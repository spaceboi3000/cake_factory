'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useFactorySimulation } from '../hooks/useFactorySimulation';
import ConveyorBelt from '../components/ConveyorBelt';

export default function FactoryDashboard() {
  // Serial and Clock Speed States
  const [hardwareClockSpeed, setHardwareClockSpeed] = useState<number | null>(null);
  const [manualClockSpeed, setManualClockSpeed] = useState<number>(1.0);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [serialError, setSerialError] = useState<string | null>(null);

  // Web Serial Port and Stream References for clean teardown
  const portRef = useRef<any>(null);
  const readerRef = useRef<ReadableStreamDefaultReader<string> | null>(null);
  const keepReadingRef = useRef<boolean>(false);

  // Active clock speed: hardware potentiometer takes precedence when connected
  const effectiveClockSpeed = isConnected && hardwareClockSpeed !== null ? hardwareClockSpeed : manualClockSpeed;

  // Mount the simulation game engine
  const {
    cakes,
    battery,
    isDead,
    powerHeat,
    theoreticalMaxCakes,
    resetSimulation,
  } = useFactorySimulation(effectiveClockSpeed);

  // -------------------------------------------------------------------------
  // WEB SERIAL API BRIDGE (Non-blocking Line-Buffered Reader)
  // -------------------------------------------------------------------------
  const connectPico = async () => {
    setSerialError(null);

    // Browser feature detection
    if (typeof window === 'undefined' || !('serial' in navigator)) {
      setSerialError('Web Serial API is not supported in this browser. Please use Chrome, Edge, or Opera.');
      return;
    }

    try {
      // 1. Request port from user
      const port = await (navigator as any).serial.requestPort();
      await port.open({ baudRate: 115200 });
      portRef.current = port;
      setIsConnected(true);
      keepReadingRef.current = true;

      // 2. Setup text decoding pipeline
      const textDecoder = new TextDecoderStream();
      port.readable.pipeTo(textDecoder.writable);
      const reader = textDecoder.readable.getReader();
      readerRef.current = reader;

      // 3. Read stream in a chunked, line-buffered loop
      let lineBuffer = '';

      while (keepReadingRef.current) {
        const { value, done } = await reader.read();
        if (done) break;

        if (value) {
          lineBuffer += value;
          const lines = lineBuffer.split('\n');
          // Retain any incomplete chunk at the end of the split
          lineBuffer = lines.pop() ?? '';

          for (const rawLine of lines) {
            const cleanLine = rawLine.trim();
            if (!cleanLine) continue;

            const parsedVal = parseFloat(cleanLine);
            if (!isNaN(parsedVal) && parsedVal >= 0.9 && parsedVal <= 5.1) {
              // Clamp cleanly to 1.0 - 5.0
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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (portRef.current) {
        disconnectPico();
      }
    };
  }, [disconnectPico]);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-12 font-sans flex flex-col items-center justify-start relative">
      <div className="w-full max-w-5xl flex flex-col gap-8">
        {/* Top Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
          <div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white flex items-center gap-3">
              <span>⚡ OVERCLOCKING CAKE FACTORY</span>
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Dynamic Voltage & Frequency Scaling (DVFS) Demonstration
            </p>
          </div>

          {/* Web Serial Hardware Connection Controller */}
          <div className="flex items-center gap-3">
            {isConnected ? (
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-2 text-xs font-mono bg-emerald-950/80 text-emerald-400 border border-emerald-700/50 px-3 py-1.5 rounded-lg">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  PICO CONNECTED (115200 BAUD)
                </span>
                <button
                  onClick={disconnectPico}
                  className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-lg border border-slate-700 transition-colors"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <button
                onClick={connectPico}
                className="flex items-center gap-2 text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl transition-all shadow-lg shadow-indigo-600/30 hover:scale-[1.02] active:scale-[0.98]"
              >
                <span>🔌 Connect Pico</span>
              </button>
            )}
          </div>
        </header>

        {/* Error notification if Web Serial encounters an issue */}
        {serialError && (
          <div className="bg-red-950/50 border border-red-800/80 text-red-300 text-xs px-4 py-3 rounded-xl flex items-center justify-between">
            <span>⚠️ {serialError}</span>
            <button onClick={() => setSerialError(null)} className="text-red-400 hover:underline">
              Dismiss
            </button>
          </div>
        )}

        {/* Primary Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Production Output Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between shadow-xl">
            <span className="text-xs font-mono text-slate-400 tracking-wider">TOTAL CAKES PRODUCED</span>
            <div className="my-4">
              <span className="text-6xl font-black tracking-tight text-white font-mono">
                {Math.floor(cakes).toLocaleString()}
              </span>
              <span className="text-slate-500 font-mono text-sm ml-2">units</span>
            </div>
            <div className="border-t border-slate-800/80 pt-3 flex flex-col gap-1">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-400">Optimal (1.0 GHz):</span>
                <span className="text-emerald-400 font-bold">{theoreticalMaxCakes} units</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-snug">
                Operating above 1.0 GHz reduces total yield due to cubic energy decay.
              </p>
            </div>
          </div>

          {/* Battery Reserve Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between shadow-xl">
            <div className="flex justify-between items-center text-xs font-mono">
              <span className="text-slate-400 tracking-wider">POWER CELL REMAINING</span>
              <span className={`font-bold ${battery < 20 ? 'text-red-400 animate-pulse' : 'text-slate-200'}`}>
                {battery.toFixed(1)}%
              </span>
            </div>

            {/* Battery Progress Bar */}
            <div className="my-4 w-full h-8 bg-slate-950 rounded-xl overflow-hidden p-1 border border-slate-800 flex items-center">
              <div
                className={`h-full rounded-lg transition-all duration-150 ${
                  battery > 50
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                    : battery > 20
                    ? 'bg-gradient-to-r from-amber-500 to-yellow-400'
                    : 'bg-gradient-to-r from-red-600 to-rose-500 animate-pulse'
                }`}
                style={{ width: `${Math.max(0, battery)}%` }}
              />
            </div>

            <div className="border-t border-slate-800/80 pt-3 flex justify-between items-center text-xs font-mono text-slate-400">
              <span>Drain Rate:</span>
              <span className="text-slate-200">
                {(0.05 * Math.pow(effectiveClockSpeed, 3) * 10).toFixed(2)} %/sec
              </span>
            </div>
          </div>

          {/* Operating Frequency (Clock Speed) Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between shadow-xl">
            <div className="flex justify-between items-center text-xs font-mono">
              <span className="text-slate-400 tracking-wider">PROCESSOR CLOCK (f)</span>
              <span className="bg-slate-800 text-indigo-300 px-2 py-0.5 rounded text-[11px]">
                {isConnected ? 'HARDWARE (ADC0)' : 'MANUAL SLIDER'}
              </span>
            </div>

            <div className="my-4">
              <span className="text-5xl font-black font-mono text-indigo-400">
                {effectiveClockSpeed.toFixed(2)}
              </span>
              <span className="text-slate-400 font-mono text-xl ml-2">GHz</span>
            </div>

            {/* Slider Fallback when Hardware is Disconnected */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-[11px] font-mono text-slate-500">
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
                className={`w-full accent-indigo-500 cursor-pointer ${
                  isConnected ? 'opacity-40 cursor-not-allowed' : ''
                }`}
              />
            </div>
          </div>
        </div>

        {/* Conveyor Belt Visual Simulation Assembly */}
        <ConveyorBelt
          clockSpeed={effectiveClockSpeed}
          powerHeat={powerHeat}
          isDead={isDead}
        />

        {/* DVFS Educational Insight Footer */}
        <section className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 text-xs text-slate-400 flex flex-col md:flex-row gap-6 items-start justify-between">
          <div className="flex-1">
            <h2 className="text-sm font-bold text-slate-200 mb-1">
              Why did my battery deplete so quickly?
            </h2>
            <p className="leading-relaxed">
              When clock frequency increases from <span className="text-indigo-400">1.0 GHz</span> to{' '}
              <span className="text-indigo-400">5.0 GHz</span> (a 5× increase), cake throughput only increases 5×.
              However, dynamic power scales with the cube of the frequency:
              <span className="text-amber-400 font-mono ml-1">
                (5.0 / 1.0)³ = 125× greater power consumption!
              </span>
            </p>
          </div>
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 font-mono text-[11px] flex flex-col gap-1 w-full md:w-auto">
            <span className="text-slate-500">// DVFS EQUATIONS</span>
            <span className="text-slate-300">Throughput = Base × f</span>
            <span className="text-amber-400">Power = Base × f³</span>
            <span className="text-emerald-400">Max Yield occurs at min(f)</span>
          </div>
        </section>
      </div>

      {/* Game Over Modal Overlay */}
      {isDead && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-slate-900 border border-red-500/50 rounded-3xl p-8 max-w-md w-full shadow-2xl flex flex-col items-center text-center gap-6">
            <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-3xl">
              💥
            </div>

            <div>
              <h3 className="text-2xl font-black text-white">POWER CELL DEPLETED</h3>
              <p className="text-xs text-red-400 font-mono mt-1 uppercase tracking-wider">
                CPU Thermal Breakdown Occurred
              </p>
            </div>

            <div className="w-full bg-slate-950 rounded-2xl p-4 border border-slate-800 flex flex-col gap-3 text-sm">
              <div className="flex justify-between items-center font-mono">
                <span className="text-slate-400">Your Score:</span>
                <span className="text-white font-bold">{Math.floor(cakes)} cakes</span>
              </div>
              <div className="flex justify-between items-center font-mono">
                <span className="text-slate-400">Theoretical 1.0 GHz Max:</span>
                <span className="text-emerald-400 font-bold">{theoreticalMaxCakes} cakes</span>
              </div>
              <div className="border-t border-slate-800 pt-2 text-left text-xs text-slate-400">
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
              className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold text-sm tracking-wide shadow-lg shadow-rose-600/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              REPLACE BATTERY & RESTART
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

