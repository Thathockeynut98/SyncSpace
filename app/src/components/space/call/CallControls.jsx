import {
  HeadphoneOff,
  Headphones,
  Mic,
  MicOff,
  MonitorOff,
  MonitorUp,
  PhoneOff,
  Moon,
  SlidersHorizontal,
  Sun,
  Video,
  VideoOff,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import CameraFacingToggle from './CameraFacingToggle';

const base = 'inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-xs font-medium transition-colors';

export default function CallControls({
  muted,
  sharing,
  cam,
  facing,
  deafened,
  settingsOpen,
  screenMode,
  onScreenMode,
  onMute,
  onShare,
  onCam,
  onFacing,
  onDeafen,
  onSettings,
  onHangUp,
}) {
  return (
    <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
      <button
        onClick={onMute}
        className={cn(
          base,
          muted
            ? 'border-rose-400/30 bg-rose-500/15 text-rose-100'
            : 'border-white/10 bg-white/5 text-slate-200 hover:bg-white/10'
        )}
      >
        {muted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
        {muted ? 'Unmute' : 'Mute'}
      </button>

      <button
        onClick={onDeafen}
        className={cn(
          base,
          deafened
            ? 'border-rose-400/30 bg-rose-500/15 text-rose-100'
            : 'border-white/10 bg-white/5 text-slate-200 hover:bg-white/10'
        )}
        title="Stop hearing them and mute your mic"
      >
        {deafened ? <HeadphoneOff className="h-4 w-4" /> : <Headphones className="h-4 w-4" />}
        {deafened ? 'Undeafen' : 'Deafen'}
      </button>

      <button
        onClick={onCam}
        className={cn(
          base,
          cam
            ? 'border-emerald-400/30 bg-emerald-500/15 text-emerald-100'
            : 'border-white/10 bg-white/5 text-slate-200 hover:bg-white/10'
        )}
        title={sharing ? 'Turning the camera on puts your screen away' : 'Show each other your faces'}
      >
        {cam ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
        {cam ? 'Camera off' : 'Camera on'}
      </button>

      {cam && <CameraFacingToggle facing={facing} onChange={onFacing} />}

      <button
        onClick={onShare}
        className={cn(
          base,
          sharing
            ? 'border-violet-400/30 bg-violet-500/20 text-violet-100'
            : 'border-white/10 bg-white/5 text-slate-200 hover:bg-white/10'
        )}
      >
        {sharing ? <MonitorOff className="h-4 w-4" /> : <MonitorUp className="h-4 w-4" />}
        {sharing ? 'Stop sharing' : 'Share screen'}
      </button>

      <button
        onClick={onSettings}
        className={cn(
          base,
          settingsOpen
            ? 'border-indigo-400/30 bg-indigo-500/20 text-indigo-100'
            : 'border-white/10 bg-white/5 text-slate-200 hover:bg-white/10'
        )}
      >
        <SlidersHorizontal className="h-4 w-4" />
        Voice settings
      </button>

      <button
        onClick={() => onScreenMode(screenMode === 'free' ? 'awake' : 'free')}
        className={cn(
          base,
          screenMode === 'free'
            ? 'border-indigo-400/30 bg-indigo-500/20 text-indigo-100'
            : 'border-white/10 bg-white/5 text-slate-200 hover:bg-white/10'
        )}
        title={
          screenMode === 'free'
            ? 'The screen may go dark — the call keeps going'
            : 'The screen is held lit — tap to let it sleep instead'
        }
      >
        {screenMode === 'free' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
        {screenMode === 'free' ? 'Screen may sleep' : 'Screen stays on'}
      </button>

      <button
        onClick={onHangUp}
        className="inline-flex items-center gap-2 rounded-full bg-rose-500/90 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-rose-500"
      >
        <PhoneOff className="h-4 w-4" />
        End
      </button>
    </div>
  );
}