const SESSION_KEY = 'joto_analytics_session_v1';

function randomId(prefix, cryptoApi) {
  return `${prefix}_${cryptoApi.randomUUID().replace(/-/g, '')}`;
}

function localeFrom(documentApi) {
  const lang = String(documentApi?.documentElement?.lang || '').toLowerCase();
  if (lang.startsWith('zh')) return 'zh-CN';
  if (lang.startsWith('fa')) return 'fa-IR';
  return 'en';
}

function deviceFrom(navigatorApi) {
  const userAgent = String(navigatorApi?.userAgent || '').toLowerCase();
  if (/ipad|tablet|playbook|silk/.test(userAgent)) return 'tablet';
  if (/android|webos|iphone|ipod|blackberry|iemobile|opera mini/.test(userAgent)) return 'mobile';
  return 'desktop';
}

function sessionId(storage, cryptoApi) {
  try {
    const existing = storage.getItem(SESSION_KEY);
    if (existing) return existing;
    const created = randomId('session', cryptoApi);
    storage.setItem(SESSION_KEY, created);
    return created;
  } catch {
    return randomId('session', cryptoApi);
  }
}

export function buildAnalyticsEvent(locationApi, documentApi, navigatorApi, storage, cryptoApi) {
  const query = new URLSearchParams(locationApi.search || '');
  let referrerHost = '';
  try { referrerHost = new URL(documentApi.referrer).hostname.toLowerCase(); } catch {}
  return {
    eventId: randomId('event', cryptoApi),
    eventType: 'page_view',
    path: locationApi.pathname || '/',
    locale: localeFrom(documentApi),
    referrerHost,
    utm: {
      source: query.get('utm_source') || '',
      medium: query.get('utm_medium') || '',
      campaign: query.get('utm_campaign') || '',
      term: query.get('utm_term') || '',
      content: query.get('utm_content') || '',
    },
    device: deviceFrom(navigatorApi),
    sessionId: sessionId(storage, cryptoApi),
    clientTime: new Date().toISOString(),
  };
}

function sendPageView() {
  try {
    if (!['http:', 'https:'].includes(window.location.protocol)) return;
    const body = JSON.stringify(buildAnalyticsEvent(
      window.location, document, navigator, sessionStorage, crypto,
    ));
    const sent = navigator.sendBeacon?.(
      '/api/jotoglobal/analytics',
      new Blob([body], { type: 'application/json' }),
    );
    if (!sent) {
      fetch('/api/jotoglobal/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        keepalive: true,
        credentials: 'same-origin',
      }).catch(() => {});
    }
  } catch {}
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') sendPageView();
