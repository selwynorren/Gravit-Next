import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: [
      "src/**/*.test.ts",
      "src/**/*.test.tsx",
      "electron/**/*.test.ts",
      "server/**/*.test.ts",
      "scripts/**/*.test.ts",
    ],
    environment: "node",
  },
});
