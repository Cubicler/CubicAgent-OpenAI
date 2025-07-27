import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    exclude: ['tests/integration/**/*.test.ts', 'node_modules/**/*'],
    globals: true,
    setupFiles: ['tests/setup.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.d.ts'],
      reporter: ['text', 'lcov', 'html'],
      reportsDirectory: './coverage'
    }
  },
  resolve: {
    alias: {
      // Handle ES module imports ending with .js to resolve to .ts files
      '^(.+)\\.js$': '$1'
    }
  }
});
