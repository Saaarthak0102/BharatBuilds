import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Repo root is two levels up from apps/web/scripts
const repoRoot = path.resolve(__dirname, '../../..');
const seedDir = path.resolve(repoRoot, 'data/seed');
const targetDir = path.resolve(__dirname, '../lib/data');

if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

const files = [
  'villages.json',
  'wards.json',
  'machines.json',
  'straw_outlets.json',
  'sample_reports.json',
  'sample_map.json',
];

for (const file of files) {
  const src = path.join(seedDir, file);
  const dest = path.join(targetDir, file);
  if (!fs.existsSync(src)) {
    console.error(`Source file not found: ${src}`);
    process.exit(1);
  }
  fs.copyFileSync(src, dest);
  console.log(`Synced ${file} -> lib/data/${file}`);
}
console.log('Reference data sync complete.');
