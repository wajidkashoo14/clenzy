import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: false,
    include: ['tests/**/*.test.ts'],
    setupFiles: ['./tests/setup.ts'],
    // Each test file spins up its own mongodb-memory-server replica set —
    // on a low-core machine, running every file's mongod at once starves
    // them all and the memory-server startup itself times out. Cap
    // parallelism to keep each file's Mongo instance actually able to boot.
    maxWorkers: 2,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
    },
  },
});
