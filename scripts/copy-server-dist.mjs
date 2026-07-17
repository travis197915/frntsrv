import { copyFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const distDir = join(root, 'dist');
const serverDir = join(root, 'server');

if (!existsSync(distDir)) {
  console.error('dist/ does not exist — run vite build first.');
  process.exit(1);
}

mkdirSync(distDir, { recursive: true });

const copies = [
  [join(serverDir, 'spa-server.mjs'), join(distDir, 'server-dist.mjs')],
  [join(serverDir, 'runtime-config.mjs'), join(distDir, 'runtime-config.mjs')],
];

for (const [source, target] of copies) {
  if (!existsSync(source)) {
    console.error(`Missing ${source}`);
    process.exit(1);
  }
  copyFileSync(source, target);
  console.log(`Created ${target}`);
}
