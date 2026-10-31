import { CalendarHeart, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { greeting } from '@/lib/moods';
import { displayName } from '@/lib/spaceData';
import MoodTracker from './MoodTracker';
import ThinkingOfYou from './ThinkingOfYou';
import LeftForYou from './LeftForYou';
import MemoryWall from './MemoryWall';
import InstallCard from '../install/InstallCard';
import VoiceNotes from './VoiceNotes';
import ChatRoom from '../ChatRoom';

export default function HomeLanding({ space, user, room, tabs, onNavigate }) {
  const myName = displayName(user);
  const memberNames = space.member_names || [];
  const partnerName = memberNames.find((name) => name !== myName) || 'your person';
  const partner = (room.peers || []).find((peer) => peer.seat !== room.seat) || null;

  const rooms = tabs.filter((tab) => tab.id !== 'home');
  const dateLine = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="space-y-4">
      <section className="glass-card relative overflow-hidden rounded-3xl p-5 shadow-soft sm:p-6">
        <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-fuchsia-500/20 blur-3xl" />
        <div className="relative">
          <p className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.18em] text-indigo-300">
            <CalendarHeart className="h-3.5 w-3.5" />
            {dateLine}
          </p>
          <h2 className="mt-2 font-heading text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            {greeting()}, {myName}
          </h2>
          <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
            <span
              className={cn(
                'h-1.5 w-1.5 rounded-full',
                partner ? 'bg-emerald-400 animate-pulse-soft' : 'bg-amber-400'
              )}
            />
            {partner
              ? `${partner.name} is here with you right now`
              : `${partnerName} is away — leave them something to find`}
          </p>
        </div>
      </section>

      <VoiceNotes space={space} user={user} />

      <InstallCard />

      <LeftForYou space={space} user={user} />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_19rem] xl:grid-cols-[minmax(0,1fr)_19rem_19rem]">
        <MoodTracker space={space} user={user} partnerName={partnerName} />
        <div className="lg:col-span-2 xl:col-span-1">
          <ChatRoom space={space} user={user} room={room} compact />
        </div>
        <ThinkingOfYou
          space={space}
          user={user}
          partnerName={partnerName}
          partnerOnline={Boolean(partner)}
        />
      </div>

      <MemoryWall space={space} user={user} />

      <section>
        <h3 className="mb-2 flex items-center gap-1.5 px-1 text-[11px] uppercase tracking-[0.16em] text-slate-500">
          <Sparkles className="h-3.5 w-3.5" />
          Where to go
        </h3>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {rooms.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => onNavigate(tab.id)}
                className="group flex items-center gap-2 rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-2.5 text-left transition-colors hover:border-indigo-400/30 hover:bg-indigo-500/10"
              >
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-indigo-500/25 to-violet-500/15 text-indigo-200">
                  <Icon className="h-4 w-4" />
                </span>
                <span className="min-w-0 truncate text-xs font-medium text-slate-200">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}