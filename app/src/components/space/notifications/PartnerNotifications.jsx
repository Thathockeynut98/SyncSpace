import { useCallback, useEffect, useRef, useState } from 'react';
import {
  BookOpen,
  Camera,
  Gamepad2,
  Home as HomeIcon,
  Library as LibraryIcon,
  MessageCircle,
  Moon,
  Palette,
  Phone,
  PlayCircle,
  Radio,
} from 'lucide-react';
import NotificationToast from '@/components/space/notifications/NotificationToast';
import { describeActivity } from '@/lib/activityLabels';
import { playMessageChime } from '@/lib/ambientAudio';
import { notifyInstant } from '@/lib/browserNotify';
import { decryptText, spaceKey } from '@/lib/spaceCrypto';
import { displayName } from '@/lib/spaceData';
import useDeviceBeacons from '@/lib/useDeviceBeacons';
import useSpaceActivity from '@/lib/useSpaceActivity';

const ICONS = {
  home: HomeIcon,
  watch: PlayCircle,
  canvas: Palette,
  chat: MessageCircle,
  games: Gamepad2,
  read: BookOpen,
  radio: Radio,
  call: Phone,
  sleep: Moon,
  photos: Camera,
  library: LibraryIcon,
};

const LIFETIME = 8000;
const MAX_TOASTS = 3;
const COALESCE_MS = 1500;

// Tells you the instant the other person does anything in the space — a message,
// a note, a photo, a heart, a queued film — wherever you are.
export default function PartnerNotifications({ space, user, room, call, tabs, currentTab, onNavigate }) {
  const [toasts, setToasts] = useState([]);
  const lastTabs = useRef(new Map());
  const timers = useRef(new Set());
  const keyRef = useRef(null);
  const myName = displayName(user);
  // Notices follow the screen you are looking at, not every screen you have open.
  const { shouldAlert } = useDeviceBeacons(room, user.id);

  // A ring has to find you on whatever screen you wandered off to.
  const ringing = useRef(false);
  useEffect(() => {
    const now = Boolean(call?.incoming);
    if (now && !ringing.current && document.hidden) {
      notifyInstant({
        title: `${call.partnerName || 'Your person'} is calling`,
        body: 'Tap to answer — the space is ringing',
        tag: 'syncspace-ring',
      });
    }
    ringing.current = now;
  }, [call?.incoming, call?.partnerName]);

  const dismiss = useCallback((id) => {
    setToasts((previous) => previous.filter((toast) => toast.id !== id));
  }, []);

  const announce = useCallback(
    (toast) => {
      if (!shouldAlert()) return false;
      const stamp = Date.now();
      setToasts((previous) => {
        if (previous.some((item) => item.id === toast.id)) return previous;
        const newest = previous[previous.length - 1];
        // A burst of the same kind of thing refreshes one notice instead of stacking.
        if (newest && newest.key === toast.key && stamp - newest.at < COALESCE_MS) {
          return [...previous.slice(0, -1), { ...toast, id: newest.id, at: stamp }];
        }
        return [...previous, { ...toast, at: stamp }].slice(-MAX_TOASTS);
      });
      const timer = setTimeout(() => {
        timers.current.delete(timer);
        dismiss(toast.id);
      }, LIFETIME);
      timers.current.add(timer);
      return true;
    },
    [dismiss, shouldAlert]
  );

  useEffect(
    () => () => {
      timers.current.forEach(clearTimeout);
      timers.current.clear();
    },
    []
  );

  // Someone opening a room.
  useEffect(() => {
    if (room.seat == null) return;
    const peers = room.peers || [];
    const live = new Set(peers.map((peer) => peer.seat));
    [...lastTabs.current.keys()].forEach((seat) => {
      if (!live.has(seat)) lastTabs.current.delete(seat);
    });

    peers.forEach((peer) => {
      if (peer.name === myName) return;
      const previous = lastTabs.current.get(peer.seat);
      lastTabs.current.set(peer.seat, peer.tab || null);
      if (previous === undefined || !peer.tab || peer.tab === previous) return;
      if (peer.tab === currentTab) return;
      const tab = tabs.find((item) => item.id === peer.tab);
      if (!tab) return;
      announce({
        id: `${peer.seat}:${peer.tab}:${Date.now()}`,
        key: `tab:${peer.tab}`,
        tone: 'activity',
        icon: ICONS[peer.tab] || MessageCircle,
        title: `${peer.name} opened ${tab.label}`,
        detail: 'Tap to join them',
        tab: peer.tab,
      });
    });
  }, [room.peers, room.seat, myName, tabs, currentTab, announce]);

  // Everything they add or write, read straight from the event.
  const handleActivity = useCallback(
    async (entity, type, data) => {
      const decrypt = async (cipher, iv, fallback = '') => {
        if (!cipher || !iv) return fallback;
        try {
          const key = keyRef.current || (await spaceKey(space));
          keyRef.current = key;
          return await decryptText(key, cipher, iv);
        } catch (error) {
          return fallback;
        }
      };

      const toast = await describeActivity({ entity, type, data, decrypt });
      if (!toast) return;

      const shown = announce({
        ...toast,
        id: `${entity}:${data.id}:${type}`,
        icon: ICONS[toast.tab] || MessageCircle,
      });
      if (!shown) return;

      if (entity === 'Message') playMessageChime();
      if (document.hidden) {
        notifyInstant({ title: toast.title, body: toast.detail, tag: `syncspace-${toast.key}` });
      }
    },
    [announce, space]
  );

  useSpaceActivity(space.id, user.id, handleActivity);

  const open = (toast) => {
    onNavigate(toast.tab);
    dismiss(toast.id);
  };

  return <NotificationToast toasts={toasts} onOpen={open} onDismiss={dismiss} />;
}