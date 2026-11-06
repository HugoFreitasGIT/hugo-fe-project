// Lets standalone Node scripts and tests import TypeScript modules the way the
// app does:
// - resolves the `@/*` path alias (see tsconfig.json) to `src/*`
// - resolves extensionless relative imports between .ts files (`./helpers`)
// - stubs `server-only`, which Next.js normally resolves itself
// Usage: node --import ./scripts/node-aliases.mjs <script.ts>
import { existsSync, statSync } from "node:fs";
import { registerHooks } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

const srcDir = fileURLToPath(new URL("../src/", import.meta.url));
const candidates = ["", ".ts", ".tsx", "/index.ts", "/index.tsx"];

// Returns a file URL for the first existing TypeScript file matching `base`.
function resolveTypeScript(base) {
  const match = candidates
    .map((suffix) => base + suffix)
    .find((path) => existsSync(path) && statSync(path).isFile());
  return match && { url: pathToFileURL(match).href, format: "module-typescript", shortCircuit: true };
}

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "server-only") {
      return { url: "data:text/javascript,", shortCircuit: true };
    }

    if (specifier.startsWith("@/")) {
      const resolved = resolveTypeScript(srcDir + specifier.slice(2));
      if (resolved) return resolved;
    }

    const isRelative = specifier.startsWith("./") || specifier.startsWith("../");
    if (isRelative && context.parentURL?.endsWith(".ts")) {
      const resolved = resolveTypeScript(fileURLToPath(new URL(specifier, context.parentURL)));
      if (resolved) return resolved;
    }

    return nextResolve(specifier, context);
  },
});
