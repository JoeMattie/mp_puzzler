// packages/server/vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    passWithNoTests: true,
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
    sequence: {
      shuffle: false,
    },
  },
});
