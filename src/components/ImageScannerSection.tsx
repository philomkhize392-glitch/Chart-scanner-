import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import { AlertTriangle, Camera, Check, Loader2, ScanLine, Trash2, Upload } from 'lucide-react';
import type { ImageAnalysisResult, StrategyType } from '../types/trading';
import { SignalBadgeBlock, TradeLevelsGrid } from './SignalCard';

const STRATEGIES: StrategyType[] = [
  'Auto',
  'ICT',
  'Smart Money Concepts (SMC)',
  'Price Action',
  'Trend Following',
  'Supply and Demand',
];

const SCAN_STAGES = [
  {
    title: 'Reading visible candles & price axis',
    detail: 'Inspecting timeframe, ticker label, and readable price scale.',
  },
  {
    title: 'Mapping structure & liquidity zones',
    detail: 'Checking BOS, CHoCH, Fair Value Gaps, and supply/demand levels.',
  },
  {
    title: 'Calculating setup levels & Risk-to-Reward',
    detail: 'Anchoring BUY/SELL bias, entry zone, stop loss, and TP1–TP3.',
  },
];

const EASE_OUT_EXPO: [number, number, number, number] = [0.16, 1, 0.3, 1];

export function ImageScannerSection() {
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [imageMimeType, setImageMimeType] = useState<string>('image/png');
  const [imageName, setImageName] = useState<string>('');
  const [strategy, setStrategy] = useState<StrategyType>('Auto');
  const [loading, setLoading] = useState(false);
  const [scanStageIdx, setScanStageIdx] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImageAnalysisResult | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (!loading) {
      setScanStageIdx(0);
      return;
    }
    const interval = setInterval(() => {
      setScanStageIdx((prev) => (prev + 1) % SCAN_STAGES.length);
    }, 1500);
    return () => clearInterval(interval);
  }, [loading]);

  const handleFile = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file (PNG, JPG, or WebP).');
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      setError('Image size must be under 12 MB.');
      return;
    }

    setError(null);
    setResult(null);
    setImageName(file.name);

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== 'string') return;
      const rawDataUrl = reader.result;
      const img = new Image();
      img.onload = () => {
        const maxEdge = 1600;
        const { width, height } = img;
        if (width <= maxEdge && height <= maxEdge) {
          setImageMimeType(file.type || 'image/png');
          setImageDataUrl(rawDataUrl);
          return;
        }
        const scale = maxEdge / Math.max(width, height);
        const targetW = Math.round(width * scale);
        const targetH = Math.round(height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          setImageMimeType(file.type || 'image/png');
          setImageDataUrl(rawDataUrl);
          return;
        }
        ctx.drawImage(img, 0, 0, targetW, targetH);
        const outMime = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
        setImageMimeType(outMime);
        setImageDataUrl(canvas.toDataURL(outMime, 0.9));
      };
      img.onerror = () => {
        setImageMimeType(file.type || 'image/png');
        setImageDataUrl(rawDataUrl);
      };
      img.src = rawDataUrl;
    };
    reader.onerror = () => {
      setError('Failed to read the selected image file.');
    };
    reader.readAsDataURL(file);
  };

  const handleClear = () => {
    setImageDataUrl(null);
    setImageName('');
    setResult(null);
    setError(null);
    if (galleryInputRef.current) galleryInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  const handleAnalyze = async () => {
    if (!imageDataUrl) {
      setError('Upload or capture a chart screenshot first.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/analyze-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: imageDataUrl,
          mimeType: imageMimeType,
          strategy,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to analyze uploaded chart image.');
      }

      setResult(data as ImageAnalysisResult);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Network error while analyzing chart image. Check your connection and retry.'
      );
    } finally {
      setLoading(false);
    }
  };

  const activeStage = SCAN_STAGES[scanStageIdx];

  return (
    <MotionConfig reducedMotion="user">
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left column: Upload & Controls */}
          <div className="lg:col-span-5 space-y-5">
            <div className="rounded-2xl border border-white/[0.08] bg-[#11141A] p-4 sm:p-5 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <h1 className="text-base sm:text-lg font-semibold text-white">Chart Image Upload</h1>
                {imageDataUrl && (
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.96 }}
                    onClick={handleClear}
                    disabled={loading}
                    className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-rose-400 disabled:opacity-40 min-h-[36px] px-2 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Remove</span>
                  </motion.button>
                )}
              </div>

              <input
                ref={galleryInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleFile(e.target.files?.[0])}
              />
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => handleFile(e.target.files?.[0])}
              />

              <AnimatePresence mode="wait">
                {!imageDataUrl ? (
                  <motion.div
                    key="dropzone"
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: isDragging ? 1.015 : 1 }}
                    exit={{ opacity: 0, scale: 0.97 }}
                    transition={{ duration: 0.22, ease: EASE_OUT_EXPO }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragging(true);
                    }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDragging(false);
                      handleFile(e.dataTransfer.files?.[0]);
                    }}
                    className={`relative rounded-xl border border-dashed p-6 sm:p-8 text-center transition-colors overflow-hidden ${
                      isDragging
                        ? 'border-emerald-400 bg-emerald-500/10'
                        : 'border-white/[0.15] bg-[#0D1015]'
                    }`}
                  >
                    {/* Viewfinder corner brackets */}
                    <span className="pointer-events-none absolute top-2.5 left-2.5 w-3.5 h-3.5 border-t-2 border-l-2 border-emerald-400/40 rounded-tl-sm" />
                    <span className="pointer-events-none absolute top-2.5 right-2.5 w-3.5 h-3.5 border-t-2 border-r-2 border-emerald-400/40 rounded-tr-sm" />
                    <span className="pointer-events-none absolute bottom-2.5 left-2.5 w-3.5 h-3.5 border-b-2 border-l-2 border-emerald-400/40 rounded-bl-sm" />
                    <span className="pointer-events-none absolute bottom-2.5 right-2.5 w-3.5 h-3.5 border-b-2 border-r-2 border-emerald-400/40 rounded-br-sm" />

                    {/* Animated mini candlestick silhouette */}
                    <div className="flex items-end justify-center gap-1.5 h-10 mb-3" aria-hidden="true">
                      {[
                        { h: 'h-4', bullish: false, delay: 0 },
                        { h: 'h-6', bullish: true, delay: 0.15 },
                        { h: 'h-5', bullish: false, delay: 0.3 },
                        { h: 'h-8', bullish: true, delay: 0.45 },
                        { h: 'h-9', bullish: true, delay: 0.6 },
                      ].map((bar, idx) => (
                        <motion.div
                          key={idx}
                          animate={{
                            scaleY: [1, 1.18, 0.92, 1],
                            opacity: [0.55, 0.95, 0.65, 0.55],
                          }}
                          transition={{
                            duration: 2.6,
                            repeat: Infinity,
                            delay: bar.delay,
                            ease: 'easeInOut',
                          }}
                          style={{ transformOrigin: 'bottom' }}
                          className={`w-1.5 rounded-xs ${bar.h} ${
                            bar.bullish ? 'bg-emerald-400/80' : 'bg-rose-400/70'
                          }`}
                        />
                      ))}
                    </div>

                    <p className="text-sm font-medium text-white mb-1">
                      Upload a trading chart screenshot
                    </p>
                    <p className="text-xs text-gray-400 mb-5">
                      Include price scale and candlesticks for accurate structure and level reading.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-2.5 justify-center">
                      <motion.button
                        type="button"
                        whileHover={{ y: -1 }}
                        whileTap={{ scale: 0.97 }}
                        transition={{ duration: 0.15 }}
                        onClick={() => galleryInputRef.current?.click()}
                        className="inline-flex items-center justify-center gap-2 min-h-[44px] px-4 py-2.5 rounded-xl bg-[#171B22] hover:bg-[#1E242E] border border-white/[0.1] text-sm font-medium text-white transition-colors whitespace-nowrap"
                      >
                        <Upload className="w-4 h-4 text-emerald-400" />
                        <span>Upload Image</span>
                      </motion.button>
                      <motion.button
                        type="button"
                        whileHover={{ y: -1 }}
                        whileTap={{ scale: 0.97 }}
                        transition={{ duration: 0.15 }}
                        onClick={() => cameraInputRef.current?.click()}
                        className="inline-flex items-center justify-center gap-2 min-h-[44px] px-4 py-2.5 rounded-xl bg-[#171B22] hover:bg-[#1E242E] border border-white/[0.1] text-sm font-medium text-white transition-colors whitespace-nowrap"
                      >
                        <Camera className="w-4 h-4 text-emerald-400" />
                        <span>Take Photo</span>
                      </motion.button>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="preview"
                    initial={{ opacity: 0, scale: 0.97 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.97 }}
                    transition={{ duration: 0.25, ease: EASE_OUT_EXPO }}
                    className="space-y-3"
                  >
                    <div className="relative rounded-xl overflow-hidden border border-white/[0.1] bg-[#090B0E]">
                      <img
                        src={imageDataUrl}
                        alt="Uploaded trading chart screenshot"
                        className="w-full max-h-[360px] object-contain mx-auto block"
                      />

                      {/* Corner scanner reticles */}
                      <motion.span
                        animate={{ opacity: loading ? 1 : 0.45 }}
                        transition={{ duration: 0.2 }}
                        className="pointer-events-none absolute top-2.5 left-2.5 w-4 h-4 border-t-2 border-l-2 border-emerald-400 rounded-tl-sm"
                      />
                      <motion.span
                        animate={{ opacity: loading ? 1 : 0.45 }}
                        transition={{ duration: 0.2 }}
                        className="pointer-events-none absolute top-2.5 right-2.5 w-4 h-4 border-t-2 border-r-2 border-emerald-400 rounded-tr-sm"
                      />
                      <motion.span
                        animate={{ opacity: loading ? 1 : 0.45 }}
                        transition={{ duration: 0.2 }}
                        className="pointer-events-none absolute bottom-2.5 left-2.5 w-4 h-4 border-b-2 border-l-2 border-emerald-400 rounded-bl-sm"
                      />
                      <motion.span
                        animate={{ opacity: loading ? 1 : 0.45 }}
                        transition={{ duration: 0.2 }}
                        className="pointer-events-none absolute bottom-2.5 right-2.5 w-4 h-4 border-b-2 border-r-2 border-emerald-400 rounded-br-sm"
                      />

                      {/* Active Laser Scanline & Calibration Grid Overlay while analyzing */}
                      <AnimatePresence>
                        {loading && (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="pointer-events-none absolute inset-0"
                          >
                            {/* Subtle precision grid */}
                            <div
                              className="absolute inset-0 opacity-25"
                              style={{
                                backgroundImage:
                                  'linear-gradient(to right, rgba(16,185,129,0.22) 1px, transparent 1px), linear-gradient(to bottom, rgba(16,185,129,0.22) 1px, transparent 1px)',
                                backgroundSize: '32px 32px',
                              }}
                            />

                            {/* Vertical sweeping laser beam across full chart height (GPU transform-only) */}
                            <motion.div
                              initial={{ y: '-100%' }}
                              animate={{ y: ['-100%', '0%', '-100%'] }}
                              transition={{
                                duration: 2.6,
                                repeat: Infinity,
                                ease: 'easeInOut',
                              }}
                              className="absolute inset-0 flex flex-col justify-end"
                            >
                              <div className="h-24 w-full bg-gradient-to-b from-transparent via-emerald-400/12 to-emerald-400/30" />
                              <div className="h-[2px] w-full bg-emerald-400 shadow-[0_0_16px_rgba(16,185,129,0.9)]" />
                            </motion.div>

                            {/* High-contrast bottom scrim caption */}
                            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/45 to-transparent px-3.5 pt-6 pb-2.5 flex items-center justify-between gap-2">
                              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-300">
                                <ScanLine className="w-3.5 h-3.5 shrink-0" />
                                <span>{activeStage.title}</span>
                              </span>
                              <span className="text-[11px] font-mono text-gray-300 tabular-nums">
                                {scanStageIdx + 1}/{SCAN_STAGES.length}
                              </span>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-400">
                      <span className="truncate max-w-[220px]">{imageName || 'Chart Screenshot'}</span>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => galleryInputRef.current?.click()}
                          disabled={loading}
                          className="text-emerald-400 hover:underline font-medium disabled:opacity-40"
                        >
                          Replace Image
                        </button>
                        <button
                          type="button"
                          onClick={() => cameraInputRef.current?.click()}
                          disabled={loading}
                          className="text-gray-300 hover:underline font-medium disabled:opacity-40"
                        >
                          Retake Photo
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Strategy Selection with sliding active highlight */}
              <div className="space-y-2 pt-1">
                <label className="block text-xs font-medium text-gray-300">
                  Analysis Strategy
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 gap-2">
                  {STRATEGIES.map((item) => {
                    const active = strategy === item;
                    return (
                      <motion.button
                        key={item}
                        type="button"
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setStrategy(item)}
                        className={`relative min-h-[44px] px-3 py-2 rounded-xl text-xs font-medium text-left transition-colors border overflow-hidden ${
                          active
                            ? 'border-emerald-500/50 text-emerald-300'
                            : 'bg-[#171B22] border-white/[0.06] text-gray-300 hover:border-white/[0.15] hover:text-white'
                        }`}
                      >
                        {active && (
                          <motion.span
                            layoutId="scanner-strategy-active"
                            transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                            className="absolute inset-0 bg-emerald-500/15"
                          />
                        )}
                        <span className="relative z-10 block truncate">{item}</span>
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              <motion.button
                type="button"
                whileHover={loading || !imageDataUrl ? undefined : { y: -1 }}
                whileTap={loading || !imageDataUrl ? undefined : { scale: 0.985 }}
                transition={{ duration: 0.15 }}
                onClick={handleAnalyze}
                disabled={loading || !imageDataUrl}
                className="w-full min-h-[48px] px-4 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:bg-[#171B22] disabled:text-gray-500 text-black font-semibold text-sm transition-colors flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Inspecting Uploaded Chart...</span>
                  </>
                ) : (
                  <>
                    <ScanLine className="w-4 h-4" />
                    <span>Analyze Chart</span>
                  </>
                )}
              </motion.button>

              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.2, ease: EASE_OUT_EXPO }}
                    className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3.5 text-xs text-rose-200 flex items-start gap-2.5"
                  >
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Right column: Analysis Report */}
          <div className="lg:col-span-7">
            <AnimatePresence mode="wait">
              {!result && !loading && (
                <motion.div
                  key="idle"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.22, ease: EASE_OUT_EXPO }}
                  className="rounded-2xl border border-white/[0.08] bg-[#11141A] p-6 sm:p-8 text-center"
                >
                  <p className="text-sm font-medium text-white mb-1.5">
                    Technical Inspection Report
                  </p>
                  <p className="text-xs text-gray-400 max-w-md mx-auto leading-relaxed">
                    Upload a clear chart screenshot and select a strategy. The scanner inspects only visible candlesticks, price axes, and structure without inventing unreadable prices.
                  </p>
                </motion.div>
              )}

              {loading && (
                <motion.div
                  key="scanning"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.25, ease: EASE_OUT_EXPO }}
                  className="rounded-2xl border border-white/[0.08] bg-[#11141A] p-6 sm:p-8 space-y-6"
                >
                  <div className="flex items-center justify-between gap-3 border-b border-white/[0.08] pb-4">
                    <div className="flex items-center gap-3">
                      <motion.div
                        animate={{ opacity: [0.65, 1, 0.65] }}
                        transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
                        className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0"
                      >
                        <ScanLine className="w-4 h-4 text-emerald-400" />
                      </motion.div>
                      <div>
                        <p className="text-sm font-semibold text-white">
                          Inspecting Visible Market Structure
                        </p>
                        <p className="text-xs text-gray-400">Strategy: {strategy}</p>
                      </div>
                    </div>
                    <Loader2 className="w-4 h-4 text-emerald-400 animate-spin shrink-0" />
                  </div>

                  {/* Smooth GPU progress bar */}
                  <div className="h-1.5 w-full rounded-full bg-white/[0.06] overflow-hidden">
                    <motion.div
                      animate={{
                        scaleX: (scanStageIdx + 1) / SCAN_STAGES.length,
                      }}
                      transition={{ duration: 0.45, ease: EASE_OUT_EXPO }}
                      style={{ transformOrigin: 'left' }}
                      className="h-full w-full bg-emerald-400 rounded-full"
                    />
                  </div>

                  {/* Sequenced inspection stage checklist */}
                  <div className="space-y-2.5">
                    {SCAN_STAGES.map((stage, idx) => {
                      const isDone = idx < scanStageIdx;
                      const isActive = idx === scanStageIdx;
                      return (
                        <motion.div
                          key={stage.title}
                          animate={{
                            opacity: isDone ? 0.65 : isActive ? 1 : 0.4,
                            x: isActive ? 4 : 0,
                          }}
                          transition={{ duration: 0.25, ease: EASE_OUT_EXPO }}
                          className={`rounded-xl border px-3.5 py-3 flex items-start gap-3 transition-colors ${
                            isActive
                              ? 'border-emerald-500/40 bg-emerald-500/[0.07]'
                              : 'border-white/[0.06] bg-[#0D1015]'
                          }`}
                        >
                          <div
                            className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-[11px] font-mono ${
                              isDone
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : isActive
                                  ? 'bg-emerald-500 text-black font-bold'
                                  : 'bg-white/[0.06] text-gray-400'
                            }`}
                          >
                            {isDone ? <Check className="w-3 h-3" /> : idx + 1}
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-medium text-white">{stage.title}</div>
                            <div className="text-[11px] text-gray-400 mt-0.5">{stage.detail}</div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {result && !loading && (
                <motion.div
                  key={`report-${result.analyzedAt}`}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.3, ease: EASE_OUT_EXPO }}
                  className="rounded-2xl border border-white/[0.08] bg-[#11141A] p-4 sm:p-6 space-y-5"
                >
                  {/* Header metadata */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.08] pb-3.5">
                    <div>
                      <h2 className="text-base font-semibold text-white">Chart Inspection Report</h2>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-gray-400 mt-0.5">
                        <span>Symbol: {result.detectedSymbol}</span>
                        <span aria-hidden="true">·</span>
                        <span>Timeframe: {result.detectedTimeframe}</span>
                        <span aria-hidden="true">·</span>
                        <span>Strategy: {result.strategyApplied}</span>
                      </div>
                    </div>
                    <span className="text-xs font-mono text-gray-500 tabular-nums">
                      {new Date(result.analyzedAt).toLocaleString()}
                    </span>
                  </div>

                  {(!result.hasEnoughData || result.limitationReason) && (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.22, delay: 0.04, ease: EASE_OUT_EXPO }}
                      className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-amber-200 flex items-start gap-2.5"
                    >
                      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <div className="font-semibold text-amber-300 mb-0.5">Chart Visibility Note</div>
                        <p className="leading-relaxed">
                          {result.limitationReason ||
                            'Some chart elements or price levels could not be confirmed from the uploaded image.'}
                        </p>
                      </div>
                    </motion.div>
                  )}

                  <motion.div
                    initial={{ opacity: 0, scale: 0.97 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.26, delay: 0.05, ease: EASE_OUT_EXPO }}
                  >
                    <SignalBadgeBlock
                      signal={result.signal}
                      direction={result.trendDirection}
                      subtitle={result.structureSummary}
                    />
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.26, delay: 0.1, ease: EASE_OUT_EXPO }}
                  >
                    <TradeLevelsGrid
                      entryZone={result.entryZone}
                      stopLoss={result.stopLoss}
                      takeProfit1={result.takeProfit1}
                      takeProfit2={result.takeProfit2}
                      takeProfit3={result.takeProfit3}
                      riskRewardRatio={result.riskRewardRatio}
                      invalidationLevel={result.invalidationLevel}
                    />
                  </motion.div>

                  {/* Market Structure Breakdown */}
                  <div className="space-y-2.5">
                    <h3 className="text-sm font-semibold text-white">Visible Structure & Price Action</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      {[
                        { label: 'Break of Structure (BOS)', val: result.detectedElements.bos },
                        { label: 'Change of Character (CHoCH)', val: result.detectedElements.choch },
                        { label: 'Market Structure Shift (MSS)', val: result.detectedElements.mss },
                        { label: 'Fair Value Gap (FVG)', val: result.detectedElements.fvg },
                        { label: 'Liquidity Levels', val: result.detectedElements.liquidityLevels },
                        { label: 'Support & Resistance', val: result.detectedElements.supportResistance },
                        { label: 'Supply & Demand Zones', val: result.detectedElements.supplyDemandZones },
                        { label: 'Candlestick Patterns', val: result.detectedElements.candlestickPatterns },
                      ].map((el, idx) => (
                        <motion.div
                          key={el.label}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{
                            duration: 0.22,
                            delay: 0.14 + idx * 0.028,
                            ease: EASE_OUT_EXPO,
                          }}
                          className="rounded-xl border border-white/[0.06] bg-[#0D1015] p-3"
                        >
                          <div className="text-gray-400 mb-1">{el.label}</div>
                          <div className="text-gray-100 leading-relaxed">{el.val}</div>
                        </motion.div>
                      ))}
                    </div>
                  </div>

                  {/* Supporting Reasons */}
                  {result.reasons.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.24, delay: 0.36, ease: EASE_OUT_EXPO }}
                      className="space-y-2 border-t border-white/[0.08] pt-4"
                    >
                      <h3 className="text-sm font-semibold text-white">Supporting Evidence</h3>
                      <ul className="space-y-1.5 text-xs sm:text-sm text-gray-300 list-disc pl-5">
                        {result.reasons.map((reason, idx) => (
                          <li key={idx} className="leading-relaxed">
                            {reason}
                          </li>
                        ))}
                      </ul>
                    </motion.div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </MotionConfig>
  );
}
