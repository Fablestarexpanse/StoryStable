import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'vault',
    include: ['tests/**/*.test.ts'],
  },
});
