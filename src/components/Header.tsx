import type { ActiveTab } from '../types/trading';
import { PWAInstallButton } from './PWAInstallButton';

interface HeaderProps {
  activeTab: ActiveTab;
}

const SECTION_DESCRIPTIONS: Record<ActiveTab, string> = {
  scanner: 'Chart Screenshot Technical Scanner',
  chart: 'Live TradingView Chart & Market Analysis',
  fundamental: 'Grounded Economic & Central Bank Analysis',
};

export function Header({ activeTab }: HeaderProps) {
  return (
    <header className="border-b border-white/[0.08] bg-[#090B0E] pt-[env(safe-area-inset-top)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
        <span className="text-lg font-bold tracking-tight text-white whitespace-nowrap shrink-0">
          Chart<span className="text-emerald-400">Scope</span>
        </span>
        <span className="hidden sm:inline text-xs sm:text-sm text-gray-400 truncate">
          {SECTION_DESCRIPTIONS[activeTab]}
        </span>
        <div className="flex items-center shrink-0">
          <PWAInstallButton />
        </div>
      </div>
    </header>
  );
}
