# Calibr: Proof of Calibration

**A DeFi primitive that turns decision quality into an owned, composable on-chain asset.**

---

## Project Overview

Most on-chain systems only measure capital. A new wallet, a skilled decision-maker, and a malicious actor all look identical. This breaks governance, incentives, and any mechanism that depends on judgment rather than money.

**Calibr fixes this by making accuracy and confidence measurable over time through prediction markets with objectively verifiable outcomes.**

It introduces **Proof of Calibration**—a system where confidence is no longer cheap talk. It directly affects both short-term outcomes and long-term reputation.

---

## Core Idea

Users make binary predictions (YES / NO) and explicitly state how confident they are (50–90%).
The system is built around two models:

### Model 1: Confidence-Weighted Incentives (Immediate Feedback)
Each prediction uses a fixed stake (e.g., 100 points). Users choose a confidence $c \in [0.5, 0.9]$.
The risk function is:
$$ \text{Risk} = \text{Stake} \times (2c - 1) $$

*   **Higher confidence = More capital at risk.**
*   **Settlement:** All losing risk forms a loser pool. Winners split this pool proportionally to their own risk.
*   **Result:** A zero-sum system where higher confidence yields higher upside if correct, but overconfidence produces larger losses if wrong. Being correct guarantees *relative advantage*, not just profit.

### Model 2: Proof of Calibration (Reputation)
After every resolved market, Calibr updates a user’s reputation using a proper scoring rule (Brier-style).
*   **Correct at High Confidence** → Strong positive update.
*   **Correct at Low Confidence** → Small positive update.
*   **Wrong at High Confidence** → Strong penalty.

Reputation compounds slowly and path-dependently. It is impossible to buy instantly and resistant to Sybil resets. This reputation is not cosmetic—it directly gates system privileges like **confidence ceilings** and **access to advanced markets**.

---

## Architecture (Sui-Native)

Calibr is designed around an object-centric execution model because reputation and long-lived identity cannot be safely represented as shared global state.

### 1. User Calibration Object (Owned)
Each user has a non-transferable **Owned Object** that stores their calibration history and reputation score. Ownership is enforced at the protocol level, not via tokens or contract variables.

### 2. Market Objects (Shared)
Each prediction market is an independent **Shared Object**. Users interacting with different markets do not contend on global state, enabling parallel execution at scale.

### 3. Atomic Updates via PTBs
Market resolution triggers a **Programmable Transaction Block (PTB)** that atomically:
1.  Resolves the market.
2.  Settles incentives.
3.  Updates each user’s calibration object.

This guarantees no partial updates or exploitable intermediate states.

---

## Oracle & Automation

Markets resolve via an automated oracle pipeline:
1.  **Event-Driven:** A node listener watches `MarketCreated` events on Sui.
2.  **AI Judge:** An AI Agent (Llama 3 via Groq) researches real-world data to determine truth (YES/NO).
3.  **On-Chain Execution:** The agent triggers the `admin_resolve` function on-chain.

This removes slow, manual governance while preserving deterministic, verifiable outcomes.

---

## Why This Matters

Calibr shifts DeFi from **capital-dominant systems** to **skill-aware systems**.
It introduces a reusable signal that answers:
*   *Who should we trust?*
*   *Whose judgment deserves weight?*
*   *Who has earned higher leverage?*

**Proof of Calibration** is a new primitive that can be composed across **DAO Governance**, **Undercollateralized Lending**, and **Risk Assessment**.

---

## Status

*   ✅ **Fully working prototype** on Sui Testnet.
*   ✅ **On-chain reputation updates** via Brier Score logic.
*   ✅ **Automated AI Oracle** resolution.
*   ✅ **End-to-end demo** ready.

---

## Run It Yourself

### 1. Clone & Install
```bash
git clone https://github.com/Calibrhq/calibr-app.git
cd calibr-app
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
# Add your GROQ_API_KEY and SUI_PRIVATE_KEY
```

### 3. Start
```bash
# Start Frontend
npm run dev

# Start AI Oracle (in separate terminal)
npm run start:oracle
```