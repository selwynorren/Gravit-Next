import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "dist",
    // "assets" is taken by the shared image/font folder.
    assetsDir: "bundle",
    sourcemap: true,
    target: "es2023",
    rolldownOptions: {
      output: {
        // The code the app starts with in four files instead of one: the
        // packages, the engine, the editor and the rest (the app and io
        // in the entry). The browser downloads and
        // compiles them side by side, so the bundle starts running about
        // 100 ms sooner than with one 4.7 MB file on the benchmark runner.
        // Each part only imports from the ones before it
        // (the engine only reads the locale table under src/app), so the
        // modules run in an order their imports allow, as before.
        // Mousetrap stays in the entry: its global-bind plugin patches the
        // global Mousetrap that mousetrap.js sets when it runs, and in the
        // packages file the plugin ran first.
        codeSplitting: {
          groups: [
            {
              name: "vendor",
              test: /[\\/]node_modules[\\/](?!mousetrap[\\/])/,
              tags: ["$initial"],
              priority: 3,
            },
            {
              name: "engine",
              test: /[\\/]src[\\/](engine[\\/]|app[\\/]locale[\\/]data[\\/])/,
              tags: ["$initial"],
              priority: 2,
            },
            { name: "editor", test: /[\\/]src[\\/]editor[\\/]/, tags: ["$initial"], priority: 1 },
          ],
        },
      },
    },
  },
  worker: { format: "es" },
});
