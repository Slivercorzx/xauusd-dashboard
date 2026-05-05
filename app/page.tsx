// app/page.tsx
"use client";

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { useMarketData } from '../hooks/useMarketData';
import { getThaiSession } from '../lib/strategy';

const Chart = dynamic(() => import('../components/Chart'), { ssr: false });

export default function Home() {
  const { candles, signals, stats } = useMarketData();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'history'>('dashboard');

  const currentThaiSession = getThaiSession(Math.floor(Date.now() / 1000));

  return (
    <div className="min-h-screen bg-black text-zinc-100 p-4 md:p-6 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        
        <header className="flex flex-col md:flex-row justify-between items-center bg-zinc-900/50 p-6 rounded-2xl border border-zinc-800 backdrop-blur-md shadow-2xl">
          <div>
            <h1 className="text-4xl font-black tracking-tighter bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent italic">
              BRIGHT TRADE SIGNAL
            </h1>
            <div className="flex items-center gap-2 mt-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
              <p className="text-sm font-bold text-zinc-300">
                Current Status: <span className="text-emerald-400">{currentThaiSession}</span>
              </p>
            </div>
          </div>
          
          <div className="flex gap-4 mt-6 md:mt-0">
             <div className="bg-black/40 border border-zinc-800 p-4 rounded-xl text-center min-w-[100px]">
                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Accuracy</p>
                <p className="text-2xl font-black text-emerald-400">{stats.winrate}%</p>
             </div>
             <div className="bg-black/40 border border-zinc-800 p-4 rounded-xl text-center min-w-[100px]">
                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Total Trades</p>
                <p className="text-2xl font-black text-cyan-400">{stats.totalTrades}</p>
             </div>
          </div>
        </header>

        <div className="flex bg-zinc-900/80 p-1.5 rounded-xl border border-zinc-800 w-fit gap-2">
          <button 
            onClick={() => setActiveTab('dashboard')} 
            className={`px-8 py-2 rounded-lg text-xs font-black transition-all ${activeTab === 'dashboard' ? 'bg-zinc-700 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            LIVE CHART
          </button>
          <button 
            onClick={() => setActiveTab('history')} 
            className={`px-8 py-2 rounded-lg text-xs font-black transition-all ${activeTab === 'history' ? 'bg-zinc-700 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            ORDER HISTORY
          </button>
        </div>

        {activeTab === 'dashboard' ? (
          <div className="h-[65vh] rounded-2xl overflow-hidden border border-zinc-800 shadow-2xl relative">
            <Chart candles={candles} signals={signals} />
          </div>
        ) : (
          <div className="bg-zinc-900/30 border border-zinc-800 rounded-2xl overflow-hidden backdrop-blur-sm shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-900/80 text-zinc-500 uppercase tracking-widest border-b border-zinc-800">
                  <tr>
                    <th className="p-5">Time (BKK)</th>
                    <th className="p-5">Side</th>
                    <th className="p-5">Outcome</th>
                    <th className="p-5">Price Levels</th>
                    <th className="p-5">ICT Analysis</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                  {[...signals].reverse().map((s, i) => (
                    <tr key={i} className="hover:bg-zinc-800/30 transition-colors">
                      <td className="p-5 text-zinc-400 font-medium">
                        {new Date(s.time * 1000).toLocaleString('th-TH', {hour:'2-digit', minute:'2-digit', day:'2-digit', month:'short'})}
                      </td>
                      <td className="p-5">
                        <span className={`px-3 py-1 rounded-full font-black text-[10px] border ${
                          s.type === 'BUY' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                        }`}>{s.type}</span>
                      </td>
                      <td className="p-5">
                        <span className={`px-2.5 py-1 rounded font-black text-[9px] ${
                          s.result === 'WIN' ? 'bg-emerald-500/20 text-emerald-400' : 
                          s.result === 'LOSS' ? 'bg-rose-500/20 text-rose-400' : 'bg-zinc-800 text-zinc-500'
                        }`}>
                          {s.result}
                        </span>
                      </td>
                      <td className="p-5 font-mono">
                        <div className="text-zinc-200 font-bold underline decoration-zinc-700">Entry: {s.price.toFixed(2)}</div>
                        <div className="text-[10px] mt-1 space-x-2">
                           <span className="text-emerald-500/70">TP: {s.tp.toFixed(2)}</span>
                           <span className="text-rose-500/70">SL: {s.sl.toFixed(2)}</span>
                        </div>
                      </td>
                      <td className="p-5 text-zinc-400 italic leading-relaxed max-w-xs">{s.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}