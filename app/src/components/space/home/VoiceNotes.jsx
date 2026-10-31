import { useCallback, useEffect, useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2, Mic, Square } from 'lucide-react';
import VoiceNoteRow from './VoiceNoteRow';
import useVoiceRecorder from '@/lib/useVoiceRecorder';
import { displayName, signFile } from '@/lib/spaceData';

const MAX_SHOWN = 8;

const stamp = (value) =>
  `${Math.floor(value / 60)}:${String(Math.floor(value % 60)).padStart(2, '0')}`;

// A tap, a whisper, a tap. Left on the landing so it is the first thing heard
// when the other person wakes up.
export default function VoiceNotes({ space, user }) {
  const [notes, setNotes] = useState([]);
  const [saving, setSaving] = useState(false);
  const [noteError, setNoteError] = useState('');
  const [playingId, setPlayingId] = useState(null);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef(null);
  const urlsRef = useRef(new Map());

  const load = useCallback(async () => {
    const page = await base44.entities.VoiceNote.filter(
      { space_id: space.id },
      { sort: '-created_date', limit: MAX_SHOWN }
    );
    setNotes(page.items || []);
  }, [space.id]);

  useEffect(() => {
    load();
    return base44.entities.VoiceNote.subscribe((event) => {
      if (!event?.data || event.data.space_id === space.id) load();
    });
  }, [load, space.id]);

  useEffect(
    () => () => {
      audioRef.current?.pause();
    },
    []
  );

  const save = useCallback(
    async (blob, seconds) => {
      setSaving(true);
      setNoteError('');
      try {
        const extension = blob.type.includes('mp4') ? 'm4a' : 'webm';
        const file = new File([blob], `voice-note.${extension}`, { type: blob.type });
        const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file });
        await base44.entities.VoiceNote.create({
          space_id: space.id,
          file_uri,
          duration_seconds: Math.round(seconds * 10) / 10,
          author_id: user.id,
          author_name: displayName(user),
        });
        await load();
      } catch (error) {
        setNoteError('That note did not send. Try recording it again.');
      } finally {
        setSaving(false);
      }
    },
    [load, space.id, user]
  );

  const recorder = useVoiceRecorder(save);

  const play = async (note) => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playingId === note.id) {
      audio.pause();
      setPlayingId(null);
      return;
    }

    let url = urlsRef.current.get(note.id);
    if (!url) {
      url = await signFile(note.file_uri);
      if (!url) {
        setNoteError('That note could not be opened.');
        return;
      }
      urlsRef.current.set(note.id, url);
    }

    audio.src = url;
    audio.currentTime = 0;
    setProgress(0);
    setPlayingId(note.id);
    audio.play().catch(() => {
      setPlayingId(null);
      setNoteError('That note did not play. Try again.');
    });
  };

  const remove = async (note) => {
    urlsRef.current.delete(note.id);
    if (playingId === note.id) {
      audioRef.current?.pause();
      setPlayingId(null);
    }
    await base44.entities.VoiceNote.delete(note.id);
    setNotes((previous) => previous.filter((item) => item.id !== note.id));
  };

  const error = recorder.error || noteError;

  return (
    <section className="glass-card rounded-3xl p-4 shadow-soft">
      <audio
        ref={audioRef}
        className="hidden"
        onTimeUpdate={(event) =>
          setProgress(
            event.target.duration ? event.target.currentTime / event.target.duration : 0
          )
        }
        onEnded={() => {
          setPlayingId(null);
          setProgress(0);
        }}
      />

      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-heading text-sm font-semibold tracking-tight text-white">
          Sleepy voice notes
        </h3>
        <span className="text-[11px] text-muted-foreground">up to {recorder.limit}s</span>
      </div>

      <div className="flex items-center gap-3">
        {recorder.recording ? (
          <button
            onClick={recorder.stop}
            className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-gradient-to-br from-rose-500 to-red-600 text-white shadow-glow animate-pulse-soft"
            title="Send this note"
          >
            <Square className="h-5 w-5" />
          </button>
        ) : (
          <button
            onClick={recorder.start}
            disabled={saving}
            className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-white shadow-glow transition-transform hover:scale-105 disabled:opacity-60"
            title="Record a voice note"
          >
            {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Mic className="h-5 w-5" />}
          </button>
        )}

        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-white">
            {recorder.recording
              ? 'Recording — tap again to send'
              : saving
                ? 'Sending your note…'
                : 'Tap to whisper something'}
          </p>
          <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
            {recorder.recording
              ? `${stamp(recorder.seconds)} of ${stamp(recorder.limit)}`
              : 'A good morning, a goodnight, whatever is on your mind.'}
          </p>
        </div>
      </div>

      {error && (
        <p className="mt-2.5 rounded-xl border border-amber-400/25 bg-amber-400/10 px-3 py-2 text-[11px] text-amber-200">
          {error}
        </p>
      )}

      {notes.length > 0 && (
        <div className="mt-3 space-y-1.5">
          {notes.map((note) => (
            <VoiceNoteRow
              key={note.id}
              note={note}
              mine={note.author_id === user.id}
              playing={playingId === note.id}
              progress={progress}
              onPlay={() => play(note)}
              onRemove={note.author_id === user.id ? () => remove(note) : null}
            />
          ))}
        </div>
      )}
    </section>
  );
}