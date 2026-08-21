const CISCO_ROOT = "/assets/cisco-certifications";
const PARTNER_ROOT = "/assets/partner-certifications";

const PARTNERS = {
  "/solutions/network/cisco": {
    brand: "Cisco",
    certificates: [
      [`${CISCO_ROOT}/cloud-ai-infrastructure-partner.png`, "Cisco Cloud and AI Infrastructure Partner"],
      [`${CISCO_ROOT}/preferred-collaboration-partner.png`, "Cisco Preferred Collaboration Partner"],
      [`${CISCO_ROOT}/preferred-networking-partner.png`, "Cisco Preferred Networking Partner"],
      [`${CISCO_ROOT}/preferred-security-partner.png`, "Cisco Preferred Security Partner"],
      [`${CISCO_ROOT}/services-partner.png`, "Cisco Services Partner"],
      [`${PARTNER_ROOT}/cisco-bydata-registered-2026.png`, "Cisco Registered Partner - BYDATA Tech - 2026"],
    ],
  },
  "/solutions/network/extreme-networks": {
    brand: "Extreme Networks",
    certificates: [[`${PARTNER_ROOT}/extreme-networks-authorized-partner-fy26.png`, "Extreme Networks FY26 Authorized Partner"]],
  },
  "/solutions/network/sangfor": {
    brand: "Sangfor",
    certificates: [[`${PARTNER_ROOT}/sangfor-gold-reseller-2026.png`, "Sangfor Gold Reseller 2026", "portrait"]],
  },
  "/solutions/security/sangfor": {
    brand: "Sangfor",
    certificates: [[`${PARTNER_ROOT}/sangfor-gold-reseller-2026.png`, "Sangfor Gold Reseller 2026", "portrait"]],
  },
  "/solutions/server-storage/dell-technologies": {
    brand: "Dell Technologies",
    certificates: [[`${PARTNER_ROOT}/dell-technologies-authorized-partner-2026.png`, "Dell Technologies Authorized Partner 2026"]],
  },
  "/solutions/server-storage/huawei": {
    brand: "Huawei",
    certificates: [[`${PARTNER_ROOT}/huawei-certified-dealer-2026.png`, "Huawei Certified Dealer 2026", "portrait"]],
  },
  "/solutions/security/palo-alto-networks": {
    brand: "Palo Alto Networks",
    certificates: [[`${PARTNER_ROOT}/palo-alto-networks-platinum-innovator-2026.png`, "Palo Alto Networks Platinum Innovator Solution Provider 2026"]],
  },
  "/solutions/safeguarding/verkada": {
    brand: "Verkada",
    certificates: [[`${PARTNER_ROOT}/verkada-certified-gold-member-fy26.png`, "Verkada Certified Gold Member FY26", "panoramic"]],
  },
};

const SHARED_COPY = {
  en: {
    eyebrow: (brand) => `${brand} certifications`,
    title: (brand) => `Certified ${brand} partnership.`,
    description: (brand) => `Current partner credentials supporting our ${brand} solution delivery.`,
    close: "Close certificate",
    view: "Enlarge",
  },
  zh: {
    eyebrow: (brand) => `${brand} 资质认证`,
    title: (brand) => `经认证的 ${brand} 合作伙伴资质。`,
    description: (brand) => `支持 ${brand} 解决方案交付的现行合作伙伴资质。`,
    close: "关闭证书",
    view: "放大查看",
  },
  fa: {
    eyebrow: (brand) => `گواهینامه‌های ${brand}`,
    title: (brand) => `صلاحیت همکاری تأییدشده با ${brand}.`,
    description: (brand) => `مدارک معتبر همکاری برای پشتیبانی از ارائه راهکارهای ${brand}.`,
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

function normalizedRoute() {
  return window.location.pathname.replace(/^\/(?:zh|fa)(?=\/)/, "").replace(/\/$/, "");
}

function localizedCopy(brand) {
  const copy = SHARED_COPY[getLocale()];
  return {
    eyebrow: copy.eyebrow(brand),
    title: copy.title(brand),
    description: copy.description(brand),
    close: copy.close,
    view: copy.view,
  };
}

function createElement(tagName, className, text) {
  const element = document.createElement(tagName);
  if (className) element.className = className;
  if (text) element.textContent = text;
  return element;
}

function createCertificateCard(certificate, copy, duplicate = false) {
  const [src, title, format = "landscape"] = certificate;
  const card = createElement("button", "partner-certifications__card");
  card.type = "button";
  card.dataset.partnerCertificateCard = "";
  card.dataset.partnerCertificateSrc = src;
  card.dataset.partnerCertificateTitle = title;
  card.dataset.certificateFormat = format;
  card.setAttribute("aria-label", `${copy.view}: ${title}`);
  if (duplicate) card.tabIndex = -1;

  const image = createElement("img", "partner-certifications__image");
  image.src = src;
  image.alt = duplicate ? "" : title;
  image.loading = "lazy";
  image.decoding = "async";
  image.draggable = false;
  card.append(image);
  return card;
}

function createSequence(partner, copy, duplicate = false) {
  const sequence = createElement("div", "partner-certifications__sequence");
  sequence.dataset.partnerCertificateSequence = duplicate ? "duplicate" : "primary";
  if (duplicate) {
    sequence.dataset.partnerCertificateDuplicate = "";
    sequence.setAttribute("aria-hidden", "true");
  }
  partner.certificates.forEach((certificate) => {
    sequence.append(createCertificateCard(certificate, copy, duplicate));
  });
  return sequence;
}

function createDialog(copy, sectionId) {
  const dialog = createElement("div", "partner-certifications__dialog");
  dialog.dataset.partnerCertificationDialog = "";
  dialog.setAttribute("role", "dialog");
  dialog.setAttribute("aria-modal", "true");
  dialog.setAttribute("aria-labelledby", `${sectionId}-dialog-title`);
  dialog.hidden = true;

  const closeButton = createElement("button", "partner-certifications__close", "×");
  closeButton.type = "button";
  closeButton.dataset.partnerCertificateClose = "";
  closeButton.setAttribute("aria-label", copy.close);

  const figure = createElement("figure", "partner-certifications__dialog-figure");
  const image = createElement("img", "partner-certifications__dialog-image");
  image.dataset.partnerCertificateDialogImage = "";
  const caption = createElement("figcaption", "partner-certifications__dialog-caption");
  caption.id = `${sectionId}-dialog-title`;
  caption.dataset.partnerCertificateDialogTitle = "";
  figure.append(image, caption);
  dialog.append(closeButton, figure);
  return dialog;
}

function createCertificationSection(partner) {
  const copy = localizedCopy(partner.brand);
  const sectionId = "partner-certifications";
  const scrolling = partner.certificates.length > 3;
  const section = createElement("section", "partner-certifications");
  section.id = sectionId;
  section.dataset.partnerCertifications = partner.brand;
  section.dataset.layout = scrolling ? "scrolling" : "static";
  section.setAttribute("aria-labelledby", `${sectionId}-title`);

  const header = createElement("div", "partner-certifications__header");
  const eyebrow = createElement("p", "partner-certifications__eyebrow", copy.eyebrow);
  const copyColumn = createElement("div", "partner-certifications__copy");
  const title = createElement("h2", "partner-certifications__title", copy.title);
  title.id = `${sectionId}-title`;
  const description = createElement("p", "partner-certifications__description", copy.description);
  copyColumn.append(title, description);
  header.append(eyebrow, copyColumn);

  const viewport = createElement("div", "partner-certifications__viewport");
  const track = createElement("div", "partner-certifications__track");
  viewport.dataset.partnerCertificationViewport = "";
  track.dataset.partnerCertificationTrack = "";
  track.append(createSequence(partner, copy));
  if (scrolling) track.append(createSequence(partner, copy, true));
  viewport.append(track);
  section.append(header, viewport, createDialog(copy, sectionId));
  return section;
}

function bindInteractions(section) {
  const dialog = section.querySelector("[data-partner-certification-dialog]");
  const dialogImage = dialog.querySelector("[data-partner-certificate-dialog-image]");
  const dialogTitle = dialog.querySelector("[data-partner-certificate-dialog-title]");
  const closeButton = dialog.querySelector("[data-partner-certificate-close]");
  let activeTrigger = null;

  function closeLightbox() {
    if (dialog.hidden) return;
    dialog.hidden = true;
    delete document.documentElement.dataset.partnerCertificateOpen;
    delete section.dataset.partnerCertificatePaused;
    activeTrigger?.focus({ preventScroll: true });
    activeTrigger = null;
  }

  function openLightbox(trigger) {
    const src = trigger.dataset.partnerCertificateSrc;
    const title = trigger.dataset.partnerCertificateTitle;
    if (!src || !title) return;
    activeTrigger = trigger;
    dialogImage.src = src;
    dialogImage.alt = title;
    dialogTitle.textContent = title;
    dialog.hidden = false;
    document.documentElement.dataset.partnerCertificateOpen = "true";
    section.dataset.partnerCertificatePaused = "true";
    closeButton.focus({ preventScroll: true });
  }

  section.addEventListener("click", (event) => {
    const trigger = event.target.closest("[data-partner-certificate-card]");
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

function mountPartnerCertifications() {
  const partner = PARTNERS[normalizedRoute()];
  if (!partner) return true;
  if (document.querySelector("[data-partner-certifications]")) return true;
  const wall = document.querySelector("#customer-logo-wall");
  if (!wall) return false;
  const section = createCertificationSection(partner);
  wall.before(section);
  bindInteractions(section);
  return true;
}

function initialize() {
  if (mountPartnerCertifications()) return;
  const observer = new MutationObserver(() => {
    if (!mountPartnerCertifications()) return;
    observer.disconnect();
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initialize, { once: true });
} else {
  initialize();
}
