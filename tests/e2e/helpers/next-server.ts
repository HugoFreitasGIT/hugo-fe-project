// Starts the Next.js production server (`next start`) for end-to-end tests.
// Requires an existing production build (`npm run build`).

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { createServer } from "node:net";

export type NextServer = {
  baseUrl: string;
  stop: () => Promise<void>;
};

const STARTUP_TIMEOUT_MS = 30_000;

function getFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.unref();
    server.on("error", reject);
    server.listen(0, () => {
      const address = server.address();
      server.close(() =>
        typeof address === "object" && address
          ? resolve(address.port)
          : reject(new Error("Could not allocate a port.")),
      );
    });
  });
}

/**
 * Starts `next start` on a free port. `env` overrides variables for this server
 * only; values already in the environment take precedence over `.env.local`.
 */
export async function startNextServer(
  env: Record<string, string> = {},
): Promise<NextServer> {
  if (!existsSync(".next/BUILD_ID")) {
    throw new Error("No production build found. Run `npm run build` first.");
  }

  const port = await getFreePort();
  const baseUrl = `http://localhost:${port}`;
  const child = spawn(
    process.execPath,
    ["node_modules/next/dist/bin/next", "start", "--port", String(port)],
    { env: { ...process.env, ...env }, stdio: "ignore" },
  );

  const exited = new Promise<void>((resolve) => child.once("exit", () => resolve()));
  const stop = async () => {
    if (child.exitCode === null) child.kill();
    await exited;
  };

  for (const start = Date.now(); Date.now() - start < STARTUP_TIMEOUT_MS; ) {
    if (child.exitCode !== null) {
      throw new Error(`next start exited early with code ${child.exitCode}.`);
    }
    try {
      await fetch(baseUrl);
      return { baseUrl, stop };
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }

  await stop();
  throw new Error(`next start did not respond within ${STARTUP_TIMEOUT_MS} ms.`);
}
