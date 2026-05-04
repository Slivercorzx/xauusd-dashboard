// app/page.tsx
'use client';

import dynamic from 'next/dynamic';
import DashboardPanel from '../components/DashboardPanel';
import { useMarketData } from '../hooks/useMarketData';

// Dynamically import chart to prevent SSR errors with window object
const Chart = dynamic(() => import('../components/Chart'), { 
  ssr: false, 
  loading: () => <div className="w-full h-full bg-zinc-900 rounded-xl animate-pulse border border-zinc-800 flex items-center justify-center text-zinc-500">Loading Chart Engine...</div> 
});

export default function Home() {
  const { candles, signals, stats, session } = useMarketData();

  return (
    <main className="min-h-screen bg-black text-zinc-100 p-4 lg:p-6 font-sans selection:bg-emerald-500/30">
      <div className="max-w-[1600px] mx-auto h-[calc(100vh-3rem)]">
        
        <header className="mb-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight text-white">
            QUANT<span className="text-emerald-400">NODE</span>
          </h1>
          <div className="flex items-center gap-3 text-sm font-medium">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Live Data Feed
            </span>
          </div>
        </header>

        <div className="flex flex-col lg:flex-row gap-4 h-full pb-10">
          <div className="flex-grow lg:w-[70%] h-[50vh] lg:h-full">
            <Chart candles={candles} signals={signals} />
          </div>
          <div className="lg:w-[30%] shrink-0">
            <DashboardPanel stats={stats} session={session} />
          </div>
        </div>

      </div>
    </main>
  );
}