import { and, asc, eq, isNull, or } from 'drizzle-orm';
import { Hono } from 'hono';
import { validator } from 'hono-openapi';
import { z } from 'zod';
import { profileSchema } from '../src/domain/rules';
import { toUser } from './auth';
import type { Database, Transaction } from './db';
import { user } from './db/schema';
import {
  type ApiEnv,
  ApiError,
  actorId,
  languageSchema,
  operation,
  requireAdmin,
  requireProfile,
  sessionAccount,
  userSchema,
  validationHook,
} from './http';

export async function readAccount(db: Database | Transaction, id: string, lock = false) {
  const query = db.select().from(user).where(eq(user.id, id));
  const [account] = await (lock ? query.for('update') : query);
  return account && toUser(account);
}

export const accounts = new Hono<ApiEnv>()
  .get(
    '/session',
    operation(
      'Read the current account and enabled sign-in methods',
      z.object({
        user: userSchema.nullable(),
        googleEnabled: z.boolean(),
      }),
      false,
    ),
    async (c) => {
      const account = await sessionAccount(c);
      return c.json({
        user: (account && (await readAccount(c.var.db, account.id))) ?? null,
        googleEnabled: !!(c.env.GOOGLE_CLIENT_ID && c.env.GOOGLE_CLIENT_SECRET),
      });
    },
  )
  .post(
    '/profile/name',
    operation('Confirm the permanent profile name'),
    validator(
      'json',
      z.object({ name: profileSchema, language: languageSchema }).strict(),
      validationHook,
    ),
    async (c) => {
      const id = await actorId(c);
      const { name, language } = c.req.valid('json');
      const [updated] = await c.var.db
        .update(user)
        .set({ profileName: name, language })
        .where(and(eq(user.id, id), isNull(user.profileName)))
        .returning({ id: user.id });
      if (!updated) throw new ApiError(409, 'Profile names cannot be changed after confirmation.');
      return c.json({ ok: true, message: 'Profile name confirmed.' });
    },
  )
  .patch(
    '/profile/language',
    operation('Save the account language'),
    validator('json', z.object({ language: languageSchema }).strict(), validationHook),
    async (c) => {
      const account = requireProfile(await readAccount(c.var.db, await actorId(c)));
      await c.var.db.update(user).set(c.req.valid('json')).where(eq(user.id, account.id));
      return c.json({ ok: true, message: 'Language preference saved.' });
    },
  )
  .get(
    '/admin/accounts',
    operation('List accounts for organizer permission management', z.array(userSchema)),
    async (c) => {
      requireAdmin(await readAccount(c.var.db, await actorId(c)));
      return c.json((await c.var.db.select().from(user).orderBy(asc(user.email))).map(toUser));
    },
  )
  .patch(
    '/admin/accounts/:userId',
    operation('Grant or remove organizer permission'),
    validator('param', z.object({ userId: z.string().min(1).max(128) }), validationHook),
    validator('json', z.object({ organizer: z.boolean() }).strict(), validationHook),
    async (c) => {
      requireAdmin(await readAccount(c.var.db, await actorId(c)));
      const { userId } = c.req.valid('param');
      const { organizer } = c.req.valid('json');
      const [updated] = await c.var.db
        .update(user)
        .set({ role: organizer ? 'organizer' : null })
        .where(and(eq(user.id, userId), or(isNull(user.role), eq(user.role, 'organizer'))))
        .returning({ id: user.id });
      if (!updated)
        throw new ApiError(409, 'The account is unavailable or its role is managed manually.');
      return c.json({ ok: true, message: 'Organizer permission updated.' });
    },
  );
