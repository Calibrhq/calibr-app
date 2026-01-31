#!/bin/bash

# ============================================================
# Calibr Development Setup Script
# ============================================================
# 
# This script helps set up your Sui development environment
# for Calibr contract development and deployment.
#
# Usage:
#   ./scripts/setup.sh
#
# ============================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}   Calibr Development Setup${NC}"
echo -e "${BLUE}============================================${NC}"
echo ""

# ============================================================
# Check Sui CLI
# ============================================================

echo -e "${YELLOW}Checking Sui CLI...${NC}"

if command -v sui &> /dev/null; then
    echo -e "${GREEN}✓ Sui CLI installed: $(sui --version)${NC}"
else
    echo -e "${RED}✗ Sui CLI not found${NC}"
    echo ""
    echo "Installing Sui CLI..."
    echo ""
    
    # Check if cargo is available
    if command -v cargo &> /dev/null; then
        echo "Installing via Cargo (this may take a few minutes)..."
        cargo install --locked --git https://github.com/MystenLabs/sui.git --branch testnet sui
    elif command -v brew &> /dev/null; then
        echo "Installing via Homebrew..."
        brew install sui
    else
        echo -e "${RED}Error: Neither Cargo nor Homebrew found.${NC}"
        echo ""
        echo "Please install Sui CLI manually:"
        echo "  https://docs.sui.io/guides/developer/getting-started/sui-install"
        exit 1
    fi
    
    echo -e "${GREEN}✓ Sui CLI installed${NC}"
fi

# ============================================================
# Initialize Sui Client
# ============================================================

echo ""
echo -e "${YELLOW}Checking Sui client configuration...${NC}"

# Check if client is configured
if [ -f ~/.sui/sui_config/client.yaml ]; then
    echo -e "${GREEN}✓ Sui client already configured${NC}"
    echo "  Active address: $(sui client active-address 2>/dev/null || echo 'Unknown')"
    echo "  Active network: $(sui client active-env 2>/dev/null || echo 'Unknown')"
else
    echo "Initializing Sui client..."
    echo ""
    echo "You'll be asked to:"
    echo "  1. Select a network (choose 'testnet')"
    echo "  2. Generate a new keypair"
    echo ""
    echo -e "${YELLOW}IMPORTANT: Save your recovery phrase securely!${NC}"
    echo ""
    read -p "Press Enter to continue..."
    
    sui client
fi

# ============================================================
# Check/Switch to Testnet
# ============================================================

echo ""
echo -e "${YELLOW}Configuring testnet...${NC}"

CURRENT_ENV=$(sui client active-env 2>/dev/null || echo "none")

if [ "$CURRENT_ENV" != "testnet" ]; then
    # Check if testnet exists
    if sui client envs 2>/dev/null | grep -q "testnet"; then
        echo "Switching to testnet..."
        sui client switch --env testnet
    else
        echo "Adding testnet configuration..."
        sui client new-env --alias testnet --rpc https://fullnode.testnet.sui.io:443
        sui client switch --env testnet
    fi
fi

echo -e "${GREEN}✓ Connected to testnet${NC}"

# ============================================================
# Get Test Tokens
# ============================================================

echo ""
echo -e "${YELLOW}Checking balance...${NC}"

ACTIVE_ADDRESS=$(sui client active-address)
BALANCE=$(sui client balance 2>&1)

if echo "$BALANCE" | grep -q "No coins found" || echo "$BALANCE" | grep -q "0 SUI"; then
    echo "No SUI tokens found. Requesting from faucet..."
    echo ""
    
    # Try CLI faucet
    if sui client faucet 2>&1 | grep -q "success\|Request successful"; then
        echo -e "${GREEN}✓ Received tokens from faucet${NC}"
    else
        echo -e "${YELLOW}CLI faucet may have rate limits. Try the web faucet:${NC}"
        echo ""
        echo "  1. Go to: https://faucet.sui.io/"
        echo "  2. Select 'Testnet'"
        echo "  3. Paste your address: $ACTIVE_ADDRESS"
        echo "  4. Click 'Request SUI'"
        echo ""
    fi
else
    echo -e "${GREEN}✓ Wallet has SUI tokens${NC}"
fi

# ============================================================
# Build Contracts
# ============================================================

echo ""
echo -e "${YELLOW}Building contracts...${NC}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONTRACT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$CONTRACT_DIR"

if sui move build 2>&1 | grep -q "BUILDING calibr"; then
    echo -e "${GREEN}✓ Contracts built successfully${NC}"
else
    echo -e "${RED}Build failed. Check the error messages above.${NC}"
    exit 1
fi

# ============================================================
# Summary
# ============================================================

echo ""
echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}   Setup Complete!${NC}"
echo -e "${BLUE}============================================${NC}"
echo ""
echo "Your environment:"
echo "  Network:  $(sui client active-env)"
echo "  Address:  $(sui client active-address)"
echo ""
echo "Balance:"
sui client balance
echo ""
echo -e "${GREEN}You're ready to deploy!${NC}"
echo ""
echo "Next steps:"
echo "  1. Run tests:    sui move test"
echo "  2. Deploy:       ./scripts/deploy.sh testnet"
echo ""
