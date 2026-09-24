/* eslint-env node */

/**
 * ESLint 8 eslintrc config.
 *
 * Kept in `.cjs` because package.json sets `"type": "module"`, and in eslintrc
 * rather than flat config because the installed ESLint (8.57) still defaults to
 * eslintrc resolution.
 */
module.exports = {
  root: true,
  env: {
    browser: true,
    es2022: true,
    node: true,
  },
  parser: "vue-eslint-parser",
  parserOptions: {
    parser: "@typescript-eslint/parser",
    ecmaVersion: "latest",
    sourceType: "module",
  },
  plugins: ["@typescript-eslint"],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:vue/vue3-recommended",
    // Must stay last: turns off rules that would fight the formatter.
    "prettier",
  ],
  rules: {
    // Template and component files are named for the single concept they
    // render (Minimal, Preview, Navbar), which is the existing convention.
    "vue/multi-word-component-names": "off",

    // Deliberate console reporting in export and upload failure paths.
    "no-console": "off",

    "@typescript-eslint/no-unused-vars": [
      "error",
      { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
    ],
  },
  ignorePatterns: ["dist", "node_modules", "public", "*.cjs"],
};
