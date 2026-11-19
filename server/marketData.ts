export interface CandleBar {
  time: string;
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface CandleFetchResult {
  available: boolean;
  candles: CandleBar[];
  dataSource: string | null;
  unavailableReason: string | null;
}

export interface SymbolSuggestion {
  symbol: string;
  tvSymbol: string;
  name: string;
  category: string;
}

const POPULAR_SYMBOLS: SymbolSuggestion[] = [
  { symbol: 'XAUUSD', tvSymbol: 'OANDA:XAUUSD', name: 'Gold Spot / US Dollar', category: 'Metals' },
  { symbol: 'EURUSD', tvSymbol: 'FX:EURUSD', name: 'Euro / US Dollar', category: 'Forex' },
  { symbol: 'GBPUSD', tvSymbol: 'FX:GBPUSD', name: 'British Pound / US Dollar', category: 'Forex' },
  { symbol: 'USDJPY', tvSymbol: 'FX:USDJPY', name: 'US Dollar / Japanese Yen', category: 'Forex' },
  { symbol: 'BTCUSD', tvSymbol: 'COINBASE:BTCUSD', name: 'Bitcoin / US Dollar', category: 'Crypto' },
  { symbol: 'ETHUSD', tvSymbol: 'COINBASE:ETHUSD', name: 'Ethereum / US Dollar', category: 'Crypto' },
  { symbol: 'NAS100', tvSymbol: 'CAPITALCOM:US100', name: 'US Tech 100 / Nasdaq 100', category: 'Indices' },
  { symbol: 'US30', tvSymbol: 'CAPITALCOM:US30', name: 'Wall Street 30 / Dow Jones', category: 'Indices' },
  { symbol: 'US500', tvSymbol: 'CAPITALCOM:US500', name: 'US 500 / S&P 500', category: 'Indices' },
  { symbol: 'XAGUSD', tvSymbol: 'OANDA:XAGUSD', name: 'Silver Spot / US Dollar', category: 'Metals' },
  { symbol: 'AUDUSD', tvSymbol: 'FX:AUDUSD', name: 'Australian Dollar / US Dollar', category: 'Forex' },
  { symbol: 'USDCAD', tvSymbol: 'FX:USDCAD', name: 'US Dollar / Canadian Dollar', category: 'Forex' },
  { symbol: 'USDCHF', tvSymbol: 'FX:USDCHF', name: 'US Dollar / Swiss Franc', category: 'Forex' },
  { symbol: 'EURJPY', tvSymbol: 'FX:EURJPY', name: 'Euro / Japanese Yen', category: 'Forex' },
  { symbol: 'GBPJPY', tvSymbol: 'FX:GBPJPY', name: 'British Pound / Japanese Yen', category: 'Forex' },
  { symbol: 'SOLUSD', tvSymbol: 'COINBASE:SOLUSD', name: 'Solana / US Dollar', category: 'Crypto' },
  { symbol: 'USOIL', tvSymbol: 'TVC:USOIL', name: 'WTI Crude Oil', category: 'Energy' },
  { symbol: 'DXY', tvSymbol: 'TVC:DXY', name: 'US Dollar Index', category: 'Indices' },
];

const YAHOO_SYMBOL_ALIASES: Record<string, { yahooTicker: string; label: string }> = {
  XAUUSD: { yahooTicker: 'GC=F', label: 'Yahoo Finance (GC=F Gold Futures proxy for XAUUSD)' },
  GOLD: { yahooTicker: 'GC=F', label: 'Yahoo Finance (GC=F Gold Futures)' },
  XAGUSD: { yahooTicker: 'SI=F', label: 'Yahoo Finance (SI=F Silver Futures proxy for XAGUSD)' },
  SILVER: { yahooTicker: 'SI=F', label: 'Yahoo Finance (SI=F Silver Futures)' },
  NAS100: { yahooTicker: '^NDX', label: 'Yahoo Finance (^NDX Nasdaq-100 Index)' },
  US100: { yahooTicker: '^NDX', label: 'Yahoo Finance (^NDX Nasdaq-100 Index)' },
  NDX: { yahooTicker: '^NDX', label: 'Yahoo Finance (^NDX Nasdaq-100 Index)' },
  US30: { yahooTicker: '^DJI', label: 'Yahoo Finance (^DJI Dow Jones Industrial Average)' },
  DJ30: { yahooTicker: '^DJI', label: 'Yahoo Finance (^DJI Dow Jones Industrial Average)' },
  DJI: { yahooTicker: '^DJI', label: 'Yahoo Finance (^DJI Dow Jones Industrial Average)' },
  US500: { yahooTicker: '^GSPC', label: 'Yahoo Finance (^GSPC S&P 500 Index)' },
  SP500: { yahooTicker: '^GSPC', label: 'Yahoo Finance (^GSPC S&P 500 Index)' },
  SPX: { yahooTicker: '^GSPC', label: 'Yahoo Finance (^GSPC S&P 500 Index)' },
  GER40: { yahooTicker: '^GDAXI', label: 'Yahoo Finance (^GDAXI DAX Index)' },
  DAX: { yahooTicker: '^GDAXI', label: 'Yahoo Finance (^GDAXI DAX Index)' },
  UK100: { yahooTicker: '^FTSE', label: 'Yahoo Finance (^FTSE FTSE 100 Index)' },
  FTSE: { yahooTicker: '^FTSE', label: 'Yahoo Finance (^FTSE FTSE 100 Index)' },
  DXY: { yahooTicker: 'DX-Y.NYB', label: 'Yahoo Finance (DX-Y.NYB US Dollar Index)' },
  USOIL: { yahooTicker: 'CL=F', label: 'Yahoo Finance (CL=F WTI Crude Oil Futures)' },
  WTI: { yahooTicker: 'CL=F', label: 'Yahoo Finance (CL=F WTI Crude Oil Futures)' },
  UKOIL: { yahooTicker: 'BZ=F', label: 'Yahoo Finance (BZ=F Brent Crude Oil Futures)' },
  BRENT: { yahooTicker: 'BZ=F', label: 'Yahoo Finance (BZ=F Brent Crude Oil Futures)' },
};

const FX_CURRENCIES = new Set([
  'USD', 'EUR', 'GBP', 'JPY', 'CHF', 'CAD', 'AUD', 'NZD', 'SEK', 'NOK', 'SGD', 'HKD', 'ZAR', 'MXN', 'TRY', 'CNH',
]);

const KRAKEN_CRYPTO_MAP: Record<string, string> = {
  BTCUSD: 'XBTUSD',
  BTCUSDT: 'XBTUSDT',
  ETHUSD: 'ETHUSD',
  ETHUSDT: 'ETHUSDT',
  SOLUSD: 'SOLUSD',
  SOLUSDT: 'SOLUSDT',
  XRPUSD: 'XRPUSD',
  XRPUSDT: 'XRPUSDT',
  ADAUSD: 'ADAUSD',
  DOGEUSD: 'DOGEUSD',
  LTCUSD: 'LTCUSD',
  AVAXUSD: 'AVAXUSD',
  LINKUSD: 'LINKUSD',
  DOTUSD: 'DOTUSD',
};

function stripExchangePrefix(rawSymbol: string): string {
  const cleaned = rawSymbol.trim().toUpperCase();
  if (cleaned.includes(':')) {
    return cleaned.split(':').pop() || cleaned;
  }
  return cleaned;
}

function aggregateBars(bars: CandleBar[], groupSize: number): CandleBar[] {
  if (groupSize <= 1 || bars.length === 0) return bars;
  const grouped: CandleBar[] = [];
  for (let i = 0; i < bars.length; i += groupSize) {
    const slice = bars.slice(i, i + groupSize);
    if (slice.length === 0) continue;
    grouped.push({
      time: slice[0].time,
      timestamp: slice[0].timestamp,
      open: slice[0].open,
      high: Math.max(...slice.map((b) => b.high)),
      low: Math.min(...slice.map((b) => b.low)),
      close: slice[slice.length - 1].close,
      volume: slice.reduce((sum, b) => sum + b.volume, 0),
    });
  }
  return grouped;
}

async function fetchKrakenCandles(pair: string, timeframe: string): Promise<CandleFetchResult | null> {
  const intervalMap: Record<string, number> = {
    '1m': 1,
    '5m': 5,
    '15m': 15,
    '30m': 30,
    '1h': 60,
    '4h': 240,
    '1d': 1440,
    '1w': 10080,
  };
  const krakenInterval = intervalMap[timeframe];
  if (!krakenInterval) return null;

  try {
    const res = await fetch(
      `https://api.kraken.com/0/public/OHLC?pair=${encodeURIComponent(pair)}&interval=${krakenInterval}`,
      { signal: AbortSignal.timeout(8000) }
    );
    if (!res.ok) return null;
    const json = (await res.json()) as {
      error?: string[];
      result?: Record<string, Array<[number, string, string, string, string, string, string, number]>>;
    };
    if (json.error && json.error.length > 0) return null;
    if (!json.result) return null;

    const resultKey = Object.keys(json.result).find((k) => k !== 'last');
    if (!resultKey) return null;

    const rawRows = json.result[resultKey];
    if (!Array.isArray(rawRows) || rawRows.length < 15) return null;

    const candles: CandleBar[] = rawRows.slice(-140).map((row) => {
      const tsMs = Number(row[0]) * 1000;
      return {
        time: new Date(tsMs).toISOString(),
        timestamp: tsMs,
        open: Number(row[1]),
        high: Number(row[2]),
        low: Number(row[3]),
        close: Number(row[4]),
        volume: Number(row[6]),
      };
    });

    return {
      available: true,
      candles,
      dataSource: `Kraken Public OHLC API (${pair})`,
      unavailableReason: null,
    };
  } catch {
    return null;
  }
}

async function fetchCoinbaseCandles(base: string, quote: string, timeframe: string): Promise<CandleFetchResult | null> {
  const productId = `${base}-${quote}`;
  const configMap: Record<string, { granularity: number; aggregate: number; note: string }> = {
    '1m': { granularity: 60, aggregate: 1, note: '' },
    '5m': { granularity: 300, aggregate: 1, note: '' },
    '15m': { granularity: 900, aggregate: 1, note: '' },
    '30m': { granularity: 900, aggregate: 2, note: ' aggregated from 15m' },
    '1h': { granularity: 3600, aggregate: 1, note: '' },
    '4h': { granularity: 3600, aggregate: 4, note: ' aggregated from 1h' },
    '1d': { granularity: 86400, aggregate: 1, note: '' },
    '1w': { granularity: 86400, aggregate: 7, note: ' aggregated from 1d' },
  };
  const cfg = configMap[timeframe];
  if (!cfg) return null;

  try {
    const res = await fetch(
      `https://api.exchange.coinbase.com/products/${encodeURIComponent(productId)}/candles?granularity=${cfg.granularity}`,
      {
        headers: { 'User-Agent': 'ChartScope/1.0' },
        signal: AbortSignal.timeout(8000),
      }
    );
    if (!res.ok) return null;
    const rows = (await res.json()) as Array<[number, number, number, number, number, number]>;
    if (!Array.isArray(rows) || rows.length < 15) return null;

    // Coinbase returns newest-first: [time, low, high, open, close, volume]
    const sorted = [...rows].sort((a, b) => a[0] - b[0]);
    const rawCandles: CandleBar[] = sorted.map((r) => {
      const tsMs = Number(r[0]) * 1000;
      return {
        time: new Date(tsMs).toISOString(),
        timestamp: tsMs,
        low: Number(r[1]),
        high: Number(r[2]),
        open: Number(r[3]),
        close: Number(r[4]),
        volume: Number(r[5]),
      };
    });

    const candles = aggregateBars(rawCandles, cfg.aggregate).slice(-140);
    if (candles.length < 10) return null;

    return {
      available: true,
      candles,
      dataSource: `Coinbase Public Exchange API (${productId}${cfg.note})`,
      unavailableReason: null,
    };
  } catch {
    return null;
  }
}

async function fetchYahooCandles(
  yahooTicker: string,
  timeframe: string,
  sourceLabel: string
): Promise<CandleFetchResult | null> {
  const tfMap: Record<string, { interval: string; range: string; aggregate: number; note: string }> = {
    '1m': { interval: '1m', range: '1d', aggregate: 1, note: '' },
    '5m': { interval: '5m', range: '5d', aggregate: 1, note: '' },
    '15m': { interval: '15m', range: '5d', aggregate: 1, note: '' },
    '30m': { interval: '30m', range: '1mo', aggregate: 1, note: '' },
    '1h': { interval: '1h', range: '1mo', aggregate: 1, note: '' },
    '4h': { interval: '1h', range: '3mo', aggregate: 4, note: ' (4h aggregated from 1h bars)' },
    '1d': { interval: '1d', range: '1y', aggregate: 1, note: '' },
    '1w': { interval: '1wk', range: '2y', aggregate: 1, note: '' },
  };
  const cfg = tfMap[timeframe];
  if (!cfg) return null;

  try {
    const queryPath = `/v8/finance/chart/${encodeURIComponent(yahooTicker)}?interval=${cfg.interval}&range=${cfg.range}`;
    let res = await fetch(`https://query1.finance.yahoo.com${queryPath}`, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      res = await fetch(`https://query2.finance.yahoo.com${queryPath}`, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        signal: AbortSignal.timeout(8000),
      });
    }
    if (!res.ok) return null;

    const json = (await res.json()) as {
      chart?: {
        result?: Array<{
          meta?: { symbol?: string };
          timestamp?: number[];
          indicators?: {
            quote?: Array<{
              open?: Array<number | null>;
              high?: Array<number | null>;
              low?: Array<number | null>;
              close?: Array<number | null>;
              volume?: Array<number | null>;
            }>;
          };
        }>;
      };
    };

    const result = json.chart?.result?.[0];
    const timestamps = result?.timestamp;
    const quote = result?.indicators?.quote?.[0];
    if (!timestamps || !quote || timestamps.length < 15) return null;

    const bars: CandleBar[] = [];
    for (let i = 0; i < timestamps.length; i++) {
      const o = quote.open?.[i];
      const h = quote.high?.[i];
      const l = quote.low?.[i];
      const c = quote.close?.[i];
      const v = quote.volume?.[i] ?? 0;
      if (o == null || h == null || l == null || c == null) continue;
      const tsMs = timestamps[i] * 1000;
      bars.push({
        time: new Date(tsMs).toISOString(),
        timestamp: tsMs,
        open: Number(o),
        high: Number(h),
        low: Number(l),
        close: Number(c),
        volume: Number(v),
      });
    }

    const finalBars = aggregateBars(bars, cfg.aggregate).slice(-140);
    if (finalBars.length < 10) return null;

    return {
      available: true,
      candles: finalBars,
      dataSource: `${sourceLabel}${cfg.note}`,
      unavailableReason: null,
    };
  } catch {
    return null;
  }
}

export async function fetchPublicCandles(rawSymbol: string, timeframe: string): Promise<CandleFetchResult> {
  const baseSymbol = stripExchangePrefix(rawSymbol);

  // 1. Check Kraken / Coinbase for known crypto pairs
  const krakenPair = KRAKEN_CRYPTO_MAP[baseSymbol];
  if (krakenPair) {
    const krakenRes = await fetchKrakenCandles(krakenPair, timeframe);
    if (krakenRes) return krakenRes;
  }

  if (baseSymbol.endsWith('USDT') && baseSymbol.length >= 6) {
    const base = baseSymbol.slice(0, -4);
    const coinbaseRes = await fetchCoinbaseCandles(base, 'USD', timeframe);
    if (coinbaseRes) return coinbaseRes;
  } else if (baseSymbol.endsWith('USD') && baseSymbol.length >= 6 && !FX_CURRENCIES.has(baseSymbol.slice(0, 3))) {
    const base = baseSymbol.slice(0, -3);
    const coinbaseRes = await fetchCoinbaseCandles(base, 'USD', timeframe);
    if (coinbaseRes) return coinbaseRes;
  }

  // 2. Check Yahoo Finance explicit aliases (Gold, Indices, Oil, DXY)
  const alias = YAHOO_SYMBOL_ALIASES[baseSymbol];
  if (alias) {
    const yahooRes = await fetchYahooCandles(alias.yahooTicker, timeframe, alias.label);
    if (yahooRes) return yahooRes;
  }

  // 3. Check 6-letter Forex pairs (e.g., EURUSD -> EURUSD=X)
  if (/^[A-Z]{6}$/.test(baseSymbol)) {
    const base = baseSymbol.slice(0, 3);
    const quote = baseSymbol.slice(3, 6);
    if (FX_CURRENCIES.has(base) && FX_CURRENCIES.has(quote)) {
      const fxTicker = `${baseSymbol}=X`;
      const fxRes = await fetchYahooCandles(fxTicker, timeframe, `Yahoo Finance (${fxTicker})`);
      if (fxRes) return fxRes;
    }
  }

  // 4. Crypto fallback via Yahoo Finance (e.g. BTCUSD -> BTC-USD)
  if (baseSymbol.endsWith('USD') && baseSymbol.length >= 6) {
    const base = baseSymbol.slice(0, -3);
    if (!FX_CURRENCIES.has(base)) {
      const cryptoTicker = `${base}-USD`;
      const cryptoRes = await fetchYahooCandles(cryptoTicker, timeframe, `Yahoo Finance (${cryptoTicker})`);
      if (cryptoRes) return cryptoRes;
    }
  }

  // 5. Direct stock / ETF / index / Yahoo-formatted symbol (e.g. AAPL, NVDA, TSLA, SPY, ^NDX)
  const directRes = await fetchYahooCandles(baseSymbol, timeframe, `Yahoo Finance (${baseSymbol})`);
  if (directRes) return directRes;

  return {
    available: false,
    candles: [],
    dataSource: null,
    unavailableReason:
      `Actual OHLCV candle data for "${rawSymbol}" (${timeframe}) could not be retrieved from any accessible no-key public feed (Yahoo Finance, Kraken, or Coinbase). TradingView's embedded chart widget does not expose candle arrays programmatically, so technical analysis is unavailable for this symbol right now.`,
  };
}

function mapYahooToTradingView(symbol: string, quoteType?: string, exchange?: string): string {
  const upper = symbol.toUpperCase();
  if (upper === 'GC=F') return 'OANDA:XAUUSD';
  if (upper === 'SI=F') return 'OANDA:XAGUSD';
  if (upper === '^NDX') return 'CAPITALCOM:US100';
  if (upper === '^DJI') return 'CAPITALCOM:US30';
  if (upper === '^GSPC') return 'CAPITALCOM:US500';
  if (upper === 'CL=F') return 'TVC:USOIL';
  if (upper === 'DX-Y.NYB') return 'TVC:DXY';
  if (upper.endsWith('=X') && upper.length === 8) {
    return `FX:${upper.replace('=X', '')}`;
  }
  if (upper.endsWith('-USD')) {
    return `COINBASE:${upper.replace('-USD', 'USD')}`;
  }
  if (quoteType === 'EQUITY' || quoteType === 'ETF') {
    if (exchange === 'NMS' || exchange === 'NGM' || exchange === 'NCM') return `NASDAQ:${upper}`;
    if (exchange === 'NYQ') return `NYSE:${upper}`;
  }
  return upper;
}

export async function searchTradingSymbols(query: string): Promise<SymbolSuggestion[]> {
  const q = query.trim().toUpperCase();
  if (!q) return POPULAR_SYMBOLS.slice(0, 9);

  const localMatches = POPULAR_SYMBOLS.filter(
    (item) =>
      item.symbol.includes(q) ||
      item.tvSymbol.includes(q) ||
      item.name.toUpperCase().includes(q) ||
      item.category.toUpperCase().includes(q)
  );

  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query.trim())}&quotesCount=8&newsCount=0`,
      {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        signal: AbortSignal.timeout(5000),
      }
    );
    if (!res.ok) return localMatches;

    const json = (await res.json()) as {
      quotes?: Array<{
        symbol?: string;
        shortname?: string;
        longname?: string;
        quoteType?: string;
        exchange?: string;
      }>;
    };

    const remoteMatches: SymbolSuggestion[] = (json.quotes || [])
      .filter((item) => item.symbol && (item.shortname || item.longname))
      .map((item) => {
        const sym = item.symbol!;
        return {
          symbol: sym,
          tvSymbol: mapYahooToTradingView(sym, item.quoteType, item.exchange),
          name: item.shortname || item.longname || sym,
          category: item.quoteType || 'Market',
        };
      });

    const seen = new Set<string>();
    const combined: SymbolSuggestion[] = [];
    for (const item of [...localMatches, ...remoteMatches]) {
      const key = item.tvSymbol;
      if (!seen.has(key)) {
        seen.add(key);
        combined.push(item);
      }
    }
    return combined.slice(0, 12);
  } catch {
    return localMatches;
  }
}
