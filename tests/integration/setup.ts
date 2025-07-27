/**
 * Integration Test Setup
 * Sets up the test environment for integration tests
 */

import { afterEach } from "vitest";

// Set up console logging for integration tests
const originalConsoleLog = console.log;
console.log = (...args: any[]) => {
  if (process.env.VITEST_VERBOSE === 'true') {
    originalConsoleLog(...args);
  }
};

// Cleanup after each test
afterEach(() => {
  // Allow some time between tests to avoid rate limiting
  return new Promise(resolve => setTimeout(resolve, 100));
});
