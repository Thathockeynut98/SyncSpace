import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';

// One quiet card that slides in at the top of the screen when the other person
// opens a room or writes to you. Tapping it takes you straight there.
export default function NotificationToast({ toasts, onOpen, onDismiss }) {
  return (
    <div className="pointer-events-none fixed inset-x-0 top-[4.2rem] z-50 flex flex-col items-center gap-2 px-4 md:inset-x-auto md:right-6 md:top-5 md:items-end">
      <AnimatePresence initial={false}>
        {toasts.map((toast) => {
          const Icon = toast.icon;
          return (
            <motion.div
              key={toast.id}
              layout
              initial={{ opacity: 0, y: -12, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.97 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="pointer-events-auto w-full max-w-sm"
            >
              <div
                role="button"
                tabIndex={0}
                onClick={() => onOpen(toast)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') onOpen(toast);
                }}
                className="glass-card flex w-full cursor-pointer items-start gap-3 rounded-2xl border border-white/10 px-3.5 py-3 text-left shadow-soft transition hover:border-indigo-300/40"
              >
                <span
                  className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
                    toast.tone === 'message'
                      ? 'bg-fuchsia-400/15 text-fuchsia-200'
                      : toast.tone === 'heart'
                        ? 'bg-rose-400/15 text-rose-200'
                        : 'bg-indigo-400/15 text-indigo-200'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-semibold text-white">{toast.title}</span>
                  <span className="mt-0.5 block truncate text-[11px] text-white/55">{toast.detail}</span>
                </span>

                <button
                  type="button"
                  aria-label="Dismiss"
                  onClick={(event) => {
                    event.stopPropagation();
                    onDismiss(toast.id);
                  }}
                  className="mt-0.5 rounded-lg p-1 text-white/35 transition hover:bg-white/10 hover:text-white/70"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}