import { useEffect, useId, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import type { TimeframeOption } from '../types/trading';

interface TradingViewWidgetProps {
  symbol: string;
  timeframe: TimeframeOption;
}

const TV_INTERVAL_MAP: Record<TimeframeOption, string> = {
  '1m': '1',
  '5m': '5',
  '15m': '15',
  '30m': '30',
  '1h': '60',
  '4h': '240',
  '1d': 'D',
  '1w': 'W',
};

declare global {
  interface Window {
    TradingView?: {
      widget: new (config: Record<string, unknown>) => unknown;
    };
  }
}

let tvScriptPromise: Promise<void> | null = null;

function loadTradingViewScript(): Promise<void> {
  if (typeof window !== 'undefined' && window.TradingView?.widget) {
    return Promise.resolve();
  }
  if (tvScriptPromise) {
    return tvScriptPromise;
  }

  tvScriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[src="https://s3.tradingview.com/tv.js"]');
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('TradingView script failed to load.')));
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/tv.js';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      tvScriptPromise = null;
      reject(new Error('Unable to load TradingView widget script. Check your internet connection.'));
    };
    document.head.appendChild(script);
  });

  return tvScriptPromise;
}

export function TradingViewWidget({ symbol, timeframe }: TradingViewWidgetProps) {
  const reactId = useId().replace(/:/g, '');
  const containerId = `tv_chart_${reactId}`;
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoadError(null);

    loadTradingViewScript()
      .then(() => {
        if (cancelled) return;
        const container = document.getElementById(containerId);
        if (!container) return;
        container.innerHTML = '';

        if (!window.TradingView?.widget) {
          setLoadError('TradingView widget constructor is unavailable.');
          return;
        }

        new window.TradingView.widget({
          autosize: true,
          symbol,
          interval: TV_INTERVAL_MAP[timeframe],
          timezone: 'Etc/UTC',
          theme: 'dark',
          style: '1',
          locale: 'en',
          backgroundColor: '#0E1117',
          gridColor: 'rgba(255, 255, 255, 0.05)',
          hide_top_toolbar: false,
          hide_legend: false,
          allow_symbol_change: true,
          save_image: false,
          container_id: containerId,
        });
      })
      .catch((err) => {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : 'Unable to load TradingView chart.');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [symbol, timeframe, containerId]);

  if (loadError) {
    return (
      <div className="h-[360px] sm:h-[460px] lg:h-[520px] rounded-2xl border border-rose-500/30 bg-[#11141A] flex flex-col items-center justify-center p-6 text-center">
        <AlertCircle className="w-8 h-8 text-rose-400 mb-3" />
        <p className="text-sm font-medium text-white mb-1">TradingView Chart Unavailable</p>
        <p className="text-xs text-gray-400 max-w-md">{loadError}</p>
      </div>
    );
  }

  return (
    <div className="h-[360px] sm:h-[460px] lg:h-[520px] w-full rounded-2xl overflow-hidden border border-white/[0.08] bg-[#0E1117]">
      <div id={containerId} className="w-full h-full" />
    </div>
  );
}
