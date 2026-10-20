import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
const files = ['/'];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p);
    else if (!['_headers', 'offline-manifest.json'].includes(entry.name))
      files.push('/' + path.relative('dist', p).split(path.sep).join('/'));
  }
}
walk('dist');
const hash = createHash('sha256');
for (const file of files.filter((f) => f !== '/'))
  hash.update(fs.readFileSync(path.join('dist', file.slice(1))));
const build = hash.digest('hex').slice(0, 12);
const worker = fs
  .readFileSync('dist/sw.js', 'utf8')
  .replace(
    /const CACHE\s*=\s*['"]arnav-space-simulation-v2['"];?/,
    `const CACHE='arnav-space-simulation-${build}';`,
  );
fs.writeFileSync('dist/sw.js', worker);
fs.writeFileSync('dist/offline-manifest.json', JSON.stringify({ version: '0.2.0', build, files }));
console.log(`Offline pack manifest: ${files.length} assets.`);
