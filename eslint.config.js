// @ts-check
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/dist-types/**',
      '**/build/**',
      '**/target/**',
      '**/node_modules/**',
      'apps/desktop/src-tauri/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    // Config files themselves are not part of a TS project.
    files: ['**/*.js', '**/*.mjs', '**/*.config.ts', '**/vite.config.ts', '**/vitest.config.ts'],
    extends: [tseslint.configs.disableTypeChecked],
  },
  {
    // Build/dev scripts run in Node, not the browser.
    files: ['scripts/**/*.mjs'],
    languageOptions: {
      globals: { process: 'readonly', console: 'readonly' },
    },
  },
  prettier,
);
