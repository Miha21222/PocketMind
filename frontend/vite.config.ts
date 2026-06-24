import { copyFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

// GitHub Pages serves static files only: a direct hit on /PocketMind/tasks/<id>
// has no matching file and returns the 404 page. Copying index.html to 404.html
// lets the SPA boot on deep links and refreshes (the router then resolves the path).
function spa404Fallback(): Plugin {
  let outDir = "dist";
  let root = process.cwd();
  return {
    name: "spa-404-fallback",
    apply: "build",
    configResolved(config) {
      outDir = config.build.outDir;
      root = config.root;
    },
    closeBundle() {
      const indexHtml = resolve(root, outDir, "index.html");
      if (existsSync(indexHtml)) {
        copyFileSync(indexHtml, resolve(root, outDir, "404.html"));
      }
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    base: env.VITE_BASE_PATH || "/",
    plugins: [react(), spa404Fallback()],
    server: {
      host: "0.0.0.0",
      // Honor a PORT assigned by the environment (e.g. the preview tooling),
      // falling back to the conventional dev port for manual runs.
      port: Number(process.env.PORT) || 5173,
    },
    build: {
      sourcemap: false,
      rollupOptions: {
        output: {
          // Keep third-party code in a stable vendor chunk so its hash only
          // changes when dependencies change — better repeat-visit caching.
          manualChunks(id) {
            if (id.includes("node_modules")) {
              return "vendor";
            }
          },
        },
      },
    },
  };
});
