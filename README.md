# ⚡ Overclocking Cake Factory

An interactive educational minigame demonstrating **Dynamic Voltage and Frequency Scaling (DVFS)**.

Computational throughput scales **linearly** with frequency ($f$), but dynamic power dissipation scales **cubically** ($P \propto f^3$). Overclocking yields cakes faster in real-time, but rapidly burns through finite battery reserves, resulting in a dramatically lower total lifetime output!

---

## 🛠 Hardware Setup (Raspberry Pi Pico)

### Wiring Pinout
Connect a $10\text{ k}\Omega$ or $100\text{ k}\Omega$ linear potentiometer to the Raspberry Pi Pico:
* **Pin 1 (VCC / 3.3V)** $\rightarrow$ **Pico Pin 36** (`3V3(OUT)`)
* **Pin 2 (Wiper / Signal)** $\rightarrow$ **Pico Pin 31** (`GP26 / ADC0`)
* **Pin 3 (GND)** $\rightarrow$ **Pico Pin 38** (`GND`)

### Flashing Firmware
1. Flash [MicroPython](https://micropython.org/download/RPI_PICO/) onto your Raspberry Pi Pico.
2. Open [`main.py`](main.py) in Thonny, VS Code (Pico-W-Go extension), or upload via `mpremote`.
3. Save `main.py` directly to the Pico filesystem root so it executes on boot.
4. The onboard LED will toggle as a heartbeat every 50ms while streaming frequency values (`1.00\n` to `5.00\n`) at **115200 baud**.

---

## 💻 Web Application Setup (Next.js)

### Prerequisites
* **Node.js** (v18.17+ or v20+) and **npm** / **pnpm** / **bun**.
  * On Arch Linux: `sudo pacman -S nodejs npm`
  * Or via NVM: `nvm install 20`
  * Or via Conda: `conda install -c conda-forge nodejs`

### Installation & Launch
```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in **Google Chrome, Microsoft Edge, or Opera** (browsers supporting the Web Serial API).

---

## 🎮 How to Play

1. **Connect Hardware:**
   - Plug the Pico into your computer via USB.
   - Click **"🔌 Connect Pico"** in the top-right corner.
   - Select the Raspberry Pi Pico serial port from the browser permission popup.
2. **Fallback / No Hardware:**
   - If you don't have the Pico connected, simply use the manual slider ($1.0 - 5.0\text{ GHz}$) in the dashboard!
3. **Observation:**
   - **At 1.0 GHz (Baseline):** The factory runs cool with minimal battery drain ($\sim 0.5\%/\text{sec}$), reaching the maximum possible total score ($\sim 200$ cakes).
   - **At 5.0 GHz (Max Overclock):** Cakes appear 5× faster, but dynamic power spikes by $(5/1)^3 = 125\times$ ($\sim 62.5\%/\text{sec}$ drain), depleting the battery in under 2 seconds!

