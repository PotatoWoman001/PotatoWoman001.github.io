import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const production = await readFile('deploy/production/jotoglobal-mall.nginx.conf', 'utf8');
const local = await readFile('deploy/local/nginx.conf', 'utf8');

assert.match(production, /location = \/api\/contact/);
assert.match(production, /proxy_pass http:\/\/127\.0\.0\.1:3004\/api\/contact/);
assert.match(production, /proxy_set_header X-Forwarded-Host \$host/);
assert.match(production, /proxy_set_header X-Request-Id \$request_id/);
assert.match(production, /limit_req zone=jotoglobal_contact/);
assert.match(local, /proxy_pass http:\/\/host\.docker\.internal:3004\/api\/contact/);
assert.match(local, /proxy_set_header X-Forwarded-Host \$host/);
assert.match(production, /location = \/api\/jotoglobal\/analytics/);
assert.match(production, /proxy_pass http:\/\/127\.0\.0\.1:3004\/api\/jotoglobal\/analytics/);
assert.match(production, /limit_req zone=jotoglobal_analytics/);
assert.match(local, /proxy_pass http:\/\/host\.docker\.internal:3004\/api\/jotoglobal\/analytics/);

console.log('Verified JOTO Global admin integration routes.');
