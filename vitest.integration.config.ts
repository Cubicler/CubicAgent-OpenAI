import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/integration/**/*.test.ts'],
    globals: true,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.d.ts'],
      reporter: ['text', 'lcov', 'html'],
      reportsDirectory: './coverage'
    },
    // Longer timeout for integration tests with real API calls
    testTimeout: 60000
  },
  resolve: {
    alias: {
      // Handle ES module imports ending with .js to resolve to .ts files
      '^(.+)\\.js$': '$1'
    }
  }
});
