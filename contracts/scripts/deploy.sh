#!/bin/bash

# ============================================================
# Calibr Smart Contract Deployment Script
# ============================================================
# 
# This script deploys the Calibr protocol to Sui testnet.
#
# Prerequisites:
# 1. Sui CLI installed (https://docs.sui.io/guides/developer/getting-started/sui-install)
# 2. Testnet SUI tokens (get from https://faucet.sui.io/)
#
# Usage:
#   ./scripts/deploy.sh [network]
#
# Networks:
#   testnet (default)
#   devnet
#   mainnet (requires caution!)
#
# ============================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default network
NETWORK=${1:-testnet}

# Gas budget (20 SUI should be plenty)
GAS_BUDGET=100000000

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONTRACT_DIR="$(dirname "$SCRIPT_DIR")"

echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}   Calibr Protocol Deployment Script${NC}"
echo -e "${BLUE}============================================${NC}"
echo ""

# ============================================================
# Step 1: Check Prerequisites
# ============================================================

echo -e "${YELLOW}[1/6] Checking prerequisites...${NC}"

# Check if Sui CLI is installed
if ! command -v sui &> /dev/null; then
    echo -e "${RED}Error: Sui CLI not found!${NC}"
    echo ""
    echo "Please install Sui CLI first:"
    echo "  cargo install --locked --git https://github.com/MystenLabs/sui.git --branch testnet sui"
    echo ""
    echo "Or visit: https://docs.sui.io/guides/developer/getting-started/sui-install"
    exit 1
fi

echo -e "${GREEN}✓ Sui CLI found: $(sui --version)${NC}"

# ============================================================
# Step 2: Configure Network
# ============================================================

echo ""
echo -e "${YELLOW}[2/6] Configuring network: ${NETWORK}...${NC}"

# Get current environment
CURRENT_ENV=$(sui client active-env 2>/dev/null || echo "none")

if [ "$CURRENT_ENV" != "$NETWORK" ]; then
    echo "Switching from '$CURRENT_ENV' to '$NETWORK'..."
    
    # Check if the environment exists
    if sui client envs | grep -q "$NETWORK"; then
        sui client switch --env "$NETWORK"
    else
        echo -e "${RED}Error: Network '$NETWORK' not configured!${NC}"
        echo ""
        echo "Available environments:"
        sui client envs
        echo ""
        echo "To add testnet, run:"
        echo "  sui client new-env --alias testnet --rpc https://fullnode.testnet.sui.io:443"
        exit 1
    fi
fi

echo -e "${GREEN}✓ Active network: $(sui client active-env)${NC}"

# ============================================================
# Step 3: Check Wallet and Balance
# ============================================================

echo ""
echo -e "${YELLOW}[3/6] Checking wallet...${NC}"

# Get active address
ACTIVE_ADDRESS=$(sui client active-address)
echo "Active address: $ACTIVE_ADDRESS"

# Check balance
echo "Checking balance..."
BALANCE_OUTPUT=$(sui client balance 2>&1)
echo "$BALANCE_OUTPUT"

# Check if we have SUI
if echo "$BALANCE_OUTPUT" | grep -q "No coins found"; then
    echo ""
    echo -e "${RED}Error: No SUI tokens found!${NC}"
    echo ""
    echo "Get testnet tokens from:"
    echo "  1. Web faucet: https://faucet.sui.io/"
    echo "  2. CLI: sui client faucet"
    echo ""
    echo "Your address: $ACTIVE_ADDRESS"
    exit 1
fi

echo -e "${GREEN}✓ Wallet has SUI tokens${NC}"

# ============================================================
# Step 4: Build the Package
# ============================================================

echo ""
echo -e "${YELLOW}[4/6] Building package...${NC}"

cd "$CONTRACT_DIR"

# Build first to check for errors
sui move build

echo -e "${GREEN}✓ Package built successfully${NC}"

# ============================================================
# Step 5: Run Tests (Optional but Recommended)
# ============================================================

echo ""
echo -e "${YELLOW}[5/6] Running tests...${NC}"

sui move test

echo -e "${GREEN}✓ All tests passed${NC}"

# ============================================================
# Step 6: Deploy
# ============================================================

echo ""
echo -e "${YELLOW}[6/6] Deploying to ${NETWORK}...${NC}"
echo ""

# Publish the package
PUBLISH_OUTPUT=$(sui client publish --gas-budget $GAS_BUDGET --json 2>&1)

# Check if publish was successful
if echo "$PUBLISH_OUTPUT" | grep -q '"status":"success"'; then
    echo -e "${GREEN}✓ Deployment successful!${NC}"
    echo ""
    
    # Extract Package ID
    PACKAGE_ID=$(echo "$PUBLISH_OUTPUT" | grep -o '"packageId":"[^"]*"' | head -1 | cut -d'"' -f4)
    
    # Extract AdminCap ID (created during init)
    ADMIN_CAP_ID=$(echo "$PUBLISH_OUTPUT" | grep -o '"objectId":"[^"]*"' | head -1 | cut -d'"' -f4)
    
    echo -e "${BLUE}============================================${NC}"
    echo -e "${BLUE}   Deployment Complete!${NC}"
    echo -e "${BLUE}============================================${NC}"
    echo ""
    echo -e "Network:     ${GREEN}${NETWORK}${NC}"
    echo -e "Package ID:  ${GREEN}${PACKAGE_ID}${NC}"
    echo ""
    echo "Save these values! You'll need them for frontend integration."
    echo ""
    
    # Save to .env file
    ENV_FILE="$CONTRACT_DIR/.env.${NETWORK}"
    echo "# Calibr Deployment - $(date)" > "$ENV_FILE"
    echo "NETWORK=$NETWORK" >> "$ENV_FILE"
    echo "PACKAGE_ID=$PACKAGE_ID" >> "$ENV_FILE"
    echo "DEPLOYER_ADDRESS=$ACTIVE_ADDRESS" >> "$ENV_FILE"
    
    echo -e "Saved to: ${GREEN}${ENV_FILE}${NC}"
    echo ""
    
    # Print full JSON for reference
    echo "Full deployment output saved to: $CONTRACT_DIR/deployment-${NETWORK}.json"
    echo "$PUBLISH_OUTPUT" > "$CONTRACT_DIR/deployment-${NETWORK}.json"
    
else
    echo -e "${RED}Deployment failed!${NC}"
    echo ""
    echo "Output:"
    echo "$PUBLISH_OUTPUT"
    exit 1
fi

echo ""
echo -e "${GREEN}Done! Your Calibr contracts are now live on ${NETWORK}.${NC}"
echo ""
echo "Next steps:"
echo "  1. Save the Package ID for frontend integration"
echo "  2. View your package on explorer:"
echo "     https://suiscan.xyz/${NETWORK}/object/${PACKAGE_ID}"
echo ""
