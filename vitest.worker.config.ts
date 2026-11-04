import { cloudflareTest } from '@cloudflare/vitest-plugin';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [
    cloudflareTest(() => {
      const database = process.env.TEST_DATABASE_URL;
      if (!database)
        throw new Error('Set TEST_DATABASE_URL to a migrated development test database.');
      return {
        main: './worker/index.ts',
        miniflare: {
          compatibilityDate: '2026-11-03',
          compatibilityFlags: ['nodejs_compat'],
          hyperdrives: { HYPERDRIVE: database },
          bindings: {
            BETTER_AUTH_URL: 'http://127.0.0.1:5173',
            BETTER_AUTH_SECRET: 'workers-test-local-only-0123456789-abcdef',
            RESEND_API_KEY: 'test-key',
            EMAIL_FROM: 'Campus Events <events@example.test>',
          },
        },
      };
    }),
  ],
  test: { include: ['worker/**/*.test.ts'], testTimeout: 15_000, hookTimeout: 25_000 },
});
