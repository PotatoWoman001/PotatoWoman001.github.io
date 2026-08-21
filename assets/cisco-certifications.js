const CERTIFICATE_ROOT = "/assets/cisco-certifications";

const CERTIFICATES = [
  [
    "cloud-ai-infrastructure-partner.png",
    "Cisco Cloud and AI Infrastructure Partner",
  ],
  [
    "preferred-collaboration-partner.png",
    "Cisco Preferred Collaboration Partner",
  ],
  ["preferred-networking-partner.png", "Cisco Preferred Networking Partner"],
  ["preferred-security-partner.png", "Cisco Preferred Security Partner"],
  ["services-partner.png", "Cisco Services Partner"],
];

const COPY = {
  en: {
    eyebrow: "Cisco certifications",
    title: "Certified expertise across the Cisco portfolio.",
    description:
      "JOTO maintains current Cisco partner qualifications across infrastructure, networking, security, collaboration and services.",
    close: "Close certificate",
    view: "Enlarge",
  },
  zh: {
    eyebrow: "Cisco 资质认证",
    title: "覆盖 Cisco 全产品组合的专业资质。",
    description:
      "JOTO 持有涵盖基础设施、网络、安全、协作与服务的 Cisco 合作伙伴资质。",
    close: "关闭证书",
    view: "放大查看",
  },
  fa: {
    eyebrow: "گواهینامه‌های سیسکو",
    title: "تخصص تأییدشده در سراسر مجموعه سیسکو.",
    description:
      "JOTO دارای صلاحیت‌های همکاری سیسکو در زیرساخت، شبکه، امنیت، همکاری و خدمات است.",
    close: "بستن گواهینامه",
    view: "نمایش بزرگ",
  },
};

function getLocale() {
  const [, routeLocale] = window.location.pathname.match(/^\/(zh|fa)\//) || [];
  if (routeLocale) return routeLocale;

  const language = document.documentElement.lang.toLowerCase();
  if (language.startsWith("zh")) return "zh";
  if (language.startsWith("fa")) return "fa";
  return "en";
}

function isCiscoDetailPage() {
  return /^\/(?:zh\/|fa\/)?solutions\/network\/cisco\/?$/.test(
    window.location.pathname,
  );
}

function createElement(tagName, className, text) {
  const element = document.createElement(tagName);
  if (className) element.className = className;
  if (text) element.textContent = text;
  return element;
}

function createCertificateCard(certificate, copy, duplicate = false) {
  const [filename, title] = certificate;
  const card = createElement("button", "cisco-certifications__card");
  card.type = "button";
  card.dataset.ciscoCertificateCard = "";
  card.dataset.ciscoCertificateSrc = `${CERTIFICATE_ROOT}/${filename}`;
  card.dataset.ciscoCertificateTitle = title;
  card.setAttribute("aria-label", `${copy.view}: ${title}`);
  if (duplicate) card.tabIndex = -1;

  const image = createElement("img", "cisco-certifications__image");
  image.src = `${CERTIFICATE_ROOT}/${filename}`;
  image.alt = duplicate ? "" : title;
  image.loading = "lazy";
  image.decoding = "async";
  image.draggable = false;
  card.append(image);
  return card;
}

function createSequence(copy, duplicate = false) {
  const sequence = createElement("div", "cisco-certifications__sequence");
  sequence.dataset.ciscoCertificateSequence = duplicate ? "duplicate" : "primary";
  if (duplicate) {
    sequence.dataset.ciscoCertificateDuplicate = "";
    sequence.setAttribute("aria-hidden", "true");
  }

  CERTIFICATES.forEach((certificate) => {
    const card = createCertificateCard(certificate, copy, duplicate);
    sequence.append(card);
  });
  return sequence;
}

function createDialog(copy) {
  const dialog = createElement("div", "cisco-certifications__dialog");
  dialog.dataset.ciscoCertificationDialog = "";
  dialog.setAttribute("role", "dialog");
  dialog.setAttribute("aria-modal", "true");
  dialog.setAttribute("aria-labelledby", "cisco-certificate-dialog-title");
  dialog.hidden = true;

  const closeButton = createElement(
    "button",
    "cisco-certifications__close",
    "×",
  );
  closeButton.type = "button";
  closeButton.dataset.ciscoCertificateClose = "";
  closeButton.setAttribute("aria-label", copy.close);

  const figure = createElement("figure", "cisco-certifications__dialog-figure");
  const image = createElement("img", "cisco-certifications__dialog-image");
  image.dataset.ciscoCertificateDialogImage = "";
  const caption = createElement(
    "figcaption",
    "cisco-certifications__dialog-caption",
  );
  caption.id = "cisco-certificate-dialog-title";
  caption.dataset.ciscoCertificateDialogTitle = "";
  figure.append(image, caption);
  dialog.append(closeButton, figure);
  return dialog;
}

function createCertificationSection(copy) {
  const section = createElement("section", "cisco-certifications");
  section.id = "cisco-certifications";
  section.dataset.ciscoCertifications = "";
  section.setAttribute("aria-labelledby", "cisco-certifications-title");

  const header = createElement("div", "cisco-certifications__header");
  const eyebrow = createElement(
    "p",
    "cisco-certifications__eyebrow",
    copy.eyebrow,
  );
  const copyColumn = createElement("div", "cisco-certifications__copy");
  const title = createElement("h2", "cisco-certifications__title", copy.title);
  title.id = "cisco-certifications-title";
  const description = createElement(
    "p",
    "cisco-certifications__description",
    copy.description,
  );
  copyColumn.append(title, description);
  header.append(eyebrow, copyColumn);

  const viewport = createElement("div", "cisco-certifications__viewport");
  viewport.dataset.ciscoCertificationViewport = "";
  const track = createElement("div", "cisco-certifications__track");
  track.dataset.ciscoCertificationTrack = "";
  track.append(createSequence(copy), createSequence(copy, true));
  viewport.append(track);

  section.append(header, viewport, createDialog(copy));
  return section;
}

function bindInteractions(section) {
  const dialog = section.querySelector("[data-cisco-certification-dialog]");
  const dialogImage = dialog.querySelector("[data-cisco-certificate-dialog-image]");
  const dialogTitle = dialog.querySelector("[data-cisco-certificate-dialog-title]");
  const closeButton = dialog.querySelector("[data-cisco-certificate-close]");
  let activeTrigger = null;

  function closeLightbox() {
    if (dialog.hidden) return;
    dialog.hidden = true;
    delete document.documentElement.dataset.ciscoCertificateOpen;
    delete section.dataset.ciscoCertificatePaused;
    activeTrigger?.focus({ preventScroll: true });
    activeTrigger = null;
  }

  function openLightbox(trigger) {
    const src = trigger.dataset.ciscoCertificateSrc;
    const title = trigger.dataset.ciscoCertificateTitle;
    if (!src || !title) return;
    activeTrigger = trigger;
    dialogImage.src = src;
    dialogImage.alt = title;
    dialogTitle.textContent = title;
    dialog.hidden = false;
    document.documentElement.dataset.ciscoCertificateOpen = "true";
    section.dataset.ciscoCertificatePaused = "true";
    closeButton.focus({ preventScroll: true });
  }

  section.addEventListener("click", (event) => {
    const trigger = event.target.closest("[data-cisco-certificate-card]");
    if (trigger) openLightbox(trigger);
  });
  closeButton.addEventListener("click", closeLightbox);
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) closeLightbox();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !dialog.hidden) closeLightbox();
  });
}

function mountCiscoCertificationCarousel() {
  if (!isCiscoDetailPage()) return false;
  if (document.querySelector("[data-cisco-certifications]")) return true;
  if (!document.querySelector('[data-partner-lockup-logo][alt="Cisco logo"]')) {
    return false;
  }
  const wall = document.querySelector("#customer-logo-wall");
  if (!wall) return false;

  const section = createCertificationSection(COPY[getLocale()]);
  wall.before(section);
  bindInteractions(section);
  return true;
}

function initialize() {
  if (mountCiscoCertificationCarousel()) return;
  const observer = new MutationObserver(() => {
    if (!mountCiscoCertificationCarousel()) return;
    observer.disconnect();
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initialize, { once: true });
} else {
  initialize();
}
