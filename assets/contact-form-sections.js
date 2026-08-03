import { loadProduct } from "./mall-data-client.js?v=20260803-3";

const CONTACT_ENDPOINT = "/api/contact";

const COPY = {
  en: {
    homeContact: "Contact us",
    eyebrow: "Start a conversation",
    title: "Tell us what you need. We’ll help find the right solution.",
    description:
      "Share your locations, priorities and timeline. JOTO will help shape a practical next step.",
    formTitle: "Send us your requirements",
    requiredHint: "Fields marked with * are required.",
    name: "Name",
    namePlaceholder: "Your name",
    company: "Company",
    companyPlaceholder: "Company or organization",
    email: "Work email",
    phone: "Phone / WeChat (optional)",
    phonePlaceholder: "Phone number or WeChat ID",
    message: "What would you like to solve?",
    messagePlaceholder:
      "Tell us about your environment, goals, timeline or current pain points",
    submit: "Send project brief",
    sending: "Sending…",
    success:
      "Thank you. Your project brief has been sent, and our team will reply within one business day.",
    error: "We could not send your enquiry. Please try again or email",
    productInquiryPrefix: "Product inquiry:",
  },
  "zh-CN": {
    homeContact: "联系我们",
    eyebrow: "开始沟通",
    title: "说说您的需求，我们一起找到解决方案。",
    description: "分享地点、重点与时间计划，JOTO 将协助梳理切实可行的下一步。",
    formTitle: "发送您的项目需求",
    requiredHint: "标有 * 的字段为必填项。",
    name: "姓名",
    namePlaceholder: "您的姓名",
    company: "公司",
    companyPlaceholder: "公司或组织名称",
    email: "工作邮箱",
    phone: "电话 / 微信（选填）",
    phonePlaceholder: "电话号码或微信号",
    message: "您希望解决什么问题？",
    messagePlaceholder: "请介绍当前环境、目标、时间计划或遇到的问题",
    submit: "提交项目需求",
    sending: "正在发送…",
    success: "感谢您的咨询。JOTO 团队将在一个工作日内回复。",
    error: "暂时无法发送，请稍后重试或发送邮件至",
    productInquiryPrefix: "产品咨询：",
  },
  "fa-IR": {
    homeContact: "تماس با ما",
    eyebrow: "شروع گفتگو",
    title: "نیازهای خود را با ما در میان بگذارید؛ با هم راه‌حل مناسب را پیدا می‌کنیم.",
    description:
      "مکان‌ها، اولویت‌ها و زمان‌بندی خود را به اشتراک بگذارید تا JOTO گام بعدی عملی را مشخص کند.",
    formTitle: "نیازمندی‌های پروژه خود را ارسال کنید",
    requiredHint: "فیلدهای دارای * الزامی هستند.",
    name: "نام",
    namePlaceholder: "نام شما",
    company: "شرکت",
    companyPlaceholder: "نام شرکت یا سازمان",
    email: "ایمیل کاری",
    phone: "تلفن / وی‌چت (اختیاری)",
    phonePlaceholder: "شماره تلفن یا شناسه وی‌چت",
    message: "چه مسئله‌ای را می‌خواهید حل کنید؟",
    messagePlaceholder: "محیط، اهداف، زمان‌بندی یا چالش فعلی خود را توضیح دهید",
    submit: "ارسال درخواست پروژه",
    sending: "در حال ارسال…",
    success: "سپاسگزاریم. درخواست شما ارسال شد و تیم ما ظرف یک روز کاری پاسخ می‌دهد.",
    error: "ارسال درخواست ممکن نشد. دوباره تلاش کنید یا ایمیل بزنید به",
    productInquiryPrefix: "درخواست محصول:",
  },
};

const LOCALE_PREFIXES = {
  en: "",
  "zh-CN": "/zh",
  "fa-IR": "/fa",
};

function getRouteContext(pathname) {
  const parts = pathname.replace(/\/index\.html$/, "").split("/").filter(Boolean);
  const locale = parts[0] === "zh" ? "zh-CN" : parts[0] === "fa" ? "fa-IR" : "en";
  const routeParts = locale === "en" ? parts : parts.slice(1);
  return { locale, routeParts };
}

export function parseProductInquirySlug(searchParams) {
  const params =
    searchParams instanceof URLSearchParams
      ? searchParams
      : new URLSearchParams(searchParams);
  const values = params.getAll("product");
  if (values.length !== 1 || !/^[a-z0-9-]{1,500}$/.test(values[0])) return "";
  return values[0];
}

export function formatProductInquiry(locale, product) {
  const title = String(product?.title || "").trim();
  const model = String(product?.model || "").trim();
  if (!title) return "";
  if (locale === "zh-CN") {
    return `${COPY[locale].productInquiryPrefix}${title}${model ? `（${model}）` : ""}`;
  }
  return `${COPY[locale].productInquiryPrefix} ${title}${model ? ` (${model})` : ""}`;
}

function waitForElement(getElement, callback) {
  const existing = getElement();
  if (existing) {
    callback(existing);
    return;
  }

  const observer = new MutationObserver(() => {
    const element = getElement();
    if (!element) return;
    observer.disconnect();
    callback(element);
  });

  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.setTimeout(() => observer.disconnect(), 10000);
}

function setControlledTextareaValue(field, value) {
  const setter = Object.getOwnPropertyDescriptor(
    HTMLTextAreaElement.prototype,
    "value",
  )?.set;
  if (setter) setter.call(field, value);
  else field.value = value;
  field.dataset.productPrefilled = "true";
  field.dispatchEvent(new Event("input", { bubbles: true }));
}

async function prefillProductInquiry(field, locale) {
  if (field.value || field.dataset.productPrefilled === "true") return;
  const slug = parseProductInquirySlug(window.location.search);
  if (!slug) return;
  try {
    const product = await loadProduct(slug);
    const value = formatProductInquiry(locale, product);
    if (!value || field.value) return;
    setControlledTextareaValue(field, value);
  } catch {
    // Contact remains fully usable when catalog data is unavailable.
  }
}

function enhanceHomepageActions(primaryCta, locale) {
  if (document.querySelector("[data-home-hero-actions]")) return;

  const actions = document.createElement("div");
  actions.dataset.homeHeroActions = "";
  primaryCta.insertAdjacentElement("beforebegin", actions);
  actions.append(primaryCta);

  const contactLink = document.createElement("a");
  const arrow = primaryCta.querySelector("svg")?.cloneNode(true);

  contactLink.href = `${LOCALE_PREFIXES[locale]}/contact`;
  contactLink.className = primaryCta.className;
  contactLink.dataset.heroCta = "";
  contactLink.dataset.homeHeroContactCta = "";
  contactLink.setAttribute("aria-label", COPY[locale].homeContact);
  contactLink.append(document.createTextNode(COPY[locale].homeContact));

  if (arrow) {
    arrow.setAttribute("aria-hidden", "true");
    contactLink.append(arrow);
  }

  actions.append(contactLink);

  const equalizeActionWidths = () => {
    const actionLinks = Array.from(actions.querySelectorAll(":scope > a"));
    actions.style.removeProperty("--joto-home-hero-action-width");
    const sharedWidth = Math.ceil(
      Math.max(...actionLinks.map((link) => link.getBoundingClientRect().width)),
    );
    if (sharedWidth > 0) {
      actions.style.setProperty(
        "--joto-home-hero-action-width",
        `${sharedWidth}px`,
      );
    }
  };

  window.requestAnimationFrame(equalizeActionWidths);
  document.fonts?.ready.then(equalizeActionWidths);
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function fieldMarkup({
  id,
  label,
  name,
  type = "text",
  placeholder,
  required = false,
  full = false,
  maxLength,
}) {
  const fieldClass = full
    ? "joto-solution-contact__field joto-solution-contact__field--full"
    : "joto-solution-contact__field";
  const requiredMark = required ? ' <span aria-hidden="true">*</span>' : "";
  const requiredAttribute = required ? " required" : "";
  const maxLengthAttribute = maxLength ? ` maxlength="${maxLength}"` : "";

  if (type === "textarea") {
    return `
      <div class="${fieldClass}">
        <label for="${id}">${escapeHtml(label)}${requiredMark}</label>
        <textarea id="${id}" name="${name}" placeholder="${escapeHtml(placeholder)}"${requiredAttribute}${maxLengthAttribute}></textarea>
      </div>
    `;
  }

  return `
    <div class="${fieldClass}">
      <label for="${id}">${escapeHtml(label)}${requiredMark}</label>
      <input id="${id}" name="${name}" type="${type}" placeholder="${escapeHtml(placeholder)}"${requiredAttribute}${maxLengthAttribute}>
    </div>
  `;
}

function contactFormMarkup(locale, idPrefix, formKind) {
  const copy = COPY[locale];
  const formDataAttribute =
    formKind === "home"
      ? "data-home-contact-form"
      : "data-solution-contact-form";

  return `
    <form class="joto-solution-contact__form" ${formDataAttribute}>
      <div class="joto-solution-contact__form-header">
        <h3>${escapeHtml(copy.formTitle)}</h3>
        <p>${escapeHtml(copy.requiredHint)}</p>
      </div>
      <div class="joto-solution-contact__fields">
        ${fieldMarkup({ id: `${idPrefix}-name`, label: copy.name, name: "name", placeholder: copy.namePlaceholder, required: true, maxLength: 100 })}
        ${fieldMarkup({ id: `${idPrefix}-company`, label: copy.company, name: "company", placeholder: copy.companyPlaceholder, required: true, maxLength: 160 })}
        ${fieldMarkup({ id: `${idPrefix}-email`, label: copy.email, name: "email", type: "email", placeholder: "name@company.com", required: true, maxLength: 254 })}
        ${fieldMarkup({ id: `${idPrefix}-phone`, label: copy.phone, name: "phoneOrWechat", placeholder: copy.phonePlaceholder, maxLength: 100 })}
        ${fieldMarkup({ id: `${idPrefix}-message`, label: copy.message, name: "message", type: "textarea", placeholder: copy.messagePlaceholder, required: true, full: true, maxLength: 5000 })}
      </div>
      <div class="joto-solution-contact__honeypot" aria-hidden="true">
        <label for="${idPrefix}-website">Website</label>
        <input id="${idPrefix}-website" name="website" type="text" autocomplete="off" tabindex="-1">
      </div>
      <div class="joto-solution-contact__actions">
        <button class="joto-solution-contact__submit" data-solution-contact-submit type="submit">
          <span data-solution-contact-submit-label>${escapeHtml(copy.submit)}</span>
          <span class="joto-solution-contact__submit-icon" aria-hidden="true">↗</span>
        </button>
      </div>
      <p class="joto-solution-contact__status" data-solution-contact-status aria-live="polite"></p>
    </form>
  `;
}

function bindContactForm(form, copy) {
  const status = form.querySelector("[data-solution-contact-status]");
  const submitButton = form.querySelector("[data-solution-contact-submit]");
  const submitLabel = form.querySelector(
    "[data-solution-contact-submit-label]",
  );

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;

    const values = Object.fromEntries(new FormData(form).entries());
    const payload = {
      name: values.name ?? "",
      company: values.company ?? "",
      email: values.email ?? "",
      phoneOrWechat: values.phoneOrWechat ?? "",
      message: values.message ?? "",
      website: values.website ?? "",
    };

    submitButton.disabled = true;
    submitLabel.textContent = copy.sending;
    status.textContent = "";

    try {
      const response = await fetch(CONTACT_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error("Contact request failed");

      form.reset();
      submitButton.disabled = false;
      submitLabel.textContent = copy.submit;
      status.textContent = copy.success;
    } catch {
      submitButton.disabled = false;
      submitLabel.textContent = copy.submit;
      status.textContent = `${copy.error} `;

      const emailLink = document.createElement("a");
      emailLink.href = "mailto:sales@jototech.cn";
      emailLink.textContent = "sales@jototech.cn";
      status.append(emailLink, ".");
    }
  });
}

export function createContactForm(locale, idPrefix, formKind) {
  const wrapper = document.createElement("div");
  wrapper.innerHTML = contactFormMarkup(locale, idPrefix, formKind);
  const form = wrapper.firstElementChild;
  bindContactForm(form, COPY[locale]);
  return form;
}

function renderSolutionContactForm(section, locale, routeParts) {
  if (section.dataset.solutionContactSection === "true") return;

  const copy = COPY[locale];
  const idPrefix = `solution-contact-${locale.toLowerCase()}-${routeParts.slice(1).join("-")}`;

  section.id = "contact";
  section.dataset.solutionContactSection = "true";
  section.innerHTML = `
    <div class="joto-solution-contact">
      <div class="joto-solution-contact__grid">
        <div>
          <p class="joto-solution-contact__eyebrow">${escapeHtml(copy.eyebrow)}</p>
          <h2 class="joto-solution-contact__title">${escapeHtml(copy.title)}</h2>
          <p class="joto-solution-contact__description">${escapeHtml(copy.description)}</p>
        </div>
        <div data-solution-contact-form-slot></div>
      </div>
    </div>
  `;

  const formSlot = section.querySelector("[data-solution-contact-form-slot]");
  formSlot.replaceWith(createContactForm(locale, idPrefix, "solution"));

  if (window.location.hash === "#contact") {
    window.setTimeout(() => section.scrollIntoView({ block: "start" }), 100);
  }
}

function renderHomepageContactForm(section, locale) {
  if (section.querySelector("[data-home-contact-form]")) return;

  const container = section.firstElementChild;
  const intro = container?.firstElementChild;
  const links = intro?.nextElementSibling;
  const eyebrow = intro?.firstElementChild;
  const headingCopy = eyebrow?.nextElementSibling;

  if (!container || !intro || !links || !eyebrow || !headingCopy) return;

  const copyPanel = document.createElement("div");
  copyPanel.className = "joto-home-contact__copy";
  copyPanel.append(eyebrow, ...Array.from(headingCopy.children));

  const formPanel = document.createElement("div");
  formPanel.className = "joto-home-contact__form-panel";
  formPanel.append(
    createContactForm(
      locale,
      `home-contact-${locale.toLowerCase()}`,
      "home",
    ),
  );

  intro.replaceChildren(copyPanel, formPanel);
  intro.dataset.homeContactLayout = "";
  links.dataset.homeContactLinks = "";

  if (window.location.hash === "#contact") {
    window.setTimeout(() => section.scrollIntoView({ block: "start" }), 100);
  }
}

function findSolutionContactSection(routeParts) {
  if (routeParts[0] !== "solutions") return null;

  if (routeParts.length === 2) {
    return document.querySelector(
      "main[data-solution-category-page] > section.bg-joto-green",
    );
  }

  if (routeParts.length === 3) {
    return document.querySelector("main > section#contact");
  }

  return null;
}

if (typeof window !== "undefined") {
  const { locale, routeParts } = getRouteContext(window.location.pathname);

  if (routeParts.length === 0) {
    waitForElement(
      () => document.querySelector("[aria-labelledby=\"hero-title\"] [data-hero-cta-mobile]"),
      (primaryCta) => enhanceHomepageActions(primaryCta, locale),
    );
    waitForElement(
      () => document.querySelector("main > section#contact"),
      (section) => renderHomepageContactForm(section, locale),
    );
  }

  if (routeParts[0] === "solutions" && [2, 3].includes(routeParts.length)) {
    waitForElement(
      () => findSolutionContactSection(routeParts),
      (section) => renderSolutionContactForm(section, locale, routeParts),
    );
  }

  if (routeParts[0] === "contact" && routeParts.length === 1) {
    waitForElement(
      () => document.querySelector("#contact-message"),
      (field) => prefillProductInquiry(field, locale),
    );
  }
}
