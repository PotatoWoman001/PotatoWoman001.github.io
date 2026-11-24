import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const workflow = await readFile('.github/workflows/publish-jotoglobal.yml', 'utf8');
// Generated articles that are already live are carried over unchanged; the
// article library is rendered only when the current release has none.
const carryAt = workflow.indexOf('node scripts/carry-over-generated-articles.mjs');
const renderAt = workflow.indexOf('node scripts/render-jotoglobal-articles.mjs', carryAt);
const siteRulesAt = workflow.indexOf('node scripts/verify-site-rules.mjs', renderAt);
const switchAt = workflow.indexOf('mv -Tf "$next_link" "$current"', renderAt);

assert.ok(carryAt >= 0, 'release workflow must carry over the live generated articles');
assert.match(workflow, /--from "\$previous" --to "\$release_path"/);
assert.ok(renderAt > carryAt, 'release workflow must fall back to rendering the independent article library');
assert.match(workflow, /carry_status" -eq 3/);
assert.ok(siteRulesAt > renderAt, 'release must validate after the article overlay');
assert.ok(switchAt > siteRulesAt, 'release must switch only after article validation');
assert.match(workflow, /--articles \/var\/www\/audit\/backend\/data\/sites\/jotoglobal\/articles\.json/);
console.log('Verified JOTO Global article overlay ordering.');
