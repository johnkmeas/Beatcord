import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'packages/client/src'),
      '@beatcord/shared': path.resolve(__dirname, 'packages/shared/src/index.ts'),
    },
  },
  test: {
    globals: true,
    include: [
      'packages/**/src/**/*.test.ts',
      'packages/**/src/**/*.spec.ts',
      'tests/**/*.test.ts',
      'tests/**/*.spec.ts',
    ],
  },
});
