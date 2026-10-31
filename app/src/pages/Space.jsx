import { useEffect, useState } from 'react';
import { syncAuth } from '@/lib/syncAuth';
import { AnimatePresence, motion } from 'framer-motion';
import {
  BookMarked,
  BookOpen,
  Camera,
  Gamepad2,
  Home as HomeIcon,
  Library as LibraryIcon,
  MessageCircle,
  Mic,
  Moon,
  Palette,
  Phone,
  PlayCircle,
  Radio,
} from 'lucide-react';
import SpaceBackdrop from '@/components/space/SpaceBackdrop';
import SpaceHeader from '@/components/space/SpaceHeader';
import TabDock from '@/components/space/TabDock';
import PairingScreen from '@/components/space/PairingScreen';
import WatchTogether from '@/components/space/WatchTogether';
import CanvasNotes from '@/components/space/CanvasNotes';
import SleepZone from '@/components/space/SleepZone';
import PhotoWall from '@/components/space/PhotoWall';
import MediaLibrary from '@/components/space/library/MediaLibrary';
import LibraryBar from '@/components/space/library/LibraryBar';
import ChatRoom from '@/components/space/ChatRoom';
import GamesRoom from '@/components/space/games/GamesRoom';
import ReadTogether from '@/components/space/read/ReadTogether';
import VesperanCodex from '@/components/space/VesperanCodex';
import RadioRoom from '@/components/space/RadioRoom';
import CallRoom from '@/components/space/call/CallRoom';
import CallBar from '@/components/space/call/CallBar';
import CamOverlay from '@/components/space/call/CamOverlay';
import NowPlayingBar from '@/components/space/radio/NowPlayingBar';
import SleepMusicBar from '@/components/space/sleep/SleepMusicBar';
import HomeLanding from '@/components/space/home/HomeLanding';
import VoiceNoteVault from '@/components/space/voice/VoiceNoteVault';
import HeartsLayer from '@/components/space/home/HeartsLayer';
import PartnerNotifications from '@/components/space/notifications/PartnerNotifications';
import useWindDown from '@/lib/useWindDown';
import useLibraryRoom from '@/lib/useLibraryRoom';
import useSleepRoom from '@/lib/useSleepRoom';
import { useCall } from '@/lib/useCall';
import { useSpaceRoom } from '@/lib/useSpaceRoom';
import { displayName, findMySpace } from '@/lib/spaceData';

const TABS = [
  { id: 'home', label: 'Home', short: 'Home', icon: HomeIcon },
  { id: 'watch', label: 'Watch Together', short: 'Watch', icon: PlayCircle },
  { id: 'canvas', label: 'Canvas', short: 'Canvas', icon: Palette },
  { id: 'chat', label: 'Our Chat', short: 'Chat', icon: MessageCircle },
  { id: 'games', label: 'Games', short: 'Games', icon: Gamepad2 },
  { id: 'read', label: 'Read Together', short: 'Read', icon: BookOpen },
  { id: 'vesperan', label: 'Vesperan', short: 'Vesperan', icon: BookMarked },
  { id: 'radio', label: 'Radio', short: 'Radio', icon: Radio },
  { id: 'call', label: 'Call', short: 'Call', icon: Phone },
  { id: 'sleep', label: 'Sleep Zone', short: 'Sleep', icon: Moon },
  { id: 'voice', label: 'Voice Note Vault', short: 'Voice', icon: Mic },
  { id: 'photos', label: 'Photo Wall', short: 'Photos', icon: Camera },
  { id: 'library', label: 'Media Library', short: 'Library', icon: LibraryIcon },
];

export default function Space() {
  const [user, setUser] = useState(null);
  const [space, setSpace] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('home');

  // Warms and dims everything once it gets late on this person's own clock.
  useWindDown();

  const room = useSpaceRoom(space?.id, displayName(user));
  // The library's song player lives here, so a track survives moving between tabs.
  useLibraryRoom({ space, room });
  // The sleep soundtrack also lives here, so it keeps going and stays in step.
  useSleepRoom({ room });
  // The call lives here, not in the Call tab, so a ring reaches you on any tab
  // and switching tabs never drops the line.
  const call = useCall(room);

  // Let the room know which part of the space we're in, so the other person gets a nudge.
  useEffect(() => {
    if (!room.connected) return;
    room.send({ type: 'activity', tab });
  }, [tab, room.connected, room.peers.length, room.send]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const response = await syncAuth.me();
        if (cancelled) return;
        const me = response?.user ?? response?.account ?? response;
        setUser(me);
        // The API identifies room membership using the session token.
        const found = await findMySpace(me?.email ?? "");
        if (!cancelled) setSpace(found);
      } catch (error) {
        const status = error?.status || error?.response?.status;
        if (status === 401) {
          window.location.assign("/login");
          return;
        }
        console.error("Failed to load SyncSpace room:", error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="relative flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/15 border-t-indigo-400" />
      </div>
    );
  }

  if (!space) {
    return <PairingScreen user={user} onReady={setSpace} />;
  }

  const callBarVisible = tab !== 'call' && (call.incoming || call.phase !== 'idle' || call.elsewhere);

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <SpaceBackdrop />
      <SpaceHeader
        space={space}
        user={user}
        room={room}
        onNameSaved={(me, nextSpace) => {
          setUser(me);
          setSpace(nextSpace);
        }}
      />
      <TabDock tabs={TABS} active={tab} onChange={setTab} />

      <main className="relative z-10 mx-auto w-full max-w-6xl px-4 pb-28 pt-4 md:pb-16 md:pt-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            {tab === 'home' && (
              <HomeLanding space={space} user={user} room={room} tabs={TABS} onNavigate={setTab} />
            )}
            {tab === 'watch' && <WatchTogether space={space} user={user} room={room} />}
            {tab === 'canvas' && <CanvasNotes space={space} user={user} room={room} />}
            {tab === 'chat' && <ChatRoom space={space} user={user} room={room} />}
            {tab === 'games' && <GamesRoom room={room} />}
            {tab === 'read' && <ReadTogether space={space} user={user} room={room} />}
            {tab === 'vesperan' && <VesperanCodex />}
            {tab === 'radio' && <RadioRoom room={room} />}
            {tab === 'call' && <CallRoom call={call} />}
            {tab === 'sleep' && <SleepZone space={space} user={user} room={room} />}
            {tab === 'voice' && <VoiceNoteVault space={space} user={user} />}
            {tab === 'photos' && <PhotoWall space={space} user={user} />}
            {tab === 'library' && <MediaLibrary space={space} user={user} />}
          </motion.div>
        </AnimatePresence>
      </main>

      <HeartsLayer space={space} user={user} />

      <PartnerNotifications
        space={space}
        user={user}
        room={room}
        call={call}
        tabs={TABS}
        currentTab={tab}
        onNavigate={setTab}
      />

      <NowPlayingBar onOpen={() => setTab('radio')} lifted={callBarVisible} />

      {tab !== 'sleep' && (
        <SleepMusicBar onOpen={() => setTab('sleep')} lifted={callBarVisible} />
      )}

      {tab !== 'library' && (
        <LibraryBar onOpen={() => setTab('library')} lifted={callBarVisible} />
      )}

      {/* Their face follows you around the space, on every screen but the call itself. */}
      <CamOverlay
        stream={call.remote}
        visible={tab !== 'call' && call.phase === 'live' && call.hasVideo}
        partnerName={call.partnerName}
      />

      <CallBar
        call={call}
        visible={callBarVisible}
        onAnswer={() => {
          call.joinCall();
          setTab('call');
        }}
        onTake={() => {
          call.startCall();
          setTab('call');
        }}
        onOpen={() => setTab('call')}
      />
    </div>
  );
}