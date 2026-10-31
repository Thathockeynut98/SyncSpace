const clip = (text, max = 74) => {
  if (!text) return '';
  return text.length > max ? `${text.slice(0, max)}…` : text;
};

// Turns one shared change into the words the notice shows. Reads straight from
// the event, so nothing has to be fetched again.
export async function describeActivity({ entity, data, decrypt }) {
  const name =
    data.author_name || data.added_by_name || data.owner_name || data.from_name || 'They';

  switch (entity) {
    case 'Message': {
      const body = await decrypt(data.cipher, data.iv, '');
      return {
        key: 'chat',
        tone: 'message',
        tab: 'chat',
        title: `${name} sent a message`,
        detail: body ? clip(body) : 'Open your chat to read it',
      };
    }
    case 'Note': {
      const body = (await decrypt(data.cipher, data.iv, data.text)) || data.text || '';
      return {
        key: 'home',
        tone: 'activity',
        tab: 'home',
        title: `${name} left you a note`,
        detail: body ? clip(body) : 'Waiting on your home screen',
      };
    }
    case 'Photo': {
      const caption = (await decrypt(data.cipher, data.iv, data.caption)) || data.caption || '';
      return {
        key: 'photos',
        tone: 'activity',
        tab: 'photos',
        title: `${name} added a photo`,
        detail: caption ? clip(caption) : 'Fresh on the photo wall',
      };
    }
    case 'VoiceNote':
      return {
        key: 'voice',
        tone: 'activity',
        tab: 'voice',
        title: `${name} left you a voice note`,
        detail: 'Saved in your voice note vault',
      };
    case 'Memory': {
      const body = (await decrypt(data.cipher, data.iv, data.text)) || data.text || '';
      return {
        key: 'home',
        tone: 'activity',
        tab: 'home',
        title: `${name} saved a memory`,
        detail: body ? clip(body) : 'Tap to keep it with them',
      };
    }
    case 'Mood':
      return {
        key: 'mood',
        tone: 'activity',
        tab: 'home',
        title: `${name} is feeling ${data.mood || 'something'}`,
        detail: data.note ? clip(data.note) : 'Tap to see their day',
      };
    case 'Goodnight': {
      const body = await decrypt(data.cipher, data.iv, '');
      return {
        key: 'sleep',
        tone: 'activity',
        tab: 'sleep',
        title: `${name} said goodnight`,
        detail: body ? clip(body) : 'Sweet dreams',
      };
    }
    case 'Heart':
      return {
        key: 'heart',
        tone: 'heart',
        tab: 'home',
        title: `${name} sent you a heart`,
        detail: 'Tap to send one back',
      };
    case 'Video':
      return {
        key: 'watch',
        tone: 'activity',
        tab: 'watch',
        title: `${name} lined up a video`,
        detail: clip(data.title) || 'Something for tonight',
      };
    case 'Media':
      return {
        key: 'library',
        tone: 'activity',
        tab: 'library',
        title: `${name} added to your library`,
        detail: clip(data.title) || 'Something new to play',
      };
    case 'ReadingDoc':
      return {
        key: 'read',
        tone: 'activity',
        tab: 'read',
        title: `${name} started a read`,
        detail: clip(data.title) || 'Take it in turns',
      };
    default:
      return null;
  }
}