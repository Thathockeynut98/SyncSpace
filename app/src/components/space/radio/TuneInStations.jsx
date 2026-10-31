import { ExternalLink, Loader2, Pause, Play, Radio, Star } from 'lucide-react';
import { useState } from 'react';
import {
  GENRE_LABEL,
  GENRE_TINT,
  TUNEIN_BROWSE,
  TUNEIN_GENRES,
  TUNEIN_STATIONS,
} from '@/lib/tuneinStations';
import { playStation, toggleStation } from '@/lib/tuneinPlayer';
import { toggleFavorite } from '@/lib/stationFavorites';
import { useStationFavorites, useTuneInPlayer } from '@/lib/useTuneIn';
import { cn } from '@/lib/utils';

export default function TuneInStations() {
  const [genre, setGenre] = useState('all');
  const player = useTuneInPlayer();
  const favorites = useStationFavorites();

  const stations = TUNEIN_STATIONS.filter((station) => {
    if (genre === 'favorites') return favorites.includes(station.id);
    if (genre === 'all') return true;
    return station.genre === genre;
  });

  const stationsById = new Map(TUNEIN_STATIONS.map((station) => [station.id, station]));
  const favoriteStations = favorites.map((id) => stationsById.get(id)).filter(Boolean);

  const pick = (station) => {
    if (player.stationId === station.id) toggleStation();
    else playStation(station);
  };

  return (
    <section className="glass-card rounded-3xl p-4 shadow-soft sm:p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-heading text-lg font-semibold tracking-tight text-white">TuneIn stations</h2>
          <p className="text-xs text-muted-foreground">
            US stations across country, classical, rock and pop. Tap one and it keeps playing on every tab.
          </p>
        </div>
        <span className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] text-slate-300">
          <Radio className="h-3.5 w-3.5" />
          {TUNEIN_STATIONS.length} stations
        </span>
      </div>

      {favoriteStations.length > 0 && genre !== 'favorites' && (
        <button
          onClick={() => setGenre('favorites')}
          className="mb-3 flex w-full items-center gap-2 rounded-2xl border border-amber-300/20 bg-amber-400/[0.07] px-3 py-2 text-left transition-colors hover:bg-amber-400/[0.12]"
        >
          <Star className="h-3.5 w-3.5 fill-amber-300 text-amber-300" />
          <span className="min-w-0 flex-1 truncate text-[11px] text-amber-100/90">
            {favoriteStations[0].name}
            {favoriteStations.length > 1 ? ` and ${favoriteStations.length - 1} more favorite${favoriteStations.length > 2 ? 's' : ''}` : ''}
          </span>
          <span className="shrink-0 text-[11px] text-amber-200/70">View</span>
        </button>
      )}

      {player.error && (
        <p className="mb-3 rounded-xl border border-rose-400/25 bg-rose-500/10 px-3 py-2 text-[11px] text-rose-200">
          {player.error}
        </p>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-1.5">
        {TUNEIN_GENRES.map((item) => (
          <button
            key={item.id}
            onClick={() => setGenre(item.id)}
            className={cn(
              'rounded-full border px-3 py-1.5 text-xs transition-colors',
              genre === item.id
                ? 'border-violet-400/40 bg-violet-500/15 text-violet-100'
                : 'border-white/8 bg-white/[0.03] text-slate-400 hover:border-violet-400/25 hover:text-slate-200'
            )}
          >
            {item.label}
          </button>
        ))}
        <button
          onClick={() => setGenre('favorites')}
          className={cn(
            'flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-colors',
            genre === 'favorites'
              ? 'border-amber-300/40 bg-amber-400/15 text-amber-100'
              : 'border-white/8 bg-white/[0.03] text-slate-400 hover:border-amber-300/25 hover:text-amber-100'
          )}
        >
          <Star className={cn('h-3 w-3', favorites.length ? 'fill-amber-300 text-amber-300' : '')} />
          Favorites{favorites.length ? ` · ${favorites.length}` : ''}
        </button>
        {genre !== 'all' && genre !== 'favorites' && (
          <a
            href={TUNEIN_BROWSE[genre]}
            target="_blank"
            rel="noreferrer noopener"
            className="ml-auto flex items-center gap-1 text-[11px] text-violet-200/80 transition-colors hover:text-violet-100"
          >
            Browse all {GENRE_LABEL[genre].toLowerCase()}
            <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>

      {stations.length === 0 ? (
        <p className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-8 text-center text-xs text-muted-foreground">
          No favorites yet. Tap the star on any station to keep it here.
        </p>
      ) : (
        <div className="grid gap-2.5 sm:grid-cols-2">
          {stations.map((station) => {
            const isActive = player.stationId === station.id;
            const isPlaying = isActive && player.status === 'playing';
            const saved = favorites.includes(station.id);
            return (
              <div
                key={station.id}
                className={cn(
                  'flex items-center gap-2 rounded-2xl border p-3 transition-colors',
                  isActive
                    ? 'border-violet-400/35 bg-violet-500/12'
                    : 'border-white/8 bg-white/[0.03] hover:border-violet-400/25 hover:bg-violet-500/[0.07]'
                )}
              >
                <button type="button" onClick={() => pick(station)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                  <span
                    className={cn(
                      'grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br text-white',
                      GENRE_TINT[station.genre]
                    )}
                  >
                    {isActive && player.status === 'loading' ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : isPlaying ? (
                      <Pause className="h-4 w-4" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-slate-100">{station.name}</span>
                    <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">{station.blurb}</span>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => toggleFavorite(station.id)}
                  aria-label={saved ? `Remove ${station.name} from favorites` : `Save ${station.name} to favorites`}
                  aria-pressed={saved}
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-full transition-colors hover:bg-white/10"
                >
                  <Star className={cn('h-3.5 w-3.5', saved ? 'fill-amber-300 text-amber-300' : 'text-slate-500')} />
                </button>
                <a
                  href={station.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  title="Open on TuneIn"
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-slate-500 transition-colors hover:bg-white/10 hover:text-violet-200"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            );
          })}
        </div>
      )}

      <p className="mt-4 border-t border-white/6 pt-3 text-[11px] text-muted-foreground">
        Favorites are saved on this device. Stations play straight from their own live stream, so some carry their own ads.
      </p>
    </section>
  );
}