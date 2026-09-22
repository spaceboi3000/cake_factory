"""
=============================================================================
OVERCLOCKING CAKE FACTORY - HARDWARE POTENTIOMETER FIRMWARE
Target: Raspberry Pi Pico / Pico W (MicroPython v1.19+)
=============================================================================

HARDWARE PINOUT & WIRING:
-----------------------------------------------------------------------------
- Potentiometer Pin 1 (High / VCC)  -> Pico Pin 36 (3V3(OUT))
- Potentiometer Pin 2 (Wiper/Signal)-> Pico Pin 31 (GP26 / ADC0)
- Potentiometer Pin 3 (Low / GND)   -> Pico Pin 38 (GND)

Optional: Onboard LED (GP25 or 'LED') toggles on transmission as a heartbeat.
Serial Output: USB CDC at 115200 baud, sending raw ASCII format: "<float>\n"
=============================================================================
"""

import machine
import time
import sys

# ---------------------------------------------------------------------------
# HARDWARE CONFIGURATION
# ---------------------------------------------------------------------------
ADC_PIN = 26  # GP26 corresponds to ADC Channel 0
TICK_INTERVAL_MS = 50  # 20 Hz transmission rate

# Initialize ADC (16-bit unsigned read: 0 to 65535)
pot = machine.ADC(ADC_PIN)

# Initialize onboard LED for diagnostic heartbeat
try:
    led = machine.Pin("LED", machine.Pin.OUT)
except (ValueError, TypeError):
    led = machine.Pin(25, machine.Pin.OUT)

# ---------------------------------------------------------------------------
# FILTER & RANGE CONFIGURATION
# ---------------------------------------------------------------------------
# Exponential Moving Average (EMA) smoothing constant:
# 0.0 < alpha <= 1.0 (lower values = more smoothing / less jitter)
ALPHA = 0.18

MIN_SPEED = 1.0  # Minimum frequency (1.0 GHz)
MAX_SPEED = 5.0  # Maximum frequency (5.0 GHz)

# ---------------------------------------------------------------------------
# FIRMWARE RUNTIME
# ---------------------------------------------------------------------------
def main():
    # Warm up ADC and prime the filter
    filtered_adc = float(pot.read_u16())
    heartbeat_state = False

    while True:
        start_time = time.ticks_ms()

        # 1. Read 16-bit analog value (0 - 65535)
        raw_adc = pot.read_u16()

        # 2. Apply Software Single-Pole Low-Pass Filter (EMA)
        filtered_adc = (ALPHA * raw_adc) + ((1.0 - ALPHA) * filtered_adc)

        # 3. Clamp and normalize to [0.0, 1.0]
        clamped_adc = max(0.0, min(65535.0, filtered_adc))
        normalized = clamped_adc / 65535.0

        # 4. Map linearly to clock speed range [MIN_SPEED, MAX_SPEED]
        clock_speed = MIN_SPEED + (normalized * (MAX_SPEED - MIN_SPEED))

        # 5. Transmit formatted ASCII value: e.g. "3.24\n"
        # sys.stdout writes unbuffered directly over USB serial
        sys.stdout.write(f"{clock_speed:.2f}\n")

        # 6. Toggle LED heartbeat
        heartbeat_state = not heartbeat_state
        led.value(heartbeat_state)

        # 7. Precise rate-limiting sleep (50 ms)
        elapsed = time.ticks_diff(time.ticks_ms(), start_time)
        sleep_time = TICK_INTERVAL_MS - elapsed
        if sleep_time > 0:
            time.sleep_ms(sleep_time)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        led.value(0)

