import { drizzleAdapter } from '@better-auth/drizzle-adapter';
import { APIError, betterAuth } from 'better-auth';
import { magicLink } from 'better-auth/plugins';
import { eq } from 'drizzle-orm';
import { emailSchema } from '../src/domain/rules';
import type { User } from '../src/domain/types';
import { accountOptions } from './auth-options';
import type { Database } from './db';
import * as schema from './db/auth-schema';
import { sendSignIn } from './email';
import type { Env } from './env';

export function toUser(
  account: Pick<
    typeof schema.user.$inferSelect,
    'id' | 'name' | 'email' | 'profileName' | 'role' | 'language'
  >,
): User & { language: 'en' | 'hu' } {
  const { id, name, email, profileName, role, language } = account;
  return { id, name: profileName ?? name, email, role, language, profileComplete: !!profileName };
}

export function createAuth(env: Env, db: Database) {
  const {
    BETTER_AUTH_URL: baseURL,
    BETTER_AUTH_SECRET: secret,
    GOOGLE_CLIENT_ID: clientId,
    GOOGLE_CLIENT_SECRET: clientSecret,
  } = env;
  if (!baseURL || !secret || secret.length < 32) throw new Error('Better Auth is not configured');
  return betterAuth({
    ...accountOptions,
    baseURL,
    secret,
    database: drizzleAdapter(db, { provider: 'pg', schema, transaction: true }),
    socialProviders: clientId && clientSecret ? { google: { clientId, clientSecret } } : {},
    advanced: { ipAddress: { ipAddressHeaders: ['cf-connecting-ip'] } },
    session: { cookieCache: { enabled: false } },
    plugins: [
      magicLink({
        storeToken: 'hashed',
        async sendMagicLink({ email, url, metadata }) {
          if (!emailSchema.safeParse(email).success) throw new APIError('BAD_REQUEST');
          const [account] = await db
            .select({ language: schema.user.language })
            .from(schema.user)
            .where(eq(schema.user.email, email.toLowerCase()));
          try {
            await sendSignIn(
              env,
              email,
              url,
              account?.language ?? (metadata?.language === 'hu' ? 'hu' : 'en'),
            );
          } catch {
            throw new APIError('SERVICE_UNAVAILABLE', {
              message: 'The sign-in email could not be sent.',
            });
          }
        },
      }),
    ],
  });
}

export type Auth = ReturnType<typeof createAuth>;
