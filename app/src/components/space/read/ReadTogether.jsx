import { useCallback, useEffect, useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { BookMarked } from 'lucide-react';
import { displayName } from '@/lib/spaceData';
import DocLibrary from './DocLibrary';
import ReaderPane from './ReaderPane';

export default function ReadTogether({ space, user, room }) {
  const { seat, peers, on, send, roomState } = room;
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reading, setReading] = useState({ docId: null, page: 0 });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const saveTimer = useRef(null);

  const partner = peers.find((item) => item.seat !== seat) || null;

  const load = useCallback(async () => {
    const page = await base44.entities.ReadingDoc.filter(
      { space_id: space.id },
      { sort: '-updated_date', limit: 40 }
    );
    setDocs(page.items);
    setLoading(false);
  }, [space.id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => () => clearTimeout(saveTimer.current), []);

  // Keeps the list in step with wherever the two of you are, without a write on every tap.
  const remember = useCallback((docId, patch) => {
    setDocs((previous) =>
      previous.map((doc) => (doc.id === docId ? { ...doc, ...patch } : doc))
    );
  }, []);

  const savePosition = useCallback(
    (docId, nextPage, total) => {
      remember(docId, { last_page: nextPage, ...(total ? { page_count: total } : {}) });
      clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        base44.entities.ReadingDoc.update(docId, {
          last_page: nextPage,
          ...(total ? { page_count: total } : {}),
        }).catch(() => {});
      }, 1200);
    },
    [remember]
  );

  const handlePages = useCallback(
    (docId, total) => {
      remember(docId, { page_count: total });
    },
    [remember]
  );

  useEffect(
    () =>
      on('reading', (message) => {
        setReading({ docId: message.docId, page: message.page });
        remember(message.docId, { last_page: message.page });
      }),
    [on, remember]
  );

  useEffect(() => {
    if (roomState?.reading) setReading(roomState.reading);
  }, [roomState]);

  const open = (docId) => {
    const doc = docs.find((item) => item.id === docId);
    const next = { docId, page: Math.max(0, doc?.last_page || 0) };
    setReading(next);
    send({ type: 'reading', ...next });
  };

  const turnTo = (page) => {
    const next = { docId: reading.docId, page };
    setReading(next);
    send({ type: 'reading', ...next });
    const doc = docs.find((item) => item.id === reading.docId);
    savePosition(reading.docId, page, doc?.page_count);
  };

  const writeBookmarks = (docId, bookmarks) => {
    setDocs((previous) =>
      previous.map((doc) => (doc.id === docId ? { ...doc, bookmarks } : doc))
    );
    base44.entities.ReadingDoc.update(docId, { bookmarks }).catch(() => {});
  };

  const addBookmark = (label) => {
    const doc = docs.find((item) => item.id === reading.docId);
    if (!doc) return;
    const entry = {
      id: `${user.id}-${Date.now()}`,
      label,
      page: reading.page,
      author_name: displayName(user),
    };
    const bookmarks = [...(doc.bookmarks || []).filter((mark) => mark.page !== reading.page), entry];
    writeBookmarks(doc.id, bookmarks);
  };

  const removeBookmark = (bookmarkId) => {
    const doc = docs.find((item) => item.id === reading.docId);
    if (!doc) return;
    writeBookmarks(
      doc.id,
      (doc.bookmarks || []).filter((mark) => mark.id !== bookmarkId)
    );
  };

  const addDoc = async ({ title, text, file }) => {
    setBusy(true);
    setError('');
    try {
      let upload = file;
      let body = text || '';
      if (!upload) {
        const safe = (title || 'Our read').replace(/[^A-Za-z0-9 _-]/g, '').trim() || 'Our read';
        upload = new File([text], `${safe}.txt`, { type: 'text/plain' });
      } else if (upload.size <= 200000) {
        body = await upload.text();
      }
      const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file: upload });
      const payload = {
        space_id: space.id,
        title: (title || upload.name || 'Our read').slice(0, 80),
        file_uri,
        char_count: body.length,
        added_by_name: displayName(user),
        added_by_id: user.id,
      };
      if (body) payload.body = body.slice(0, 120000);
      const created = await base44.entities.ReadingDoc.create(payload);
      setDocs((previous) => [created, ...previous]);
      open(created.id);
    } catch (err) {
      setError('That one did not upload. A plain .txt file works best.');
    } finally {
      setBusy(false);
    }
  };

  const addLink = async ({ url, title }) => {
    setBusy(true);
    setError('');
    try {
      const response = await base44.functions.invoke('fetchReadableLink', { url });
      const data = response.data || {};
      if (data.error) throw new Error(data.error);
      const text = String(data.text || '');
      const created = await base44.entities.ReadingDoc.create({
        space_id: space.id,
        title: (title || data.title || 'A link we found').slice(0, 80),
        source: 'link',
        url: data.url || url,
        body: text.slice(0, 120000),
        char_count: text.length,
        added_by_name: displayName(user),
        added_by_id: user.id,
      });
      setDocs((previous) => [created, ...previous]);
      open(created.id);
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || 'That link could not be opened.');
    } finally {
      setBusy(false);
    }
  };

  const active = docs.find((doc) => doc.id === reading.docId) || null;

  return (
    <div className="grid gap-4 lg:grid-cols-[18rem_minmax(0,1fr)]">
      <div className="flex flex-col gap-3">
        <DocLibrary
          docs={docs}
          activeId={reading.docId}
          onPick={open}
          onAdd={addDoc}
          onAddLink={addLink}
          busy={busy}
          loading={loading}
          error={error}
        />
        <p className="px-1 text-[11px] leading-relaxed text-muted-foreground">
          Text you add is kept in private storage (stored privately) and only the two of you can open it.
          {partner ? ` ${partner.name} turns the page when you do.` : ''}
        </p>
      </div>

      {active ? (
        <ReaderPane
          doc={active}
          page={reading.page}
          onPage={turnTo}
          onPages={handlePages}
          onBookmark={addBookmark}
          onUnbookmark={removeBookmark}
        />
      ) : (
        <section className="glass-card grid min-h-[22rem] place-items-center rounded-3xl p-6 text-center shadow-soft">
          <div>
            <BookMarked className="mx-auto h-7 w-7 text-indigo-300" />
            <p className="mt-3 font-heading text-base font-semibold text-white">Nothing open yet</p>
            <p className="mx-auto mt-1 max-w-xs text-xs leading-relaxed text-muted-foreground">
              Paste a chapter, drop in a .txt, or paste a link. When one of you turns the page, it turns for both of you.
            </p>
          </div>
        </section>
      )}
    </div>
  );
}