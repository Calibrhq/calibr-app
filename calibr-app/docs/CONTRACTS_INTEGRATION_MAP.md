# Calibr: Contracts ↔ Frontend Integration Map

This document is the **single source of truth** for integrating the Sui Move contracts (`@contracts/`) with the Next.js frontend (`@calibr-app/`). It is based on:

- All contract modules: `calibr`, `market`, `prediction`, `reputation`, `events`, `math`
- Current frontend: `WalletContext`, `sui-config`, Explore, Market detail, Dashboard, Profile, PredictionPanel
- Calibr doc: Model 1 (risk/payout), Model 2 (reputation/skill), tiers, zero-sum

**No implementation should contradict this map.**

---

## 1. Contract Reference (Quick)

### 1.1 Deployed IDs (testnet)

| Item | Value |
|------|--------|
| **Package ID** | `0xc99b9b813061ebcf76ddd0043c65583bb56b7e6be192eb515d001e804666efd1` |
| **Upgrade Cap** | `0x09e200c40f54e153f85438dc18334f58169feb3229737e30c23a0d841139730c` |
| **AdminCap** | Created at publish; holder can create/lock/resolve markets. ID stored in `ADMIN_CAP_IDS.testnet` (from deployment output). |

- **Source of truth**: `contracts/Published.toml` and deployment logs.
- **Frontend config**: `calibr-app/src/lib/sui-config.ts` — `PACKAGE_IDS`, `ADMIN_CAP_IDS`, `DEFAULT_NETWORK`.

### 1.2 Object Types (Move → Frontend)

| Move Type | StructType (for RPC) | Key Fields |
|-----------|----------------------|------------|
| **UserProfile** | `{packageId}::calibr::UserProfile` | `id`, `owner`, `reputation_score`, `reputation_count`, `max_confidence` |
| **Market** | `{packageId}::calibr::Market` | `id`, `question` (bytes), `yes_risk_total`, `no_risk_total`, `yes_count`, `no_count`, `locked`, `resolved`, `outcome`, `authority` |
| **Prediction** | `{packageId}::calibr::Prediction` | `id`, `market_id`, `side`, `confidence`, `stake`, `risked`, `settled` |
| **AdminCap** | `{packageId}::market::AdminCap` | `id` (used only for admin calls) |

### 1.3 Entry Points Used by Frontend

| Module | Function | Who Calls | Args |
|--------|----------|-----------|------|
| **reputation** | `create_profile` | User (once) | (none; `ctx` from sender) |
| **prediction** | `place_prediction` | User | `profile`, `market`, `side` (bool), `confidence` (u64) |
| **prediction** | `settle_prediction` | User | `profile`, `prediction`, `market` |
| **market** | `create_market` | Admin only | `AdminCap`, `question` (vector<u8>), `authority` |
| **market** | `lock_market` | Admin only | `AdminCap`, `market` |
| **market** | `resolve_market` | Admin only | `AdminCap`, `market`, `outcome` (bool) |

- **place_prediction**: `profile` and `market` are object refs (IDs); `side` and `confidence` are pure (e.g. `tx.pure.u64(75)`).
- **settle_prediction**: All three args are object refs (profile mut, prediction mut, market imm).

### 1.4 Protocol Constants (Must Match Contract)

| Constant | Contract | Frontend (`sui-config`) |
|----------|----------|--------------------------|
| Stake S | 100 | `FIXED_STAKE = 100` |
| Confidence range | [50, 90] | `MIN_CONFIDENCE = 50`, `MAX_CONFIDENCE_*` |
| Risk formula | R = max(5, 100×(c−50)/40) | `calculateRisk(confidence)` |
| New tier | score < 700 → cap 70 | `TIER_THRESHOLDS.NEW` |
| Proven tier | 700 ≤ score ≤ 850 → cap 80 | `TIER_THRESHOLDS.PROVEN` |
| Elite tier | score > 850 → cap 90 | `TIER_THRESHOLDS.ELITE` |

---

## 2. User Flows (Implementation Order)

### 2.1 Flow A: Connect Wallet → Profile (Create If Missing)

**Goal**: Every connected user has exactly one `UserProfile` on-chain before they can predict.

1. **Connect wallet** (existing: dApp Kit).
2. **Fetch profile**: `getOwnedObjects({ owner, filter: { StructType: `${packageId}::calibr::UserProfile` } })` (already in `WalletContext.fetchUserProfile`).
3. **If no profile**:
   - Option A: Show CTA “Create profile” that triggers a transaction.
   - Option B: Auto-invoke create in background (one-time).
4. **Transaction**: Single moveCall:
   - **Target**: `{packageId}::reputation::create_profile`
   - **Arguments**: none (sender from wallet).
5. **After success**: Call `refreshProfile()` so `userProfile`, `reputation`, `maxConfidence`, `tier` update.

**Files**: `WalletContext.tsx` (fetch + optional create), new small helper or hook for `create_profile` PTB (e.g. `lib/calibr-transactions.ts` or `hooks/useCalibrTransactions.ts`).

**Validation**: Contract enforces one profile per tx sender; frontend does not need to “prevent duplicate” beyond normal UX (e.g. disable “Create” once profile exists).

---

### 2.2 Flow B: List Markets (Explore Page)

**Goal**: Explore page shows real markets from chain (or hybrid with mock for missing metadata).

**Constraint**: Sui does not have “get all objects of type.” Markets are created by admin and are **shared objects**. Options:

1. **Event index (recommended)**  
   - Query/subscribe events: `MarketCreated` (from `calibr::events`).  
   - Each event has `market_id`, `question`, `authority`.  
   - Frontend or backend caches these and optionally enriches with `getObject(market_id)` for live totals.

2. **Curated list**  
   - Backend or config keeps a list of market object IDs.  
   - Frontend fetches each with `getObject(id)` and parses `Market` fields.

3. **MVP hybrid**  
   - Keep mock list for categories/descriptions; replace `id` with real market object ID when admin has created markets.  
   - Detail page and prediction flow use real `market_id`.

**Market fields to use** (from chain):

- `question`: UTF-8 bytes → decode for title.
- `yes_risk_total`, `no_risk_total`, `yes_count`, `no_count`: for “volume” and YES/NO balance.
- `locked`, `resolved`, `outcome`: for status and result.

**Files**: `explore/page.tsx`, optional `hooks/useMarkets.ts` (event query or getObject list), `lib/calibr-types.ts` (Market type from chain).

---

### 2.3 Flow C: Market Detail + Place Prediction

**Goal**: User opens a market by ID, sees live data, and can place a prediction via PTB.

1. **Route**: `/market/[id]` — `id` = Sui Market object ID.
2. **Load market**: `getObject(id)` with `showContent: true`. Parse `Market` (question, yes/no totals, locked, resolved, outcome).
3. **Load user**: `userProfile` from WalletContext (object ID for profile).
4. **PredictionPanel**:
   - **maxConfidence**: From `userProfile.maxConfidence` (or WalletContext `maxConfidence`). Slider must cap at this.
   - **Place prediction**:
     - Require: `userProfile` exists; market `!locked && !resolved`; confidence in [50, 90] and ≤ maxConfidence.
     - Build **one** PTB:
       - **Target**: `{packageId}::prediction::place_prediction`
       - **Arguments**:  
         - `tx.object(userProfileId)`  
         - `tx.object(marketId)`  
         - `tx.pure.bool(side)` — true = YES, false = NO  
         - `tx.pure.u64(confidence)` — number 50–90
     - Sign and execute (e.g. `useSignAndExecuteTransaction` from dApp Kit).
     - On success: refresh WalletContext profile; optionally refetch market object to update yes/no totals.
5. **If no profile**: Redirect or block with “Create profile first” (Flow A).

**Files**: `market/[id]/page.tsx` (fetch market by id), `PredictionPanel.tsx` (wire place_prediction PTB, use `userProfile.id` and `marketId` from props/context), `lib/calibr-transactions.ts` (build place_prediction tx).

**Errors to handle**: Contract aborts (e.g. EConfidenceExceedsUserCap, EMarketNotOpen). Map abort code to user message where possible.

---

### 2.4 Flow D: Dashboard — My Predictions + Settle

**Goal**: Show user’s predictions (owned `Prediction` objects) and allow settling when market is resolved.

1. **Fetch predictions**: `getOwnedObjects({ owner, filter: { StructType: `${packageId}::calibr::Prediction` } })`.
2. **For each prediction**: Read `market_id`, `side`, `confidence`, `stake`, `risked`, `settled`.
3. **Fetch markets**: For each unique `market_id`, `getObject(market_id)` to get `question`, `resolved`, `outcome`.
4. **Display**:
   - **Active**: `!settled` and market `!resolved` → show “Pending”.
   - **Settled**: `settled === true` → show result (WON/LOST, payout).
   - **Settleable**: `!settled` and market `resolved` → show “Settle” button.
5. **Settle**:
   - Build PTB: **Target** `{packageId}::prediction::settle_prediction`  
     **Arguments**: `tx.object(profileId)`, `tx.object(predictionId)`, `tx.object(marketId)`.
   - Sign and execute.
   - On success: refresh profile and prediction list (and balance if payouts use coins in a future version).

**Files**: `dashboard/page.tsx` (replace mock with chain data), `hooks/useUserPredictions.ts` (owned predictions + market details), `lib/calibr-transactions.ts` (build settle_prediction tx).

---

### 2.5 Flow E: Profile / Reputation

**Goal**: Profile page reflects on-chain reputation only (no mock stats for core numbers).

- **Source**: `WalletContext.userProfile` (from chain): `reputationScore`, `reputationCount`, `maxConfidence`, `tier`.
- **Charts / history**: Can stay mock for now, or later be driven by events (`ReputationUpdated`, `PredictionSettled`).
- **No new contract calls** for basic profile; only use existing `userProfile` and optional event index for history.

**Files**: `profile/page.tsx` — ensure it uses `userProfile` (and thus chain data) for score, tier, max confidence.

---

### 2.6 Flow F: Admin (Create / Lock / Resolve Markets)

**Goal**: Only admin (holder of `AdminCap`) can create, lock, and resolve markets.

- **create_market**: `{packageId}::market::create_market`  
  Args: `tx.object(adminCapId)`, `tx.pure.vector(['u8'], new TextEncoder().encode(question))`, `tx.pure.address(authority)`.
- **lock_market**: `{packageId}::market::lock_market`  
  Args: `tx.object(adminCapId)`, `tx.object(marketId)`.
- **resolve_market**: `{packageId}::market::resolve_market`  
  Args: `tx.object(adminCapId)`, `tx.object(marketId)`, `tx.pure.bool(outcome)`.

**Frontend**: Admin-only page or script; check that connected address owns `AdminCap` (e.g. getOwnedObjects filter `AdminCap`). Do not expose to normal users.

**Files**: Optional `app/admin/` or `lib/admin-transactions.ts`; keep AdminCap ID in env or config (not in default client bundle if possible).

---

## 3. Technical Checklist

### 3.1 Config & Types

- [ ] `sui-config.ts`: `PACKAGE_IDS.testnet` and `ADMIN_CAP_IDS.testnet` match deployment.
- [ ] Add TypeScript types for chain responses: `UserProfile`, `Market`, `Prediction` (from getObject content).
- [ ] Centralize `StructType` strings: e.g. `getCalibrStructType('UserProfile')` → `${packageId}::calibr::UserProfile`.

### 3.2 WalletContext

- [ ] Already fetches UserProfile by StructType; keep as is.
- [ ] Add flow to **create profile** if none (call create_profile tx then refresh).
- [ ] Expose `userProfile?.id` (object ID) for PTB arguments.

### 3.3 Transactions (PTB)

- [ ] Use `Transaction` from `@mysten/sui/transactions` (or equivalent from installed SDK).
- [ ] Use `useSignAndExecuteTransaction` (or equivalent) from `@mysten/dapp-kit-react`.
- [ ] Implement:
  - [ ] `create_profile()` — single moveCall, no args.
  - [ ] `place_prediction(profileId, marketId, side, confidence)` — one moveCall, four args.
  - [ ] `settle_prediction(profileId, predictionId, marketId)` — one moveCall, three args.
- [ ] All moveCall targets: `${getPackageId()}::<module>::<function>`.

### 3.4 Explore / Markets

- [ ] Decide: event index vs curated list vs hybrid.
- [ ] Explore page: load markets from chain (or hybrid); link to `/market/<marketObjectId>`.
- [ ] Market card: show question, yes/no totals (or derived percentage), status (open/locked/resolved).

### 3.5 Market Detail Page

- [ ] Fetch market by object ID from route; parse and show question, totals, locked, resolved, outcome.
- [ ] PredictionPanel: receive `marketId` (object ID) and `userProfile.id`; call place_prediction PTB on confirm.
- [ ] Handle “no profile”: redirect to create profile or show modal.

### 3.6 Dashboard

- [ ] Replace mock predictions with `getOwnedObjects` Prediction + getObject(market_id) for each.
- [ ] Show “Settle” for unsettled predictions on resolved markets; call settle_prediction PTB.
- [ ] After settle, refresh profile and list.

### 3.7 Profile

- [ ] Use only chain data for reputation score, tier, max confidence (from WalletContext).
- [ ] Optional: event-based history later.

### 3.8 Errors & UX

- [ ] Map contract abort codes to messages (e.g. EConfidenceExceedsUserCap → “Confidence above your current cap”).
- [ ] Toasts for tx success/failure; loading state during sign and execute.

---

## 4. Event Indexing (Optional but Recommended)

Events to query for a full integration:

| Event | Use Case |
|-------|----------|
| **MarketCreated** | Build market list; question, market_id, authority |
| **MarketLocked** | Update market status |
| **MarketResolved** | Update outcome; show “Settle” for predictions |
| **PredictionPlaced** | Activity feed; update market totals |
| **PredictionSettled** | User history; reputation changes |
| **ProfileCreated** | Know when user first joined |
| **ReputationUpdated** | Leaderboard; profile history |
| **ConfidenceCapChanged** | Show tier changes |

Implementation can be a backend indexer that writes to DB/API, or frontend query by event type and package (if RPC supports it). Not required for MVP of “place + settle + profile.”

---

## 5. Dependency Summary

| Frontend Need | Contract Side | Notes |
|---------------|---------------|------|
| User profile (reputation, cap) | UserProfile owned object | Fetch by StructType; create via create_profile |
| Place prediction | place_prediction(profile, market, side, confidence) | PTB; profile and market object IDs |
| Settle prediction | settle_prediction(profile, prediction, market) | PTB; all three object IDs |
| Market list | MarketCreated events or curated IDs | No “get all markets” RPC |
| Market detail | getObject(marketId) | question, totals, locked, resolved, outcome |
| My predictions | getOwnedObjects Prediction | Then getObject(market_id) per market |
| Admin create/lock/resolve | market::create_market, lock_market, resolve_market | AdminCap required |

---

## 6. Implementation Order (Suggested)

1. **Config & types**: Package ID, struct types, TS types for Market/UserProfile/Prediction.
2. **Create profile**: Transaction helper + WalletContext “create if missing” (or explicit button).
3. **Place prediction**: Transaction helper + PredictionPanel wiring (market ID from route, profile from context).
4. **Market detail**: Fetch market by ID; show real data; connect PredictionPanel to real place_prediction.
5. **Dashboard**: Fetch user predictions + markets; add Settle button and settle_prediction.
6. **Explore**: Replace or merge mock with chain markets (event index or curated IDs).
7. **Admin**: Optional; create/lock/resolve behind admin check.
8. **Events**: Optional; indexer or event-driven UI for history and leaderboard.

This order keeps contract usage correct and avoids duplicate or inconsistent logic between frontend and Move.
