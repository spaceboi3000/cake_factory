'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useFactorySimulation } from '../hooks/useFactorySimulation';
import ConveyorBelt from '../components/ConveyorBelt';
import PipeliningConveyor from '../components/PipeliningConveyor';

export default function FactoryDashboard() {
  // Navigation Window State
  const [activeWindow, setActiveWindow] = useState<'dvfs' | 'pipelining'>('dvfs');

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
  } = useFactorySimulation(effectiveClockSpeed, vliwEnabled);

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
      <div className="w-full max-w-6xl flex flex-col gap-10">

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
                Dynamic Voltage & Frequency Scaling (DVFS) Demonstration
              </p>
            </div>

            {/* Web Serial Hardware Connection Controller */}
            <div className="flex items-center gap-3">
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
            </div>
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
          </div>

          {/* Error notification if Web Serial encounters an issue */}
          {serialError && (
            <div className="bg-rose-100 border-2 border-rose-300 text-rose-800 text-xs px-4 py-3 rounded-2xl flex items-center justify-between shadow-sm">
              <span>⚠️ {serialError}</span>
              <button onClick={() => setSerialError(null)} className="text-rose-600 font-bold hover:underline">
                Dismiss
              </button>
            </div>
          )}

          {/* Active Factory Window Component */}
          {activeWindow === 'dvfs' ? (
            /* Window 1: DVFS & VLIW Conveyor */
            <ConveyorBelt
              clockSpeed={effectiveClockSpeed}
              powerHeat={powerHeat}
              isDead={isDead}
              onSetSpeed={(s) => setManualClockSpeed(s)}
              vliwEnabled={vliwEnabled}
              onToggleVliw={setVliwEnabled}
            />
          ) : (
            /* Window 2: CPU Instruction Pipelining Conveyor */
            <PipeliningConveyor
              clockSpeed={effectiveClockSpeed}
              onSetSpeed={(s) => setManualClockSpeed(s)}
            />
          )}

          {/* Scroll Down Hint Banner */}
          <div className="w-full flex items-center justify-center py-3 bg-purple-100/70 border-2 border-purple-200 rounded-2xl text-purple-800 text-xs font-bold font-mono tracking-wider shadow-sm animate-bounce">
            ⬇️ SCROLL DOWN TO VIEW POWER CELL, DVFS GAUGES & EQUATIONS ⬇️
          </div>
        </section>

        {/* SECTION 2: METRICS DASHBOARD (REQUIRING SCROLLING DOWN) */}
        <section className="flex flex-col gap-8 pt-6 border-t-4 border-purple-200">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📊</span>
            <h2 className="text-2xl font-black text-purple-950 uppercase tracking-tight">
              Factory Instrumentation & Power Cell
            </h2>
          </div>

          {/* Primary Metrics Grid (Exact Gauge Names Kept) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

            {/* Production Output Card */}
            <div className="bg-white/85 backdrop-blur-sm border-2 border-pink-200 rounded-3xl p-6 flex flex-col justify-between shadow-xl shadow-pink-100/50">
              <span className="text-xs font-mono font-bold text-pink-700 tracking-wider">TOTAL CAKES PRODUCED</span>
              <div className="my-4">
                <span className="text-6xl font-black tracking-tight text-slate-800 font-mono">
                  {Math.floor(cakes).toLocaleString()}
                </span>
                <span className="text-purple-600 font-mono font-bold text-sm ml-2">units</span>
              </div>
              <div className="border-t border-pink-100 pt-3 flex flex-col gap-1">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-slate-600 font-medium">Optimal (1.0 GHz):</span>
                  <span className="text-emerald-600 font-bold">{theoreticalMaxCakes} units</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-snug">
                  Operating above 1.0 GHz reduces total yield due to cubic energy decay.
                </p>
              </div>
            </div>

            {/* Battery Reserve Card */}
            <div className="bg-white/85 backdrop-blur-sm border-2 border-purple-200 rounded-3xl p-6 flex flex-col justify-between shadow-xl shadow-purple-100/50">
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="text-purple-700 font-bold tracking-wider">POWER CELL REMAINING</span>
                <span className={`font-black ${battery < 20 ? 'text-rose-600 animate-pulse' : 'text-slate-700'}`}>
                  {battery.toFixed(1)}%
                </span>
              </div>

              {/* Battery Progress Bar */}
              <div className="my-4 w-full h-10 bg-slate-200/80 rounded-2xl overflow-hidden p-1.5 border-2 border-slate-300 flex items-center shadow-inner">
                <div
                  className={`h-full rounded-xl transition-all duration-100 ease-linear ${
                    battery > 50
                      ? 'bg-gradient-to-r from-emerald-400 to-teal-400 shadow-[0_0_12px_rgba(52,211,153,0.5)]'
                      : battery > 20
                      ? 'bg-gradient-to-r from-amber-400 to-orange-400 shadow-[0_0_12px_rgba(251,191,36,0.5)]'
                      : 'bg-gradient-to-r from-rose-500 to-red-600 animate-pulse shadow-[0_0_15px_rgba(244,63,94,0.6)]'
                  }`}
                  style={{ width: `${Math.max(0, battery)}%` }}
                />
              </div>

              <div className="border-t border-purple-100 pt-3 flex justify-between items-center text-xs font-mono text-slate-600">
                <span className="font-medium">Drain Rate:</span>
                <span className="text-slate-800 font-bold">
                  {(0.05 * Math.pow(effectiveClockSpeed, 3) * 10).toFixed(2)} %/sec
                </span>
              </div>
            </div>

            {/* Operating Frequency (Clock Speed) Card */}
            <div className="bg-white/85 backdrop-blur-sm border-2 border-indigo-200 rounded-3xl p-6 flex flex-col justify-between shadow-xl shadow-indigo-100/50">
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="text-indigo-700 font-bold tracking-wider">PROCESSOR CLOCK (f)</span>
                <span className="bg-indigo-100 text-indigo-700 font-bold px-2.5 py-0.5 rounded-lg text-[11px] border border-indigo-200">
                  {isConnected ? 'HARDWARE (ADC0)' : 'MANUAL SLIDER'}
                </span>
              </div>

              <div className="my-4">
                <span className="text-5xl font-black font-mono text-purple-700">
                  {effectiveClockSpeed.toFixed(2)}
                </span>
                <span className="text-slate-500 font-mono text-xl ml-2 font-bold">GHz</span>
              </div>

              {/* Slider Fallback when Hardware is Disconnected */}
              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-[11px] font-mono text-slate-500 font-bold">
                  <span>1.0 GHz</span>
                  <span>3.0 GHz</span>
                  <span>5.0 GHz</span>
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

          {/* DVFS Educational Insight Footer (Exact Names Kept) */}
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
        </section>
      </div>

      {/* Game Over Modal Overlay (Exact Names Kept) */}
      {isDead && (
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
