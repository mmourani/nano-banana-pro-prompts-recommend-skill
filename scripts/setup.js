#!/usr/bin/env node
/**
 * setup.js - Downloads/updates Nano Banana Pro prompt library from GitHub
 *
 * Usage:
 *   node scripts/setup.js           # Download only if missing
 *   node scripts/setup.js --force   # Force re-download (get latest)
 *   node scripts/setup.js --check   # Check freshness, auto-update if stale (>24h)
 *
 * No credentials required — all data is publicly available on GitHub.
 * Source: https://github.com/YouMind-OpenLab/nano-banana-pro-prompts-recommend-skill
 */

import { existsSync, mkdirSync, statSync, writeFileSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const refsDir = join(__dirname, '..', 'references');
const stampFile = join(refsDir, '.last-updated');

const BASE_URL = 'https://raw.githubusercontent.com/YouMind-OpenLab/nano-banana-pro-prompts-recommend-skill/main/references';

const CATEGORIES = [
  'social-media-post', 'product-marketing', 'profile-avatar',
  'poster-flyer', 'infographic-edu-visual', 'ecommerce-main-image',
  'game-asset', 'comic-storyboard', 'youtube-thumbnail',
  'app-web-design', 'others',
];

const STALE_HOURS = 24; // auto-refresh if older than this

function isStale() {
  if (!existsSync(stampFile)) return true;
  const ts = parseInt(readFileSync(stampFile, 'utf8').trim(), 10);
  const ageHours = (Date.now() - ts) / 1000 / 3600;
  return ageHours > STALE_HOURS;
}

async function downloadFile(url, dest) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  writeFileSync(dest, await res.text(), 'utf8');
}

async function setup(force = false) {
  if (!existsSync(refsDir)) mkdirSync(refsDir, { recursive: true });

  const args = process.argv.slice(2);
  const checkMode = args.includes('--check');
  const forceMode = force || args.includes('--force');

  // --check mode: only run if stale
  if (checkMode && !isStale()) {
    console.log('[setup] References are fresh (< 24h). Skipping update.');
    return;
  }

  let downloaded = 0, skipped = 0, failed = 0;
  const mode = forceMode ? 'force-update' : 'install';
  console.log(`[setup] ${mode === 'force-update' ? 'Updating' : 'Downloading'} Nano Banana Pro prompt library from GitHub...`);

  for (const cat of CATEGORIES) {
    const dest = join(refsDir, `${cat}.json`);

    if (!forceMode && existsSync(dest) && statSync(dest).size > 100) {
      skipped++;
      continue;
    }

    const url = `${BASE_URL}/${cat}.json`;
    process.stdout.write(`  → ${cat}.json ... `);
    try {
      await downloadFile(url, dest);
      console.log('✓');
      downloaded++;
    } catch (err) {
      console.log(`✗ (${err.message})`);
      failed++;
    }
  }

  if (downloaded > 0 || failed === 0) {
    writeFileSync(stampFile, String(Date.now()), 'utf8');
  }

  if (downloaded > 0) {
    console.log(`[setup] Done! ${downloaded} file(s) ${forceMode ? 'updated' : 'downloaded'}. Skill is ready.`);
  } else if (skipped === CATEGORIES.length) {
    console.log('[setup] References already present. Use --force to update.');
  }
  if (failed > 0) {
    console.warn(`[setup] ${failed} file(s) failed. Run again to retry.`);
  }
}

setup().catch(err => {
  console.warn('[setup] Warning (non-fatal):', err.message);
  process.exit(0);
});
