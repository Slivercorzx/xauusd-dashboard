// app/page.tsx
'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { useMarketData } from '../hooks/useMarketData';
import { getThaiSession } from '../lib/strategy';

const Chart = dynamic(() => import('../components/Chart'), { ssr: false });

export default function Home() {
  const { candles, signals, stats, isLoading, lastUpdated, clearHistory } = useMarketData();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'history'>('dashboard');
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const currentThaiSession = getThaiSession(Math.floor(Date.now() / 1000));

  const handleClear = async () => {
    await clearHistory();
    setShowClearConfirm(false);
  };

  return (
    <div className="min-h-screen bg-black text-zinc-100 p-4 md:p-6 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* ─── Header ─────────────────────────────────────────────────────── */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center bg-zinc-900/50 p-6 rounded-2xl border border-zinc-800 backdrop-blur-md shadow-2xl gap-6">
          <div>
            <h1 className="text-4xl font-black tracking-tighter bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent italic">
              BRIGHT TRADE SIGNAL
            </h1>
            <div className="flex items-center gap-2 mt-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
              </span>
              <p className="text-sm font-bold text-zinc-300">
                Status:{' '}
                <span className="text-emerald-400">{currentThaiSession}</span>
              </p>
            </div>
            {lastUpdated && (
              <p className="text-[10px] text-zinc-600 mt-1">
                อัปเดตล่าสุด {lastUpdated.toLocaleTimeString('th-TH')}
              </p>
            )}
          </div>

          {/* ─── Stats Cards ──────────────────────────────────────────────── */}
          <div className="flex flex-wrap gap-3">
            <StatCard
              label="Accuracy"
              value={`${stats.winrate}%`}
              color="text-emerald-400"
              sub={stats.wins + stats.losses > 0 ? `${stats.wins}W / ${stats.losses}L` : '—'}
            />
            <StatCard
              label="Total Trades"
              value={String(stats.totalTrades)}
              color="text-cyan-400"
              sub={`${stats.pending} pending`}
            />
          </div>
        </header>

        {/* ─── Tabs ───────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <div className="flex bg-zinc-900/80 p-1.5 rounded-xl border border-zinc-800 gap-2">
            <TabButton active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')}>
              LIVE CHART
            </TabButton>
            <TabButton active={activeTab === 'history'} onClick={() => setActiveTab('history')}>
              ORDER HISTORY
              {stats.pending > 0 && (
                <span className="ml-2 bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[9px] font-black px-1.5 py-0.5 rounded-full">
                  {stats.pending}
                </span>
              )}
            </TabButton>
          </div>

          {/* Clear button */}
          {activeTab === 'history' && signals.length > 0 && (
            <div>
              {showClearConfirm ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-zinc-400">ลบทั้งหมด?</span>
                  <button
                    onClick={handleClear}
                    className="text-xs px-3 py-1.5 rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/30 hover:bg-rose-500/30 transition-colors font-bold"
                  >
                    ยืนยัน
                  </button>
                  <button
                    onClick={() => setShowClearConfirm(false)}
                    className="text-xs px-3 py-1.5 rounded-lg bg-zinc-800 text-zinc-400 hover:bg-zinc-700 transition-colors"
                  >
                    ยกเลิก
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowClearConfirm(true)}
                  className="text-xs px-3 py-1.5 rounded-lg bg-zinc-900 text-zinc-500 border border-zinc-800 hover:border-rose-500/40 hover:text-rose-400 transition-all"
                >
                  🗑 ล้างประวัติ
                </button>
              )}
            </div>
          )}
        </div>

        {/* ─── Content ────────────────────────────────────────────────────── */}
        {activeTab === 'dashboard' ? (
          <div className="h-[65vh] rounded-2xl overflow-hidden border border-zinc-800 shadow-2xl relative">
            {isLoading && candles.length === 0 ? (
              <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/80 z-10">
                <div className="text-center space-y-3">
                  <div className="inline-flex gap-1">
                    {[0, 1, 2].map((n) => (
                      <div
                        key={n}
                        className="w-2 h-8 bg-emerald-500 rounded-full animate-pulse"
                        style={{ animationDelay: `${n * 0.15}s` }}
                      />
                    ))}
                  </div>
                  <p className="text-zinc-400 text-sm font-bold">กำลังโหลดข้อมูลตลาด...</p>
                </div>
              </div>
            ) : null}
            <Chart candles={candles} signals={signals} />
          </div>
        ) : (
          <OrderHistoryTable signals={signals} />
        )}
      </div>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  color,
  sub,
}: {
  label: string;
  value: string;
  color: string;
  sub?: string;
}) {
  return (
    <div className="bg-black/40 border border-zinc-800 p-4 rounded-xl text-center min-w-[100px]">
      <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">{label}</p>
      <p className={`text-2xl font-black ${color}`}>{value}</p>
      {sub && <p className="text-[10px] text-zinc-600 mt-0.5">{sub}</p>}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center px-8 py-2 rounded-lg text-xs font-black transition-all ${
        active ? 'bg-zinc-700 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'
      }`}
    >
      {children}
    </button>
  );
}

function OrderHistoryTable({ signals }: { signals: import('../lib/strategy').Signal[] }) {
  const reversed = [...signals].reverse();

  if (reversed.length === 0) {
    return (
      <div className="bg-zinc-900/30 border border-zinc-800 rounded-2xl p-16 text-center">
        <p className="text-zinc-600 text-sm">ยังไม่มีออเดอร์</p>
      </div>
    );
  }

  return (
    <div className="bg-zinc-900/30 border border-zinc-800 rounded-2xl overflow-hidden backdrop-blur-sm shadow-xl">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-zinc-900/80 text-zinc-500 uppercase tracking-widest border-b border-zinc-800">
            <tr>
              <th className="p-5">Time (BKK)</th>
              <th className="p-5">Side</th>
              <th className="p-5">Outcome</th>
              <th className="p-5">Price Levels</th>
              <th className="p-5">Strategy</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/50">
            {reversed.map((s, i) => (
              <tr key={i} className="hover:bg-zinc-800/30 transition-colors">
                <td className="p-5 text-zinc-400 font-medium">
                  {new Date(s.time * 1000).toLocaleString('th-TH', {
                    hour: '2-digit',
                    minute: '2-digit',
                    day: '2-digit',
                    month: 'short',
                  })}
                </td>
                <td className="p-5">
                  <span
                    className={`px-3 py-1 rounded-full font-black text-[10px] border ${
                      s.type === 'BUY'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                    }`}
                  >
                    {s.type}
                  </span>
                </td>
                <td className="p-5">
                  <ResultBadge result={s.result} />
                </td>
                <td className="p-5 font-mono">
                  <div className="text-zinc-200 font-bold">
                    Entry: {s.price.toFixed(2)}
                  </div>
                  <div className="text-[10px] mt-1 space-x-2">
                    <span className="text-emerald-500/80">TP: {s.tp.toFixed(2)}</span>
                    <span className="text-rose-500/80">SL: {s.sl.toFixed(2)}</span>
                  </div>
                  {/* แสดง RR Ratio */}
                  <div className="text-[10px] text-zinc-600 mt-0.5">
                    RR: {calcRR(s)}
                  </div>
                </td>
                <td className="p-5 text-zinc-400 italic leading-relaxed max-w-xs">
                  {s.reason}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ResultBadge({ result }: { result: 'WIN' | 'LOSS' | 'PENDING' }) {
  const styles = {
    WIN: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
    LOSS: 'bg-rose-500/20 text-rose-400 border border-rose-500/30',
    PENDING: 'bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse',
  };
  const icons = { WIN: '✓', LOSS: '✗', PENDING: '⏳' };

  return (
    <span className={`px-2.5 py-1 rounded font-black text-[9px] ${styles[result]}`}>
      {icons[result]} {result}
    </span>
  );
}

function calcRR(s: import('../lib/strategy').Signal): string {
  const risk   = Math.abs(s.price - s.sl);
  const reward = Math.abs(s.tp - s.price);
  if (risk === 0) return '—';
  return `1 : ${(reward / risk).toFixed(2)}`;
}