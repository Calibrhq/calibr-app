
# ⚡ Calibr
### **The Reputation Layer for Truth**
---

## 🛑 The Problem: "Sure" vs "Maybe"
In every other prediction market (Polymarket, Augur), a 95% probability trade and a 55% probability trade are just "buys".
**The market is binary. The world is not.**

*   **Noise:** A whale can bet $1M on a coin flip and look like an expert.
*   **Signal Decay:** True experts who are "90% sure" get the same payout structure as degens who are "guessing".

We are fixing the **Signal-to-Noise Ratio** of truth.

---

## 🎯 The Solution: Calibr
Calibr is the first **Confidence-Aware Prediction Market**. We force users to stake their **Reputation** alongside their capital.

### **The "Skin in the Game" Mechanic**
When you predict on Calibr, you stick your neck out.
1.  **Predict:** YES or NO.
2.  **Calibrate:** Set your Confidence Slider (50% → 100%).
3.  **Consequence:**
    *   **High Confidence (90%)**: High Reward, **Massive Penalty** if wrong.
    *   **Low Confidence (60%)**: Low Reward, Safety Net if wrong.

> *Technically, we track your **Brier Score** on-chain. Over time, lucky guessers revert to the mean. True forecasters rise to the top.*

---

## 🛠️ Technical Architecture: Why Sui?

We didn't just choose Sui for the speed (though sub-second finality is nice). We chose it for the **Object Model**.

### **1. Object-Centric Markets (No Global State)**
On EVM, a single "Market Factory" contract is a bottleneck. On Sui, **every Market is a distinct Object.**
*   **Parallel Execution:** Thousands of users can trade on Market A and Market B simultaneously without touching the same shared state.
*   **Dynamic Fields:** We use `dynamic_field` to attach liquidity positions to markets, allowing infinite scalability without array iteration limits.

### **2. Autonomous AI Oracle (Event-Driven Loop)**
We moved the "Human Oracle" bottleneck out of the way.
*   **The Listener:** Our Oracle Node subscribes to Sui `MarketCreated` events via WebSocket.
*   **The Brain:** Upon market lock, it triggers an AI Agent (GPT-4) to research the web for the ground truth.
*   **The Hand:** The agent constructs a `resolve_market` transaction and executes it on-chain in < 2 seconds.

### **3. Soulbound Reputation**
Your `Reputation` struct is a soulbound object attached to your address. It cannot be bought or transferred. It must be earned through consistent, low-Brier-score predictions.

---

## 📸 "Wow" Moments

### **The Living Ticker**
Our hero section isn't a static image. It's a real-time WebSocket stream of global market activity, visualizing the pulse of the truth economy.

### **Interactive "Spotlight" UI**
We built a custom UI engine using `framer-motion` and `Tailwind`. Hover over grids to see **mouse-following spotlights**—a subtle nod to "shining a light on the truth."

---

## 💻 Tech Stack

| Layer | Tech |
| :--- | :--- |
| **L1 Blockchain** | **Sui Move** (Testnet) |
| **Frontend** | Next.js 14, TypeScript, Tailwind |
| **Indexing** | Sui SDK (RPC Direct) |
| **Oracle** | Node.js, OpenAI API |
| **Animations** | Framer Motion |

---

## 🏃‍♂️ Run It Yourself

### 1. Clone & Install
```bash
git clone https://github.com/your-username/calibr.git
cd calibr
npm install
```

### 2. Configure Environment
```bash
# We need your OpenAI Key for the Oracle and a Sui Admin Key
cp .env.example .env
```

### 3. Start the Engine
```bash
# Use "turbo" to run frontend + oracle in parallel
npm run dev
```

---

> *"There are two kinds of forecasters: those who don't know, and those who don't know they don't know."* – JK Galbraith  
> **Calibr exposes the difference.**