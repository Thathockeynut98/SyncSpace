import { Moon, Sun } from 'lucide-react';
import { ACCENTS, WALLPAPERS, useAppearance } from '@/lib/spaceAppearance';

const THEMES = [
  { id: 'dark', label: 'Night', icon: Moon },
  { id: 'light', label: 'Daylight', icon: Sun },
];

export default function AppearanceSettings() {
  const [appearance, update] = useAppearance();

  return (
    <div className="space-y-6">
      <section className="space-y-2.5">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
          Light or dark
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {THEMES.map((theme) => {
            const Icon = theme.icon;
            const active = appearance.theme === theme.id;
            return (
              <button
                key={theme.id}
                type="button"
                onClick={() => update({ theme: theme.id })}
                className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-medium transition-colors ${
                  active
                    ? 'border-primary/60 bg-primary/15 text-white'
                    : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {theme.label}
              </button>
            );
          })}
        </div>
      </section>

      <section className="space-y-2.5">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
          Your colour
        </h3>
        <div className="flex flex-wrap gap-2">
          {ACCENTS.map((accent) => {
            const active = appearance.accent === accent.id;
            return (
              <button
                key={accent.id}
                type="button"
                onClick={() => update({ accent: accent.id })}
                title={accent.label}
                aria-label={accent.label}
                className={`h-8 w-8 rounded-full transition-transform hover:scale-110 ${accent.swatch} ${
                  active ? 'ring-2 ring-white/80 ring-offset-2 ring-offset-background' : ''
                }`}
              />
            );
          })}
        </div>
      </section>

      <section className="space-y-2.5">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
          Wallpaper
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {WALLPAPERS.map((wallpaper) => {
            const active = appearance.wallpaper === wallpaper.id;
            return (
              <button
                key={wallpaper.id}
                type="button"
                onClick={() => update({ wallpaper: wallpaper.id })}
                className={`overflow-hidden rounded-xl border text-left transition-colors ${
                  active
                    ? 'border-primary/60 bg-primary/10'
                    : 'border-white/10 bg-white/5 hover:bg-white/10'
                }`}
              >
                <span className={`block h-12 w-full bg-gradient-to-br ${wallpaper.preview}`} />
                <span className="block px-2.5 py-2">
                  <span className="block text-xs font-medium text-white">{wallpaper.label}</span>
                  <span className="block text-[10px] text-slate-400">{wallpaper.hint}</span>
                </span>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}