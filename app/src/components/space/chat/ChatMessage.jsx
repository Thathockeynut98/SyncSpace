import { Heart, Pin, PinOff } from 'lucide-react';
import { clockTime } from '@/lib/time';
import { cn } from '@/lib/utils';

const EMOJI_ONLY = /^(?:[\p{Extended_Pictographic}\u200d\ufe0f\s])+$/u;

function isSticker(text) {
  const trimmed = (text || '').trim();
  if (!trimmed || trimmed.length > 20) return false;
  return EMOJI_ONLY.test(trimmed);
}

function MessageActions({ message, myId, onHeart, onPin }) {
  const hearts = message.hearts || [];
  const hearted = hearts.includes(myId);

  return (
    <div
      className={cn(
        'mt-1 flex items-center gap-1 transition-opacity',
        'md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100'
      )}
    >
      <button
        type="button"
        onClick={() => onHeart(message)}
        aria-pressed={hearted}
        title={hearted ? 'Take your heart back' : 'Heart this message'}
        className={cn(
          'inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] transition-colors',
          hearted
            ? 'border-rose-300/40 bg-rose-400/15 text-rose-200'
            : 'border-white/10 bg-white/[0.04] text-slate-400 hover:text-rose-200'
        )}
      >
        <Heart className={cn('h-3 w-3', hearted && 'fill-current')} />
        {hearts.length > 0 && hearts.length}
      </button>
      <button
        type="button"
        onClick={() => onPin(message)}
        title={message.pinned ? 'Unpin this message' : 'Pin this message'}
        className={cn(
          'inline-flex items-center rounded-full border px-1.5 py-0.5 transition-colors',
          message.pinned
            ? 'border-indigo-300/40 bg-indigo-400/15 text-indigo-100'
            : 'border-white/10 bg-white/[0.04] text-slate-400 hover:text-indigo-200'
        )}
      >
        {message.pinned ? <PinOff className="h-3 w-3" /> : <Pin className="h-3 w-3" />}
      </button>
    </div>
  );
}

export default function ChatMessage({ message, mine, user, compact = false, onHeart, onPin }) {
  const sticker = isSticker(message.body);
  const actions = (
    <MessageActions
      message={message}
      myId={user?.id}
      onHeart={onHeart}
      onPin={onPin}
    />
  );

  if (sticker) {
    return (
      <div className={cn('group flex flex-col', mine ? 'items-end' : 'items-start')}>
        <div className={mine ? 'text-right' : 'text-left'}>
          {!mine && (
            <p className="mb-0.5 text-[10px] font-medium text-indigo-200">
              {message.author_name || 'Them'}
            </p>
          )}
          <p className={compact ? 'text-2xl leading-none' : 'text-4xl leading-none'}>
            {message.body}
          </p>
          <p className="mt-1 text-[10px] text-slate-500">{clockTime(message.created_date)}</p>
        </div>
        {actions}
      </div>
    );
  }

  return (
    <div className={cn('group flex flex-col', mine ? 'items-end' : 'items-start')}>
      <div
        className={`max-w-[85%] rounded-2xl ${
          compact ? 'px-2.5 py-1.5' : 'px-3.5 py-2'
        } ${
          message.pinned ? 'ring-1 ring-indigo-300/40' : ''
        } ${
          mine
            ? 'bg-gradient-to-br from-indigo-500 to-violet-500 text-white'
            : 'border border-white/8 bg-white/[0.05] text-slate-100'
        }`}
      >
        {!mine && (
          <p className="mb-0.5 text-[10px] font-medium text-indigo-200">
            {message.author_name || 'Them'}
          </p>
        )}
        <p
          className={`whitespace-pre-wrap break-words leading-relaxed ${
            compact ? 'text-[11px]' : 'text-sm'
          }`}
        >
          {message.body}
        </p>
        <p className={`mt-1 text-[10px] ${mine ? 'text-white/70' : 'text-slate-400'}`}>
          {clockTime(message.created_date)}
        </p>
      </div>
      {actions}
    </div>
  );
}