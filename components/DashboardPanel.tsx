// components/DashboardPanel.tsx
import { Activity, Target, AlertCircle, Clock, Zap } from 'lucide-react';

interface StatsProps {
  stats: { winrate: number; totalTrades: number; rr: number };
  session: string;
}

export default function DashboardPanel({ stats, session }: StatsProps) {
  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-6 flex flex-col gap-6 text-zinc-100 shadow-xl h-full">
      <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2"><Zap className="text-emerald-400 w-5 h-5"/> Strategy Algo</h2>
          <p className="text-sm text-zinc-500">XAUUSD • 5m Scalper</p>
        </div>
        <div className={`px-3 py-1 rounded-full text-xs font-bold ${session === 'Off-Hours' ? 'bg-zinc-800 text-zinc-400' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50'}`}>
          <span className="flex items-center gap-1"><Clock className="w-3 h-3"/> {session}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-zinc-900 p-4 rounded-lg border border-zinc-800/50">
          <p className="text-zinc-500 text-sm flex items-center gap-2"><Target className="w-4 h-4"/> Winrate (Last 50)</p>
          <p className="text-2xl font-bold text-white mt-1">{stats.winrate}%</p>
        </div>
        <div className="bg-zinc-900 p-4 rounded-lg border border-zinc-800/50">
          <p className="text-zinc-500 text-sm flex items-center gap-2"><Activity className="w-4 h-4"/> Risk / Reward</p>
          <p className="text-2xl font-bold text-white mt-1">1 : {stats.rr}</p>
        </div>
      </div>

      <div className="bg-zinc-900 p-4 rounded-lg border border-zinc-800/50 flex-1">
        <h3 className="text-sm text-zinc-500 mb-3 flex items-center gap-2"><AlertCircle className="w-4 h-4"/> Active Rules Engine</h3>
        <ul className="space-y-2 text-xs font-medium text-zinc-400">
          <li className="flex justify-between"><span>Trend Filter</span> <span className="text-zinc-200">EMA50 / 200</span></li>
          <li className="flex justify-between"><span>Momentum</span> <span className="text-zinc-200">ADX &gt; 25 &amp; RSI</span></li>
          <li className="flex justify-between"><span>Risk</span> <span className="text-rose-400">SL: 1x ATR</span></li>
          <li className="flex justify-between"><span>Target</span> <span className="text-emerald-400">TP: 1.3x ATR</span></li>
        </ul>
      </div>
      
      <button className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-3 rounded-lg transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)]">
        Strategy Active
      </button>
    </div>
  );
}