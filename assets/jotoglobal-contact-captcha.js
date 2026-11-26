// Image verification code for every JOTO Global enquiry form.
//
// The code image is issued by the shared admin backend (same server as
// jotoglobal.com/api/contact). Every POST to /api/contact carries
// captchaId + captchaText so the backend can reject robot submissions.

export const CAPTCHA_ENDPOINT = "https://admin.jotoai.com/api/captcha";
const CONTACT_PATH = "/api/contact";
const ENHANCED = "jotoCaptcha";

const COPY = Object.freeze({
  en: {
    label: "Verification code",
    placeholder: "Enter the characters shown",
    refresh: "Refresh verification code",
    image: "Verification code",
    loading: "Loading…",
    required: "Please enter the verification code.",
    loadFailed: "The verification code could not be loaded. Tap the image to try again.",
    wrong: "The verification code is incorrect or expired. Please enter the new code.",
  },
  zh: {
    label: "验证码",
    placeholder: "请输入图中字符",
    refresh: "刷新验证码",
    image: "验证码",
    loading: "加载中…",
    required: "请输入验证码。",
    loadFailed: "验证码加载失败，请点击图片重试。",
    wrong: "验证码错误或已过期，请输入新的验证码。",
  },
  "zh-hk": {
    label: "驗證碼",
    placeholder: "請輸入圖中字符",
    refresh: "重新整理驗證碼",
    image: "驗證碼",
    loading: "載入中…",
    required: "請輸入驗證碼。",
    loadFailed: "驗證碼載入失敗，請點擊圖片重試。",
    wrong: "驗證碼錯誤或已過期，請輸入新的驗證碼。",
  },
  fa: {
    label: "کد تأیید",
    placeholder: "نویسه‌های تصویر را وارد کنید",
    refresh: "بارگذاری دوباره کد تأیید",
    image: "کد تأیید",
    loading: "در حال بارگذاری…",
    required: "لطفاً کد تأیید را وارد کنید.",
    loadFailed: "بارگذاری کد تأیید ناموفق بود. برای تلاش دوباره روی تصویر بزنید.",
    wrong: "کد تأیید نادرست است یا منقضی شده است. لطفاً کد جدید را وارد کنید.",
  },
});

export function captchaLocale(pathname) {
  const first = String(pathname || "/").split("/").filter(Boolean)[0];
  if (first === "zh-hk") return "zh-hk";
  if (first === "zh") return "zh";
  if (first === "fa") return "fa";
  return "en";
}

export function isCaptchaErrorMessage(message) {
  return /验证码|驗證碼|captcha|verification/i.test(String(message || ""));
}

export function addCaptchaToPayload(payload, captcha) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return payload;
  if (!captcha) return payload;
  return {
    ...payload,
    captchaId: captcha.captchaId || "",
    captchaText: String(captcha.captchaText || "").trim(),
  };
}

export function svgToDataUrl(svg) {
  // The backend already returns a data: URL; raw SVG markup is encoded here.
  if (/^data:image\//.test(String(svg || ""))) return String(svg);
  const bytes = new TextEncoder().encode(String(svg || ""));
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return `data:image/svg+xml;base64,${btoa(binary)}`;
}

const STYLE_ID = "joto-captcha-style";
const STYLE = `
.joto-captcha__row{display:flex;gap:12px;align-items:stretch}
.joto-captcha__row>input{flex:1 1 auto;min-width:0;margin-top:0!important}
.joto-captcha__image{flex:0 0 auto;display:inline-flex;align-items:center;gap:8px;padding:0 10px;border:1px solid rgba(255,255,255,.18);background:#fff;border-radius:0;cursor:pointer;min-height:44px;color:#0a100d}
.joto-captcha__image img{display:block;width:120px;height:40px}
.joto-captcha__image svg{width:16px;height:16px;flex:0 0 auto}
.joto-captcha__image[aria-busy=true]{opacity:.6;cursor:wait}
.joto-captcha__control{margin-top:8px}
.joto-captcha__message{margin-top:8px;font-size:12px;line-height:18px;color:#ff8f8f;min-height:0}
.joto-captcha__message:empty{display:none}
`;

const REFRESH_ICON =
  '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M20 11a8 8 0 1 0-2.34 5.66M20 4v7h-7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

const states = new WeakMap();
let lastSubmittedForm = null;

function ensureStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = STYLE;
  document.head.append(style);
}

function isEnquiryForm(form) {
  return (
    form instanceof HTMLFormElement &&
    !form.dataset[ENHANCED] &&
    form.querySelector('input[type="email"]') &&
    form.querySelector("textarea")
  );
}

async function loadCaptcha(state) {
  const { copy, image, imageButton, input, message } = state;
  imageButton.setAttribute("aria-busy", "true");
  state.captchaId = "";
  input.value = "";
  try {
    const response = await fetch(CAPTCHA_ENDPOINT, { cache: "no-store", credentials: "omit" });
    if (!response.ok) throw new Error("captcha");
    const data = await response.json();
    const captchaId = data.captchaId || data.id;
    if (!captchaId || !data.svg) throw new Error("captcha");
    state.captchaId = captchaId;
    image.src = svgToDataUrl(data.svg);
    image.alt = copy.image;
  } catch {
    image.removeAttribute("src");
    image.alt = copy.loadFailed;
    message.textContent = copy.loadFailed;
  } finally {
    imageButton.removeAttribute("aria-busy");
  }
}

function enhanceForm(form) {
  if (!isEnquiryForm(form)) return;
  const email = form.querySelector('input[type="email"]');
  const textarea = form.querySelector("textarea");
  const messageField = textarea.parentElement;
  const fieldGrid = messageField?.parentElement;
  if (!messageField || !fieldGrid || !form.contains(fieldGrid)) return;

  form.dataset[ENHANCED] = "true";
  ensureStyle();

  const copy = COPY[captchaLocale(window.location.pathname)];
  const uid = `${form.querySelector("[id]")?.id || "form"}-captcha-${Math.random().toString(36).slice(2, 8)}`;
  const referenceLabel = form.querySelector(`label[for="${textarea.id}"]`) || messageField.querySelector("label");

  const field = document.createElement("div");
  field.className = `${messageField.className} joto-captcha`;

  const label = document.createElement("label");
  label.htmlFor = uid;
  if (referenceLabel?.className) label.className = referenceLabel.className;
  label.append(copy.label, " ");
  const star = document.createElement("span");
  star.setAttribute("aria-hidden", "true");
  star.textContent = "*";
  const referenceStar = referenceLabel?.querySelector("span");
  if (referenceStar?.className) star.className = referenceStar.className;
  label.append(star);

  const row = document.createElement("div");
  row.className = "joto-captcha__row joto-captcha__control";

  const input = document.createElement("input");
  input.id = uid;
  input.name = "captchaText";
  input.type = "text";
  input.required = true;
  input.autocomplete = "off";
  input.autocapitalize = "off";
  input.spellcheck = false;
  input.maxLength = 12;
  input.placeholder = copy.placeholder;
  input.setAttribute("aria-describedby", `${uid}-message`);
  if (email.className) input.className = email.className;

  const imageButton = document.createElement("button");
  imageButton.type = "button";
  imageButton.className = "joto-captcha__image";
  imageButton.setAttribute("aria-label", copy.refresh);
  imageButton.title = copy.refresh;
  const image = document.createElement("img");
  image.alt = copy.loading;
  image.width = 120;
  image.height = 40;
  imageButton.append(image);
  imageButton.insertAdjacentHTML("beforeend", REFRESH_ICON);

  const message = document.createElement("p");
  message.id = `${uid}-message`;
  message.className = "joto-captcha__message";
  message.setAttribute("aria-live", "polite");

  row.append(input, imageButton);
  field.append(label, row, message);
  fieldGrid.append(field);

  const state = { form, copy, input, image, imageButton, message, captchaId: "" };
  states.set(form, state);

  imageButton.addEventListener("click", () => {
    message.textContent = "";
    loadCaptcha(state);
  });
  input.addEventListener("input", () => {
    message.textContent = "";
    input.removeAttribute("aria-invalid");
  });

  loadCaptcha(state);
}

function scan(root = document) {
  if (root instanceof HTMLFormElement) enhanceForm(root);
  root.querySelectorAll?.("form").forEach(enhanceForm);
}

// Runs in the capture phase on document, i.e. before React's root listener
// and before the form's own submit handler.
function guardSubmit(event) {
  const form = event.target;
  const state = form instanceof HTMLFormElement ? states.get(form) : null;
  if (!state) return;
  lastSubmittedForm = form;
  const value = state.input.value.trim();
  if (value && state.captchaId) return;

  event.preventDefault();
  event.stopImmediatePropagation();
  if (!state.captchaId) {
    state.message.textContent = state.copy.loadFailed;
    loadCaptcha(state);
  } else {
    state.message.textContent = state.copy.required;
  }
  state.input.setAttribute("aria-invalid", "true");
  state.input.focus();
}

function currentCaptcha() {
  const state = lastSubmittedForm ? states.get(lastSubmittedForm) : null;
  if (!state) return null;
  return { state, captchaId: state.captchaId, captchaText: state.input.value };
}

function installFetchWrapper() {
  const previousFetch = window.fetch.bind(window);
  window.fetch = (input, init) => {
    let isContactPost = false;
    try {
      const requestUrl =
        typeof input === "string" || input instanceof URL ? String(input) : input?.url || "";
      const method = String(init?.method || input?.method || "GET").toUpperCase();
      const url = new URL(requestUrl, window.location.origin);
      isContactPost =
        method === "POST" &&
        url.origin === window.location.origin &&
        url.pathname === CONTACT_PATH &&
        typeof init?.body === "string";
    } catch {
      isContactPost = false;
    }
    if (!isContactPost) return previousFetch(input, init);

    const captcha = currentCaptcha();
    let body = init.body;
    try {
      body = JSON.stringify(addCaptchaToPayload(JSON.parse(init.body), captcha));
    } catch {
      body = init.body;
    }

    const request = previousFetch(input, { ...init, body });
    if (!captcha) return request;

    return request.then(
      (response) => {
        const { state } = captcha;
        if (!response.ok) {
          response
            .clone()
            .json()
            .then((data) => {
              if (isCaptchaErrorMessage(data?.error)) {
                state.message.textContent = state.copy.wrong;
              }
            })
            .catch(() => {});
        }
        // A code is single-use: always fetch a fresh one after each attempt.
        loadCaptcha(state);
        return response;
      },
      (error) => {
        loadCaptcha(captcha.state);
        throw error;
      },
    );
  };
}

function initialize() {
  installFetchWrapper();
  document.addEventListener("submit", guardSubmit, true);
  scan();
  new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node instanceof Element) scan(node);
      }
    }
  }).observe(document.documentElement, { childList: true, subtree: true });
}

if (typeof window !== "undefined" && typeof document !== "undefined" && !window.__jotoCaptcha) {
  window.__jotoCaptcha = true;
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize, { once: true });
  } else {
    initialize();
  }
}
