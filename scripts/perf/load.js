// k6 load test for the read-heavy pages. Run it against a local app connected to a seeded
// test database (see README, "Load test"). It signs in as the seeded organizer through the
// local inbox, then measures six endpoints first with one user and then with 20 at once.
import { check, fail } from 'k6';
import http from 'k6/http';

const BASE = __ENV.BASE_URL || 'http://127.0.0.1:5173';
const MAIL = __ENV.MAIL_URL || 'http://127.0.0.1:5174/emails';
const STAFF_EMAIL = 'k6-staff@load.test';
const VUS = Number(__ENV.VUS || 20);
const DURATION = __ENV.DURATION || '1m';

const ENDPOINTS = [
  ['public_list', 'Public event list (/events)'],
  ['public_event', 'Public event page (/events/:id)'],
  ['staff_list', 'Staff event list (/staff/events)'],
  ['attendees', 'Attendee list, 2,000 rows'],
  ['statistics', 'Event statistics, 2,000 registrations'],
  ['reviews', 'Review results'],
];
const SCENARIOS = {
  single: { executor: 'per-vu-iterations', vus: 1, iterations: 20, maxDuration: '3m' },
  concurrent: { executor: 'constant-vus', vus: VUS, duration: DURATION, startTime: '3m' },
};

const thresholds = { http_req_failed: ['rate<0.01'], checks: ['rate>0.99'] };
for (const scenario of Object.keys(SCENARIOS)) {
  thresholds[`http_reqs{scenario:${scenario}}`] = ['count>0'];
  for (const [name] of ENDPOINTS)
    thresholds[`http_req_duration{scenario:${scenario},name:${name}}`] = ['max>=0'];
}

export const options = {
  scenarios: SCENARIOS,
  thresholds,
  summaryTrendStats: ['avg', 'min', 'med', 'p(90)', 'p(95)', 'max'],
};

export function setup() {
  const started = http.post(
    `${BASE}/api/auth/sign-in/magic-link`,
    JSON.stringify({ email: STAFF_EMAIL, callbackURL: '/' }),
    { headers: { 'Content-Type': 'application/json', Origin: BASE } },
  );
  if (started.status !== 200) fail(`Sign-in request failed: ${started.status} ${started.body}`);

  const message = JSON.parse(http.get(MAIL).body)
    .filter((item) => item.to === STAFF_EMAIL)
    .pop();
  if (!message) fail('No sign-in email in the local inbox. Is "pnpm dev:mail" running?');
  const link = message.text.trim().split('\n').pop();

  const verified = http.get(link, { redirects: 0 });
  const session = Object.entries(verified.cookies).find(([name]) => name.endsWith('session_token'));
  if (!session) fail(`Sign-in link gave no session cookie (status ${verified.status}).`);
  const cookie = `${session[0]}=${session[1][0].value}`;

  const staffEvents = JSON.parse(
    http.get(`${BASE}/api/staff/events`, { headers: { Cookie: cookie } }).body,
  );
  const big = staffEvents.find((event) => event.title === '[k6] Nagy esemény');
  const publicEvents = JSON.parse(http.get(`${BASE}/api/events`).body);
  if (!big || !publicEvents.length) fail('Seed data missing. Run "pnpm perf:seed" first.');
  return { cookie, bigId: big.id, publicId: publicEvents[0].id };
}

export default function (data) {
  const staff = { headers: { Cookie: data.cookie } };
  const urls = {
    public_list: [`${BASE}/api/events`, {}],
    public_event: [`${BASE}/api/events/${data.publicId}`, {}],
    staff_list: [`${BASE}/api/staff/events`, staff],
    attendees: [`${BASE}/api/staff/events/${data.bigId}/attendees`, staff],
    statistics: [`${BASE}/api/staff/events/${data.bigId}/statistics`, staff],
    reviews: [`${BASE}/api/staff/events/${data.bigId}/reviews`, staff],
  };
  for (const [name] of ENDPOINTS) {
    const [url, params] = urls[name];
    const response = http.get(url, { ...params, tags: { name } });
    check(response, { [`${name} 200`]: (r) => r.status === 200 });
  }
}

export function handleSummary(data) {
  const ms = (value) => (value === undefined ? '-' : value.toFixed(0));
  const lines = [];
  for (const [scenario, config] of Object.entries(SCENARIOS)) {
    const users = config.vus;
    const requests = data.metrics[`http_reqs{scenario:${scenario}}`]?.values.count ?? 0;
    lines.push(`\n${scenario} (${users} user${users > 1 ? 's' : ''}, ${requests} requests)`);
    lines.push('| Endpoint | avg ms | median ms | p90 ms | p95 ms | max ms |');
    lines.push('| --- | ---: | ---: | ---: | ---: | ---: |');
    for (const [name, label] of ENDPOINTS) {
      const v = data.metrics[`http_req_duration{scenario:${scenario},name:${name}}`]?.values;
      if (!v) continue;
      lines.push(
        `| ${label} | ${ms(v.avg)} | ${ms(v.med)} | ${ms(v['p(90)'])} | ${ms(v['p(95)'])} | ${ms(v.max)} |`,
      );
    }
  }
  const failed = data.metrics.http_req_failed?.values.rate ?? 0;
  lines.push(`\nFailed requests: ${(failed * 100).toFixed(2)}%`);
  const report = lines.join('\n');
  return {
    stdout: `${report}\n`,
    'perf-results.md': `${report}\n`,
    'perf-results.json': JSON.stringify(data, null, 2),
  };
}
