import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';

interface SignalBadgeBlockProps {
  signal: 'BUY' | 'SELL' | 'NO_SIGNAL';
  direction: string;
  subtitle?: string;
}

export function SignalBadgeBlock({ signal, direction, subtitle }: SignalBadgeBlockProps) {
  const config =
    signal === 'BUY'
      ? {
          container: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300',
          label: 'BUY',
          Icon: ArrowUpRight,
        }
      : signal === 'SELL'
        ? {
            container: 'bg-rose-500/10 border-rose-500/30 text-rose-300',
            label: 'SELL',
            Icon: ArrowDownRight,
          }
        : {
            container: 'bg-amber-500/10 border-amber-500/30 text-amber-300',
            label: 'NO CLEAR SIGNAL',
            Icon: Minus,
          };

  const Icon = config.Icon;

  return (
    <div className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 ${config.container}`}>
      <div className="flex items-center gap-2.5">
        <Icon className="w-5 h-5 shrink-0" />
        <div>
          <div className="text-base font-bold tracking-tight whitespace-nowrap">{config.label}</div>
          {subtitle && <div className="text-xs opacity-80">{subtitle}</div>}
        </div>
      </div>
      <div className="text-right">
        <div className="text-[11px] uppercase tracking-wider opacity-75">Market Direction</div>
        <div className="text-sm font-semibold">{direction}</div>
      </div>
    </div>
  );
}

interface TradeLevelsGridProps {
  entryZone: string;
  stopLoss: string;
  takeProfit1: string;
  takeProfit2: string;
  takeProfit3: string;
  riskRewardRatio: string;
  invalidationLevel?: string;
}

export function TradeLevelsGrid({
  entryZone,
  stopLoss,
  takeProfit1,
  takeProfit2,
  takeProfit3,
  riskRewardRatio,
  invalidationLevel,
}: TradeLevelsGridProps) {
  const items = [
    { label: 'Entry Price / Zone', value: entryZone, tone: 'text-white' },
    { label: 'Stop Loss', value: stopLoss, tone: 'text-rose-400' },
    { label: 'Take Profit 1', value: takeProfit1, tone: 'text-emerald-400' },
    { label: 'Take Profit 2', value: takeProfit2, tone: 'text-emerald-400' },
    { label: 'Take Profit 3', value: takeProfit3, tone: 'text-emerald-400' },
    { label: 'Risk-to-Reward', value: riskRewardRatio, tone: 'text-white' },
  ];

  if (invalidationLevel) {
    items.push({ label: 'Invalidation Level', value: invalidationLevel, tone: 'text-amber-300' });
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-px bg-white/[0.08] rounded-xl overflow-hidden border border-white/[0.08]">
      {items.map((item) => (
        <div key={item.label} className="bg-[#11141A] p-3.5">
          <div className="text-xs text-gray-400 mb-1">{item.label}</div>
          <div className={`text-sm font-mono font-semibold tabular-nums break-words ${item.tone}`}>
            {item.value}
          </div>
        </div>
      ))}
    </div>
  );
}
