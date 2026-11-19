import { CandlestickChart, Globe, ScanLine } from 'lucide-react';
import type { ActiveTab } from '../types/trading';

interface BottomNavProps {
  activeTab: ActiveTab;
  onChange: (tab: ActiveTab) => void;
}

const NAV_ITEMS: Array<{
  id: ActiveTab;
  label: string;
  icon: typeof ScanLine;
}> = [
  { id: 'scanner', label: 'Image Scanner', icon: ScanLine },
  { id: 'chart', label: 'Live Chart', icon: CandlestickChart },
  { id: 'fundamental', label: 'Fundamental Analysis', icon: Globe },
];

export function BottomNav({ activeTab, onChange }: BottomNavProps) {
  return (
    <nav
      aria-label="Primary Navigation"
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/[0.08] bg-[#090B0E]/95 backdrop-blur-md"
    >
      <div className="max-w-3xl mx-auto grid grid-cols-3 h-16">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onChange(item.id)}
              aria-current={isActive ? 'page' : undefined}
              className={`relative flex flex-col items-center justify-center min-h-[44px] px-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-400 ${
                isActive ? 'text-emerald-400' : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              {isActive && (
                <span
                  aria-hidden="true"
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-0.5 bg-emerald-400"
                />
              )}
              <Icon className="w-5 h-5 shrink-0" strokeWidth={isActive ? 2.25 : 1.75} />
              <span className="text-[11px] font-medium tracking-tight mt-1 whitespace-nowrap truncate max-w-full">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
