import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      ".next/**",
      ".claude/**",
      "node_modules/**",
      "next-env.d.ts",
    ],
  },
  ...tseslint.configs.recommended,
  {
    rules: {
      // Allow _-prefixed variables to signal intentionally unused params/vars
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
  {
    // CommonJS config files use require()
    files: ["**/*.config.js", "**/*.config.cjs"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  }
);
