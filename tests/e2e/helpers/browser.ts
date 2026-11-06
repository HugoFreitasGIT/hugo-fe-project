// Minimal headless Chrome driver over the Chrome DevTools Protocol, using
// Node's built-in WebSocket. Each browser gets a fresh temporary profile (a
// reused profile can hold assets from an earlier build) that is deleted on close.
//
// Chrome is located via CHROME_PATH or the usual install locations.

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const CHROME_CANDIDATES = [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/usr/bin/google-chrome",
  "/usr/bin/google-chrome-stable",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
];
// Generous: the first on-demand render on a cold server can take ~10 s.
const WAIT_TIMEOUT_MS = 30_000;

type CdpMessage = {
  id?: number;
  method?: string;
  params?: Record<string, unknown>;
  result?: Record<string, unknown>;
  error?: { message: string };
};

type Point = { x: number; y: number };

export type Browser = {
  /** Navigates and resolves with the HTTP status of the document. */
  goto: (url: string) => Promise<number | undefined>;
  /** Evaluates a JavaScript expression in the page and returns its value. */
  evaluate: <T>(expression: string) => Promise<T>;
  /** Waits until the expression is truthy; throws with `description` on timeout. */
  waitFor: (expression: string, description: string) => Promise<void>;
  /** Waits until Next.js has hydrated, so clicks use its client-side router. */
  waitForHydration: () => Promise<void>;
  /** Clicks with a real mouse event at the centre of the matched element. */
  click: (elementExpression: string) => Promise<void>;
  setViewport: (width: number, height: number) => Promise<void>;
  close: () => Promise<void>;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function findChrome(): string {
  const path = process.env.CHROME_PATH ?? CHROME_CANDIDATES.find((p) => existsSync(p));
  if (!path || !existsSync(path)) {
    throw new Error("Chrome not found. Install Chrome or set CHROME_PATH.");
  }
  return path;
}

async function waitForDebuggerPort(profileDir: string): Promise<number> {
  // With --remote-debugging-port=0 Chrome picks a free port and writes it here.
  const file = join(profileDir, "DevToolsActivePort");
  for (const start = Date.now(); Date.now() - start < WAIT_TIMEOUT_MS; await sleep(100)) {
    const content = await readFile(file, "utf8").catch(() => "");
    const port = Number(content.split("\n")[0]);
    if (port > 0) return port;
  }
  throw new Error("Chrome did not start its DevTools endpoint.");
}

export async function launchBrowser(): Promise<Browser> {
  const chromePath = findChrome(); // Before creating anything that needs cleanup.
  const profileDir = await mkdtemp(join(tmpdir(), "noma-e2e-chrome-"));
  const chrome = spawn(
    chromePath,
    [
      "--headless=new",
      "--disable-gpu",
      "--no-first-run",
      "--no-default-browser-check",
      `--user-data-dir=${profileDir}`,
      "--remote-debugging-port=0",
      "--window-size=1280,900",
      "about:blank",
    ],
    { stdio: "ignore" },
  );
  const chromeExited = new Promise<void>((resolve) => chrome.once("exit", () => resolve()));

  const cleanUp = async () => {
    if (chrome.exitCode === null) chrome.kill();
    await chromeExited;
    await rm(profileDir, { recursive: true, force: true });
  };

  try {
    const port = await waitForDebuggerPort(profileDir);
    const targets = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()) as {
      type: string;
      webSocketDebuggerUrl: string;
    }[];
    const page = targets.find((target) => target.type === "page");
    if (!page) throw new Error("Chrome has no page target.");

    const socket = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      socket.addEventListener("open", resolve, { once: true });
      socket.addEventListener("error", reject, { once: true });
    });

    return createBrowser(socket, async () => {
      socket.close();
      await cleanUp();
    });
  } catch (error) {
    await cleanUp();
    throw error;
  }
}

async function createBrowser(
  socket: WebSocket,
  close: () => Promise<void>,
): Promise<Browser> {
  let nextId = 0;
  const pending = new Map<number, (message: CdpMessage) => void>();
  const documentStatuses = new Map<string, number>();

  socket.addEventListener("message", (event) => {
    const message = JSON.parse(String(event.data)) as CdpMessage;
    if (message.id !== undefined) {
      pending.get(message.id)?.(message);
      pending.delete(message.id);
    }
    if (message.method === "Network.responseReceived" && message.params?.type === "Document") {
      const response = message.params.response as { url: string; status: number };
      documentStatuses.set(response.url, response.status);
    }
  });

  const send = (method: string, params: Record<string, unknown> = {}) =>
    new Promise<CdpMessage>((resolve, reject) => {
      const id = ++nextId;
      pending.set(id, (message) =>
        message.error ? reject(new Error(`${method}: ${message.error.message}`)) : resolve(message),
      );
      socket.send(JSON.stringify({ id, method, params }));
    });

  const evaluate = async <T>(expression: string): Promise<T> => {
    const message = await send("Runtime.evaluate", {
      expression,
      awaitPromise: true,
      returnByValue: true,
    });
    const result = message.result as {
      result?: { value?: unknown };
      exceptionDetails?: { text: string };
    };
    if (result.exceptionDetails) {
      throw new Error(`Page script failed: ${result.exceptionDetails.text}`);
    }
    return result.result?.value as T;
  };

  const waitFor = async (expression: string, description: string) => {
    for (const start = Date.now(); Date.now() - start < WAIT_TIMEOUT_MS; await sleep(100)) {
      if (await evaluate<boolean>(`Boolean(${expression})`).catch(() => false)) return;
    }
    throw new Error(`Timed out waiting for: ${description}`);
  };

  await send("Page.enable");
  await send("Runtime.enable");
  await send("Network.enable");

  return {
    async goto(url) {
      documentStatuses.delete(url);
      await send("Page.navigate", { url });
      await waitFor(`document.readyState === "complete"`, `${url} to load`);
      return documentStatuses.get(url);
    },
    evaluate,
    waitFor,
    async waitForHydration() {
      await waitFor(`window.next && document.readyState === "complete"`, "Next.js hydration");
      await sleep(500); // Let React attach event handlers after hydration starts.
    },
    async click(elementExpression) {
      const point = await evaluate<Point | null>(`(() => {
        const element = ${elementExpression};
        if (!element) return null;
        element.scrollIntoView({ block: "center" });
        const rect = element.getBoundingClientRect();
        return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
      })()`);
      if (!point) throw new Error(`Nothing to click for: ${elementExpression}`);
      for (const type of ["mousePressed", "mouseReleased"]) {
        await send("Input.dispatchMouseEvent", { type, ...point, button: "left", clickCount: 1 });
      }
    },
    async setViewport(width, height) {
      await send("Emulation.setDeviceMetricsOverride", {
        width,
        height,
        deviceScaleFactor: 2,
        mobile: width < 768,
      });
    },
    close,
  };
}
