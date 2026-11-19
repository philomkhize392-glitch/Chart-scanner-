import { useEffect, useState } from 'react';
import { AlertTriangle, Loader2, Search } from 'lucide-react';
import type {
  LiveChartAnalysisResult,
  StrategyType,
  SymbolSearchItem,
  TimeframeOption,
} from '../types/trading';
import { SignalBadgeBlock, TradeLevelsGrid } from './SignalCard';
import { TradingViewWidget } from './TradingViewWidget';

const TIMEFRAMES: Array<{ value: TimeframeOption; label: string }> = [
  { value: '1m', label: '1m' },
  { value: '5m', label: '5m' },
  { value: '15m', label: '15m' },
  { value: '30m', label: '30m' },
  { value: '1h', label: '1h' },
  { value: '4h', label: '4h' },
  { value: '1d', label: '1D' },
  { value: '1w', label: '1W' },
];

const STRATEGIES: StrategyType[] = [
  'Auto',
  'ICT',
  'Smart Money Concepts (SMC)',
  'Price Action',
  'Trend Following',
  'Supply and Demand',
];

const QUICK_SYMBOLS: Array<{ label: string; tvSymbol: string }> = [
  { label: 'XAUUSD', tvSymbol: 'OANDA:XAUUSD' },
  { label: 'EURUSD', tvSymbol: 'FX:EURUSD' },
  { label: 'GBPUSD', tvSymbol: 'FX:GBPUSD' },
  { label: 'USDJPY', tvSymbol: 'FX:USDJPY' },
  { label: 'BTCUSD', tvSymbol: 'COINBASE:BTCUSD' },
  { label: 'ETHUSD', tvSymbol: 'COINBASE:ETHUSD' },
  { label: 'NAS100', tvSymbol: 'CAPITALCOM:US100' },
  { label: 'US30', tvSymbol: 'CAPITALCOM:US30' },
  { label: 'US500', tvSymbol: 'CAPITALCOM:US500' },
];

export function LiveChartSection() {
  const [searchInput, setSearchInput] = useState('XAUUSD');
  const [tvSymbol, setTvSymbol] = useState('OANDA:XAUUSD');
  const [displaySymbol, setDisplaySymbol] = useState('XAUUSD');
  const [timeframe, setTimeframe] = useState<TimeframeOption>('1h');
  const [strategy, setStrategy] = useState<StrategyType>('Auto');

  const [suggestions, setSuggestions] = useState<SymbolSearchItem[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchingSymbols, setSearchingSymbols] = useState(false);

  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<LiveChartAnalysisResult | null>(null);

  useEffect(() => {
    const trimmed = searchInput.trim();
    if (!showSuggestions) return;

    const timer = setTimeout(async () => {
      setSearchingSymbols(true);
      try {
        const res = await fetch(`/api/symbols/search?q=${encodeURIComponent(trimmed)}`);
        if (res.ok) {
          const data = (await res.json()) as { suggestions?: SymbolSearchItem[] };
          setSuggestions(data.suggestions || []);
        }
      } catch {
        // Keep current suggestions on transient search errors
      } finally {
        setSearchingSymbols(false);
      }
    }, 220);

    return () => clearTimeout(timer);
  }, [searchInput, showSuggestions]);

  const selectSymbol = (label: string, targetTvSymbol: string) => {
    setDisplaySymbol(label);
    setTvSymbol(targetTvSymbol);
    setSearchInput(label);
    setShowSuggestions(false);
    setAnalysis(null);
    setError(null);
  };

  const handleManualSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = searchInput.trim().toUpperCase();
    if (!cleaned) return;

    const preset = QUICK_SYMBOLS.find((q) => q.label === cleaned || q.tvSymbol === cleaned);
    if (preset) {
      selectSymbol(preset.label, preset.tvSymbol);
      return;
    }

    const matchingSuggestion = suggestions.find(
      (s) => s.symbol.toUpperCase() === cleaned || s.tvSymbol.toUpperCase() === cleaned
    );
    if (matchingSuggestion) {
      selectSymbol(matchingSuggestion.symbol, matchingSuggestion.tvSymbol);
      return;
    }

    // Allow searching any symbol directly on TradingView
    selectSymbol(cleaned, cleaned);
  };

  const handleAnalyzeChart = async () => {
    setAnalyzing(true);
    setError(null);

    try {
      const response = await fetch('/api/live-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: displaySymbol,
          timeframe,
          strategy,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to analyze market candle data.');
      }

      setAnalysis(data as LiveChartAnalysisResult);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Network error while retrieving public candle data. Please retry.'
      );
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Top Controls Bar */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#11141A] p-4 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center gap-3 justify-between">
          {/* Symbol Search */}
          <div className="relative flex-1 max-w-md">
            <form onSubmit={handleManualSearchSubmit} className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchInput}
                  onFocus={() => setShowSuggestions(true)}
                  onChange={(e) => {
                    setSearchInput(e.target.value);
                    setShowSuggestions(true);
                  }}
                  placeholder="Search symbol (e.g. XAUUSD, EURUSD, AAPL, BTCUSD)"
                  aria-label="Search trading symbol"
                  className="w-full min-h-[44px] pl-9 pr-3 rounded-xl bg-[#171B22] border border-white/[0.1] text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-emerald-400"
                />
              </div>
              <button
                type="submit"
                className="min-h-[44px] px-4 rounded-xl bg-[#171B22] hover:bg-[#1F2530] border border-white/[0.1] text-sm font-medium text-white whitespace-nowrap shrink-0 transition-colors"
              >
                Load
              </button>
            </form>

            {showSuggestions && (
              <div className="absolute left-0 right-0 top-full mt-1.5 z-30 rounded-xl border border-white/[0.12] bg-[#13171F] shadow-xl max-h-64 overflow-y-auto">
                <div className="flex items-center justify-between px-3 py-2 border-b border-white/[0.06] text-[11px] text-gray-400">
                  <span>{searchingSymbols ? 'Searching symbols...' : 'Available Symbols'}</span>
                  <button
                    type="button"
                    onClick={() => setShowSuggestions(false)}
                    className="text-gray-400 hover:text-white"
                  >
                    Close
                  </button>
                </div>
                {suggestions.length === 0 && !searchingSymbols ? (
                  <div className="px-3 py-3 text-xs text-gray-400">
                    Press Load to open &ldquo;{searchInput.toUpperCase()}&rdquo; directly in TradingView.
                  </div>
                ) : (
                  suggestions.map((item) => (
                    <button
                      key={`${item.tvSymbol}-${item.symbol}`}
                      type="button"
                      onClick={() => selectSymbol(item.symbol, item.tvSymbol)}
                      className="w-full text-left px-3 py-2.5 hover:bg-white/[0.05] flex items-center justify-between gap-3 border-b border-white/[0.04] last:border-none"
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-white truncate">
                          {item.symbol}
                        </div>
                        <div className="text-[11px] text-gray-400 truncate">{item.name}</div>
                      </div>
                      <span className="text-[11px] font-mono text-gray-400 shrink-0">
                        {item.category}
                      </span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Timeframe Selector */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 lg:pb-0">
            {TIMEFRAMES.map((tf) => {
              const active = timeframe === tf.value;
              return (
                <button
                  key={tf.value}
                  type="button"
                  onClick={() => {
                    setTimeframe(tf.value);
                    setAnalysis(null);
                  }}
                  className={`min-h-[40px] px-3 py-1.5 rounded-lg text-xs font-mono font-medium whitespace-nowrap shrink-0 transition-colors ${
                    active
                      ? 'bg-emerald-500 text-black font-semibold'
                      : 'bg-[#171B22] text-gray-300 hover:text-white hover:bg-[#1E242E]'
                  }`}
                >
                  {tf.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Quick popular symbols */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
          {QUICK_SYMBOLS.map((item) => {
            const active = tvSymbol === item.tvSymbol;
            return (
              <button
                key={item.label}
                type="button"
                onClick={() => selectSymbol(item.label, item.tvSymbol)}
                className={`min-h-[36px] px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 border transition-colors ${
                  active
                    ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-300'
                    : 'bg-[#0D1015] border-white/[0.06] text-gray-400 hover:text-white'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        {/* Strategy & Analyze CTA */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 border-t border-white/[0.08]">
          <div className="flex flex-wrap items-center gap-1.5">
            {STRATEGIES.map((item) => {
              const active = strategy === item;
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => setStrategy(item)}
                  className={`min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 border transition-colors ${
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

          <button
            type="button"
            onClick={handleAnalyzeChart}
            disabled={analyzing}
            className="min-h-[44px] px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:bg-[#171B22] disabled:text-gray-400 text-black font-semibold text-sm whitespace-nowrap shrink-0 transition-colors flex items-center justify-center gap-2"
          >
            {analyzing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Analyzing Real Candles...</span>
              </>
            ) : (
              <span>Analyze Chart</span>
            )}
          </button>
        </div>
      </div>

      {/* Genuine TradingView Chart Viewport */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-400 px-1">
          <span>
            TradingView Chart · <strong className="text-white">{tvSymbol}</strong> · {timeframe}
          </span>
          <span>Live interactive chart widget</span>
        </div>
        <TradingViewWidget symbol={tvSymbol} timeframe={timeframe} />
      </div>

      {error && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs sm:text-sm text-rose-200 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Analysis Report Below Chart */}
      {analyzing && (
        <div className="rounded-2xl border border-white/[0.08] bg-[#11141A] p-6 text-center space-y-2">
          <Loader2 className="w-6 h-6 text-emerald-400 animate-spin mx-auto" />
          <p className="text-sm font-medium text-white">
            Retrieving public OHLCV candles for {displaySymbol} ({timeframe})
          </p>
          <p className="text-xs text-gray-400">
            Checking no-key market feeds and evaluating market structure.
          </p>
        </div>
      )}

      {analysis && !analyzing && (
        <div className="rounded-2xl border border-white/[0.08] bg-[#11141A] p-4 sm:p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.08] pb-3.5">
            <div>
              <h2 className="text-base font-semibold text-white">
                {analysis.symbol} ({analysis.timeframe}) Technical Analysis
              </h2>
              <div className="flex flex-wrap items-center gap-2 text-xs text-gray-400 mt-0.5">
                <span>Strategy: {analysis.strategyApplied}</span>
                {analysis.dataSource && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>Feed: {analysis.dataSource}</span>
                  </>
                )}
                {analysis.latestPrice != null && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono text-gray-200 tabular-nums">
                      Last Close: {analysis.latestPrice}
                    </span>
                  </>
                )}
              </div>
            </div>
            <span className="text-xs font-mono text-gray-500 tabular-nums">
              {new Date(analysis.analyzedAt).toLocaleString()}
            </span>
          </div>

          {!analysis.available ? (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs sm:text-sm text-amber-200 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="font-semibold text-amber-300">
                  Technical Analysis Unavailable for This Chart
                </div>
                <p className="leading-relaxed">
                  {analysis.unavailableReason ||
                    'Real OHLCV candle data could not be accessed from a no-key public data source for this symbol.'}
                </p>
              </div>
            </div>
          ) : (
            <>
              <SignalBadgeBlock
                signal={analysis.signal}
                direction={analysis.marketDirection}
                subtitle={`Evaluated across ${analysis.candleCount} verified OHLCV candles`}
              />

              <TradeLevelsGrid
                entryZone={analysis.entryZone}
                stopLoss={analysis.stopLoss}
                takeProfit1={analysis.takeProfit1}
                takeProfit2={analysis.takeProfit2}
                takeProfit3={analysis.takeProfit3}
                riskRewardRatio={analysis.riskRewardRatio}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="rounded-xl border border-white/[0.06] bg-[#0D1015] p-3.5">
                  <div className="text-gray-400 mb-1">BOS & CHoCH</div>
                  <div className="text-gray-100 leading-relaxed">{analysis.bosAndChoch}</div>
                </div>
                <div className="rounded-xl border border-white/[0.06] bg-[#0D1015] p-3.5">
                  <div className="text-gray-400 mb-1">Fair Value Gaps (FVG)</div>
                  <div className="text-gray-100 leading-relaxed">{analysis.fvg}</div>
                </div>
                <div className="rounded-xl border border-white/[0.06] bg-[#0D1015] p-3.5">
                  <div className="text-gray-400 mb-1">Liquidity Levels</div>
                  <div className="text-gray-100 leading-relaxed">{analysis.liquidityLevels}</div>
                </div>
                <div className="rounded-xl border border-white/[0.06] bg-[#0D1015] p-3.5">
                  <div className="text-gray-400 mb-1">Support & Resistance</div>
                  <div className="text-gray-100 leading-relaxed">{analysis.supportAndResistance}</div>
                </div>
              </div>

              <div className="space-y-2 border-t border-white/[0.08] pt-4">
                <h3 className="text-sm font-semibold text-white">Analysis Explanation</h3>
                <p className="text-xs sm:text-sm text-gray-300 leading-relaxed">
                  {analysis.explanation}
                </p>
                {analysis.keyObservations.length > 0 && (
                  <ul className="space-y-1.5 text-xs sm:text-sm text-gray-300 list-disc pl-5 pt-1">
                    {analysis.keyObservations.map((obs, idx) => (
                      <li key={idx} className="leading-relaxed">
                        {obs}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
