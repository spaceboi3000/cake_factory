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

### The three windows

- Window 1: DVFS and two lanes. Its battery and production pause while another window is selected; Pico/manual frequency controls continue to work on return.
- Window 2: sequential or three-stage processing. A cake is produced when stage three finishes, before delivery travel ends. The first cake takes three cycles in both modes; subsequent completions are every three cycles sequentially or every cycle in the pipeline. Switching modes resets the belt and counters. Display speed can be controlled locally or by the Pico.
- Window 3: **The Baker’s Fast Shelf** has two optional levels. Level 1 keeps the six independent strawberry/chocolate/vanilla cake orders, two shelf slots, fully associative LRU, and three waiting cycles per pantry miss. Swapping two cards changes baking order, not requested cakes. Run, Pause/Resume, Step and Reset let visitors observe the round; its existing hint/reveal flow and 6-trip/24-cycle mixed and 3-trip/15-cycle grouped results are unchanged.

After one completed Level 1 round, **Level 2 · Pantry pairs** unlocks. It has eight orders, two each of strawberry, chocolate, vanilla and blueberry. Pantry memory has two fixed adjacent pairs; the challenge interleaves the toppings. A miss fetches the whole matching pair in one trip after three waiting cycles, and the one-pair shelf replaces both jars together. A hit takes one bake cycle; the example comparison stays hidden until a completed attempt or **Need a hint?**. It shows the four eight-cake reference traces: 8/0/32, 4/4/20, 4/4/20 and 2/6/14 (trips/hits/cycles). These comparisons are within Level 2 only. The visible takeaway after play distinguishes exact-item temporal reuse from use of an unused neighbor that arrived in the fixed pair (spatial locality). Pantry pairs represent adjacent memory addresses; jars represent reusable data. Level switching empties the selected level’s shelf and stops the other level’s timer. Level 2 controls mirror Level 1, and its example is clearly labeled as a hint, not the visitor’s solution.

### Simulation checks

Run `npm test` for focused TypeScript simulation tests, using the same transition functions as the browser. The runner uses the existing TypeScript dependency and Node’s built-in test runner, compiles into an isolated temporary directory, then removes that directory. Tests cover both cache levels’ access/completion traces, Level 2 pair arrival/eviction and hit explanations, pause/step/reset and hint state, plus pipeline completion/delivery, display speeds and mode resets. Run `npm run build` for production/type checks. The older Python formula tests do not validate these browser models.

Optional browser checks: with `npm run dev` running, use `node scripts/check-browser.mjs` (Node 22+ and local Chrome; set `CHROME_PATH` or `APP_URL` if needed). This checks rendered counters and pair arrivals, mouse/keyboard/touch swaps, accessible topping names, hint/reveal flow, both levels’ reference results and timers under Strict Mode, tab isolation and reduced-motion feedback, and saves desktop/mobile screenshots to a printed temporary directory. It uses local Chrome’s debugging protocol without adding dependencies. Physical Pico hardware still needs an on-device check.

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
