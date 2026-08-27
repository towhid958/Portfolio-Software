import { defineConfig, loadEnv, type UserConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import { nitro } from "nitro/vite";
import { devtools } from "@tanstack/devtools-vite";

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
