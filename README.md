# Campus Events

Campus Events is a university event service with a React and Astryx Neutral frontend and a Hono API on Cloudflare Workers. The Worker serves the frontend and API from the same origin.

## Run locally

Use Node 22.13 or later in the 22.x line, Node 24, or Node 26+, and pnpm 12.8.1. The example uses Podman and a fresh local PostgreSQL database.

```sh
pnpm install --frozen-lockfile
podman run -d --name campus-events-dev-pg \
  -e POSTGRES_USER=campus -e POSTGRES_PASSWORD=campus -e POSTGRES_DB=campus_dev \
  -p 127.0.0.1:55432:5432 docker.io/library/postgres:18-alpine
sed "s/^BETTER_AUTH_SECRET=.*/BETTER_AUTH_SECRET=$(openssl rand -hex 32)/" .dev.vars.example > .dev.vars
chmod 600 .dev.vars

export DATABASE_URL=postgres://campus:campus@127.0.0.1:55432/campus_dev
pnpm db:migrate
export CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE="$DATABASE_URL"
pnpm dev
```

For an existing local container, use `podman start campus-events-dev-pg`.

Run `pnpm dev:mail` in a second terminal before signing in. Open the [app](http://127.0.0.1:5173/) and request a magic link with a test address. Copy the link from the message's `text` field in the [local inbox](http://127.0.0.1:5174/emails) into the same browser. The inbox keeps messages and attachments in memory until the process stops.

To create a local admin, sign in and confirm the account's name first. Replace `admin@example.test` in this command with that account's address and sign in again. The admin can grant or remove organizer status in the app.

```sh
podman exec campus-events-dev-pg psql -U campus -d campus_dev -c \
  "UPDATE \"user\" SET role = 'admin' WHERE email = 'admin@example.test' AND profile_name IS NOT NULL"
```

The API schema is at [OpenAPI JSON](http://127.0.0.1:5173/api/openapi.json). [Scalar](http://127.0.0.1:5173/api/docs) uses the browser's existing session for protected operations. To invoke the five-minute review invitation cron locally, use the scheduled trigger in the [Cloudflare local explorer](http://127.0.0.1:5173/__debug).

## Local scenario preview

Run `pnpm dev:preview` and open [the scenario preview](http://127.0.0.1:5175/__preview/). It runs without a database or mail server. **Preview controls** can change the sample identity, set the demo clock to a deadline, simulate loading and failures, and reset the fixtures. The reference clock is 3 November 2026 at noon in Europe/Budapest. A reload resets the sample records.

The preview uses its own in-memory data and authentication. Its fixtures, controls, and simulated scanner are excluded from production bundles. Staff draft preview stays available from the live dashboard.

## Checks

```sh
pnpm typecheck
pnpm check
pnpm test
pnpm build

podman exec campus-events-dev-pg createdb -U campus campus_test
export TEST_DATABASE_URL=postgres://campus:campus@127.0.0.1:55432/campus_test
DATABASE_URL="$TEST_DATABASE_URL" pnpm db:migrate
pnpm test:worker
```

The Worker tests use PostgreSQL through local Hyperdrive, run inside workerd, and intercept email delivery. Use a separate development database for these tests. For local git hooks, run `pnpm hooks:install`.

## Cloud setup

A hosted environment needs a fresh Neon PostgreSQL database, a Cloudflare Hyperdrive configuration that points to its direct endpoint, and the Hyperdrive ID in `wrangler.jsonc`. Use `--caching-disabled` when creating the Hyperdrive configuration so permission, ticket and event state reads reflect committed changes. Run `pnpm db:migrate` against the approved database using its direct `DATABASE_URL`.

Set `BETTER_AUTH_URL` to the public HTTPS origin and `BETTER_AUTH_SECRET` to a random value of at least 32 characters. For Google login, set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` and register `<origin>/api/auth/callback/google` as a redirect URI. Set `RESEND_API_KEY` and `EMAIL_FROM` with a verified Resend sender. Keep the local inbox endpoint in local development only. If testing real Google OAuth locally, also register `http://127.0.0.1:5173/api/auth/callback/google`.

The Worker owns deadlines and permissions. Transactions lock event and account rows before conflicting actions, and PostgreSQL enforces one active registration per account and event. An invitation can be retried by cron after a send error. A certificate request consumes the attendee's single request before generating and sending the PDF. The app shows failure when delivery fails and reports unconfirmed delivery if the request stops before the provider reports an outcome.
