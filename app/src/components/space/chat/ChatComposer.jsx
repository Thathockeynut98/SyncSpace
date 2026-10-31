import { useRef, useState } from 'react';
import { Languages, Loader2, Send, Smile } from 'lucide-react';
import { cn } from '@/lib/utils';
import EmojiPicker from './EmojiPicker';
import VesperanTranslator from './VesperanTranslator';

export default function ChatComposer({ onSend, onTyping, sending, partnerName, compact = false }) {
  const [draft, setDraft] = useState('');
  const [panel, setPanel] = useState(null);
  const inputRef = useRef(null);

  const submit = async (event) => {
    event.preventDefault();
    const body = draft.trim();
    if (!body || sending) return;
    await onSend(body);
    setDraft('');
    setPanel(null);
  };

  const insertEmoji = (emoji) => {
    const field = inputRef.current;
    if (!field) {
      setDraft((value) => value + emoji);
      return;
    }
    const start = field.selectionStart ?? draft.length;
    const end = field.selectionEnd ?? draft.length;
    setDraft(draft.slice(0, start) + emoji + draft.slice(end));
    requestAnimationFrame(() => {
      field.focus();
      const caret = start + emoji.length;
      field.setSelectionRange(caret, caret);
    });
  };

  const sendSticker = async (sticker) => {
    if (sending) return;
    setPanel(null);
    await onSend(sticker);
  };

  const toggle = (next) => setPanel((current) => (current === next ? null : next));

  const sideButton = (active) =>
    cn(
      'grid shrink-0 place-items-center rounded-full border transition-colors',
      compact ? 'h-8 w-8' : 'h-9 w-9',
      active
        ? 'border-indigo-400/50 bg-indigo-500/20 text-indigo-100'
        : 'border-white/8 bg-white/[0.04] text-slate-300 hover:bg-white/10'
    );

  return (
    <div className={cn('border-t border-white/8', compact ? 'px-2.5 pt-1.5 pb-2.5' : 'px-3 pt-2 pb-3')}>
      {panel === 'emoji' && <EmojiPicker onPick={insertEmoji} onSticker={sendSticker} />}
      {panel === 'vesperan' && (
        <VesperanTranslator
          draft={draft}
          onUse={(value) => {
            setDraft(value);
            inputRef.current?.focus();
          }}
        />
      )}

      <form onSubmit={submit} className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => toggle('emoji')}
          title="Emojis and stickers"
          aria-label="Emojis and stickers"
          className={sideButton(panel === 'emoji')}
        >
          <Smile className={compact ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
        </button>

        <button
          type="button"
          onClick={() => toggle('vesperan')}
          title="Translate to Vesperan"
          aria-label="Translate to Vesperan"
          className={sideButton(panel === 'vesperan')}
        >
          <Languages className={compact ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
        </button>

        <input
          ref={inputRef}
          value={draft}
          onChange={(event) => {
            setDraft(event.target.value);
            if (event.target.value.trim()) onTyping?.();
          }}
          maxLength={2000}
          placeholder={`Message ${partnerName}…`}
          className={cn(
            'min-w-0 flex-1 rounded-full border border-white/8 bg-white/[0.04] text-slate-100 outline-none placeholder:text-slate-500 focus:border-indigo-400/40',
            compact ? 'px-3 py-1.5 text-[11px]' : 'px-4 py-2.5 text-sm'
          )}
        />

        <button
          type="submit"
          disabled={sending || !draft.trim()}
          title="Send"
          className={cn(
            'grid shrink-0 place-items-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 text-white transition-transform hover:scale-[1.03] disabled:opacity-50',
            compact ? 'h-8 w-8' : 'h-10 w-10'
          )}
        >
          {sending ? (
            <Loader2 className={compact ? 'h-3.5 w-3.5 animate-spin' : 'h-4 w-4 animate-spin'} />
          ) : (
            <Send className={compact ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
          )}
        </button>
      </form>
    </div>
  );
}