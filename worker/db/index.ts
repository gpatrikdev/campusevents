import { Socket } from 'node:net';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import type { Env } from '../env';
import * as schema from './schema';

export function openDatabase(env: Env) {
  const pool = new Pool({
    connectionString: env.HYPERDRIVE.connectionString,
    max: 1,
    // The pg Cloudflare shim emits a late socket error on normal request shutdown.
    stream: () => new Socket(),
    connectionTimeoutMillis: 5000,
  });
  return { db: drizzle(pool, { schema }), close: () => pool.end() };
}

export type Database = ReturnType<typeof openDatabase>['db'];
export type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0];
