import { execFileSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';

const TAG = '<script type="module" src="/assets/jotoglobal-analytics.js?v=20260805-1"></script>';
const files = execFileSync('git', ['ls-files', '*index.html', '404.html'], { encoding: 'utf8' })
  .trim().split('\n').filter(Boolean);
let changed = 0;

for (const file of files) {
  const original = await readFile(file, 'utf8');
  const currentTags = original.match(/<script[^>]+src=["']\/assets\/jotoglobal-analytics\.js(?:\?[^"']*)?["'][^>]*><\/script>/g) || [];
  if (currentTags.length === 1 && currentTags[0] === TAG) continue;
  const withoutOld = original.replace(/\s*<script[^>]+src=["']\/assets\/jotoglobal-analytics\.js(?:\?[^"']*)?["'][^>]*><\/script>/g, '');
  if (!/<\/body>/i.test(withoutOld)) throw new Error(`${file}: missing </body>`);
  const next = withoutOld.replace(/<\/body>/i, `  ${TAG}\n</body>`);
  if (next === original) continue;
  await writeFile(file, next);
  changed += 1;
}

console.log(`${changed} files changed`);
