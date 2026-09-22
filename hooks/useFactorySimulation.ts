import { useState, useEffect, useRef, useCallback, useMemo } from 'react';

export interface FactorySimulationState {
  cakes: number;
  battery: number;
  isDead: boolean;
  powerHeat: number;
  theoreticalMaxCakes: number;
  resetSimulation: () => void;
}

// ---------------------------------------------------------------------------
// SIMULATION CONSTANTS
// ---------------------------------------------------------------------------
const TICK_RATE_MS = 100; // 10 ticks per second
const INITIAL_BATTERY = 100.0; // Battery starts at 100.0%

// Base rates calibrated at 1.0 GHz:
// At 1.0 GHz: 0.1 cakes/tick -> 1.0 cake/sec
const BASE_PRODUCTION = 0.1;

// At 1.0 GHz: 0.05% battery/tick -> 0.5% battery/sec -> 200s total runtime
const BASE_DRAIN = 0.05;

// Clock speed range boundaries
const MIN_CLOCK = 1.0;
const MAX_CLOCK = 5.0;

export function useFactorySimulation(inputClockSpeed: number): FactorySimulationState {
  const [cakes, setCakes] = useState<number>(0);
  const [battery, setBattery] = useState<number>(INITIAL_BATTERY);
  const [isDead, setIsDead] = useState<boolean>(false);

  // Mutable ref to clock speed to prevent timer teardown on rapid serial updates
  const clockSpeedRef = useRef<number>(inputClockSpeed);
  useEffect(() => {
    clockSpeedRef.current = Math.min(MAX_CLOCK, Math.max(MIN_CLOCK, inputClockSpeed));
  }, [inputClockSpeed]);

  // Derive instantaneous heat on a 0-100% scale based on cubic power scaling (P ~ f^3)
  // 1.0^3 = 1, 5.0^3 = 125
  const powerHeat = useMemo(() => {
    const minPower = Math.pow(MIN_CLOCK, 3); // 1.0
    const maxPower = Math.pow(MAX_CLOCK, 3); // 125.0
    const currentPower = Math.pow(clockSpeedRef.current, 3);
    const normalized = (currentPower - minPower) / (maxPower - minPower);
    return Math.min(100, Math.max(0, normalized * 100));
  }, [inputClockSpeed]);

  // Theoretical maximum cakes: score if operated strictly at optimal 1.0 GHz efficiency.
  // Lifetime ticks at 1.0 GHz = INITIAL_BATTERY / (BASE_DRAIN * 1.0^3) = 100 / 0.05 = 2000 ticks.
  // Maximum cakes = 2000 ticks * (BASE_PRODUCTION * 1.0) = 200 cakes.
  const theoreticalMaxCakes = useMemo(() => {
    const totalTicksAtBase = INITIAL_BATTERY / (BASE_DRAIN * Math.pow(MIN_CLOCK, 3));
    return Math.floor(totalTicksAtBase * (BASE_PRODUCTION * MIN_CLOCK));
  }, []);

  // Main simulation tick loop
  useEffect(() => {
    if (isDead) return;

    const intervalId = setInterval(() => {
      const currentSpeed = clockSpeedRef.current;

      // 1. Linear Throughput: cakes += base * f
      const cakeYield = BASE_PRODUCTION * currentSpeed;

      // 2. Cubic Power Drain: drain = base * f^3
      const batteryDrain = BASE_DRAIN * Math.pow(currentSpeed, 3);

      setBattery((prevBattery) => {
        const nextBattery = prevBattery - batteryDrain;
        if (nextBattery <= 0) {
          setIsDead(true);
          return 0;
        }
        return nextBattery;
      });

      setCakes((prevCakes) => prevCakes + cakeYield);
    }, TICK_RATE_MS);

    return () => clearInterval(intervalId);
  }, [isDead]);

  const resetSimulation = useCallback(() => {
    setCakes(0);
    setBattery(INITIAL_BATTERY);
    setIsDead(false);
  }, []);

  return {
    cakes,
    battery,
    isDead,
    powerHeat,
    theoreticalMaxCakes,
    resetSimulation,
  };
}

