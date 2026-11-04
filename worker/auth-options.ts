import type { BetterAuthOptions } from 'better-auth';

export const accountOptions = {
  user: {
    additionalFields: {
      profileName: { type: 'string', required: false, input: false },
      role: { type: ['organizer', 'admin'], required: false, input: false },
      language: { type: ['en', 'hu'], defaultValue: 'en', required: true, input: false },
    },
  },
  rateLimit: { enabled: true, storage: 'database' },
} satisfies BetterAuthOptions;
