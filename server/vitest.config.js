import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Backend tests run in a Node environment (Express + Mongoose).
    environment: 'node',
    // Tests import { describe, it, expect, ... } explicitly from 'vitest'.
    globals: false,
    include: ['tests/**/*.test.js'],
    // Each test file spins up its own in-memory MongoDB; run files in a
    // single fork sequentially to keep memory usage and startup stable.
    pool: 'forks',
    poolOptions: {
      forks: { singleFork: true },
    },
    testTimeout: 30000,
    hookTimeout: 120000,
  },
});
