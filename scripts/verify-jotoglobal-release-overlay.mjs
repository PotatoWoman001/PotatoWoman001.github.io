import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const workflow = await readFile('.github/workflows/publish-jotoglobal.yml', 'utf8');
const renderAt = workflow.indexOf('node scripts/render-jotoglobal-articles.mjs');
const siteRulesAt = workflow.indexOf('node scripts/verify-site-rules.mjs', renderAt);
const switchAt = workflow.indexOf('mv -Tf "$next_link" "$current"', renderAt);

assert.ok(renderAt >= 0, 'release workflow must render the independent article library');
assert.ok(siteRulesAt > renderAt, 'release must validate after rendering articles');
assert.ok(switchAt > siteRulesAt, 'release must switch only after article validation');
assert.match(workflow, /--articles \/var\/www\/audit\/backend\/data\/sites\/jotoglobal\/articles\.json/);
console.log('Verified JOTO Global article overlay ordering.');
