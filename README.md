# Calibr: Proof of Calibration

**A DeFi primitive that turns decision quality into an owned, composable on-chain asset.**

## Deployed Contracts (Testnet)

| Contract Name | Object ID | Explorer Link |
|---------------|-----------|---------------|
| **Package** | `0x75ac...6667` | [View on SuiScan](https://suiscan.xyz/testnet/package/0x75ac97b98aceeeab79b2c7177266799528b0ecb16a56e8698ffde75d5da26667) |
| **points_market.move** (Config) | `0x5589...2e22` | [View on SuiScan](https://suiscan.xyz/testnet/object/0x55895949dc612b1f9dac92ab8327e75d5ab95215cedd9e0f9541c69a407c2e22) |
| **points_market.move** (Registry)| `0xa94d...44f1` | [View on SuiScan](https://suiscan.xyz/testnet/object/0xa94d7ecbcfe896be288353075c89a3764f0f7fc4f338e8e8b07ba8f8536a44f1) |
| **treasury.move** | `0xc90e...780e` | [View on SuiScan](https://suiscan.xyz/testnet/object/0xc90e7dc8b61899cf6d21bacb6223f7fe563bcc3e051fac06eeee22d3a94f780e) |
| **market.move** (AdminCap) | `0x1085...df0e` | [View on SuiScan](https://suiscan.xyz/testnet/object/0x108534a9cebf7eff2a968bbac578b9c24bc60fc6637f6c987d6a60397ffcdf0e) |

---

## Overview

Calibr introduces a new DeFi primitive called **Proof of Calibration**—a rigorous method to measure and assetize long-term decision quality. By coupling economic risk with explicit confidence declarations, we create a system where reputation is not a vanity metric, but a mathematical function of historical accuracy.

---

## The Problem

Current prediction markets suffer from incentive misalignment that degrades their utility as signal mechanisms:
1.  **Gambling Drift:** Binary "all-or-nothing" payoffs reward variance, not precision. A degenerate gambler who bets 100% on a coin flip and wins is effectively indistinguishable from a calibrated expert.
2.  **Short-Termism:** Incentives focus purely on the immediate settlement. There is no cumulative memory of "who was right/wrong and by how much."
3.  **Signal Decay:** Without a persistent reputation layer, skill does not accrue value. A new wallet has the same standing as a proven forecaster, limiting the ability to meaningfully weight expert opinion.

Calibr addresses this by differentiating between *luck* and *calibration*.

---

## Core Idea

Users make binary predictions (YES / NO) and explicitly declare their **Confidence** ($c$).
Confidence is no longer cheap talk; it has direct economic and reputational consequences.

---

## Model 1: Confidence-Weighted Incentives

Each prediction uses a fixed stake $S$ (normalized point value) and a declared confidence $c \in [0.5, 0.9]$.

### Risk Sizing
The capital explicitly at risk is a function of confidence:

$$
\text{Risk} = S \times (2c - 1)
$$

*   At 50% confidence (uncertain), Risk = 0.
*   At 100% confidence (certain), Risk = S.

This mechanism forces users to perform an internal risk assessment. Overconfidence at the individual trade level is immediately punished by larger potential losses.

### Settlement
Markets settle via a zero-sum redistribution of risk capital.
Let $R_L$ be the total risk pledged by the losing side.
Let $r_i$ be the risk pledged by winning user $i$.

The payout for user $i$ is:

$$
\text{Payout}_i = \frac{r_i}{\sum r_{\text{winners}}} \times R_L
$$

$$
\text{Net}_i = \text{Payout}_i - r_i
$$

**Implication:** Being "right" is necessary but not sufficient for profit. A user must be "right" relative to the consensus. This structure ensures that payouts flow from the overconfident/wrong to the calibrated/correct.

---

## Model 2: Proof of Calibration (Reputation)

While Model 1 handles immediate incentives, Model 2 handles long-term signal preservation.
After each resolved market, a user's on-chain reputation is updated using a **Proper Scoring Rule** (Brier-style logic).

Let outcome $o \in \{0,1\}$ and declared confidence $c$.

**1. Calculate Loss:**

$$
\text{Loss} = (c - o)^2
$$

**2. Calculate Delta:**

$$
\Delta\text{Skill} = 1 - \text{Loss}
$$

**3. Update Reputation (Exponential Moving Average):**

$$
\text{Skill}_t = \alpha \cdot \text{Skill}_{t-1} + (1 - \alpha) \cdot \Delta\text{Skill}
$$

### Properties
*   **Overconfidence Penalty:** Claiming 90% confidence and being wrong results in a massive penalty $(0.9 - 0)^2 = 0.81$ loss.
*   **Calculated Caution:** Being unsure (50%) results in a stable minimal update, preserving skill rather than destroying it.
*   **Path Dependence:** Reputation must be built over time. It cannot be purchased, flash-loaned, or easily farmed by Sybils.

---

## Architecture

Calibr leverages the **Sui Object Model** to implement this logic efficiently.

*   **Owned Objects (Reputation):** Each user's history is stored in a `UserProfile` object owned by their address. This ensures reputation is self-sovereign and non-transferable.
*   **Shared Objects (Markets):** Prediction markets are independent shared objects. This allows thousands of markets to operate in parallel without global state contention.
*   **Atomic Updates:** Market resolution triggers a Programmable Transaction Block (PTB) that atomically resolves the market, calculates Model 1 incentives, and updates Model 2 reputation scores in a single finalized block.

---

## Oracle Assumptions

Markets are resolved via an automated, verifiable pipeline.
1.  **Source:** External ground truth (Price Feeds, Event APIs).
2.  **Resolution:** An off-chain node (running robust LLM logic + heuristic checks) detects definitive outcomes.
3.  **Verification:** The node submits a signed transaction to the `admin_resolve` function.
    *   *Note: Future iterations will implement a decentralized oracle network (e.g., UMA/Switchboard) for trustless resolution.*

---

## Composability

**Proof of Calibration** is a generalized primitive. The `reputation_score` exposed by the `UserProfile` object can be consumed by other protocols to:
*   **Governance:** Weight votes by domain-specific accuracy rather than token holdings.
*   **Risk:** Offer lower collateral ratios to users with high calibration scores.
*   **Access:** Gate access to high-stakes or institutional markets.

---

## Status

*   **Contracts:** Fully implemented in Sui Move (Testnet). [View on Explorer](https://suiscan.xyz/testnet/package/0x75ac97b98aceeeab79b2c7177266799528b0ecb16a56e8698ffde75d5da26667)
*   **Incentives:** Model 1 & 2 logic operational.
*   **Frontend:** Live prediction interface with real-time feedback.
*   **Oracle:** Automated "AI Referee" resolving markets.

---

## Run Locally

```bash
git clone https://github.com/Calibrhq/calibr-app.git
cd calibr-app
npm install
cp .env.example .env

# Start App
npm run dev
```