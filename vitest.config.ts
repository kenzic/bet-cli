import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
  coverage: {
    provider: "v8",
    reporter: ["text", "html", "lcov"],
    exclude: [
      "dist/**",
      "node_modules/**",
      "src/index.ts",
      "src/ui/**",
      "**/*.test.ts",
      "**/*.config.ts",
    ],
  },
});
