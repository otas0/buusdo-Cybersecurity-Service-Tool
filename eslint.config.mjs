import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // React Compiler / hooks 5 rules conflict with intentional announce-ref + filter-sync patterns.
    // Keep core-web-vitals; soften these until components are refactored.
    rules: {
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/refs": "off",
      "react-hooks/immutability": "off"
    }
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "dist/**",
    "next-env.d.ts",
    // CJS / bundled surfaces — not Next App Router (website-first lint target)
    "desktop-app/**",
    "extension/**",
    "safari/**",
    "shared/qrcode-browser.js",
    "shared/shield-lists.classic.js",
    "shared/detect.classic.js"
  ])
]);

export default eslintConfig;