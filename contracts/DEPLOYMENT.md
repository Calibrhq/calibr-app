# Calibr Smart Contract Deployment Guide

This guide walks you through deploying the Calibr protocol to Sui testnet.

## Prerequisites

### 1. Install Sui CLI

**macOS/Linux:**
```bash
# Using Homebrew (macOS)
brew install sui

# Or using Cargo (requires Rust)
cargo install --locked --git https://github.com/MystenLabs/sui.git --branch testnet sui
```

**Verify installation:**
```bash
sui --version
```

### 2. Configure Sui Client

Run the Sui client for the first time to set up configuration:
```bash
sui client
```

When prompted:
- Select `testnet` as your network
- Choose to create a new keypair (or import existing)
- Save your recovery phrase securely!

### 3. Get Testnet SUI Tokens

You need testnet SUI tokens to deploy. Get them from:

**Option A: Web Faucet (Recommended)**
1. Go to https://faucet.sui.io/
2. Select "Testnet" network
3. Paste your address (get it with `sui client active-address`)
4. Click "Request SUI"

**Option B: CLI Faucet**
```bash
sui client faucet
```

**Verify your balance:**
```bash
sui client balance
```

You should see at least 1 SUI in your balance.

## Deployment Methods

### Method 1: Using the Deploy Script (Recommended)

```bash
# Navigate to contracts directory
cd calibr/contracts

# Make script executable
chmod +x scripts/deploy.sh

# Deploy to testnet
./scripts/deploy.sh testnet
```

The script will:
1. Check prerequisites
2. Build the package
3. Run all tests
4. Deploy to testnet
5. Save deployment info to `.env.testnet`

### Method 2: Manual Deployment

#### Step 1: Verify Network Configuration

```bash
# Check current environment
sui client active-env

# List available environments
sui client envs

# Switch to testnet if needed
sui client switch --env testnet
```

If testnet isn't configured:
```bash
sui client new-env --alias testnet --rpc https://fullnode.testnet.sui.io:443
sui client switch --env testnet
```

#### Step 2: Build the Package

```bash
cd calibr/contracts

# Build (checks for compilation errors)
sui move build
```

#### Step 3: Run Tests

```bash
sui move test
```

Ensure all 74 tests pass before deployment.

#### Step 4: Publish to Testnet

```bash
sui client publish --gas-budget 100000000
```

#### Step 5: Save Deployment Info

After successful deployment, you'll see output like:
```
╭──────────────────────────────────────────────────────────────────────────────╮
│ Object Changes                                                                │
├──────────────────────────────────────────────────────────────────────────────┤
│ Created Objects:                                                              │
│  ┌──                                                                          │
│  │ ObjectID: 0x1234...  ← This is the AdminCap                               │
│  │ ObjectType: 0xabc...::market::AdminCap                                    │
│  └──                                                                          │
│ Published Objects:                                                            │
│  ┌──                                                                          │
│  │ PackageID: 0xabc...  ← This is your PACKAGE_ID                            │
│  └──                                                                          │
╰──────────────────────────────────────────────────────────────────────────────╯
```

**Save these values:**
```bash
export PACKAGE_ID=0x... # Your package ID
export ADMIN_CAP_ID=0x... # AdminCap object ID
```

## Post-Deployment Verification

### 1. View on Explorer

Visit the Sui explorer to verify your deployment:
- **SuiScan:** `https://suiscan.xyz/testnet/object/<PACKAGE_ID>`
- **SuiVision:** `https://testnet.suivision.xyz/package/<PACKAGE_ID>`

### 2. Test Contract Interaction

**Create a user profile:**
```bash
sui client call \
  --package $PACKAGE_ID \
  --module reputation \
  --function create_profile \
  --gas-budget 10000000
```

**Create a market (admin only):**
```bash
sui client call \
  --package $PACKAGE_ID \
  --module market \
  --function create_market \
  --args $ADMIN_CAP_ID "Will BTC exceed 100k by 2025?" $YOUR_ADDRESS \
  --gas-budget 10000000
```

## Frontend Integration

After deployment, update your frontend configuration:

```typescript
// calibr-app/src/config/sui.ts
export const SUI_CONFIG = {
  NETWORK: 'testnet',
  PACKAGE_ID: '0x...', // Your deployed package ID
  
  // Module names
  MODULES: {
    CALIBR: 'calibr',
    MARKET: 'market',
    PREDICTION: 'prediction',
    REPUTATION: 'reputation',
  },
};
```

## Troubleshooting

### "Insufficient gas" error
Increase the gas budget:
```bash
sui client publish --gas-budget 200000000
```

### "No coins found" error
Get more testnet tokens from the faucet:
```bash
sui client faucet
```

### Build errors
```bash
# Clean and rebuild
rm -rf build/
sui move build
```

### Network connection issues
Check your network configuration:
```bash
sui client envs
sui client switch --env testnet
```

## Contract Addresses (After Deployment)

| Contract | Module | Description |
|----------|--------|-------------|
| `calibr` | Core data objects | UserProfile, Market, Prediction |
| `market` | Market management | Create, lock, resolve markets |
| `prediction` | Prediction logic | Place and settle predictions |
| `reputation` | Reputation system | Profile creation, tier management |
| `math` | Pure calculations | Risk, skill formulas |
| `events` | Event emission | Off-chain indexing |

## Security Notes

1. **AdminCap:** The `AdminCap` object is created during deployment and transferred to the deployer. Keep it secure! Whoever owns it can create and resolve markets.

2. **Testnet vs Mainnet:** Always test thoroughly on testnet before mainnet deployment.

3. **Upgrade Path:** Sui packages are immutable once published. Plan for upgrades using the Sui upgrade framework if needed.

## Support

- Sui Documentation: https://docs.sui.io/
- Sui Discord: https://discord.gg/sui
- Move Book: https://move-book.com/
