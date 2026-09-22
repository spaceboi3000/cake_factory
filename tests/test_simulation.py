"""
Unit tests for the DVFS (Dynamic Voltage and Frequency Scaling) game engine math.
Matches the logic implemented in hooks/useFactorySimulation.ts.
"""

import unittest
import math


class TestSimulationPhysics(unittest.TestCase):
    def setUp(self):
        self.tick_rate_ms = 100
        self.initial_battery = 100.0
        self.base_production = 0.1
        self.base_drain = 0.05
        self.min_clock = 1.0
        self.max_clock = 5.0

    def calculate_theoretical_max(self):
        total_ticks = self.initial_battery / (self.base_drain * math.pow(self.min_clock, 3))
        return math.floor(total_ticks * (self.base_production * self.min_clock))

    def calculate_power_heat(self, clock_speed):
        min_p = math.pow(self.min_clock, 3)
        max_p = math.pow(self.max_clock, 3)
        curr_p = math.pow(clock_speed, 3)
        normalized = (curr_p - min_p) / (max_p - min_p)
        return min(100.0, max(0.0, normalized * 100.0))

    def simulate_run(self, clock_speed):
        battery = self.initial_battery
        cakes = 0.0
        ticks = 0

        cake_yield = self.base_production * clock_speed
        battery_drain = self.base_drain * math.pow(clock_speed, 3)

        while battery > 0:
            battery -= battery_drain
            cakes += cake_yield
            ticks += 1

        return cakes, ticks

    def test_theoretical_max_score(self):
        """Theoretical maximum cakes should equal exactly 200 units at baseline 1.0 GHz."""
        self.assertEqual(self.calculate_theoretical_max(), 200)

    def test_heat_boundaries(self):
        """Heat percentage must be strictly 0% at 1.0 GHz and 100% at 5.0 GHz."""
        self.assertAlmostEqual(self.calculate_power_heat(1.0), 0.0, places=2)
        self.assertAlmostEqual(self.calculate_power_heat(5.0), 100.0, places=2)

    def test_cubic_decay_punishment(self):
        """
        Verify that overclocking reduces total lifetime cakes produced:
        - 1.0 GHz yields 200 cakes
        - 2.0 GHz yields 50 cakes (4x reduction)
        - 5.0 GHz yields 8 cakes (25x reduction)
        """
        cakes_1ghz, _ = self.simulate_run(1.0)
        cakes_2ghz, _ = self.simulate_run(2.0)
        cakes_5ghz, _ = self.simulate_run(5.0)

        self.assertAlmostEqual(cakes_1ghz, 200, delta=1)
        self.assertAlmostEqual(cakes_2ghz, 50, delta=1)
        self.assertAlmostEqual(cakes_5ghz, 8, delta=1)

        # Overclocking must always yield fewer cakes overall than baseline
        self.assertGreater(cakes_1ghz, cakes_2ghz)
        self.assertGreater(cakes_2ghz, cakes_5ghz)


if __name__ == "__main__":
    unittest.main()
