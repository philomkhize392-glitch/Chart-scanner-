import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export function OfflineIndicator() {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-20 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 rounded-xl border border-amber-500/40 bg-[#171B22]/95 backdrop-blur-md px-3.5 py-2 text-xs font-medium text-amber-200 shadow-lg whitespace-nowrap"
    >
      <WifiOff className="w-3.5 h-3.5 text-amber-400 shrink-0" />
      <span>Offline — Live feeds & image scan require internet</span>
    </div>
  );
}
