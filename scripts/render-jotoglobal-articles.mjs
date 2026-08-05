import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { renderArticleRelease } from './jotoglobal-article-renderer.mjs';

const args = process.argv.slice(2); const value = flag => { const index = args.indexOf(flag); return index >= 0 ? args[index + 1] : null; };
const articlesPath = value('--articles'); const siteRoot = value('--site-root'); const includePublishingId = value('--include-publishing');
if (!articlesPath || !siteRoot) throw new Error('Usage: --articles <file> --site-root <dir> [--include-publishing <id>]');
const articles = JSON.parse(await readFile(resolve(articlesPath), 'utf8'));
const result = await renderArticleRelease({ articles, siteRoot: resolve(siteRoot), generatedAt: new Date().toISOString(), includePublishingId });
console.log(JSON.stringify(result));
