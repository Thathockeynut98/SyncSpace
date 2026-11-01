import { cn } from '@/lib/utils';

export default function TypingIndicator({ name, compact = false }) {
  return (
    <div
      className={cn(
        'flex items-center gap-1.5 text-muted-foreground transition-opacity',
        compact ? 'px-3 pb-1 text-[10px]' : 'px-4 pb-1.5 text-[11px]'
      )}
    >
      <span className="flex items-center gap-1">
        {[0, 1, 2].map((dot) => (
          <span
            key={dot}
            className="h-1.5 w-1.5 rounded-full bg-indigo-300/70 animate-pulse-soft"
            style={{ animationDelay: `${dot * 180}ms` }}
          />
        ))}
      </span>
      <span className="truncate">{name} is typing</span>
    </div>
  );
}