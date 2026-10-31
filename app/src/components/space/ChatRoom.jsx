import { useEffect, useRef, useState } from 'react';
import { Loader2, Lock, Search, X } from 'lucide-react';
import { displayName } from '@/lib/spaceData';
import { cn } from '@/lib/utils';
import { useMessages } from '@/lib/useMessages';
import ChatComposer from './chat/ChatComposer';
import ChatMessage from './chat/ChatMessage';
import MessageAlertsButton from './chat/MessageAlertsButton';
import PinnedMessages from './chat/PinnedMessages';
import TypingIndicator from './chat/TypingIndicator';

export default function ChatRoom({ space, user, room, compact = false }) {
  const {messages,sending,ready,error,load,send,retry,toggleHeart,togglePin}=useMessages(space,user,room);
  const [partnerTyping,setPartnerTyping]=useState(false);
  const [search,setSearch]=useState('');
  const [searchOpen,setSearchOpen]=useState(false);
  const listRef=useRef(null),bottomRef=useRef(true),sentAtRef=useRef(0),typingTimer=useRef(null);
  const myName=displayName(user);
  const partnerName=(space.member_names||[]).find(name=>name!==myName)||'your person';
  // A quiet pulse to the room while one of us is writing, and a fade if it stops.
  useEffect(() => {
    if (!room) return undefined;
    return room.on('typing', (msg) => {
      if (msg.from === room.seat) return;
      clearTimeout(typingTimer.current);
      setPartnerTyping(msg.on === true);
      if (msg.on === true) {
        typingTimer.current = setTimeout(() => setPartnerTyping(false), 3200);
      }
    });
  }, [room, room?.seat]);

  useEffect(() => () => clearTimeout(typingTimer.current), []);

  const notifyTyping = () => {
    const now = Date.now();
    if (now - sentAtRef.current < 1500) return;
    sentAtRef.current = now;
    room?.send({ type: 'typing', on: true });
  };

  useEffect(()=>{
    const list=listRef.current;if(list&&bottomRef.current)list.scrollTop=list.scrollHeight;
  },[messages,ready]);

  const query = search.trim().toLowerCase();
  const visible = query
    ? messages.filter((message) => message.body.toLowerCase().includes(query))
    : messages;
  const pinnedMessages = messages.filter((message) => message.pinned);

  return (
    <section data-chat-compact={String(compact)}
      className={cn(
        'glass-card flex flex-col overflow-hidden rounded-3xl shadow-soft',
        compact
          ? 'aspect-square w-full max-w-[300px]'
          : 'h-[58vh] min-h-[380px] md:h-[66vh]'
      )}
    >
      <div
        className={cn(
          'flex items-center justify-between gap-2 border-b border-white/8',
          compact ? 'px-3 py-1.5' : 'gap-3 px-4 py-3'
        )}
      >
        <div className="min-w-0">
          <h3
            className={cn(
              'font-heading font-semibold tracking-tight text-white',
              compact ? 'text-xs' : 'text-sm'
            )}
          >
            Our chat
          </h3>
          {!compact && (
            <p className="truncate text-[11px] text-muted-foreground">Just you and {partnerName}</p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              setSearchOpen((value) => !value);
              if (searchOpen) setSearch('');
            }}
            title="Search our chat"
            className={cn(
              'inline-flex items-center justify-center rounded-full border transition-colors',
              compact ? 'h-6 w-6' : 'h-7 w-7',
              searchOpen
                ? 'border-indigo-300/40 bg-indigo-400/15 text-indigo-100'
                : 'border-white/10 bg-white/[0.04] text-slate-400 hover:text-slate-200'
            )}
          >
            <Search className="h-3.5 w-3.5" />
          </button>
          <MessageAlertsButton compact={compact} />
          <span
            className={cn(
              'inline-flex shrink-0 items-center gap-1 rounded-full border border-emerald-300/20 bg-emerald-300/10 font-medium text-emerald-200',
              compact ? 'hidden' : 'px-2.5 py-1 text-[11px]'
            )}
          >
            <Lock className="h-3 w-3" />
            Encrypted
          </span>
        </div>
      </div>

      {searchOpen && (
        <div
          className={cn(
            'flex items-center gap-2 border-b border-white/8 bg-slate-950/30',
            compact ? 'px-3 py-1.5' : 'px-4 py-2'
          )}
        >
          <Search className="h-3.5 w-3.5 shrink-0 text-slate-500" />
          <input
            autoFocus
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search what you two said…"
            className={cn(
              'min-w-0 flex-1 bg-transparent text-slate-100 outline-none placeholder:text-slate-500',
              compact ? 'text-[11px]' : 'text-xs'
            )}
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              title="Clear search"
              className="shrink-0 text-slate-500 transition-colors hover:text-slate-200"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}

      <PinnedMessages messages={pinnedMessages} onUnpin={togglePin} compact={compact} />

      <div
        ref={listRef}
        data-testid="message-list"
        onScroll={()=>{const list=listRef.current;bottomRef.current=list.scrollHeight-list.scrollTop-list.clientHeight<80}}
        className={cn(
          'min-h-0 flex-1 overflow-y-auto',
          compact ? 'space-y-2 px-3 py-2.5' : 'space-y-2.5 px-4 py-4'
        )}
      >
        {!ready && (
          <div className="grid h-full place-items-center">
            <Loader2 className="h-5 w-5 animate-spin text-indigo-300" />
          </div>
        )}

        {error && (
          <div role="alert" className="rounded-xl border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-xs text-rose-200">
            {error} <button type="button" className="ml-2 underline" onClick={() => load()}>Retry</button>
          </div>
        )}

        {ready && messages.length > 0 && !visible.length && (
          <p
            className={cn(
              'rounded-2xl border border-dashed border-white/12 text-center text-muted-foreground',
              compact ? 'px-3 py-4 text-[11px] leading-snug' : 'px-4 py-8 text-xs leading-relaxed'
            )}
          >
            Nothing matches “{search.trim()}”.
          </p>
        )}

        {ready && !messages.length && (
          <p
            className={cn(
              'rounded-2xl border border-dashed border-white/12 text-center text-muted-foreground',
              compact
                ? 'px-3 py-4 text-[11px] leading-snug'
                : 'px-4 py-8 text-xs leading-relaxed'
            )}
          >
            Nothing said yet. Everything you write here is scrambled before it is saved.
          </p>
        )}

        {visible.map((message) => (
          <ChatMessage
            key={message.id}
            message={message}
            mine={String(message.author_id) === String(user.id) || message.author_id?.toLowerCase() === user.email?.toLowerCase() || message.authorEmail?.toLowerCase() === user.email?.toLowerCase()}
            user={user}
            compact={compact}
            onHeart={toggleHeart}
            onPin={togglePin}
            onRetry={retry}
          />
        ))}
      </div>

      {partnerTyping && <TypingIndicator name={partnerName} compact={compact} />}

      <ChatComposer
        onSend={send}
        onTyping={notifyTyping}
        sending={sending}
        partnerName={partnerName}
        compact={compact}
      />
    </section>
  );
}