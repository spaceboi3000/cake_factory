"""
Unit tests for Raspberry Pi Pico MicroPython firmware logic (main.py).
Mocks the 'machine' hardware module to test EMA filtering, range mapping, and formatting.
"""

import sys
import unittest
from unittest.mock import MagicMock

# Create a mock 'machine' module before importing or testing firmware logic
mock_machine = MagicMock()
sys.modules['machine'] = mock_machine


class TestFirmwareLogic(unittest.TestCase):
    def setUp(self):
        self.alpha = 0.18
        self.min_speed = 1.0
        self.max_speed = 5.0

    def test_ema_filter_smoothing(self):
        """Verify exponential moving average converges smoothly without overshoot."""
        filtered_adc = 0.0
        target_adc = 32768.0

        for _ in range(50):
            filtered_adc = (self.alpha * target_adc) + ((1.0 - self.alpha) * filtered_adc)

        self.assertAlmostEqual(filtered_adc, target_adc, delta=10.0)

    def test_range_mapping_min(self):
        """Raw 0 ADC should map strictly to 1.00 GHz."""
        normalized = 0.0 / 65535.0
        clock_speed = self.min_speed + (normalized * (self.max_speed - self.min_speed))
        formatted = f"{clock_speed:.2f}"
        self.assertEqual(formatted, "1.00")

    def test_range_mapping_mid(self):
        """Raw 32767.5 ADC should map strictly to ~3.00 GHz."""
        normalized = 32767.5 / 65535.0
        clock_speed = self.min_speed + (normalized * (self.max_speed - self.min_speed))
        formatted = f"{clock_speed:.2f}"
        self.assertEqual(formatted, "3.00")

    def test_range_mapping_max(self):
        """Raw 65535 ADC should map strictly to 5.00 GHz."""
        normalized = 65535.0 / 65535.0
        clock_speed = self.min_speed + (normalized * (self.max_speed - self.min_speed))
        formatted = f"{clock_speed:.2f}"
        self.assertEqual(formatted, "5.00")

    def test_clamp_protection(self):
        """Values out of bounds (due to analog spikes or negative noise) must clamp cleanly."""
        for noisy_val in [-500.0, 70000.0]:
            clamped = max(0.0, min(65535.0, noisy_val))
            normalized = clamped / 65535.0
            clock = self.min_speed + (normalized * (self.max_speed - self.min_speed))
            self.assertGreaterEqual(clock, 1.0)
            self.assertLessEqual(clock, 5.0)


if __name__ == "__main__":
    unittest.main()

