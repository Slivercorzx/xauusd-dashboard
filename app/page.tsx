// app/page.tsx
"use client";

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { useMarketData } from '../hooks/useMarketData';

const Chart = dynamic(() => import('../components/Chart'), { ssr: false });

export default function Home() {
  const { candles, signals, stats, session } = useMarketData();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'history'>('dashboard');

  return (
    <div className="min-h-screen bg-black text-zinc-100 p-4 md:p-6 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header - เปลี่ยนเป็นชื่อคุณสุดเท่ */}
        <header className="flex flex-col md:flex-row justify-between items-center bg-zinc-900/50 p-6 rounded-2xl border border-zinc-800 backdrop-blur-sm shadow-xl">
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-emerald-400 to-cyan-500 bg-clip-text text-transparent">
              BRIGHT TRADE SIGNAL
            </h1>
            <p className="text-sm text-zinc-400 mt-2 font-medium tracking-wide">
              Advanced ICT Algorithm • {session}
            </p>
          </div>
          
          <div className="flex gap-4 mt-4 md:mt-0">
            <div className="bg-zinc-900/80 px-5 py-2 rounded-xl border border-zinc-800 text-center shadow-inner">
              <p className="text-xs text-zinc-500 font-semibold mb-1">WIN RATE</p>
              <p className="text-xl font-bold text-emerald-400">{stats.winrate}%</p>
            </div>
            <div className="bg-zinc-900/80 px-5 py-2 rounded-xl border border-zinc-800 text-center shadow-inner">
              <p className="text-xs text-zinc-500 font-semibold mb-1">TRADES</p>
              <p className="text-xl font-bold text-cyan-400">{stats.totalTrades}</p>
            </div>
          </div>
        </header>

        {/* Navigation Tabs */}
        <nav className="flex space-x-2 bg-zinc-900/40 p-1.5 rounded-xl border border-zinc-800 w-fit">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${activeTab === 'dashboard' ? 'bg-zinc-800 text-white shadow-md' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'}`}
          >
            📊 กราฟ & สัญญาณเทรด (Dashboard)
          </button>
          <button 
            onClick={() => setActiveTab('history')}
            className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${activeTab === 'history' ? 'bg-zinc-800 text-white shadow-md' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'}`}
          >
            📜 ประวัติออเดอร์ (Order History)
          </button>
        </nav>

        {/* Content Area */}
        {activeTab === 'dashboard' ? (
          // แท็บกราฟ
          <div className="h-[60vh] md:h-[70vh] w-full rounded-2xl overflow-hidden border border-zinc-800 shadow-2xl relative">
             <Chart candles={candles} signals={signals} />
          </div>
        ) : (
          // แท็บประวัติออเดอร์
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="uppercase tracking-wider border-b border-zinc-800 bg-zinc-900">
                  <tr>
                    <th className="px-6 py-4 font-medium text-zinc-400">เวลา (Time)</th>
                    <th className="px-6 py-4 font-medium text-zinc-400">ประเภท (Type)</th>
                    <th className="px-6 py-4 font-medium text-zinc-400">ราคาเข้า (Entry)</th>
                    <th className="px-6 py-4 font-medium text-zinc-400">TP / SL</th>
                    <th className="px-6 py-4 font-medium text-zinc-400">เหตุผลวิเคราะห์ (ICT Context)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                  {signals.length > 0 ? (
                    // นำออเดอร์ล่าสุดขึ้นก่อน (reverse)
                    [...signals].reverse().map((signal, idx) => (
                      <tr key={idx} className="hover:bg-zinc-800/30 transition-colors">
                        <td className="px-6 py-4 text-zinc-300">
                          {new Date((signal.time as number) * 1000).toLocaleString('th-TH', { 
                            dateStyle: 'short', timeStyle: 'short' 
                          })}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-md text-xs font-bold ${
                            signal.type === 'BUY' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 
                            'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          }`}>
                            {signal.type}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-mono text-zinc-200">
                          {signal.price.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 font-mono">
                          <span className="text-emerald-400 mr-2">TP: {signal.tp.toFixed(2)}</span>
                          <span className="text-rose-400">SL: {signal.sl.toFixed(2)}</span>
                        </td>
                        <td className="px-6 py-4 text-zinc-400 max-w-md truncate whitespace-normal">
                          {signal.reason}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-zinc-500">
                        ยังไม่มีสัญญาณเทรดในขณะนี้ กำลังรอการกวาด Liquidity...
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}