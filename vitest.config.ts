import { defineConfig } from "vitest/config";
import vue from "@vitejs/plugin-vue";

// Kept separate from vite.config.ts so the production build config stays
// untouched. Tailwind is deliberately omitted: these tests assert structure and
// inline geometry, not utility-class output.
export default defineConfig({
  plugins: [vue()],
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.ts"],
    setupFiles: ["src/tests/setup.ts"],
  },
});
