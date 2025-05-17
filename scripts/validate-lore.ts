#!/usr/bin/env ts-node

/**
 * Validate all First-Flame JSON lore files at build-time.
 *
 * Usage:  pnpm run validate:lore
 */

import { promises as fs } from 'fs';
import path from 'path';
import { zRitualDayContent } from '../src/lib/core/FirstFlame.zod';   // adjust if you placed it elsewhere

const LORE_DIR = path.resolve(process.cwd(), 'public/data/first-flame');

(async () => {
  const files = await fs.readdir(LORE_DIR);
  const jsonFiles = files.filter(f => /^day-\d+\.json$/.test(f));

  let hasError = false;

  for (const file of jsonFiles) {
    const fullPath = path.join(LORE_DIR, file);
    const raw = await fs.readFile(fullPath, 'utf8');

    try {
      const parsed = JSON.parse(raw);
      zRitualDayContent.parse(parsed);          // will throw if invalid
      // Optional: console.log(`✓ ${file} OK`);
    } catch (err) {
      hasError = true;
      console.error(`\n✗ ${file} failed validation\n`, err);
    }
  }

  if (hasError) {
    console.error('\nAborting build: lore validation failed.\n');
    process.exit(1);
  } else {
  console.log('All lore files valid \u2714');
  }
})();
