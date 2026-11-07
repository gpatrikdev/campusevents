import { readdirSync, readFileSync } from 'node:fs';
import { sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { previewHu } from '../mocks/translations';
import { hu } from './hu';

describe('interface translations', () => {
  it('includes Hungarian for every literal interface translation key', () => {
    const root = fileURLToPath(new URL('../', import.meta.url));
    // Names use the platform separator (\ on Windows); the mocks/ check below expects /.
    const files = readdirSync(root, { recursive: true })
      .map((name) => String(name).split(sep).join('/'))
      .filter((name) => /\.(ts|tsx)$/.test(name) && !name.endsWith('.test.ts'));
    const missing = new Set<string>();
    for (const name of files) {
      const source = readFileSync(`${root}/${name}`, 'utf8');
      for (const match of source.matchAll(/\bt\('([^']+)'/g))
        if (!hu[match[1]] && !(name.startsWith('mocks/') && previewHu[match[1]]))
          missing.add(match[1]);
    }
    expect([...missing]).toEqual([]);
  });
});
