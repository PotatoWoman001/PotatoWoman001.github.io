const CHECK_POINT_EMAIL_ROUTE = /^\/(?:zh\/|fa\/)?solutions\/security\/check-point\/?$/;

const PLATFORMS = [
  "Microsoft 365",
  "Gmail",
  "Teams",
  "Slack",
  "OneDrive",
  "SharePoint",
  "Google Drive",
];

const COMPLIANCE = ["SOC 2 Type 2", "ISO 27001", "GDPR", "HIPAA"];

const COPY = {
  en: {
    eyebrow: "Harmony Email & Collaboration",
    title: "AI-powered email and collaboration security.",
    description:
      "Stop phishing, business email compromise, malicious files, QR-code attacks and account takeover before threats reach the inbox, while protecting sensitive data across everyday collaboration.",
    primaryCta: "Discuss email security",
    secondaryCta: "Explore JOTO delivery",
    threatLabel: "Inbox protection",
    threatTitle: "High-risk email blocked",
    threatDescription:
      "A forged payment request, suspicious sender domain and urgent language were detected.",
    protectedStatus: "Protected through API Inline",
    capabilitiesLabel: "Core capabilities",
    capabilities: [
      ["Advanced phishing & BEC protection", "Assess sender identity, language, behavior and threat intelligence to identify targeted attacks."],
      ["Account takeover detection", "Build user baselines to reveal abnormal sign-ins, mailbox rules and sending patterns."],
      ["API Inline deployment", "Integrate quickly with Microsoft 365 and Gmail without changing MX records."],
      ["DLP & collaboration protection", "Gain visibility and control over sensitive data in email, shared files and collaboration apps."],
    ],
    platformTitle: "Protect the places where work happens",
    complianceTitle: "Security and compliance",
  },
  zh: {
    eyebrow: "Harmony Email & Collaboration",
    title: "AI 驱动的邮件与协作安全。",
    description:
      "在威胁进入收件箱之前，阻断网络钓鱼、商业邮件泄露（BEC）、恶意文件、恶意二维码和账户接管，同时保护日常协作中的敏感数据。",
    primaryCta: "咨询邮件安全方案",
    secondaryCta: "了解 JOTO 交付能力",
    threatLabel: "收件箱防护",
    threatTitle: "高风险邮件已拦截",
    threatDescription: "检测到伪造付款请求、可疑发件域和紧迫性语义。",
    protectedStatus: "正在通过 API Inline 受到保护",
    capabilitiesLabel: "核心能力",
    capabilities: [
      ["高级钓鱼与 BEC 防护", "结合发件身份、语义、行为和威胁情报判定精准攻击。"],
      ["账户接管检测", "根据用户行为基线，识别异常登录、邮件规则和发送模式。"],
      ["API Inline 部署", "不修改 MX 记录，与 Microsoft 365 及 Gmail 环境快速集成。"],
      ["DLP 与协作防护", "对邮件、文件分享和协作应用中的敏感数据建立可视与控制。"],
    ],
    platformTitle: "覆盖日常办公与协作平台",
    complianceTitle: "安全与合规",
  },
  fa: {
    eyebrow: "Harmony Email & Collaboration",
    title: "امنیت ایمیل و همکاری با قدرت هوش مصنوعی.",
    description:
      "پیش از رسیدن تهدیدها به صندوق ورودی، فیشینگ، جعل ایمیل سازمانی، فایل‌ها و کدهای QR مخرب و تصرف حساب را متوقف کنید و از داده‌های حساس در همکاری‌های روزمره محافظت کنید.",
    primaryCta: "مشاوره امنیت ایمیل",
    secondaryCta: "خدمات اجرایی JOTO",
    threatLabel: "محافظت از صندوق ورودی",
    threatTitle: "ایمیل پرخطر متوقف شد",
    threatDescription: "درخواست پرداخت جعلی، دامنه مشکوک فرستنده و زبان فوری شناسایی شد.",
    protectedStatus: "محافظت‌شده با API Inline",
    capabilitiesLabel: "قابلیت‌های کلیدی",
    capabilities: [
      ["محافظت در برابر فیشینگ و BEC", "هویت فرستنده، زبان، رفتار و دانش تهدید برای شناسایی حملات هدفمند ترکیب می‌شوند."],
      ["شناسایی تصرف حساب", "الگوی رفتار کاربر برای کشف ورودها، قواعد صندوق و ارسال‌های غیرعادی بررسی می‌شود."],
      ["استقرار API Inline", "بدون تغییر رکورد MX، به‌سرعت با Microsoft 365 و Gmail یکپارچه شوید."],
      ["DLP و محافظت از همکاری", "بر داده‌های حساس در ایمیل، فایل‌های مشترک و برنامه‌های همکاری نظارت و کنترل داشته باشید."],
    ],
    platformTitle: "محافظت از محیط‌های کار و همکاری",
    complianceTitle: "امنیت و انطباق",
  },
};

function createElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text) element.textContent = text;
  return element;
}

function getCopy(pathname) {
  if (pathname.startsWith("/zh/")) return COPY.zh;
  if (pathname.startsWith("/fa/")) return COPY.fa;
  return COPY.en;
}

function createTagList(items, modifier) {
  const list = createElement("ul", `check-point-email-security__tags ${modifier}`);
  for (const item of items) {
    list.append(createElement("li", "check-point-email-security__tag", item));
  }
  return list;
}

function createThreatVisual(copy) {
  const visual = createElement("div", "check-point-email-security__visual");
  visual.setAttribute("aria-label", copy.threatTitle);

  const mailbox = createElement("div", "check-point-email-security__mailbox");
  const top = createElement("div", "check-point-email-security__mailbox-top");
  top.append(
    createElement("span", "", copy.threatLabel),
    createElement("span", "", "AI ANALYSIS"),
  );

  const threat = createElement("div", "check-point-email-security__threat");
  threat.append(
    createElement("strong", "", copy.threatTitle),
    createElement("p", "", copy.threatDescription),
  );

  const status = createElement("p", "check-point-email-security__status");
  status.append(createElement("span", "check-point-email-security__status-dot"));
  status.append(document.createTextNode(copy.protectedStatus));

  const applications = createElement(
    "p",
    "check-point-email-security__applications",
    "Microsoft 365 · Gmail · Teams · Slack",
  );
  mailbox.append(top, threat, status, applications);
  visual.append(mailbox, createElement("span", "check-point-email-security__ai-badge", "AI\nTHREAT\nPREVENTION"));
  return visual;
}

function ensureContactAnchor() {
  const existing = document.getElementById("contact");
  if (existing) return existing;

  const form =
    document.querySelector("[data-joto-contact-form]") ||
    document.querySelector('form[action="/api/contact"]') ||
    [...document.querySelectorAll("form")].at(-1);
  const section = form?.closest("section") || form?.parentElement;
  if (section) section.id = "contact";
  return section || null;
}

function createSection(copy, serviceAnchorId) {
  const section = createElement("section", "check-point-email-security");
  section.dataset.checkPointEmailSecurity = "";

  const inner = createElement("div", "check-point-email-security__inner");
  const panel = createElement("div", "check-point-email-security__panel");
  const hero = createElement("div", "check-point-email-security__hero");
  const copyColumn = createElement("div", "check-point-email-security__copy");
  copyColumn.append(
    createElement("p", "check-point-email-security__eyebrow", copy.eyebrow),
    createElement("h2", "check-point-email-security__title", copy.title),
    createElement("p", "check-point-email-security__description", copy.description),
  );

  const actions = createElement("div", "check-point-email-security__actions");
  const primary = createElement("a", "check-point-email-security__button check-point-email-security__button--primary", copy.primaryCta);
  primary.href = "#contact";
  primary.setAttribute("data-check-point-email-contact-link", "");
  primary.addEventListener("click", (event) => {
    const target = ensureContactAnchor();
    if (!target) return;
    event.preventDefault();
    target.scrollIntoView({ behavior: "smooth", block: "start" });
    history.replaceState(null, "", "#contact");
  });

  const secondary = createElement("a", "check-point-email-security__button check-point-email-security__button--secondary", copy.secondaryCta);
  secondary.href = `#${serviceAnchorId}`;
  actions.append(primary, secondary);
  copyColumn.append(actions);
  hero.append(copyColumn, createThreatVisual(copy));

  const capabilityLabel = createElement("p", "check-point-email-security__section-label", copy.capabilitiesLabel);
  const capabilities = createElement("div", "check-point-email-security__capabilities");
  copy.capabilities.forEach(([title, description], index) => {
    const card = createElement("article", "check-point-email-security__card");
    card.append(
      createElement("span", "check-point-email-security__card-index", String(index + 1).padStart(2, "0")),
      createElement("h3", "", title),
      createElement("p", "", description),
    );
    capabilities.append(card);
  });

  const proof = createElement("div", "check-point-email-security__proof");
  const platforms = createElement("div", "check-point-email-security__proof-card");
  platforms.append(createElement("h3", "", copy.platformTitle), createTagList(PLATFORMS, "check-point-email-security__tags--platforms"));
  const compliance = createElement("div", "check-point-email-security__proof-card check-point-email-security__proof-card--accent");
  compliance.append(createElement("h3", "", copy.complianceTitle), createTagList(COMPLIANCE, "check-point-email-security__tags--compliance"));
  proof.append(platforms, compliance);

  panel.append(hero, capabilityLabel, capabilities, proof);
  inner.append(panel);
  section.append(inner);
  return section;
}

function findServiceSection() {
  const headings = [...document.querySelectorAll("h2")];
  const heading = headings.find((candidate) => {
    const text = candidate.textContent.replace(/\s+/g, " ").trim();
    return /JOTO/i.test(text) && /Check Point/i.test(text);
  });
  return heading?.closest("section") || null;
}

function mountCheckPointEmailSecurity() {
  if (!CHECK_POINT_EMAIL_ROUTE.test(location.pathname)) return false;
  if (document.querySelector("[data-check-point-email-security]")) return true;

  const serviceSection = findServiceSection();
  if (!serviceSection) return false;

  serviceSection.setAttribute("data-check-point-email-service-anchor", "");
  const serviceAnchorId = serviceSection.id || "check-point-services";
  serviceSection.id = serviceAnchorId;
  ensureContactAnchor();
  serviceSection.before(createSection(getCopy(location.pathname), serviceAnchorId));
  return true;
}

if (!mountCheckPointEmailSecurity()) {
  const observer = new MutationObserver(() => {
    if (mountCheckPointEmailSecurity()) observer.disconnect();
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
}
