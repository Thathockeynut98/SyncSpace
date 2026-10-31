import { useEffect } from 'react';
import { base44 } from '@/api/base44Client';

// Everything the two of you can add to the space. One stream each, no polling.
const FEEDS = [
  'Message',
  'Note',
  'VoiceNote',
  'Photo',
  'Memory',
  'Mood',
  'Goodnight',
  'Heart',
  'Video',
  'Media',
  'ReadingDoc',
];

const SEEN_LIMIT = 400;

const actorOf = (data) =>
  data.author_id || data.added_by_id || data.owner_id || data.from_id || data.created_by_id || null;

// Fires the moment the other person does anything shared in this space.
export default function useSpaceActivity(spaceId, userId, onActivity) {
  useEffect(() => {
    if (!spaceId || !userId || !onActivity) return undefined;

    const seen = new Set();
    const unsubscribers = FEEDS.map((entity) =>
      base44.entities[entity].subscribe((event) => {
        const data = event?.data;
        if (!data || !data.id || event.type === 'delete') return;
        if (data.space_id !== spaceId) return;
        if (actorOf(data) === userId) return;
        const mark = `${event.type}:${data.id}`;
        if (seen.has(mark)) return;
        seen.add(mark);
        if (seen.size > SEEN_LIMIT) seen.delete(seen.values().next().value);
        onActivity(entity, event.type, data);
      })
    );

    return () => unsubscribers.forEach((off) => off?.());
  }, [spaceId, userId, onActivity]);
}