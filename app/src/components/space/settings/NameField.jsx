import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { displayName, renameSelf } from '@/lib/spaceData';

export default function NameField({ space, user, onSaved }) {
  const [value, setValue] = useState(displayName(user));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      const result = await renameSelf({ space, user, name: value });
      onSaved(result.me, result.space);
      setValue(result.me.display_name);
      setSaved(true);
    } catch (err) {
      setError(err.message || 'Could not save just now. Try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={save} className="space-y-2">
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
        Your name
      </h3>
      <div className="flex gap-2">
        <Input
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            setError('');
            setSaved(false);
          }}
          maxLength={30}
          placeholder="Your name"
          className="h-9 border-white/10 bg-white/5 text-sm"
        />
        <Button
          type="submit"
          disabled={saving}
          className="h-9 shrink-0 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground"
        >
          {saving ? 'Saving…' : 'Save'}
        </Button>
      </div>
      {error && <p className="text-[11px] text-rose-300">{error}</p>}
      {saved && <p className="text-[11px] text-emerald-300">Saved — that&apos;s what they&apos;ll see.</p>}
    </form>
  );
}