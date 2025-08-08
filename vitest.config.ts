import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.{test,spec}.ts'],
    exclude: ['tests/setup.ts', 'node_modules/**'],
    // Reduce worker complexity to avoid tinypool termination issues in constrained sandboxes
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: true,
        maxThreads: 1,
        minThreads: 1,
      },
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.d.ts', 'src/**/*.test.ts', 'src/**/*.spec.ts'],
    },
    setupFiles: ['tests/setup.ts'],
    testTimeout: 30000,
    globals: true,
  },
  resolve: {
    alias: {
      '@': '/src',
    },
  },
});
