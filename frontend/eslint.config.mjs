import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    rules: {
      // setState v useEffect je standardní pattern pro mounted detection a async fetch
      "react-hooks/set-state-in-effect": "off",
      // Unused imports opravíme postupně
      "@typescript-eslint/no-unused-vars": "warn",
      // aria-expanded na input není blokující chyba
      "jsx-a11y/role-supports-aria-props": "warn",
      // exhaustive-deps — warned, ale ne error (existující pattern)
      "react-hooks/exhaustive-deps": "warn",
    },
  },
]);

export default eslintConfig;
