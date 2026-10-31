import { useCallback, useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { displayName, signFile } from '@/lib/spaceData';
import { decryptText, encryptText, spaceKey } from '@/lib/spaceCrypto';

// Memories are kept scrambled in the database, like notes and chat, and opened
// only in the browser with the space's own key.
export function useMemories(space, user) {
  const [memories, setMemories] = useState([]);
  const [urls, setUrls] = useState({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const page = await base44.entities.Memory.filter(
      { space_id: space.id },
      { sort: '-created_date', limit: 40 }
    );
    const items = page.items;
    const key = await spaceKey(space);
    const opened = await Promise.all(
      items.map(async (item) => {
        if (!item.cipher || !item.iv) return { ...item, body: item.text || '' };
        try {
          return { ...item, body: await decryptText(key, item.cipher, item.iv) };
        } catch {
          return { ...item, body: 'Could not be opened here.' };
        }
      })
    );
    setMemories(opened);

    const signed = await Promise.all(
      items
        .filter((item) => item.photo_uri)
        .map(async (item) => {
          try {
            return [item.id, await signFile(item.photo_uri)];
          } catch {
            return [item.id, null];
          }
        })
    );
    setUrls(Object.fromEntries(signed));
    setLoading(false);
  }, [space]);

  useEffect(() => {
    load();
    return base44.entities.Memory.subscribe((event) => {
      if (!event?.data || event.data.space_id === space.id) load();
    });
  }, [load, space.id]);

  const add = async ({ text, file }) => {
    const body = text.trim().slice(0, 1000);
    if (!body && !file) return;
    let photo_uri = '';
    if (file) {
      const uploaded = await base44.integrations.Core.UploadPrivateFile({ file });
      photo_uri = uploaded.file_uri;
    }
    const key = await spaceKey(space);
    const { cipher, iv } = await encryptText(key, body);
    await base44.entities.Memory.create({
      space_id: space.id,
      cipher,
      iv,
      photo_uri,
      author_name: displayName(user),
      author_id: user.id,
    });
    await load();
  };

  const remove = async (memory) => {
    await base44.entities.Memory.delete(memory.id);
    setMemories((previous) => previous.filter((item) => item.id !== memory.id));
  };

  return { memories, urls, loading, add, remove };
}