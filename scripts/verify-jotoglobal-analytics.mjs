import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';

const source = await readFile('assets/jotoglobal-analytics.js', 'utf8');
const moduleUrl = `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
const { buildAnalyticsEvent } = await import(moduleUrl);

const stored = new Map();
const event = buildAnalyticsEvent(
  { pathname: '/zh/blog', search: '?utm_source=google' },
  { referrer: 'https://google.com/search?q=joto', documentElement: { lang: 'zh-CN' } },
  { userAgent: 'fixture', maxTouchPoints: 0 },
  { getItem: (key) => stored.get(key) || null, setItem: (key, value) => stored.set(key, value) },
  { randomUUID: () => '00000000-0000-4000-8000-000000000001' },
);
assert.equal(event.path, '/zh/blog');
assert.equal(event.locale, 'zh-CN');
assert.equal(event.referrerHost, 'google.com');
assert.equal(event.utm.source, 'google');
assert.equal('userAgent' in event, false);
assert.equal('ip' in event, false);

const htmlFiles = execFileSync('git', ['ls-files', '*index.html', '404.html'], { encoding: 'utf8' })
  .trim().split('\n').filter(Boolean);
assert.ok(htmlFiles.length > 100);
for (const file of htmlFiles) {
  const html = await readFile(file, 'utf8');
  assert.match(html, /\/assets\/jotoglobal-analytics\.js\?v=20260804-1/, file);
}

console.log(`Verified privacy-safe analytics across ${htmlFiles.length} routes.`);
