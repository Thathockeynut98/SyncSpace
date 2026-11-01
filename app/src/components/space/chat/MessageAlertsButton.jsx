import { useEffect, useState } from 'react';
import { Bell, BellRing } from 'lucide-react';
import { alertsPermission, alertsSupport, askForAlerts } from '@/lib/browserNotify';
import { currentDeviceLabel } from '@/lib/deviceAlerts';
import { cn } from '@/lib/utils';

export default function MessageAlertsButton({ compact = false }) {
  const [permission, setPermission] = useState(() => alertsPermission());

  useEffect(() => {
    setPermission(alertsPermission());
  }, []);

  if (!alertsSupport()) return null;

  const on = permission === 'granted';

  const enable = async () => {
    if (on) return;
    setPermission(await askForAlerts());
  };

  return (
    <button
      type="button"
      onClick={enable}
      title={`${on ? 'Alerts are on' : 'Get a notification when something happens'} · ${currentDeviceLabel()}`}
      className={cn(
        'inline-flex shrink-0 items-center gap-1 rounded-full border font-medium transition',
        on
          ? 'border-indigo-300/25 bg-indigo-400/10 text-indigo-200'
          : 'border-white/12 bg-white/5 text-muted-foreground hover:border-white/25 hover:text-white',
        compact ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-[11px]'
      )}
    >
      {on ? <BellRing className="h-3 w-3" /> : <Bell className="h-3 w-3" />}
      {!compact && (on ? 'Alerts on' : 'Alerts')}
    </button>
  );
}