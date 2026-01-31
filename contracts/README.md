# Calibr Smart Contracts

Sui Move smart contracts for the Calibr confidence-weighted prediction protocol.

## Overview

Calibr is a prediction game where your confidence level matters as much as being right. The protocol uses two models:

- **Model 1 (Money)**: Risk/reward based on confidence level
- **Model 2 (Reputation)**: Track record of calibration accuracy

## Architecture

```
contracts/
├── sources/
│   ├── calibr.move      # Core data objects (UserProfile, Market, Prediction)
│   ├── market.move      # Market lifecycle (create, lock, resolve)
│   ├── prediction.move  # Prediction placement and settlement
│   ├── reputation.move  # Reputation tracking and tiers
│   ├── math.move        # Pure math functions (risk, skill)
│   ├── events.move      # Event definitions for indexing
│   └── tests/           # Unit and integration tests
├── scripts/
│   ├── setup.sh         # Development environment setup
│   └── deploy.sh        # Deployment script
├── Move.toml            # Package manifest
└── DEPLOYMENT.md        # Detailed deployment guide
```

## Quick Start

### Prerequisites

- [Sui CLI](https://docs.sui.io/guides/developer/getting-started/sui-install)
- Testnet SUI tokens from [faucet](https://faucet.sui.io/)

### Setup

```bash
# Run setup script (installs Sui CLI if needed)
./scripts/setup.sh
```

### Build

```bash
sui move build
```

### Test

```bash
sui move test
```

All 74 tests should pass:
- 17 math tests
- 11 market tests  
- 18 reputation tests
- 16 prediction tests
- 12 integration tests

### Deploy

```bash
# Deploy to testnet
./scripts/deploy.sh testnet

# Or manually
sui client publish --gas-budget 100000000
```

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed instructions.

## Key Formulas

### Model 1: Risk Calculation
```
R = max(5, 100 × (confidence - 50) / 40)

Examples:
- 50% confidence → R = 5  (minimum risk)
- 70% confidence → R = 50 (moderate risk)
- 90% confidence → R = 100 (maximum risk)
```

### Model 1: Settlement
```
Pool = Σ R_losers (sum of loser risk values)
Winner payout = stake + (my_R / Σ R_winners) × pool
Loser payout = stake - my_R (keep protected portion)
```

### Model 2: Skill Calculation
```
skill = 1 - (c - o)²

Where:
- c = confidence as decimal [0.5, 0.9]
- o = outcome (1 if correct, 0 if wrong)

Examples:
- 90% correct → skill = 0.99
- 90% wrong  → skill = 0.19
- 60% correct → skill = 0.84
- 60% wrong  → skill = 0.64
```

### Model 2: Reputation
```
new_rep = (old_rep × n + skill) / (n + 1)

Where n = number of previous predictions
```

### Tier System
| Reputation | Tier | Max Confidence |
|------------|------|----------------|
| < 700 | New | 70% |
| 700-850 | Proven | 80% |
| > 850 | Elite | 90% |

## Contract Modules

### calibr.move
Core data structures:
- `UserProfile` (owned) - Reputation state
- `Market` (shared) - Prediction market
- `Prediction` (owned) - User's prediction receipt

### market.move
Admin functions:
- `create_market` - Create new market
- `lock_market` - Lock for resolution
- `resolve_market` - Set outcome

### prediction.move
User functions:
- `place_prediction` - Make a prediction
- `settle_prediction` - Claim payout + update reputation

### reputation.move
User functions:
- `create_profile` - One-time profile creation
- `update_after_settlement` - Update reputation (called internally)

### math.move
Pure functions:
- `risk_from_confidence` - Calculate R value
- `skill` - Calculate skill score

### events.move
Events for off-chain indexing:
- `MarketCreated`, `MarketLocked`, `MarketResolved`
- `PredictionPlaced`, `PredictionSettled`
- `ProfileCreated`, `ReputationUpdated`, `ConfidenceCapChanged`

## Development

### Run specific tests
```bash
# All tests
sui move test

# Specific module
sui move test integration_tests
sui move test math_tests

# With verbose output
sui move test --verbose
```

### Code coverage
```bash
sui move test --coverage
```

## License

MIT
