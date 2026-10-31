const DEVICE_KEY = 'syncspace:device';
const TAB_KEY = 'syncspace:tab';

const KIND_WORDS = { phone: 'Phone', tablet: 'Tablet', desktop: 'Desktop' };

function detectKind() {
  if (typeof navigator === 'undefined') return 'desktop';
  const ua = navigator.userAgent || '';
  const touch = navigator.maxTouchPoints || 0;
  const shortest = Math.min(window.screen?.width || 0, window.screen?.height || 0);

  if (/iPad|Tablet|PlayBook|Silk/i.test(ua)) return 'tablet';
  if (/iPhone|iPod/i.test(ua)) return 'phone';
  if (/Android/i.test(ua)) return touch > 0 && shortest >= 600 ? 'tablet' : 'phone';
  if (/Mobi/i.test(ua)) return 'phone';
  // iPadOS reports itself as a Mac, so a touch screen gives it away.
  if (/Macintosh/i.test(ua) && touch > 1) return 'tablet';
  if (touch > 1 && shortest >= 600) return 'tablet';
  return 'desktop';
}

function detectBrowser() {
  if (typeof navigator === 'undefined') return 'browser';
  const ua = navigator.userAgent || '';
  if (/Edg\//.test(ua)) return 'Edge';
  if (/OPR\//.test(ua)) return 'Opera';
  if (/SamsungBrowser/.test(ua)) return 'Samsung Internet';
  if (/Firefox\//.test(ua)) return 'Firefox';
  if (/CriOS|Chrome\//.test(ua)) return 'Chrome';
  if (/Safari\//.test(ua)) return 'Safari';
  return 'browser';
}

// Which kind of screen this is, and which browser it is opened in.
export function detectDevice() {
  if (typeof window === 'undefined') {
    return { deviceId: 'server', tabId: 'server', kind: 'desktop', browser: 'browser', label: 'this device' };
  }

  let deviceId = localStorage.getItem(DEVICE_KEY);
  if (!deviceId) {
    deviceId = crypto.randomUUID();
    localStorage.setItem(DEVICE_KEY, deviceId);
  }

  let tabId = sessionStorage.getItem(TAB_KEY);
  if (!tabId) {
    tabId = crypto.randomUUID();
    sessionStorage.setItem(TAB_KEY, tabId);
  }

  const kind = detectKind();
  const browser = detectBrowser();
  return {
    deviceId,
    tabId,
    kind,
    browser,
    label: `${KIND_WORDS[kind]} · ${browser}`,
  };
}

export function currentDeviceLabel() {
  return detectDevice().label;
}

// Chooses the one screen to show a notice on: whatever you are looking at
// right now, and if nothing is in front of you, whichever you used last.
export function pickAlertTab(tabs) {
  const now = Date.now();
  const live = tabs.filter((tab) => now - (tab.at || 0) < 45000);
  if (!live.length) return null;
  live.sort(
    (a, b) =>
      (b.focused ? 1 : 0) - (a.focused ? 1 : 0) ||
      (b.visible ? 1 : 0) - (a.visible ? 1 : 0) ||
      (b.alerts ? 1 : 0) - (a.alerts ? 1 : 0) ||
      (b.at || 0) - (a.at || 0) ||
      String(a.tabId).localeCompare(String(b.tabId))
  );
  return live[0];
}