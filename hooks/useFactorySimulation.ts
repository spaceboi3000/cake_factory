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

// At 1.0 GHz: 0.03% battery/tick -> 0.3% battery/sec -> 333s total runtime
const BASE_DRAIN = 0.03;

// Clock speed range boundaries
const MIN_CLOCK = 1.0;
const MAX_CLOCK = 5.0;

export function useFactorySimulation(inputClockSpeed: number, vliwEnabled: boolean = false, active: boolean = true): FactorySimulationState {
  const [cakes, setCakes] = useState<number>(0);
  const [battery, setBattery] = useState<number>(INITIAL_BATTERY);
  const [isDead, setIsDead] = useState<boolean>(false);

  // Mutable ref to clock speed and vliw state to prevent timer teardown on rapid updates
  const clockSpeedRef = useRef<number>(inputClockSpeed);
  useEffect(() => {
    clockSpeedRef.current = Math.min(MAX_CLOCK, Math.max(MIN_CLOCK, inputClockSpeed));
  }, [inputClockSpeed]);

  const vliwRef = useRef<boolean>(vliwEnabled);
  useEffect(() => {
    vliwRef.current = vliwEnabled;
  }, [vliwEnabled]);

  // Derive instantaneous heat on a 0-100% scale based on cubic power scaling (P ~ f^3)
  // 1.0^3 = 1, 5.0^3 = 125
  const powerHeat = useMemo(() => {
    const minPower = Math.pow(MIN_CLOCK, 3); // 1.0
    const maxPower = Math.pow(MAX_CLOCK, 3); // 125.0
    const lanes = vliwEnabled ? 2 : 1;
    const currentPower = Math.pow(clockSpeedRef.current, 3) * lanes;
    const normalized = (currentPower - minPower) / (maxPower - minPower);
    return Math.min(100, Math.max(0, normalized * 100));
  }, [inputClockSpeed, vliwEnabled]);

  // Theoretical maximum cakes: score if operated strictly at optimal 1.0 GHz efficiency.
  // Lifetime ticks at 1.0 GHz = INITIAL_BATTERY / (BASE_DRAIN * 1.0^3) = 100 / 0.03 = 3333.3 ticks.
  // Maximum cakes = 3333.3 ticks * (BASE_PRODUCTION * 1.0) = 333 cakes.
  const theoreticalMaxCakes = useMemo(() => {
    const totalTicksAtBase = INITIAL_BATTERY / (BASE_DRAIN * Math.pow(MIN_CLOCK, 3));
    return Math.floor(totalTicksAtBase * (BASE_PRODUCTION * MIN_CLOCK));
  }, []);

  // Main simulation tick loop
  useEffect(() => {
    if (isDead || !active) return;

    const intervalId = setInterval(() => {
      const currentSpeed = clockSpeedRef.current;
      const lanes = vliwRef.current ? 2 : 1;

      // 1. Linear Throughput: cakes += base * f * lanes
      const cakeYield = BASE_PRODUCTION * currentSpeed * lanes;

      // 2. Cubic Power Drain: drain = base * f^3 * lanes
      const batteryDrain = BASE_DRAIN * Math.pow(currentSpeed, 3) * lanes;

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
  }, [isDead, active]);

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
