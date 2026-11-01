import { useCallback, useEffect, useRef } from 'react';
import { detectDevice, pickAlertTab } from '@/lib/deviceAlerts';

const BEACON_MS = 20000;

// Every open tab of yours says hello over the room, so a notice can be sent to
// the one you are actually looking at — phone, tablet or computer.
export default function useDeviceBeacons(room, userId) {
  const profileRef = useRef(null);
  if (!profileRef.current) profileRef.current = detectDevice();
  const profile = profileRef.current;
  const tabsRef = useRef(new Map());

  const { on, send } = room;

  useEffect(() => {
    if (!on || !userId) return undefined;

    const broadcast = () => {
      const beacon = {
        ...profile,
        userId,
        visible: document.visibilityState === 'visible',
        focused: document.hasFocus(),
        alerts: typeof Notification !== 'undefined' && Notification.permission === 'granted',
        at: Date.now(),
      };
      tabsRef.current.set(beacon.tabId, beacon);
      send({ type: 'device', device: beacon });
    };

    broadcast();
    const interval = window.setInterval(broadcast, BEACON_MS);
    window.addEventListener('focus', broadcast);
    window.addEventListener('blur', broadcast);
    document.addEventListener('visibilitychange', broadcast);

    const off = on('device', (message) => {
      const device = message?.device;
      if (!device?.tabId || device.userId !== userId) return;
      tabsRef.current.set(device.tabId, device);
    });

    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', broadcast);
      window.removeEventListener('blur', broadcast);
      document.removeEventListener('visibilitychange', broadcast);
      off();
    };
  }, [on, send, userId, profile]);

  const shouldAlert = useCallback(() => {
    const winner = pickAlertTab([...tabsRef.current.values()]);
    if (!winner) return true;
    return winner.tabId === profile.tabId;
  }, [profile]);

  return { profile, shouldAlert };
}