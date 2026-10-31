import { useCallback, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { signFile } from '@/lib/spaceData';
import {
  getLibraryState,
  playItem,
  setQueue,
  setRepeatMode,
  setShuffle,
  setTrackResolver,
  subscribeLibrary,
} from '@/lib/libraryPlayer';

function compact(item) {
  return {
    id: item.id,
    title: item.title,
    kind: item.kind,
    source: item.source,
    url: item.url || '',
    file_uri: item.file_uri || '',
    duration_seconds: item.duration_seconds || 0,
    added_by_name: item.added_by_name || '',
  };
}

// Keeps the song player in step with the other person, on whatever tab they are on.
export default function useLibraryRoom({ space, room }) {
  const { send, on, connected, seat } = room;
  const muteUntil = useRef(0);
  const lastRef = useRef({ id: null, playing: false, repeat: 'off', shuffle: false });

  const broadcast = useCallback(() => {
    if (!connected) return;
    const current = getLibraryState();
    send({
      type: 'library',
      action: 'state',
      from: seat,
      item: current.item ? compact(current.item) : null,
      position: current.position || 0,
      playing: current.playing,
      repeat: current.repeat,
      shuffle: current.shuffle,
      order: current.queue.map((entry) => entry.id),
    });
  }, [send, connected, seat]);

  // The library's songs, kept fresh so next and shuffle work from any tab.
  useEffect(() => {
    if (!space?.id) return undefined;
    setTrackResolver(async (item) =>
      item.source === 'link' ? item.url : await signFile(item.file_uri)
    );

    let cancelled = false;
    const load = async () => {
      const page = await base44.entities.Media.filter(
        { space_id: space.id, kind: 'audio' },
        { sort: '-created_date', limit: 100 }
      );
      if (!cancelled) setQueue(page.items);
    };
    load();
    const unsubscribe = base44.entities.Media.subscribe((event) => {
      if (!event?.data || event.data.space_id === space.id) load();
    });
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [space?.id]);

  // Anything that happens here gets passed to them.
  useEffect(() => {
    return subscribeLibrary((current) => {
      const id = current.item?.id || null;
      const last = lastRef.current;
      const changed =
        id !== last.id ||
        current.playing !== last.playing ||
        current.repeat !== last.repeat ||
        current.shuffle !== last.shuffle;
      lastRef.current = {
        id,
        playing: current.playing,
        repeat: current.repeat,
        shuffle: current.shuffle,
      };
      if (!changed || Date.now() < muteUntil.current) return;
      broadcast();
    });
  }, [broadcast]);

  // And anything that happens there lands here.
  useEffect(
    () =>
      on('library', (message) => {
        if (!message || message.from === seat) return;
        if (message.action === 'ask') {
          broadcast();
          return;
        }
        if (message.action !== 'state') return;

        muteUntil.current = Date.now() + 1500;
        setRepeatMode(message.repeat === 'one' || message.repeat === 'all' ? message.repeat : 'off');
        setShuffle(message.shuffle);
        if (!message.item) return;

        const offset = message.playing ? (message.position || 0) + 0.4 : message.position || 0;
        playItem(message.item, { autoplay: !!message.playing, position: offset });
      }),
    [on, seat, broadcast]
  );

  // Ask what they are listening to when you arrive.
  useEffect(() => {
    if (!connected) return;
    send({ type: 'library', action: 'ask', from: seat });
  }, [connected, send, seat]);
}