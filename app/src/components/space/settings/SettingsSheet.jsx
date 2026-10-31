import { useState } from 'react';
import { Settings } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import AppearanceSettings from './AppearanceSettings';
import NameField from './NameField';

export default function SettingsSheet({ space, user, onSaved }) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          title="Settings"
          aria-label="Settings"
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-white/10 bg-white/5 text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
        >
          <Settings className="h-4 w-4" />
        </button>
      </SheetTrigger>
      <SheetContent
        side="right"
        className="w-[22rem] overflow-y-auto border-white/10 bg-background/95 px-5 pb-10 pt-6 backdrop-blur-xl sm:max-w-sm"
      >
        <SheetHeader className="text-left">
          <SheetTitle className="font-heading text-lg text-white">Settings</SheetTitle>
          <p className="text-xs text-muted-foreground">Make this little world feel like yours.</p>
        </SheetHeader>

        <div className="mt-6 space-y-7">
          <NameField space={space} user={user} onSaved={onSaved} />
          <AppearanceSettings />
        </div>
      </SheetContent>
    </Sheet>
  );
}