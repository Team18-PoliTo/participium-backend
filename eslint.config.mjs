import js from "@eslint/js";
import tseslint from "typescript-eslint";
import globals from "globals";
import prettier from "eslint-config-prettier";

export default tseslint.config(
  // Ignore patterns - must be first
  {
    ignores: [
      "dist/**",
      "node_modules/**",
      "coverage/**",
      "logs/**",
      "*.js",
      "*.mjs",
      "jest.config.js",
      "jest.setup.js",
      "eslint.config.mjs",
    ],
  },

  // Base JS recommended rules
  js.configs.recommended,

  // TypeScript recommended rules
  ...tseslint.configs.recommended,

  // Global settings
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
    },
  },

  // Custom rules for the project
  {
    files: ["**/*.ts"],
    rules: {
      // TypeScript-specific rules - relaxed for existing codebase
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/no-explicit-any": "off", // Too many existing any types - enable later
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/explicit-module-boundary-types": "off",
      "@typescript-eslint/no-non-null-assertion": "off", // Common pattern in existing code
      "@typescript-eslint/no-require-imports": "off", // Allow require() for dynamic imports
      "@typescript-eslint/no-wrapper-object-types": "warn",
      "@typescript-eslint/no-namespace": "off", // Needed for Express type augmentation
      "@typescript-eslint/no-unsafe-function-type": "off", // Allow Function type

      // General code quality
      "no-console": "off", // Allow all console methods for now
      "prefer-const": "error",
      "no-var": "error",
      eqeqeq: ["error", "always"],

      // Allow empty catch blocks (common in error handling)
      "no-empty": ["error", { allowEmptyCatch: true }],
    },
  },

  // Test files - more lenient rules
  // Best practice: Lint tests but allow common test patterns
  {
    files: ["**/*.test.ts", "**/*.spec.ts", "**/test/**/*.ts"],
    rules: {
      // Allow any types for mocks and test data
      "@typescript-eslint/no-explicit-any": "off",
      
      // Allow console for debugging tests
      "no-console": "off",
      
      // Be lenient with unused vars - tests often have setup variables
      // that aren't used in every test case
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_|^(setup|teardown|mock|spy|stub)",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      
      // Allow non-null assertions in tests (common for test data)
      "@typescript-eslint/no-non-null-assertion": "off",
      
      // Allow empty functions in tests (common for mocks)
      "@typescript-eslint/no-empty-function": "off",
    },
  },

  // Seed and migration files - allow console.log
  {
    files: ["**/seed/**/*.ts", "**/migrations/**/*.ts", "**/data/**/*.ts"],
    rules: {
      "no-console": "off",
    },
  },

  // Prettier config - must be last to override formatting rules
  prettier
);

