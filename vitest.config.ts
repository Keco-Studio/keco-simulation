import path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/__tests__/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@studio': path.resolve(__dirname, './src/studio-lib'),
      '@keco/battle-core': path.resolve(__dirname, './packages/keco-battle-core/src/index.ts'),
    },
  },
});
