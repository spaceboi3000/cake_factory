'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useFactorySimulation } from '../hooks/useFactorySimulation';
import ConveyorBelt from '../components/ConveyorBelt';
import PipeliningConveyor from '../components/PipeliningConveyor';
import CacheBakery from '../components/CacheBakery';

export default function FactoryDashboard() {
  // Navigation Window State
  const [activeWindow, setActiveWindow] = useState<'dvfs' | 'pipelining' | 'cache'>('dvfs');

  // Serial, Clock Speed, and VLIW Computing States
  const [hardwareClockSpeed, setHardwareClockSpeed] = useState<number | null>(null);
  const [manualClockSpeed, setManualClockSpeed] = useState<number>(1.0);
  const [vliwEnabled, setVliwEnabled] = useState<boolean>(false);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [serialError, setSerialError] = useState<string | null>(null);

  // Web Serial Port and Stream References for clean teardown
  const portRef = useRef<any>(null);
  const readerRef = useRef<ReadableStreamDefaultReader<string> | null>(null);
  const keepReadingRef = useRef<boolean>(false);

  // Active clock speed: hardware potentiometer takes precedence when connected
  const effectiveClockSpeed = isConnected && hardwareClockSpeed !== null ? hardwareClockSpeed : manualClockSpeed;

  // Mount the simulation game engine (supports VLIW dual-pipeline mode)
  const {
    cakes,
    battery,
    isDead,
    powerHeat,
    theoreticalMaxCakes,
    resetSimulation,
  } = useFactorySimulation(effectiveClockSpeed, vliwEnabled, activeWindow === 'dvfs');

  // Stop battery drain & reset simulation whenever active window changes
  useEffect(() => {
    resetSimulation();
  }, [activeWindow, resetSimulation]);

  // -------------------------------------------------------------------------
  // WEB SERIAL API BRIDGE (Non-blocking Line-Buffered Reader)
  // -------------------------------------------------------------------------
  const connectPico = async () => {
    setSerialError(null);

    if (typeof window === 'undefined' || !('serial' in navigator)) {
      setSerialError('Web Serial API is not supported in this browser. Please use Chrome, Edge, or Opera.');
      return;
    }

    try {
      const port = await (navigator as any).serial.requestPort();
      await port.open({ baudRate: 115200 });
      portRef.current = port;
      setIsConnected(true);
      keepReadingRef.current = true;

      const textDecoder = new TextDecoderStream();
      port.readable.pipeTo(textDecoder.writable);
      const reader = textDecoder.readable.getReader();
      readerRef.current = reader;

      let lineBuffer = '';

      while (keepReadingRef.current) {
        const { value, done } = await reader.read();
        if (done) break;

        if (value) {
          lineBuffer += value;
          const lines = lineBuffer.split('\n');
          lineBuffer = lines.pop() ?? '';

          for (const rawLine of lines) {
            const cleanLine = rawLine.trim();
            if (!cleanLine) continue;

            const parsedVal = parseFloat(cleanLine);
            if (!isNaN(parsedVal) && parsedVal >= 0.9 && parsedVal <= 5.1) {
              const clamped = Math.min(5.0, Math.max(1.0, parsedVal));
              setHardwareClockSpeed(clamped);
            }
          }
        }
      }
    } catch (err: any) {
      if (err.name !== 'NotFoundError') {
        console.error('Serial connection error:', err);
        setSerialError(err.message || 'Failed to open serial port.');
      }
      setIsConnected(false);
    }
  };

  const disconnectPico = useCallback(async () => {
    keepReadingRef.current = false;
    try {
      if (readerRef.current) {
        await readerRef.current.cancel();
        readerRef.current.releaseLock();
        readerRef.current = null;
      }
      if (portRef.current) {
        await portRef.current.close();
        portRef.current = null;
      }
    } catch (err) {
      console.warn('Error during serial teardown:', err);
    } finally {
      setIsConnected(false);
      setHardwareClockSpeed(null);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (portRef.current) {
        disconnectPico();
      }
    };
  }, [disconnectPico]);

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#ffe4e6] via-[#fef3c7]/30 to-[#f3e8ff] text-slate-800 p-4 md:p-8 font-sans flex flex-col items-center justify-start relative">
      <div className="w-full max-w-[1440px] mx-auto flex flex-col gap-8">

        {/* SECTION 1: PRIMARY BIG GAME SCREEN */}
        <section className="flex flex-col gap-5 min-h-[92vh] justify-between">
          {/* Top Header - Purble Place Candy Bakery Style */}
          <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b-2 border-purple-200">
            <div>
              <h1 className="text-3xl md:text-4xl font-black tracking-tight text-purple-900 flex items-center gap-3">
                <span className="p-2 bg-pink-100 rounded-2xl shadow-inner border border-pink-200">🎂</span>
                <span>⚡ OVERCLOCKING CAKE FACTORY</span>
              </h1>
              <p className="text-sm font-medium text-purple-700/80 mt-1">
                {activeWindow === 'dvfs' ? 'Dynamic Voltage & Frequency Scaling (DVFS) Demonstration'
                  : activeWindow === 'pipelining' ? 'Three-stage pipeline · overlap the work'
                  : 'The Baker’s Fast Shelf · same work, fewer waits'}
              </p>
            </div>

            {/* Web Serial Hardware Connection Controller */}
            {activeWindow !== 'cache' && <div className="flex items-center gap-3">
              {isConnected ? (
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-2 text-xs font-mono font-bold bg-emerald-100 text-emerald-800 border-2 border-emerald-400 px-3.5 py-2 rounded-2xl shadow-sm">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                    PICO CONNECTED (115200 BAUD)
                  </span>
                  <button
                    onClick={disconnectPico}
                    className="text-xs font-bold bg-purple-100 hover:bg-purple-200 text-purple-700 px-3.5 py-2 rounded-2xl border border-purple-300 transition-colors shadow-sm"
                  >
                    Disconnect
                  </button>
                </div>
              ) : (
                <button
                  onClick={connectPico}
                  className="flex items-center gap-2 text-sm font-bold bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white px-5 py-2.5 rounded-2xl transition-all shadow-lg shadow-purple-500/25 hover:scale-[1.02] active:scale-[0.98]"
                >
                  <span>🔌 Connect Pico</span>
                </button>
              )}
            </div>}
          </header>

          {/* Window Tab Navigation */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setActiveWindow('dvfs')}
              className={`px-5 py-2.5 rounded-2xl font-mono font-bold text-xs transition-all shadow-md flex items-center gap-2 cursor-pointer ${
                activeWindow === 'dvfs'
                  ? 'bg-purple-700 text-white border-2 border-purple-500 shadow-purple-500/30 scale-[1.02]'
                  : 'bg-white/80 text-purple-900 border-2 border-purple-200 hover:bg-purple-100'
              }`}
            >
              <span>🏭</span>
              <span>WINDOW 1: DVFS & VLIW FACTORY</span>
            </button>

            <button
              onClick={() => setActiveWindow('pipelining')}
              className={`px-5 py-2.5 rounded-2xl font-mono font-bold text-xs transition-all shadow-md flex items-center gap-2 cursor-pointer ${
                activeWindow === 'pipelining'
                  ? 'bg-purple-700 text-white border-2 border-purple-500 shadow-purple-500/30 scale-[1.02]'
                  : 'bg-white/80 text-purple-900 border-2 border-purple-200 hover:bg-purple-100'
              }`}
            >
              <span>🔄</span>
              <span>WINDOW 2: CPU PIPELINING FACTORY</span>
            </button>
            <button
              onClick={() => setActiveWindow('cache')}
              className={`px-5 py-2.5 rounded-2xl font-mono font-bold text-xs transition-all shadow-md flex items-center gap-2 cursor-pointer ${
                activeWindow === 'cache'
                  ? 'bg-purple-700 text-white border-2 border-purple-500 shadow-purple-500/30 scale-[1.02]'
                  : 'bg-white/80 text-purple-900 border-2 border-purple-200 hover:bg-purple-100'
              }`}
            >
              <span>👩‍🍳</span>
              <span>WINDOW 3: THE BAKER’S FAST SHELF</span>
            </button>
          </div>

          {/* Error notification if Web Serial encounters an issue */}
          {serialError && activeWindow !== 'cache' && (
            <div className="bg-rose-100 border-2 border-rose-300 text-rose-800 text-xs px-4 py-3 rounded-2xl flex items-center justify-between shadow-sm">
              <span>⚠️ {serialError}</span>
              <button onClick={() => setSerialError(null)} className="text-rose-600 font-bold hover:underline">
                Dismiss
              </button>
            </div>
          )}

          {/* Active Factory Window Component */}
          {activeWindow === 'dvfs' ? (
            /* Window 1: DVFS & VLIW Factory with Sidebar Layout */
            <div className="flex flex-col gap-6">
              {/* Main Stage Grid: Factory Screen on Left + 80% Thinner Sidebar on Right */}
              <div className="grid grid-cols-1 lg:grid-cols-[1fr_95px] xl:grid-cols-[1fr_105px] gap-4 items-stretch">
                {/* Left: Conveyor Screen */}
                <div className="w-full">
                  <ConveyorBelt
                    clockSpeed={effectiveClockSpeed}
                    powerHeat={powerHeat}
                    isDead={isDead}
                    onSetSpeed={(s) => setManualClockSpeed(s)}
                    vliwEnabled={vliwEnabled}
                    onToggleVliw={setVliwEnabled}
                  />
                </div>

                {/* Right: 80% Thinner Sidebar (Vertical Power Cell Battery Tower) */}
                <aside className="w-full bg-white/90 backdrop-blur-md border-3 border-purple-200 rounded-3xl p-3 shadow-2xl flex flex-col items-center justify-between gap-3 select-none">
                  {/* Top Label & Percentage */}
                  <div className="w-full flex flex-col items-center gap-1 border-b border-purple-100 pb-2">
                    <span className="text-xl">🔋</span>
                    <span className="text-[9px] font-mono font-black text-purple-950 uppercase tracking-tight text-center leading-none">
                      POWER CELL
                    </span>
                    <span className={`font-black text-xs font-mono text-center ${battery < 20 ? 'text-rose-600 animate-pulse' : 'text-slate-800'}`}>
                      {battery.toFixed(1)}%
                    </span>
                  </div>

                  {/* Vertical Battery Body Assembly */}
                  <div className="flex flex-col items-center my-auto">
                    {/* Positive Terminal Nub (+) on top */}
                    <div className="w-7 h-2.5 bg-gradient-to-t from-slate-400 to-slate-200 border-2 border-b-0 border-slate-600 rounded-t-sm shadow-xs mx-auto" />
                    {/* Battery Outer Housing */}
                    <div className="relative w-16 h-56 md:h-64 bg-slate-900/95 border-3 border-slate-700 rounded-2xl p-1 shadow-[inset_0_2px_8px_rgba(0,0,0,0.7)] overflow-hidden flex flex-col justify-end mx-auto">
                      <div
                        className={`w-full rounded-xl transition-all duration-100 ease-linear flex items-center justify-center relative overflow-hidden ${
                          battery > 50
                            ? 'bg-gradient-to-t from-emerald-500 via-teal-400 to-emerald-300 shadow-[0_0_15px_rgba(52,211,153,0.6)]'
                            : battery > 20
                            ? 'bg-gradient-to-t from-orange-500 via-amber-400 to-yellow-300 shadow-[0_0_15px_rgba(251,191,36,0.6)]'
                            : 'bg-gradient-to-t from-red-600 to-rose-500 animate-pulse shadow-[0_0_15px_rgba(244,63,94,0.7)]'
                        }`}
                        style={{ height: `${Math.max(0, battery)}%` }}
                      >
                        <span className="text-xs font-black text-slate-900 font-mono select-none drop-shadow-sm relative z-10">⚡</span>
                      </div>
                      {/* Glass Specular Reflection Sheen (Vertical left edge) */}
                      <div className="absolute inset-y-2 left-1 w-1.5 bg-gradient-to-r from-white/35 to-transparent rounded-l-md pointer-events-none z-20" />
                      {/* 5 Battery Level Segment Ticks (Horizontal rows) */}
                      <div className="absolute inset-0 grid grid-rows-5 pointer-events-none z-10 divide-y-2 divide-slate-800/50">
                        <div /><div /><div /><div /><div />
                      </div>
                    </div>
                    {/* Battery Negative Base Indicator (-) */}
                    <div className="w-10 h-1 bg-slate-700 rounded-b-sm mt-0.5 opacity-60 mx-auto" />
                  </div>

                  {/* Bottom: Drain Rate & Formula Badge */}
                  <div className="w-full flex flex-col items-center gap-1.5 border-t border-purple-100 pt-2 font-mono">
                    <div className="w-full bg-purple-50/90 border border-purple-200 rounded-xl py-1 px-1 text-center">
                      <span className="text-[8px] text-purple-700 font-bold block uppercase leading-none mb-0.5">DRAIN</span>
                      <span className="text-slate-800 font-black text-[10px] block leading-none">
                        {(0.05 * Math.pow(effectiveClockSpeed, 3) * 10).toFixed(2)}%/s
                      </span>
                    </div>
                    <span className="text-[9px] text-rose-600 font-black text-center leading-none">P ∝ f³</span>
                  </div>
                </aside>
              </div>

              {/* Factory Controls & Instrumentation (Under the Screen) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Total Cakes Produced Card */}
                <div className="bg-white/85 backdrop-blur-sm border-2 border-pink-200 rounded-3xl p-5 flex flex-col justify-between shadow-xl shadow-pink-100/50">
                  <div className="flex justify-between items-center text-xs font-mono">
                    <span className="font-bold text-pink-700 tracking-wider">TOTAL CAKES PRODUCED</span>
                    <span className="text-[10px] bg-pink-100 text-pink-800 font-bold px-2 py-0.5 rounded-full border border-pink-200">PRODUCTION YIELD</span>
                  </div>
                  <div className="my-3 flex items-baseline gap-2">
                    <span className="text-5xl font-black tracking-tight text-slate-800 font-mono">
                      {Math.floor(cakes).toLocaleString()}
                    </span>
                    <span className="text-purple-600 font-mono font-bold text-base">cakes</span>
                  </div>
                  <div className="border-t border-pink-100 pt-3 flex flex-col gap-1">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-slate-600 font-medium">Optimal Yield (1.0 GHz):</span>
                      <span className="text-emerald-600 font-bold">{theoreticalMaxCakes} units</span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-snug">
                      Operating above 1.0 GHz reduces total yield due to cubic energy decay.
                    </p>
                  </div>
                </div>

                {/* Operating Frequency (Clock Speed) Card */}
                <div className="bg-white/85 backdrop-blur-sm border-2 border-indigo-200 rounded-3xl p-5 flex flex-col justify-between shadow-xl shadow-indigo-100/50">
                  <div className="flex justify-between items-center text-xs font-mono">
                    <span className="text-indigo-700 font-bold tracking-wider">PROCESSOR CLOCK (f)</span>
                    <span className="bg-indigo-100 text-indigo-700 font-bold px-2.5 py-0.5 rounded-lg text-[10px] border border-indigo-200">
                      {isConnected ? 'HARDWARE (ADC0)' : 'MANUAL SLIDER'}
                    </span>
                  </div>

                  <div className="my-3 flex items-baseline gap-2">
                    <span className="text-5xl font-black font-mono text-purple-700">
                      {effectiveClockSpeed.toFixed(2)}
                    </span>
                    <span className="text-slate-500 font-mono text-xl font-bold">GHz</span>
                  </div>

                  {/* Slider & Presets */}
                  <div className="flex flex-col gap-1.5 pt-1 border-t border-indigo-100">
                    <div className="flex justify-between text-xs font-mono text-slate-500 font-bold">
                      <button type="button" onClick={() => setManualClockSpeed(1.0)} className="hover:text-purple-700 underline cursor-pointer">1.0 GHz (Min)</button>
                      <span>3.0 GHz</span>
                      <button type="button" onClick={() => setManualClockSpeed(5.0)} className="hover:text-purple-700 underline cursor-pointer">5.0 GHz (Max)</button>
                    </div>
                    <input
                      type="range"
                      min="1.0"
                      max="5.0"
                      step="0.05"
                      disabled={isConnected}
                      value={effectiveClockSpeed}
                      onChange={(e) => setManualClockSpeed(parseFloat(e.target.value))}
                      className={`w-full accent-purple-600 cursor-pointer ${
                        isConnected ? 'opacity-40 cursor-not-allowed' : ''
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* DVFS & VLIW Educational Insight Footer (Full Width Below) */}
              <section className="bg-white/85 backdrop-blur-sm border-2 border-purple-200 rounded-3xl p-6 text-xs text-slate-600 flex flex-col md:flex-row gap-6 items-start justify-between shadow-lg">
                <div className="flex-1">
                  <h2 className="text-sm font-black text-purple-900 mb-1">
                    Why did my battery deplete so quickly?
                  </h2>
                  <p className="leading-relaxed">
                    When clock frequency increases from <span className="text-purple-700 font-bold">1.0 GHz</span> to{' '}
                    <span className="text-purple-700 font-bold">5.0 GHz</span> (a 5× increase), cake throughput only increases 5×.
                    However, dynamic power scales with the cube of the frequency:
                    <span className="text-rose-600 font-mono font-bold ml-1">
                      (5.0 / 1.0)³ = 125× greater power consumption!
                    </span>
                  </p>
                </div>
                <div className="bg-purple-50 p-4 rounded-2xl border-2 border-purple-200 font-mono text-[11px] flex flex-col gap-1 w-full md:w-auto shadow-sm">
                  <span className="text-purple-600 font-bold">// DVFS & VLIW EQUATIONS</span>
                  <span className="text-slate-700 font-bold">Throughput = Base × f × (VLIW ? 2 : 1)</span>
                  <span className="text-rose-600 font-bold">Power = Base × f³ × (VLIW ? 2 : 1)</span>
                  <span className="text-emerald-600 font-bold">Max Yield occurs at min(f)</span>
                </div>
              </section>
            </div>
          ) : activeWindow === 'pipelining' ? (
            /* Window 2: CPU Instruction Pipelining Conveyor */
            <PipeliningConveyor
              clockSpeed={effectiveClockSpeed}
              onSetSpeed={(s) => setManualClockSpeed(s)}
              hardwareControlled={isConnected}
            />
          ) : <CacheBakery />}
        </section>
      </div>

      {/* Game Over Modal Overlay (Exact Names Kept) */}
      {isDead && activeWindow === 'dvfs' && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white border-4 border-rose-300 rounded-3xl p-8 max-w-md w-full shadow-2xl flex flex-col items-center text-center gap-6">
            <div className="w-20 h-20 rounded-3xl bg-pink-100 border-2 border-pink-300 flex items-center justify-center text-4xl shadow-md">
              🧁
            </div>

            <div>
              <h3 className="text-2xl font-black text-purple-950">POWER CELL DEPLETED</h3>
              <p className="text-xs text-rose-600 font-mono font-bold mt-1 uppercase tracking-wider">
                CPU Thermal Breakdown Occurred
              </p>
            </div>

            <div className="w-full bg-pink-50/70 rounded-2xl p-4 border border-pink-200 flex flex-col gap-3 text-sm">
              <div className="flex justify-between items-center font-mono">
                <span className="text-slate-600">Your Score:</span>
                <span className="text-purple-900 font-black text-base">{Math.floor(cakes)} cakes</span>
              </div>
              <div className="flex justify-between items-center font-mono">
                <span className="text-slate-600">Theoretical 1.0 GHz Max:</span>
                <span className="text-emerald-600 font-bold">{theoreticalMaxCakes} cakes</span>
              </div>
              <div className="border-t border-pink-200 pt-2 text-left text-xs text-slate-600">
                {cakes < theoreticalMaxCakes * 0.5 ? (
                  <p>
                    Overclocking burned through your energy reserves before production could scale efficiently!
                  </p>
                ) : (
                  <p>
                    Good balance, but lower frequencies achieve maximum energy-delay product (EDP)!
                  </p>
                )}
              </div>
            </div>

            <button
              onClick={resetSimulation}
              className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white font-black text-sm tracking-wide shadow-lg shadow-pink-500/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              REPLACE BATTERY & RESTART
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
