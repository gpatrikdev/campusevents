import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { hu } from './hu';

describe('interface translations', () => {
  it('includes Hungarian for every literal interface translation key', () => {
    const root = fileURLToPath(new URL('../', import.meta.url));
    const files = readdirSync(root, { recursive: true }).filter(
      (name) => /\.(ts|tsx)$/.test(String(name)) && !String(name).endsWith('.test.ts'),
    );
    const missing = new Set<string>();
    for (const name of files) {
      const source = readFileSync(`${root}/${name}`, 'utf8');
      for (const match of source.matchAll(/\bt\('([^']+)'/g))
        if (!hu[match[1]]) missing.add(match[1]);
    }
    expect([...missing]).toEqual([]);
  });
});
