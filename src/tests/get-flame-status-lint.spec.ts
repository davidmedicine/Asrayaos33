import fs from 'fs';
import path from 'path';
import { describe, it } from 'vitest';

const SRC_DIR = path.resolve(__dirname, '..');

function walk(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries.flatMap(entry => {
    const res = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'tests') return [];
      return walk(res);
    }
    if (res.endsWith('.ts') || res.endsWith('.tsx')) return [res];
    return [];
  });
}

describe('get-flame-status call lint', () => {
  it('ensures quest_id, user_id and day_number are present', () => {
    const files = walk(SRC_DIR);
    const violations: string[] = [];
    const search = "functions.invoke('get-flame-status'";

    for (const file of files) {
      const content = fs.readFileSync(file, 'utf8');
      let idx = content.indexOf(search);
      while (idx !== -1) {
        const end = content.indexOf(')', idx);
        const snippet = end !== -1 ? content.slice(idx, end + 1) : content.slice(idx);
        if (!snippet.includes('quest_id') || !snippet.includes('user_id') || !snippet.includes('day_number')) {
          violations.push(`${file}: ${snippet.replace(/\s+/g, ' ').trim()}`);
        }
        idx = content.indexOf(search, idx + search.length);
      }
    }

    if (violations.length) {
      console.error('Invalid get-flame-status invocation found:\n' + violations.join('\n'));
      throw new Error(`Found ${violations.length} invalid invocation(s).`);
    }
  });
});
