const ICON = '/icon-1024.jpg';

let registered = null;

async function worker() {
  if (!('serviceWorker' in navigator)) return null;
  if (registered) return registered;
  try {
    registered = await navigator.serviceWorker.getRegistration();
    if (!registered) registered = await navigator.serviceWorker.register('/sw.js');
  } catch (error) {
    registered = null;
  }
  return registered;
}

export function alertsSupport() {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function alertsPermission() {
  return alertsSupport() ? Notification.permission : 'unsupported';
}

export async function askForAlerts() {
  if (!alertsSupport()) return 'unsupported';
  let result = Notification.permission;
  if (result === 'default') {
    try {
      result = await Notification.requestPermission();
    } catch (error) {
      result = 'denied';
    }
  }
  if (result === 'granted') worker();
  return result;
}

// Pops a system notification the instant anything happens in the space, so it
// reaches you even when this tab is in the background.
export async function notifyInstant({ title, body, tag = 'syncspace', url = '/' }) {
  if (alertsPermission() !== 'granted') return;
  const options = {
    body: (body || '').slice(0, 160),
    icon: ICON,
    badge: ICON,
    tag,
    renotify: true,
    data: { url },
  };

  const registration = await worker();
  try {
    if (registration) {
      await registration.showNotification(title, options);
      return;
    }
    if (typeof Notification !== 'undefined') new Notification(title, options);
  } catch (error) {
    // The device refused the notification; the in-app toast still shows.
  }
}