import { useCallback, useEffect, useState } from 'react';

const DISMISS_KEY = 'syncspace:install-dismissed';

// Whether this window is already running as the installed app.
export function isStandalone() {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia?.('(display-mode: standalone)').matches === true ||
    window.navigator.standalone === true
  );
}

// iPhones and iPads never fire the install prompt, so they get steps instead.
export function isAppleMobile() {
  if (typeof navigator === 'undefined') return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

export default function useInstallPrompt() {
  const [promptEvent, setPromptEvent] = useState(null);
  const [installed, setInstalled] = useState(isStandalone);
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(DISMISS_KEY) === '1';
    } catch (error) {
      return false;
    }
  });

  useEffect(() => {
    const onPrompt = (event) => {
      event.preventDefault();
      setPromptEvent(event);
    };
    const onInstalled = () => {
      setInstalled(true);
      setPromptEvent(null);
    };
    const display = window.matchMedia?.('(display-mode: standalone)');
    const onDisplay = () => setInstalled(isStandalone());

    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    display?.addEventListener?.('change', onDisplay);

    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
      display?.removeEventListener?.('change', onDisplay);
    };
  }, []);

  const install = useCallback(async () => {
    if (!promptEvent) return false;
    promptEvent.prompt();
    const choice = await promptEvent.userChoice.catch(() => null);
    setPromptEvent(null);
    if (choice?.outcome === 'accepted') setInstalled(true);
    return choice?.outcome === 'accepted';
  }, [promptEvent]);

  const dismiss = useCallback(() => {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, '1');
    } catch (error) {
      // Nothing to remember it with; it simply comes back next time.
    }
  }, []);

  return {
    available: !installed && !dismissed,
    installed,
    apple: isAppleMobile(),
    canPrompt: Boolean(promptEvent),
    install,
    dismiss,
  };
}