import path from "node:path";
import { cloudflare } from "@cloudflare/vite-plugin";
import babelPlugin from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig(({ command }) => {
  const isServe = command === "serve";

  return {
    plugins: [
      devtools(),
      tailwindcss(),
      tanstackRouter({
        autoCodeSplitting: true,
        routeFileIgnorePattern: "\\.test\\.ts$",
        target: "react",
      }),
      babelPlugin({ presets: [reactCompilerPreset()], sourceMap: isServe }),
      react(),
      ...(isServe ? [] : [cloudflare()]),
    ],
    resolve: {
      alias: {
        "@": path.resolve(import.meta.dirname, "./src"),
      },
    },
    server: {
      allowedHosts: ["macbook.grouse-ph.ts.net"],
      host: true,
      proxy: {
        "/api": {
          changeOrigin: true,
          target: "http://localhost:3000",
        },
        "/rpc": {
          changeOrigin: true,
          target: "http://localhost:3000",
        },
      },
    },
  };
});
