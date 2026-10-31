import { WALLPAPERS, useAppearance } from '@/lib/spaceAppearance';

export default function SpaceBackdrop() {
  const [appearance] = useAppearance();
  const wallpaper = WALLPAPERS.find((item) => item.id === appearance.wallpaper) || WALLPAPERS[0];
  const showGlows = wallpaper.id !== 'linen';

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div className={`absolute inset-0 ${wallpaper.layer}`} />

      {showGlows && (
        <>
          <div className="aura-blob aura-1 absolute -left-32 -top-40 h-[32rem] w-[32rem] animate-drift-slow" />
          <div className="aura-blob aura-2 absolute -right-32 top-1/4 h-[28rem] w-[28rem] animate-drift" />
          <div className="aura-blob aura-3 absolute bottom-[-12rem] left-1/4 h-[26rem] w-[26rem] animate-drift-slow" />
          <div className="aura-blob aura-4 absolute left-1/2 top-1/3 h-64 w-64 -translate-x-1/2 animate-float" />
        </>
      )}

      <div className="wallpaper-veil absolute inset-0" />
    </div>
  );
}