// Test setup file for vitest
// This file is run before all tests

import { vi, beforeEach } from 'vitest';

// Global setup for all tests
beforeEach(() => {
  // Clear all mocks before each test
  vi.clearAllMocks();
});
