import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  addCaptchaToPayload,
  captchaLocale,
  isCaptchaErrorMessage,
  svgToDataUrl,
} from "../assets/jotoglobal-contact-captcha.js";
import { CAPTCHA_SCRIPT, collectPages } from "./integrate-contact-captcha.mjs";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

assert.equal(captchaLocale("/"), "en");
assert.equal(captchaLocale("/contact/"), "en");
assert.equal(captchaLocale("/zh/contact/"), "zh");
assert.equal(captchaLocale("/zh-hk/solutions/network"), "zh-hk");
assert.equal(captchaLocale("/fa/"), "fa");

assert.deepEqual(
  addCaptchaToPayload({ company: "A" }, { captchaId: "id-1", captchaText: " Ab3d " }),
  { company: "A", captchaId: "id-1", captchaText: "Ab3d" },
);
assert.deepEqual(addCaptchaToPayload({ company: "A" }, null), { company: "A" });

assert.ok(isCaptchaErrorMessage("验证码错误"));
assert.ok(isCaptchaErrorMessage("Invalid captcha"));
assert.ok(!isCaptchaErrorMessage("请填写公司或机构名称"));

assert.equal(svgToDataUrl("data:image/svg+xml;base64,AAA"), "data:image/svg+xml;base64,AAA");
assert.match(svgToDataUrl("<svg/>"), /^data:image\/svg\+xml;base64,/);

let pagesWithBundle = 0;
for (const page of await collectPages()) {
  const html = await readFile(path.join(projectRoot, page), "utf8");
  if (!html.includes("/assets/index-covers-fe2c6a4b8409.js")) continue;
  pagesWithBundle += 1;
  assert.ok(html.includes(CAPTCHA_SCRIPT), `${page} is missing the contact captcha script`);
}
assert.ok(pagesWithBundle >= 100, `expected the captcha on all site pages, found ${pagesWithBundle}`);

console.log(`Verified contact captcha helpers and script on ${pagesWithBundle} pages.`);
