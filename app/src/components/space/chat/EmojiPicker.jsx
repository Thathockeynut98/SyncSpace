import { useState } from 'react';

const GROUPS = [
  {
    id: 'faces',
    label: 'Faces',
    items: ['😀', '😄', '😁', '😊', '🙂', '😉', '😍', '🥰', '😘', '😋', '😜', '🤪', '🤗', '🤭', '🤔', '🥹', '😴', '😌', '😔', '🥺', '😢', '😭', '😤', '😱', '😅', '🙃', '🫠', '🥳', '😎', '🤩'],
  },
  {
    id: 'love',
    label: 'Love',
    items: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '💖', '💗', '💓', '💞', '💕', '💘', '💝', '💌', '💋', '🫶', '🌹', '💐'],
  },
  {
    id: 'hands',
    label: 'Hands',
    items: ['👍', '👎', '👌', '✌️', '🤞', '🤟', '🤝', '🙌', '👏', '🙏', '💪', '🫂', '👋', '🤙', '☝️', '👀'],
  },
  {
    id: 'things',
    label: 'Things',
    items: ['🌙', '✨', '🌟', '⭐', '🔥', '☀️', '🌈', '☁️', '🌊', '🍂', '🌸', '🌷', '🕯️', '🎬', '🎧', '🎶', '🎵', '📻', '📚', '🧸', '🍫', '🍓', '☕', '🍵', '🥂', '🎂', '🎁', '🐱', '🐶', '🦋', '🪐', '🌌'],
  },
];

export const STICKERS = ['💞', '🫂', '🌙', '✨', '🥹', '😘', '🎧', '🎬', '🕯️', '☕', '💌', '🔥', '🥰', '🤍', '🪐', '🌸', '🧸', '🎶', '🙏', '😴', '🫶', '🌠', '🍫', '🎂'];

export default function EmojiPicker({ onPick, onSticker }) {
  const [tab, setTab] = useState('emoji');

  return (
    <div className="mb-2 rounded-2xl border border-white/10 bg-slate-950/80 p-2 shadow-glow backdrop-blur">
      <div className="mb-1.5 flex items-center gap-1">
        {[
          { id: 'emoji', label: 'Emoji' },
          { id: 'stickers', label: 'Stickers' },
        ].map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
              tab === item.id
                ? 'bg-white/12 text-white'
                : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'stickers' ? (
        <div className="grid max-h-44 grid-cols-8 gap-1 overflow-y-auto pr-1">
          {STICKERS.map((sticker) => (
            <button
              key={sticker}
              type="button"
              onClick={() => onSticker(sticker)}
              className="grid h-9 place-items-center rounded-xl text-xl transition-transform hover:scale-110 hover:bg-white/5"
            >
              {sticker}
            </button>
          ))}
        </div>
      ) : (
        <div className="max-h-44 space-y-1.5 overflow-y-auto pr-1">
          {GROUPS.map((group) => (
            <div key={group.id}>
              <p className="px-1 text-[10px] uppercase tracking-[0.14em] text-slate-500">
                {group.label}
              </p>
              <div className="grid grid-cols-10 gap-0.5">
                {group.items.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => onPick(emoji)}
                    className="grid h-7 place-items-center rounded-lg text-base transition-transform hover:scale-110 hover:bg-white/5"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}