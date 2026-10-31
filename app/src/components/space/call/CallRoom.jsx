import { useEffect, useState } from 'react';
import { HeadphoneOff, MonitorUp, Phone, ShieldCheck, SlidersHorizontal, Video } from 'lucide-react';
import CallControls from './CallControls';
import CallStage from './CallStage';
import CallSettings from './CallSettings';
import LineHealth from './LineHealth';
import CallQualityMenu from './CallQualityMenu';

export default function CallRoom({ call }) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { prepare, unprepare } = call;

  // The line is warmed the moment this tab opens — routes found, relay picked,
  // microphone up if the browser has already been told yes — so pressing call
  // connects at once instead of starting from nothing.
  useEffect(() => {
    prepare();
    return () => unprepare();
  }, [prepare, unprepare]);

  if (call.incoming) {
    return (
      <section className="glass-card rounded-3xl p-6 text-center shadow-soft">
        <span className="mx-auto grid h-14 w-14 animate-pulse place-items-center rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 text-white">
          <Phone className="h-6 w-6" />
        </span>
        <h2 className="mt-4 font-heading text-lg font-semibold text-white">{call.partnerName} is calling</h2>
        <p className="mx-auto mt-1 max-w-xs text-xs leading-relaxed text-muted-foreground">
          Joining asks your browser for the microphone. The sound travels straight between your two devices.
        </p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          <button
            onClick={call.joinCall}
            className="rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 px-5 py-2.5 text-sm font-semibold text-white shadow-glow"
          >
            Join the call
          </button>
          <button
            onClick={call.dismiss}
            className="rounded-full border border-white/10 bg-white/5 px-5 py-2.5 text-sm text-slate-300 transition-colors hover:bg-white/10"
          >
            Not right now
          </button>
        </div>
      </section>
    );
  }

  if (call.phase === 'idle') {
    return (
      <section className="glass-card rounded-3xl p-6 shadow-soft sm:p-8">
        <div className="mx-auto max-w-md text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-white">
            <Phone className="h-6 w-6" />
          </span>
          <h2 className="mt-4 font-heading text-xl font-semibold tracking-tight text-white">
            {call.elsewhere
              ? 'Your call is running on another device'
              : 'Call, turn on your camera, or share your screen'}
          </h2>
          <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
            {call.elsewhere
              ? 'Bring it here and this device takes it up. The other one lets go of the microphone and the line, so the call follows you in one tap.'
              : 'Voice, camera and screen sharing use encrypted WebRTC transport, directly or through a relay. SyncSpace does not record calls.'}
          </p>

          {(call.error || call.notice) && (
            <p className="mt-4 rounded-xl border border-rose-400/25 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
              {call.error || call.notice}
            </p>
          )}

          <button
            onClick={call.startCall}
            className={`mt-5 inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-semibold text-white shadow-glow transition-transform hover:scale-[1.02] ${
              call.elsewhere
                ? 'bg-gradient-to-r from-indigo-500 to-fuchsia-500'
                : 'bg-gradient-to-r from-emerald-500 to-teal-500'
            }`}
          >
            <Phone className="h-4 w-4" />
            {call.elsewhere ? 'Bring the call here' : 'Start a call'}
          </button>

          <button
            onClick={() => setSettingsOpen((open) => !open)}
            className="mt-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[11px] font-medium text-slate-200 transition-colors hover:bg-white/10"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Mic and deafen settings
          </button>

          {settingsOpen && (
            <CallSettings
              voice={call.voice}
              level={call.level}
              muted={call.muted}
              deafened={call.deafened}
              onChange={call.changeVoice}
              onDeafen={call.toggleDeafen}
            />
          )}

          <div className="mt-6 grid gap-2 text-left sm:grid-cols-2">
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-3">
              <MonitorUp className="h-4 w-4 text-indigo-300" />
              <p className="mt-1.5 text-xs font-medium text-slate-100">Watch together, for real</p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                Once you are on the call, turn on your camera or share a tab.
              </p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-3">
              <ShieldCheck className="h-4 w-4 text-emerald-300" />
              <p className="mt-1.5 text-xs font-medium text-slate-100">Just the two of you</p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                Allow the microphone when the browser asks — it will.
              </p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="glass-card rounded-3xl p-4 shadow-soft sm:p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 className="font-heading text-base font-semibold text-white">
            {call.phase === 'waiting' ? 'In a call waiting for your partner' : `In a call with ${call.partnerName}`}
          </h2>
          <p className="text-[11px] text-muted-foreground">
            {call.phase === 'live'
              ? `Connected · ${Math.floor(call.duration/60)}:${String(call.duration%60).padStart(2,'0')}`
              : call.phase === 'waiting'
                ? 'They will join as soon as they answer'
                : 'Connecting…'}
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-1.5">
          <LineHealth line={call.line} />
          <CallQualityMenu quality={call.quality} onChange={call.changeQuality} />
          {call.sharing && (
            <span className="rounded-full border border-violet-400/30 bg-violet-500/15 px-3 py-1 text-[10px] text-violet-100">
              Sharing your screen
            </span>
          )}
          {call.cam && (
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-500/15 px-3 py-1 text-[10px] text-emerald-100">
              <Video className="h-3 w-3" />
              Camera on
            </span>
          )}
          {call.deafened && (
            <span className="inline-flex items-center gap-1 rounded-full border border-rose-400/30 bg-rose-500/15 px-3 py-1 text-[10px] text-rose-100">
              <HeadphoneOff className="h-3 w-3" />
              Deafened
            </span>
          )}
        </div>
      </div>

      <CallStage
        remote={call.remote}
        self={call.self}
        cam={call.cam}
        facing={call.facing}
        hasVideo={call.hasVideo}
        sharing={call.sharing}
        phase={call.phase}
        partnerName={call.partnerName}
        muted={call.muted}
      />

      {call.error && (
        <p className="mt-3 rounded-xl border border-rose-400/25 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
          {call.error}
        </p>
      )}

      {call.shareHint && !call.error && (
        <p className="mt-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-300">
          {call.shareHint}
        </p>
      )}

      {call.notice && !call.error && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
          <p className="text-xs text-slate-300">{call.notice}</p>
          {call.phase !== 'live' && (
            <button
              onClick={call.retry}
              className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] font-medium text-slate-200 transition-colors hover:bg-white/10"
            >
              Try again
            </button>
          )}
        </div>
      )}

      <CallControls
        muted={call.muted}
        sharing={call.sharing}
        cam={call.cam}
        facing={call.facing}
        deafened={call.deafened}
        settingsOpen={settingsOpen}
        screenMode={call.screenMode}
        onScreenMode={call.changeScreenMode}
        onMute={call.toggleMute}
        onShare={call.toggleShare}
        onCam={call.toggleCam}
        onFacing={call.switchFacing}
        onDeafen={call.toggleDeafen}
        onSettings={() => setSettingsOpen((open) => !open)}
        onHangUp={call.hangUp}
      />

      {settingsOpen && (
        <CallSettings
          voice={call.voice}
          level={call.level}
          muted={call.muted}
          deafened={call.deafened}
          onChange={call.changeVoice}
          onDeafen={call.toggleDeafen}
        />
      )}
    </section>
  );
}