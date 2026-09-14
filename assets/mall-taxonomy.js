const CATEGORY_DEFINITIONS = [
  {
    key: "networking",
    labels: { en: "Networking", zh: "网络", fa: "شبکه" },
    aliases: ["network", "networking", "网络", "routers", "switches", "enterprise network"],
  },
  {
    key: "security",
    labels: { en: "Security", zh: "安全", fa: "امنیت" },
    aliases: ["security", "安全", "firewalls", "firewall"],
  },
  {
    key: "servers-storage",
    labels: { en: "Servers & Storage", zh: "服务器与存储", fa: "سرور و ذخیره‌سازی" },
    aliases: ["servers & storage", "server storage", "servers", "storages", "storage", "服务器与存储"],
  },
  {
    key: "collaboration",
    labels: { en: "Collaboration", zh: "协作通信", fa: "ارتباطات سازمانی" },
    aliases: ["collaboration", "unified communications", "voice", "协作通信"],
  },
  {
    key: "physical-security",
    labels: { en: "Physical Security", zh: "物理安防", fa: "امنیت فیزیکی" },
    aliases: ["physical security", "safeguarding", "video surveillance", "物理安防"],
  },
];

const TYPE_DEFINITIONS = [
  { key: "routers", category: "networking", labels: { en: "Routers", zh: "路由器", fa: "مسیریاب‌ها" }, terms: ["router", "routing", "gateway", "路由"] },
  { key: "switches", category: "networking", labels: { en: "Switches", zh: "交换机", fa: "سوئیچ‌ها" }, terms: ["switch", "switching", "交换机"] },
  { key: "wireless", category: "networking", labels: { en: "Wireless Networking", zh: "无线网络", fa: "شبکه بی‌سیم" }, terms: ["wireless", "wi-fi", "wifi", "wlan", "access point"] },
  { key: "enterprise-network", category: "networking", labels: { en: "Enterprise Network", zh: "企业网络", fa: "شبکه سازمانی" }, terms: ["enterprise network", "network module", "transceiver", "line card"] },
  { key: "firewalls", category: "security", labels: { en: "Firewalls", zh: "防火墙", fa: "فایروال‌ها" }, terms: ["firewall", "firepower", "fortigate", " asa "] },
  { key: "network-security", category: "security", labels: { en: "Network Security", zh: "网络安全", fa: "امنیت شبکه" }, terms: ["network security", "threat prevention", "zero trust", "vpn gateway", "secure web gateway"] },
  { key: "servers", category: "servers-storage", labels: { en: "Servers", zh: "服务器", fa: "سرورها" }, terms: ["server", "poweredge", " ucs ", "inspur"] },
  { key: "storage", category: "servers-storage", labels: { en: "Storage", zh: "存储", fa: "ذخیره‌سازی" }, terms: ["storage", "oceanstor", "powerstore", "powermax", "powervault", "equallogic"] },
  { key: "backup-expansion", category: "servers-storage", labels: { en: "Backup & Expansion", zh: "备份与扩展", fa: "پشتیبان‌گیری و توسعه" }, terms: ["backup", "disk array", "drive enclosure", "storage expansion"] },
  { key: "unified-communications", category: "collaboration", labels: { en: "Unified Communications", zh: "统一通信", fa: "ارتباطات یکپارچه" }, terms: ["unified communication", "callmanager", "call manager", "voice gateway", "sbc", "session border"] },
  { key: "ip-phones", category: "collaboration", labels: { en: "IP Phones", zh: "IP 电话", fa: "تلفن‌های IP" }, terms: ["ip phone", "voip phone", "desk phone"] },
  { key: "conferencing", category: "collaboration", labels: { en: "Conferencing & Video Collaboration", zh: "会议与视频协作", fa: "کنفرانس و همکاری ویدیویی" }, terms: ["video conferencing", "telepresence", "webex", "conference"] },
  { key: "video-surveillance", category: "physical-security", labels: { en: "Video Surveillance", zh: "视频监控", fa: "نظارت تصویری" }, terms: ["video surveillance", "security camera", "ip camera", "cctv", "camera"] },
  { key: "access-control", category: "physical-security", labels: { en: "Access Control", zh: "门禁", fa: "کنترل دسترسی" }, terms: ["access control", "door controller", "card reader", "door station"] },
  { key: "recording-storage", category: "physical-security", labels: { en: "Recording & Storage", zh: "录像与存储", fa: "ضبط و ذخیره‌سازی" }, terms: ["network video recorder", " nvr ", "video recorder"] },
];

const normalize = (value) => String(value || "").normalize("NFKC").trim().toLocaleLowerCase();
const padded = (value) => ` ${normalize(value)} `;

export const MALL_CATEGORIES = Object.freeze(CATEGORY_DEFINITIONS.map((item) => Object.freeze(item)));

export function mallLocaleKey(locale) {
  const value = typeof locale === "string" ? locale : locale?.lang || locale?.key || "en";
  if (String(value).toLowerCase().startsWith("zh")) return "zh";
  if (String(value).toLowerCase().startsWith("fa")) return "fa";
  return "en";
}

export function canonicalCategoryKey(value) {
  const candidate = normalize(value);
  if (!candidate) return "";
  return CATEGORY_DEFINITIONS.find((item) => item.key === candidate || item.aliases.some((alias) => normalize(alias) === candidate))?.key || "";
}

export function productCategoryKey(product) {
  const path = Array.isArray(product?.category_path) ? product.category_path : [];
  for (const segment of path) {
    const direct = canonicalCategoryKey(segment);
    if (direct) return direct;
  }
  const text = padded([product?.title, product?.summary, ...path].filter(Boolean).join(" "));
  const type = TYPE_DEFINITIONS.find((item) => item.terms.some((term) => text.includes(normalize(term))));
  return type?.category || "";
}

export function productTypeKey(product) {
  const path = Array.isArray(product?.category_path) ? product.category_path : [];
  const text = padded([product?.title, product?.summary, ...path].filter(Boolean).join(" "));
  const category = productCategoryKey(product);
  return TYPE_DEFINITIONS.find((item) => item.category === category && item.terms.some((term) => text.includes(normalize(term))))?.key || "";
}

export function localizedCategoryLabel(value, locale) {
  const key = canonicalCategoryKey(value);
  const item = CATEGORY_DEFINITIONS.find((candidate) => candidate.key === key);
  return item?.labels[mallLocaleKey(locale)] || "";
}

export function localizedProductType(product, locale) {
  const key = typeof product === "string" ? product : productTypeKey(product);
  const item = TYPE_DEFINITIONS.find((candidate) => candidate.key === key);
  return item?.labels[mallLocaleKey(locale)] || "";
}

export function categoryTypeKeys(products, categoryKey) {
  const counts = new Map();
  products.forEach((product) => {
    if (productCategoryKey(product) !== categoryKey) return;
    const key = productTypeKey(product);
    if (key) counts.set(key, (counts.get(key) || 0) + 1);
  });
  return [...counts].sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0])).map(([key]) => key);
}
