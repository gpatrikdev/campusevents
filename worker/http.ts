import type { Context } from 'hono';
import { describeRoute, resolver } from 'hono-openapi';
import { z } from 'zod';
import { isStaff } from '../src/domain/rules';
import type { Auth } from './auth';
import type { Database } from './db';
import type { Env } from './env';

export type ApiEnv = {
  Bindings: Env;
  Variables: { db: Database; auth: () => Auth };
};

export class ApiError extends Error {
  constructor(
    readonly status: 400 | 401 | 403 | 404 | 409 | 413 | 415 | 503,
    message: string,
  ) {
    super(message);
  }
}

export const languageSchema = z.enum(['en', 'hu']);
export const idSchema = z.uuid();
export const outcomeSchema = z.object({
  ok: z.boolean(),
  message: z.string(),
  id: idSchema.optional(),
  warning: z.boolean().optional(),
  checkedInAt: z.string().optional(),
});
export const userSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  role: z.enum(['organizer', 'admin']).nullable(),
  profileComplete: z.boolean(),
  language: languageSchema,
});

export function operation(summary: string, schema: z.ZodType = outcomeSchema, secured = true) {
  const error = (description: string) => ({
    description,
    content: { 'application/json': { schema: resolver(outcomeSchema) } },
  });
  return describeRoute({
    summary,
    ...(secured && { security: [{ sessionCookie: [] }, { secureSessionCookie: [] }] }),
    responses: {
      200: {
        description: 'Success',
        content: { 'application/json': { schema: resolver(schema) } },
      },
      400: error('Invalid input'),
      ...(secured && { 401: error('Sign-in required'), 403: error('Access denied') }),
      404: error('Resource unavailable'),
      409: error('Action conflicts with the current state or deadline'),
      503: error('Email delivery failed'),
    },
  });
}

export const invalidInput = { ok: false, message: 'Check the submitted information.' };
export const validationHook = (result: { success: boolean }, c: Context) => {
  if (!result.success) return c.json(invalidInput, 400);
};

export async function sessionAccount(c: Context<ApiEnv>) {
  if (!c.req.header('cookie')) return undefined;
  const { response, headers } = await c.var.auth().api.getSession({
    headers: c.req.raw.headers,
    returnHeaders: true,
  });
  for (const cookie of headers.getSetCookie()) c.header('Set-Cookie', cookie, { append: true });
  return response?.user;
}

export async function actorId(c: Context<ApiEnv>) {
  const account = await sessionAccount(c);
  if (!account) throw new ApiError(401, 'Sign in to continue.');
  return account.id;
}

export function requireProfile<T extends { profileComplete: boolean }>(account: T | undefined): T {
  if (!account) throw new ApiError(401, 'Sign in to continue.');
  if (!account.profileComplete) throw new ApiError(403, 'Confirm your profile name first.');
  return account;
}

export function requireStaff(account: Parameters<typeof isStaff>[0]) {
  const user = requireProfile(account);
  if (!isStaff(user)) throw new ApiError(403, 'Staff access is required.');
  return user;
}

export function requireAdmin(account: Parameters<typeof isStaff>[0]) {
  const user = requireProfile(account);
  if (user.role !== 'admin') throw new ApiError(403, 'Admin access is required.');
  return user;
}

export const unavailable = () => new ApiError(404, 'This event is unavailable.');
export function conflict(issue: string | null) {
  if (issue) throw new ApiError(409, issue);
}
