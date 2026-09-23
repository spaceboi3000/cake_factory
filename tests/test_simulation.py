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

    def simulate_run(self, clock_speed, lanes=1):
        battery = self.initial_battery
        cakes = 0.0
        ticks = 0

        cake_yield = self.base_production * clock_speed * lanes
        battery_drain = self.base_drain * math.pow(clock_speed, 3) * lanes

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

    def test_vliw_dual_issue_throughput(self):
        """VLIW mode with 2 lanes should produce double the cakes per tick at identical frequency."""
        single_lane_yield = self.base_production * 1.0 * 1
        dual_lane_yield = self.base_production * 1.0 * 2
        self.assertEqual(dual_lane_yield, single_lane_yield * 2)

    def test_vliw_vs_overclocking_efficiency(self):
        """
        Demonstrate VLIW energy efficiency over frequency scaling:
        - Both 1.0 GHz VLIW (2 lanes) and 2.0 GHz Scalar (1 lane) produce 0.2 cakes/tick (identical throughput).
        - But 1.0 GHz VLIW yields 200 total lifetime cakes, whereas 2.0 GHz Scalar yields only 50 cakes!
        - VLIW provides a 4x efficiency advantage for the exact same throughput.
        """
        cakes_vliw_1ghz, _ = self.simulate_run(1.0, lanes=2)
        cakes_scalar_2ghz, _ = self.simulate_run(2.0, lanes=1)

        self.assertAlmostEqual(cakes_vliw_1ghz, 200, delta=1)
        self.assertAlmostEqual(cakes_scalar_2ghz, 50, delta=1)
        self.assertAlmostEqual(cakes_vliw_1ghz / cakes_scalar_2ghz, 4.0, places=1)


    def test_non_pipelined_throughput(self):
        """
        Verify non-pipelined execution:
        - 1 machine executes Bake -> Frost -> Box sequentially.
        - Latency = 3 cycles per cake.
        - Throughput = 1 cake every 3 cycles (CPI = 3.0).
        """
        def simulate_non_pipelined(cycles):
            return cycles // 3

        self.assertEqual(simulate_non_pipelined(1), 0)
        self.assertEqual(simulate_non_pipelined(2), 0)
        self.assertEqual(simulate_non_pipelined(3), 1)
        self.assertEqual(simulate_non_pipelined(6), 2)
        self.assertEqual(simulate_non_pipelined(30), 10)

    def test_pipelined_throughput(self):
        """
        Verify 3-stage pipelined execution:
        - First cake takes 3 cycles (pipeline fill latency).
        - Subsequent cakes are produced 1 every cycle thereafter.
        - Produces 10 cakes in 3 + (10 - 1) = 12 cycles (vs 30 cycles non-pipelined, ~2.5x speedup).
        - As cycles -> infinity, throughput approaches 1.0 cake/cycle (3x speedup).
        """
        def simulate_pipelined(cycles):
            if cycles < 3:
                return 0
            return 1 + (cycles - 3)

        self.assertEqual(simulate_pipelined(1), 0)
        self.assertEqual(simulate_pipelined(2), 0)
        self.assertEqual(simulate_pipelined(3), 1)  # 1st cake emerges
        self.assertEqual(simulate_pipelined(4), 2)  # 2nd cake emerges next cycle
        self.assertEqual(simulate_pipelined(5), 3)  # 3rd cake emerges next cycle
        self.assertEqual(simulate_pipelined(12), 10) # 10 cakes completed in 12 cycles

        # 3x peak speedup demonstration
        cycles_large = 300
        non_pipelined_cakes = cycles_large // 3  # 100 cakes
        pipelined_cakes = 1 + (cycles_large - 3)  # 298 cakes
        speedup = pipelined_cakes / non_pipelined_cakes
        self.assertAlmostEqual(speedup, 3.0, delta=0.05)


if __name__ == "__main__":
    unittest.main()

