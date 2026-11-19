import { useState } from 'react';
import { BottomNav } from './components/BottomNav';
import { FundamentalSection } from './components/FundamentalSection';
import { Header } from './components/Header';
import { ImageScannerSection } from './components/ImageScannerSection';
import { LiveChartSection } from './components/LiveChartSection';
import { OfflineIndicator } from './components/OfflineIndicator';
import type { ActiveTab } from './types/trading';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('scanner');
  const [mountedTabs, setMountedTabs] = useState<Record<ActiveTab, boolean>>({
    scanner: true,
    chart: false,
    fundamental: false,
  });

  const handleTabChange = (tab: ActiveTab) => {
    setActiveTab(tab);
    setMountedTabs((prev) => (prev[tab] ? prev : { ...prev, [tab]: true }));
  };

  return (
    <div className="min-h-screen bg-[#090B0E] text-[#F3F4F6] flex flex-col">
      <Header activeTab={activeTab} />

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 pt-5 pb-24">
        {mountedTabs.scanner && (
          <section
            aria-label="Image Scanner"
            className={activeTab === 'scanner' ? 'block' : 'hidden'}
          >
            <ImageScannerSection />
          </section>
        )}

        {mountedTabs.chart && (
          <section
            aria-label="Live Chart"
            className={activeTab === 'chart' ? 'block' : 'hidden'}
          >
            <LiveChartSection />
          </section>
        )}

        {mountedTabs.fundamental && (
          <section
            aria-label="Fundamental Analysis"
            className={activeTab === 'fundamental' ? 'block' : 'hidden'}
          >
            <FundamentalSection />
          </section>
        )}
      </main>

      <OfflineIndicator />
      <BottomNav activeTab={activeTab} onChange={handleTabChange} />
    </div>
  );
}
