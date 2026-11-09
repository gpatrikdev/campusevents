// Fills a test database with load-test data: 500 events and one past event with 2,000
// registrations. Every row it creates is marked ("[k6]" titles, "@load.test" emails), and
// --clean removes them again. Usage:
//   DATABASE_URL=<test database> node scripts/perf/seed.mjs [--clean]
import { randomUUID } from 'node:crypto';
import pg from 'pg';

const EVENTS = 500;
const ATTENDEES = 2000;
const HOUR = 3_600_000;
const STAFF_EMAIL = 'k6-staff@load.test';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('Set DATABASE_URL to a migrated test database.');

const client = new pg.Client({ connectionString: url });
await client.connect();

async function clean() {
  // Registrations go with their events and users through ON DELETE CASCADE.
  const removed = await client.query(`DELETE FROM events WHERE title LIKE '[k6]%'`);
  const users = await client.query(`DELETE FROM "user" WHERE email LIKE '%@load.test'`);
  console.log(`Removed ${removed.rowCount} events and ${users.rowCount} accounts.`);
}

// Inserts rows in batches so one statement stays well under PostgreSQL's parameter limit.
async function insert(table, columns, rows) {
  for (let i = 0; i < rows.length; i += 500) {
    const batch = rows.slice(i, i + 500);
    const values = batch
      .map((_, r) => `(${columns.map((_, c) => `$${r * columns.length + c + 1}`).join(', ')})`)
      .join(', ');
    await client.query(
      `INSERT INTO ${table} (${columns.join(', ')}) VALUES ${values}`,
      batch.flat(),
    );
  }
}

const content = (text) =>
  JSON.stringify({
    root: {
      type: 'root',
      children: [{ type: 'paragraph', children: [{ type: 'text', text }] }],
    },
  });

const form = {
  elements: [
    {
      type: 'rating',
      name: 'qrating',
      title: 'Overall rating',
      isRequired: true,
      rateMin: 1,
      rateMax: 5,
      displayMode: 'buttons',
    },
    { type: 'comment', name: 'qcomment', title: 'Comment', isRequired: false, maxLength: 2000 },
  ],
};

async function seed() {
  const now = Date.now();
  const at = (ms) => new Date(ms).toISOString();

  // 500 events: most published and upcoming, some drafts, some past.
  const events = [];
  for (let i = 0; i < EVENTS; i++) {
    const start = now + (i % 10 === 0 ? -(i + 2) * 24 * HOUR : (i + 2) * 12 * HOUR);
    events.push([
      randomUUID(),
      `[k6] Esemény ${String(i + 1).padStart(3, '0')}`,
      `Terheléses teszt · ${i % 20}. terem`,
      at(start),
      at(start + 2 * HOUR),
      'Europe/Budapest',
      content('Terheléses teszthez generált esemény. '.repeat(20)),
      i % 7 === 0 ? 'draft' : 'published',
    ]);
  }
  await insert(
    'events',
    ['id', 'title', 'location', 'starts_at', 'ends_at', 'timezone', 'content', 'status'],
    events,
  );

  // The large event ended an hour ago, so attendance, reviews and certificates all apply.
  const bigId = randomUUID();
  const bigStart = now - 4 * HOUR;
  await client.query(
    `INSERT INTO events (id, title, location, starts_at, ends_at, timezone, content, form, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'published')`,
    [
      bigId,
      '[k6] Nagy esemény',
      'Terheléses teszt · Aula',
      at(bigStart),
      at(bigStart + 3 * HOUR),
      'Europe/Budapest',
      content('Kétezer résztvevős terheléses teszt.'),
      JSON.stringify(form),
    ],
  );

  const users = [[randomUUID(), 'k6 staff', STAFF_EMAIL, true, 'k6 Szervező', 'organizer', 'hu']];
  const registrations = [];
  for (let i = 0; i < ATTENDEES; i++) {
    const id = randomUUID();
    const n = String(i + 1).padStart(4, '0');
    users.push([id, `k6 user ${n}`, `k6-${n}@load.test`, true, `Teszt Résztvevő ${n}`, null, 'hu']);
    const active = i % 20 !== 0; // 5% cancelled
    const checkedIn = active && i % 10 !== 1; // most active attendees arrived
    const reviewed = checkedIn && i % 5 < 3;
    registrations.push([
      randomUUID(),
      bigId,
      id,
      randomUUID(),
      active,
      checkedIn ? at(bigStart - HOUR + ((i * 7919) % (4 * HOUR))) : null,
      reviewed ? JSON.stringify({ qrating: (i % 5) + 1, qcomment: `Megjegyzés ${n}` }) : null,
      checkedIn && i % 5 < 2 ? 'sent' : 'none',
    ]);
  }
  await insert(
    '"user"',
    ['id', 'name', 'email', 'email_verified', 'profile_name', 'role', 'language'],
    users,
  );
  await insert(
    'registrations',
    ['id', 'event_id', 'user_id', 'ticket', 'active', 'checked_in_at', 'answers', 'certificate'],
    registrations,
  );
  console.log(`Seeded ${EVENTS + 1} events, ${ATTENDEES} attendees and ${STAFF_EMAIL}.`);
  console.log(`Large event id: ${bigId}`);
}

try {
  await clean();
  if (!process.argv.includes('--clean')) await seed();
} finally {
  await client.end();
}
