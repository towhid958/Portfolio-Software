import { defineConfig, loadEnv, type UserConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import { nitro } from "nitro/vite";
import { devtools } from "@tanstack/devtools-vite";
import { existsSync, readFileSync } from "node:fs";

// .dev.vars is Wrangler's local-secrets convention (SUPABASE_SERVICE_ROLE_KEY,
// STRIPE_SECRET_KEY, etc.) - it's only auto-loaded by `wrangler dev`, never by
// plain `vite dev`. Load it into process.env ourselves so server code that
// reads process.env['SOME_SECRET'] (e.g. client.server.ts) works the same way
// under `npm run dev` as it will once deployed (where Wrangler injects these
// as real secrets). Never overwrites a var already set in the shell/CI.
function loadDevVars(path = ".dev.vars") {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const match = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    const key = match?.[1];
    const rawValue = match?.[2];
    if (!key || rawValue === undefined || process.env[key] !== undefined) continue;
    process.env[key] = rawValue.trim().replace(/^["']|["']$/g, "");
  }
}
loadDevVars();

export default defineConfig(({ command, mode }) => {
  const isDevBuild = command === "build" && mode === "development";

  // Vite already exposes VITE_*-prefixed env vars via import.meta.env, but
  // this makes the replacement an explicit build-time constant so it's
  // identical between the client bundle and the SSR bundle.
  const envDefine: Record<string, string> = {};
  for (const [key, value] of Object.entries(loadEnv(mode, process.cwd(), "VITE_"))) {
    envDefine[`import.meta.env.${key}`] = JSON.stringify(value);
  }

  const config: UserConfig = {
    define: envDefine,
    css: { transformer: "lightningcss" },
    resolve: {
      alias: { "@": `${process.cwd()}/src` },
      dedupe: [
        "react",
        "react-dom",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
        "@tanstack/react-query",
        "@tanstack/query-core",
      ],
    },
    optimizeDeps: {
      include: ["react", "react-dom", "react-dom/client", "react/jsx-runtime", "react/jsx-dev-runtime"],
      ignoreOutdatedRequests: true,
    },
    server: {
      host: "::",
      port: 8080,
      // Debounces HMR reloads until a saved file's write has fully settled -
      // avoids the double-reload some editors/OSes trigger on save.
      watch: {
        awaitWriteFinish: { stabilityThreshold: 1000, pollInterval: 100 },
      },
    },
    plugins: [
      ...(mode === "development"
        ? [
            devtools({
              logging: false,
              eventBusConfig: { enabled: false },
              enhancedLogs: { enabled: false },
              consolePiping: { enabled: false },
              removeDevtoolsOnBuild: false,
              injectSource: { enabled: true },
            }),
          ]
        : []),
      tailwindcss(),
      tsConfigPaths({ projects: ["./tsconfig.json"] }),
      tanstackStart({
        // Fails the build if server-only code (files under **/server/**, or
        // anything using the `server-only` package) is imported client-side.
        importProtection: {
          behavior: "error",
          client: {
            files: ["**/server/**"],
            specifiers: ["server-only"],
          },
        },
        server: { entry: "server" },
      }),
      // Nitro builds the SSR server bundle; only needed for `vite build`.
      ...(command === "build" ? [nitro({ defaultPreset: "cloudflare-module" })] : []),
      viteReact(),
    ],
  };

  if (isDevBuild) {
    config.environments = { client: { define: { "process.env.NODE_ENV": JSON.stringify("development") } } };
  }

  return config;
});
