import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export default function TabDock({ tabs, active, onChange }) {
  return (
    <>
      <nav className="relative z-20 mx-auto hidden w-full max-w-6xl px-4 pt-6 md:block">
        <div className="inline-flex flex-wrap items-center gap-1 rounded-2xl border border-white/8 bg-white/5 p-1 backdrop-blur-xl">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = active === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onChange(tab.id)}
                className={cn(
                  'relative flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-colors',
                  isActive ? 'text-white' : 'text-slate-400 hover:text-slate-200'
                )}
              >
                {isActive && (
                  <motion.span
                    layoutId="tab-pill-desktop"
                    className="absolute inset-0 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 shadow-glow"
                    transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                  />
                )}
                <span className="relative flex items-center gap-2">
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      <nav className="glass-panel fixed bottom-0 left-0 right-0 z-40 border-t border-white/8 pb-[env(safe-area-inset-bottom)] md:hidden">
        <div className="flex items-stretch gap-0.5 overflow-x-auto px-1.5 py-1.5">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = active === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onChange(tab.id)}
                className={cn(
                  'relative flex min-w-[58px] shrink-0 flex-col items-center gap-1 rounded-xl px-2 py-2 text-[10px] font-medium transition-colors',
                  isActive ? 'text-white' : 'text-slate-500'
                )}
              >
                {isActive && (
                  <motion.span
                    layoutId="tab-pill-mobile"
                    className="absolute inset-x-2 inset-y-0 -z-10 rounded-xl bg-gradient-to-b from-indigo-500/25 to-violet-500/10"
                    transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                  />
                )}
                <Icon className={cn('h-5 w-5 transition-transform', isActive && 'scale-110')} />
                {tab.short}
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}