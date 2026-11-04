import { Scalar } from '@scalar/hono-api-reference';
import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { openAPIRouteHandler } from 'hono-openapi';
import { accounts } from './accounts';
import { type Auth, createAuth } from './auth';
import { openDatabase } from './db';
import type { Env } from './env';
import { eventRoutes } from './events';
import { type ApiEnv, ApiError } from './http';
import { inviteReviewers } from './invitations';

const authRoutes = new Set([
  'POST /api/auth/sign-in/magic-link',
  'GET /api/auth/magic-link/verify',
  'POST /api/auth/sign-in/social',
  'GET /api/auth/callback/google',
  'POST /api/auth/callback/google',
  'POST /api/auth/sign-out',
]);

export const app = new Hono<ApiEnv>()
  .basePath('/api')
  .use('*', async (c, next) => {
    c.header('Cache-Control', 'private, no-store');
    c.header('Referrer-Policy', 'no-referrer');
    c.header('X-Content-Type-Options', 'nosniff');
    await next();
  })
  .onError((error, c) => {
    if (error instanceof ApiError)
      return c.json({ ok: false, message: error.message }, error.status);
    console.error(
      'Campus Events request failed',
      error.name,
      error.cause instanceof Error ? error.cause.name : '',
    );
    return c.json({ ok: false, message: 'Something went wrong. Try again.' }, 500);
  })
  .notFound((c) => c.json({ ok: false, message: 'Page not found' }, 404));

app.get(
  '/openapi.json',
  openAPIRouteHandler(app, {
    documentation: {
      info: {
        title: 'Campus Events API',
        version: '1.0.0',
        description:
          'Public discovery, event management and attendee workflows. Protected operations use the same-origin Better Auth session cookie.',
      },
      paths: {
        '/api/auth/sign-in/magic-link': {
          post: {
            summary: 'Send a single-use sign-in link',
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    required: ['email'],
                    properties: {
                      email: { type: 'string', format: 'email' },
                      callbackURL: { type: 'string' },
                      newUserCallbackURL: { type: 'string' },
                      errorCallbackURL: { type: 'string' },
                      metadata: {
                        type: 'object',
                        properties: { language: { enum: ['en', 'hu'] } },
                      },
                    },
                  },
                },
              },
            },
            responses: {
              200: { description: 'Sign-in email accepted by the mail provider' },
              429: { description: 'Too many sign-in attempts' },
              503: { description: 'Sign-in email could not be sent' },
            },
          },
        },
        '/api/auth/magic-link/verify': {
          get: {
            summary: 'Consume the emailed sign-in link',
            parameters: [
              { in: 'query', name: 'token', required: true, schema: { type: 'string' } },
            ],
            responses: { 302: { description: 'Redirect after verification' } },
          },
        },
        '/api/auth/sign-in/social': {
          post: {
            summary: 'Start Google OAuth',
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    required: ['provider'],
                    properties: {
                      provider: { const: 'google' },
                      callbackURL: { type: 'string' },
                      newUserCallbackURL: { type: 'string' },
                      errorCallbackURL: { type: 'string' },
                    },
                  },
                },
              },
            },
            responses: { 200: { description: 'Authorization URL and redirect flag' } },
          },
        },
        '/api/auth/sign-out': {
          post: {
            summary: 'End the current session',
            responses: { 200: { description: 'Session cleared' } },
          },
        },
      },
      components: {
        securitySchemes: {
          sessionCookie: { type: 'apiKey', in: 'cookie', name: 'better-auth.session_token' },
          secureSessionCookie: {
            type: 'apiKey',
            in: 'cookie',
            name: '__Secure-better-auth.session_token',
          },
        },
      },
    },
  }),
);
app.get('/docs', Scalar({ url: '/api/openapi.json' }));

app.use(
  '*',
  bodyLimit({
    maxSize: 512 * 1024,
    onError: (c) => c.json({ ok: false, message: 'The submitted information is too large.' }, 413),
  }),
);
app.use('*', async (c, next) => {
  if (!['GET', 'HEAD', 'OPTIONS'].includes(c.req.method) && !c.req.path.startsWith('/api/auth/')) {
    const origin = c.req.header('origin');
    if (origin && origin !== c.env.BETTER_AUTH_URL) throw new ApiError(403, 'Access unavailable');
  }
  const { db, close } = openDatabase(c.env);
  let auth: Auth | undefined;
  c.set('db', db);
  c.set('auth', () => (auth ??= createAuth(c.env, db)));
  try {
    await next();
  } finally {
    await close();
  }
});
app.on(['GET', 'POST'], '/auth/*', async (c) => {
  if (!authRoutes.has(`${c.req.method} ${c.req.path}`)) return c.notFound();
  const response = await c.var.auth().handler(c.req.raw);
  const headers = new Headers(response.headers);
  headers.set('Cache-Control', 'private, no-store');
  headers.set('Referrer-Policy', 'no-referrer');
  return new Response(response.body, { status: response.status, headers });
});

const routes = app.route('/', accounts).route('/', eventRoutes);
export type AppType = typeof routes;

export default {
  fetch: app.fetch,
  async scheduled(_controller, env) {
    const { db, close } = openDatabase(env);
    try {
      await inviteReviewers(env, db, Date.now());
    } finally {
      await close();
    }
  },
} satisfies ExportedHandler<Env>;
