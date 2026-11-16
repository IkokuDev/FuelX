import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    globals: false,
    setupFiles: ['tests/setup.ts'],
    // openSUSE's default mongod build links OpenSSL 1.1; the Ubuntu 22.04 build uses OpenSSL 3,
    // which is what modern hosts ship. Pin it so mongodb-memory-server always works.
    env: {
      MONGOMS_VERSION: process.env.MONGOMS_VERSION ?? '7.0.24',
      MONGOMS_DISTRO: process.env.MONGOMS_DISTRO ?? 'ubuntu-22.04',
    },
    testTimeout: 30000,
    hookTimeout: 60000,
    pool: 'forks',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: [
        'src/server.ts',
        'src/providers/**',
        'src/realtime/**',
        'src/jobs/**',
        '**/*.routes.ts',
      ],
      thresholds: {
        lines: 70,
        branches: 70,
      },
    },
  },
});
