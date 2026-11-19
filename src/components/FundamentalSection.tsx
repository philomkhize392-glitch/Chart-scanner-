import { useState } from 'react';
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  ExternalLink,
  Loader2,
} from 'lucide-react';
import type { AnalysisPeriod, FundamentalAnalysisResult } from '../types/trading';

const MARKETS = [
  'XAUUSD',
  'EURUSD',
  'GBPUSD',
  'USDJPY',
  'BTCUSD',
  'ETHUSD',
  'NAS100',
  'US500',
  'DXY',
  'AUDUSD',
  'USDCAD',
  'EURGBP',
];

const US_EVENTS = [
  'FOMC',
  'FOMC Minutes',
  'Federal Interest Rate Decision',
  'NFP',
  'CPI',
  'Core CPI',
  'PPI',
  'PCE',
  'Core PCE',
  'GDP',
  'PMI',
  'ISM Manufacturing PMI',
  'ISM Services PMI',
  'JOLTS',
  'Unemployment Rate',
  'Retail Sales',
  'Initial Jobless Claims',
];

const CENTRAL_BANK_EVENTS = [
  'ECB Interest Rate Decision',
  'BOE Interest Rate Decision',
  'BOJ Interest Rate Decision',
  'SNB Monetary Policy Decision',
  'RBA Interest Rate Decision',
  'BOC Interest Rate Decision',
];

const ANALYSIS_PERIODS: AnalysisPeriod[] = [
  'Next 24 hours',
  'Next 1–3 days',
  'Next 1 week',
];

export function FundamentalSection() {
  const [market, setMarket] = useState('XAUUSD');
  const [economicEvent, setEconomicEvent] = useState('FOMC');
  const [analysisPeriod, setAnalysisPeriod] = useState<AnalysisPeriod>('Next 1–3 days');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<FundamentalAnalysisResult | null>(null);

  const handleAnalyze = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/fundamental-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          market,
          economicEvent,
          analysisPeriod,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to research fundamental news.');
      }

      setResult(data as FundamentalAnalysisResult);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Network error while searching public economic releases. Check your connection and retry.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Controls Column */}
        <div className="lg:col-span-5 rounded-2xl border border-white/[0.08] bg-[#11141A] p-4 sm:p-5 space-y-5">
          <h1 className="text-base sm:text-lg font-semibold text-white">
            Fundamental Research Parameters
          </h1>

          {/* Market Selection */}
          <div className="space-y-2">
            <label htmlFor="fundamental-market" className="block text-xs font-medium text-gray-300">
              Market
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {MARKETS.slice(0, 8).map((item) => {
                const active = market === item;
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setMarket(item)}
                    className={`min-h-[40px] px-2.5 py-2 rounded-xl text-xs font-mono font-medium border transition-colors ${
                      active
                        ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-300'
                        : 'bg-[#171B22] border-white/[0.06] text-gray-300 hover:text-white'
                    }`}
                  >
                    {item}
                  </button>
                );
              })}
            </div>
            <select
              id="fundamental-market"
              value={market}
              onChange={(e) => setMarket(e.target.value)}
              className="w-full min-h-[44px] px-3 rounded-xl bg-[#171B22] border border-white/[0.1] text-sm text-white focus:outline-none focus:border-emerald-400"
            >
              {MARKETS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          {/* Economic Event Selection */}
          <div className="space-y-2">
            <label htmlFor="economic-event" className="block text-xs font-medium text-gray-300">
              Economic Event / Central Bank
            </label>
            <select
              id="economic-event"
              value={economicEvent}
              onChange={(e) => setEconomicEvent(e.target.value)}
              className="w-full min-h-[44px] px-3 rounded-xl bg-[#171B22] border border-white/[0.1] text-sm text-white focus:outline-none focus:border-emerald-400"
            >
              <optgroup label="United States Economic Events">
                {US_EVENTS.map((ev) => (
                  <option key={ev} value={ev}>
                    {ev}
                  </option>
                ))}
              </optgroup>
              <optgroup label="International Central Banks">
                {CENTRAL_BANK_EVENTS.map((ev) => (
                  <option key={ev} value={ev}>
                    {ev}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>

          {/* Analysis Period */}
          <div className="space-y-2">
            <label className="block text-xs font-medium text-gray-300">Analysis Period</label>
            <div className="grid grid-cols-3 gap-2">
              {ANALYSIS_PERIODS.map((period) => {
                const active = analysisPeriod === period;
                return (
                  <button
                    key={period}
                    type="button"
                    onClick={() => setAnalysisPeriod(period)}
                    className={`min-h-[44px] px-2.5 py-2 rounded-xl text-xs font-medium border transition-colors ${
                      active
                        ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-300'
                        : 'bg-[#171B22] border-white/[0.06] text-gray-300 hover:text-white'
                    }`}
                  >
                    {period}
                  </button>
                );
              })}
            </div>
          </div>

          <button
            type="button"
            onClick={handleAnalyze}
            disabled={loading}
            className="w-full min-h-[48px] px-4 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:bg-[#171B22] disabled:text-gray-400 text-black font-semibold text-sm transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Researching Official Releases & News...</span>
              </>
            ) : (
              <span>Analyze Fundamentals</span>
            )}
          </button>

          {error && (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3.5 text-xs text-rose-200 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Report Column */}
        <div className="lg:col-span-7">
          {!result && !loading && (
            <div className="rounded-2xl border border-white/[0.08] bg-[#11141A] p-6 sm:p-8 text-center">
              <p className="text-sm font-medium text-white mb-1.5">
                Fundamental Economic Outlook
              </p>
              <p className="text-xs text-gray-400 max-w-md mx-auto leading-relaxed">
                Select a market, economic release or central bank, and analysis horizon. Live web search verifies current official releases, actual vs. forecast figures, and source links before summarizing sentiment.
              </p>
            </div>
          )}

          {loading && (
            <div className="rounded-2xl border border-white/[0.08] bg-[#11141A] p-8 text-center space-y-3">
              <Loader2 className="w-7 h-7 text-emerald-400 animate-spin mx-auto" />
              <p className="text-sm font-medium text-white">
                Searching official economic data & financial news
              </p>
              <p className="text-xs text-gray-400">
                Checking recent {economicEvent} publications and USD/central bank drivers for {market}.
              </p>
            </div>
          )}

          {result && !loading && (
            <div className="rounded-2xl border border-white/[0.08] bg-[#11141A] p-4 sm:p-6 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.08] pb-3.5">
                <div>
                  <h2 className="text-base font-semibold text-white">
                    {result.market} · {result.economicEvent}
                  </h2>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-gray-400 mt-0.5">
                    <span>Period: {result.analysisPeriod}</span>
                    <span aria-hidden="true">·</span>
                    <span className="text-emerald-300 font-medium">
                      Next Event Date: {result.eventDate}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>Updated: {result.publicationDate}</span>
                  </div>
                </div>
                <span className="text-xs font-mono text-gray-500 tabular-nums">
                  {new Date(result.researchTimestamp).toLocaleString()}
                </span>
              </div>

              {!result.available ? (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs sm:text-sm text-amber-200 flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <div className="font-semibold text-amber-300">
                      Verified Public News Unavailable
                    </div>
                    <p className="leading-relaxed">
                      {result.unavailableReason ||
                        'Current public news could not be verified for this event. No fundamental signal was generated.'}
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  {/* Fundamental BUY or SELL Signal Only (no Entry/SL/TP) */}
                  <div
                    className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3.5 ${
                      result.signal === 'BUY'
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                        : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      {result.signal === 'BUY' ? (
                        <ArrowUpRight className="w-6 h-6 shrink-0" />
                      ) : (
                        <ArrowDownRight className="w-6 h-6 shrink-0" />
                      )}
                      <div>
                        <div className="text-xs opacity-80">
                          Next Release Fundamental Signal ({result.market})
                        </div>
                        <div className="text-lg font-bold tracking-tight">{result.signal}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[11px] uppercase tracking-wider opacity-75">
                        Fundamental Bias
                      </div>
                      <div className="text-sm font-semibold">{result.sentiment}</div>
                    </div>
                  </div>

                  {/* Actual vs Forecast vs Previous Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-white/[0.08] rounded-xl overflow-hidden border border-white/[0.08]">
                    <div className="bg-[#0D1015] p-3.5">
                      <div className="text-xs text-gray-400 mb-1">Actual Result</div>
                      <div className="text-sm font-mono font-semibold text-white tabular-nums">
                        {result.actualResult}
                      </div>
                    </div>
                    <div className="bg-[#0D1015] p-3.5">
                      <div className="text-xs text-gray-400 mb-1">Forecast</div>
                      <div className="text-sm font-mono font-semibold text-gray-200 tabular-nums">
                        {result.forecast}
                      </div>
                    </div>
                    <div className="bg-[#0D1015] p-3.5">
                      <div className="text-xs text-gray-400 mb-1">Previous Result</div>
                      <div className="text-sm font-mono font-semibold text-gray-300 tabular-nums">
                        {result.previousResult}
                      </div>
                    </div>
                  </div>

                  {/* Latest Verified News & Expected Impact */}
                  <div className="space-y-3">
                    <div className="rounded-xl border border-white/[0.06] bg-[#0D1015] p-3.5">
                      <div className="text-xs text-gray-400 mb-1">Latest Verified News</div>
                      <p className="text-xs sm:text-sm text-gray-100 leading-relaxed">
                        {result.latestVerifiedNews}
                      </p>
                    </div>

                    <div className="rounded-xl border border-white/[0.06] bg-[#0D1015] p-3.5">
                      <div className="text-xs text-gray-400 mb-1">Expected Market Impact</div>
                      <p className="text-xs sm:text-sm text-gray-100 leading-relaxed">
                        {result.expectedMarketImpact}
                      </p>
                    </div>

                    {result.usdImpactNote && (
                      <div className="rounded-xl border border-white/[0.06] bg-[#0D1015] p-3.5">
                        <div className="text-xs text-gray-400 mb-1">US Dollar Impact Assessment</div>
                        <p className="text-xs sm:text-sm text-gray-100 leading-relaxed">
                          {result.usdImpactNote}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Bullish vs Bearish Factors */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04] p-3.5 space-y-2">
                      <div className="text-xs font-semibold text-emerald-300">
                        Bullish Fundamental Factors
                      </div>
                      {result.bullishFactors.length > 0 ? (
                        <ul className="space-y-1.5 text-xs text-gray-200 list-disc pl-4">
                          {result.bullishFactors.map((f, idx) => (
                            <li key={idx} className="leading-relaxed">
                              {f}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-xs text-gray-400">No prominent bullish drivers reported.</p>
                      )}
                    </div>

                    <div className="rounded-xl border border-rose-500/20 bg-rose-500/[0.04] p-3.5 space-y-2">
                      <div className="text-xs font-semibold text-rose-300">
                        Bearish Fundamental Factors
                      </div>
                      {result.bearishFactors.length > 0 ? (
                        <ul className="space-y-1.5 text-xs text-gray-200 list-disc pl-4">
                          {result.bearishFactors.map((f, idx) => (
                            <li key={idx} className="leading-relaxed">
                              {f}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-xs text-gray-400">No prominent bearish drivers reported.</p>
                      )}
                    </div>
                  </div>

                  {/* Reasoning */}
                  <div className="space-y-1.5 border-t border-white/[0.08] pt-4">
                    <h3 className="text-sm font-semibold text-white">Reasoning & Conflicting Drivers</h3>
                    <p className="text-xs sm:text-sm text-gray-300 leading-relaxed">
                      {result.reasoning}
                    </p>
                  </div>

                  {/* Verified Source Links */}
                  <div className="space-y-2 border-t border-white/[0.08] pt-4">
                    <h3 className="text-sm font-semibold text-white">Verified Sources</h3>
                    <div className="space-y-2">
                      {result.sources.map((src, idx) => (
                        <a
                          key={idx}
                          href={src.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.08] bg-[#0D1015] hover:border-emerald-500/40 px-3.5 py-2.5 text-xs transition-colors group"
                        >
                          <span className="text-gray-200 group-hover:text-emerald-300 truncate">
                            {src.title}
                          </span>
                          <ExternalLink className="w-3.5 h-3.5 text-gray-400 group-hover:text-emerald-300 shrink-0" />
                        </a>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
