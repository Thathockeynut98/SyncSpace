import { useState } from 'react';
import { ChevronDown, Pin, X } from 'lucide-react';
import { clockTime } from '@/lib/time';
import { cn } from '@/lib/utils';

export default function PinnedMessages({ messages, onUnpin, compact = false }) {
  const [open, setOpen] = useState(false);

  if (!messages.length) return null;

  return (
    <div className="border-b border-white/8 bg-indigo-500/[0.07]">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={cn('flex w-full items-center gap-1.5 text-left', compact ? 'px-3 py-1' : 'px-4 py-1.5')}
      >
        <Pin className="h-3 w-3 shrink-0 text-indigo-300" />
        <span className={cn('font-medium text-indigo-100', compact ? 'text-[10px]' : 'text-[11px]')}>
          {messages.length} pinned
        </span>
        <ChevronDown
          className={cn(
            'ml-auto h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform',
            open && 'rotate-180'
          )}
        />
      </button>

      {open && (
        <ul
          className={cn(
            'space-y-1 overflow-y-auto',
            compact ? 'max-h-24 px-3 pb-2' : 'max-h-40 px-4 pb-2.5'
          )}
        >
          {messages.map((message) => (
            <li
              key={message.id}
              className="flex items-start gap-2 rounded-xl border border-white/8 bg-slate-950/40 px-2 py-1.5"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-[11px] text-slate-200">{message.body}</p>
                <p className="truncate text-[10px] text-slate-500">
                  {message.author_name || 'Them'} · {clockTime(message.created_date)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onUnpin(message)}
                title="Unpin this message"
                className="shrink-0 text-slate-500 transition-colors hover:text-rose-300"
              >
                <X className="h-3 w-3" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}