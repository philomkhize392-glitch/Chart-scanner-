import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { analyzeChartImage, analyzeFundamentals, analyzeLiveCandles } from './server/gemini.ts';
import { fetchPublicCandles, searchTradingSymbols } from './server/marketData.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: '15mb' }));

function formatApiError(err: unknown): { status: number; message: string } {
  const raw = err instanceof Error ? err.message : String(err);
  if (raw.includes('GEMINI_API_KEY')) {
    return {
      status: 503,
      message: 'Analysis service configuration is unavailable right now.',
    };
  }
  if (raw.includes('429') || raw.includes('RESOURCE_EXHAUSTED')) {
    return {
      status: 429,
      message: 'Analysis rate limit reached. Please wait a moment and try again.',
    };
  }
  if (raw.includes('timeout') || raw.includes('AbortError') || raw.includes('ENOTFOUND')) {
    return {
      status: 504,
      message: 'Network request timed out while reaching upstream data services. Please retry.',
    };
  }
  return {
    status: 500,
    message: raw || 'An unexpected error occurred during analysis.',
  };
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.get('/api/symbols/search', async (req, res) => {
  try {
    const query = typeof req.query.q === 'string' ? req.query.q : '';
    const suggestions = await searchTradingSymbols(query);
    res.json({ suggestions });
  } catch (err) {
    const { status, message } = formatApiError(err);
    res.status(status).json({ error: message });
  }
});

app.post('/api/analyze-image', async (req, res) => {
  try {
    const { imageBase64, mimeType, strategy } = req.body as {
      imageBase64?: string;
      mimeType?: string;
      strategy?: string;
    };

    if (!imageBase64 || !mimeType) {
      res.status(400).json({ error: 'Please upload a valid chart image before analyzing.' });
      return;
    }

    const cleanBase64 = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;
    const result = await analyzeChartImage(cleanBase64, mimeType, strategy || 'Auto');
    res.json(result);
  } catch (err) {
    const { status, message } = formatApiError(err);
    res.status(status).json({ error: message });
  }
});

app.post('/api/live-analysis', async (req, res) => {
  try {
    const { symbol, timeframe, strategy } = req.body as {
      symbol?: string;
      timeframe?: string;
      strategy?: string;
    };

    if (!symbol || !timeframe) {
      res.status(400).json({ error: 'Symbol and timeframe are required.' });
      return;
    }

    const candleResult = await fetchPublicCandles(symbol, timeframe);
    if (!candleResult.available || candleResult.candles.length === 0 || !candleResult.dataSource) {
      res.json({
        available: false,
        unavailableReason:
          candleResult.unavailableReason ||
          'Actual OHLCV candle data could not be retrieved for this symbol and timeframe.',
        symbol,
        timeframe,
        strategyApplied: strategy || 'Auto',
        dataSource: null,
        candleCount: 0,
        latestPrice: null,
        latestCandleTime: null,
        marketDirection: 'Bullish',
        signal: 'BUY',
        bosAndChoch: 'Unavailable',
        fvg: 'Unavailable',
        liquidityLevels: 'Unavailable',
        supportAndResistance: 'Unavailable',
        entryZone: 'Unavailable',
        stopLoss: 'Unavailable',
        takeProfit1: 'Unavailable',
        takeProfit2: 'Unavailable',
        takeProfit3: 'Unavailable',
        riskRewardRatio: 'Unavailable',
        explanation:
          candleResult.unavailableReason ||
          'Technical analysis cannot be generated without accessible real candle data.',
        keyObservations: [],
        analyzedAt: new Date().toISOString(),
      });
      return;
    }

    const analysis = await analyzeLiveCandles(
      symbol,
      timeframe,
      strategy || 'Auto',
      candleResult.candles,
      candleResult.dataSource
    );
    res.json(analysis);
  } catch (err) {
    const { status, message } = formatApiError(err);
    res.status(status).json({ error: message });
  }
});

app.post('/api/fundamental-analysis', async (req, res) => {
  try {
    const { market, economicEvent, analysisPeriod } = req.body as {
      market?: string;
      economicEvent?: string;
      analysisPeriod?: string;
    };

    if (!market || !economicEvent || !analysisPeriod) {
      res.status(400).json({ error: 'Market, economic event, and analysis period are required.' });
      return;
    }

    const result = await analyzeFundamentals(market, economicEvent, analysisPeriod);
    res.json(result);
  } catch (err) {
    const { status, message } = formatApiError(err);
    res.status(status).json({ error: message });
  }
});

async function startServer() {
  const port = Number(process.env.PORT) || 3000;
  const distDir = path.resolve(__dirname, 'dist');
  const isProd = process.env.NODE_ENV === 'production' && fs.existsSync(distDir);

  if (isProd) {
    app.use(express.static(distDir));
    app.get('/{*splat}', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`ChartScope server running on http://0.0.0.0:${port}`);
  });
}

startServer();
