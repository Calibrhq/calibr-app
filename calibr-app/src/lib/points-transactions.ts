/**
 * Points Economy Transaction Builders
 * 
 * PTB builders for the Points Economy Layer.
 */

import { Transaction } from "@mysten/sui/transactions";
import { getPackageId, DEFAULT_NETWORK, CONTRACT_IDS } from "./sui-config";

// ============================================================
// POINTS ECONOMY CONSTANTS
// ============================================================

// Default base price: 0.01 SUI per 100 points (in MIST)
export const POINTS_BASE_PRICE_MIST = 10_000_000;

// Points must be purchased in multiples of this
export const POINTS_UNIT = 100;

// 1 SUI = 1,000,000,000 MIST
export const MIST_PER_SUI = 1_000_000_000;

// ============================================================
// SHARED OBJECT IDS
// ============================================================

export const POINTS_ECONOMY_OBJECTS = {
    testnet: {
        treasury: CONTRACT_IDS.testnet.treasuryId,
        marketConfig: CONTRACT_IDS.testnet.pointsMarketConfigId,
        balanceRegistry: CONTRACT_IDS.testnet.balanceRegistryId,
    },
    mainnet: {
        treasury: CONTRACT_IDS.mainnet.treasuryId,
        marketConfig: CONTRACT_IDS.mainnet.pointsMarketConfigId,
        balanceRegistry: CONTRACT_IDS.mainnet.balanceRegistryId,
    },
    devnet: {
        treasury: CONTRACT_IDS.devnet.treasuryId,
        marketConfig: CONTRACT_IDS.devnet.pointsMarketConfigId,
        balanceRegistry: CONTRACT_IDS.devnet.balanceRegistryId,
    },
};

// ============================================================
// PRICE CALCULATION
// ============================================================

/**
 * Calculate approximate cost for purchasing points.
 * 
 * Formula: price_per_100 = base_price × (1 + alpha × total_minted / supply_cap)
 * 
 * For simplicity, this returns base price. For accurate pricing,
 * call the on-chain calculate_price function via devInspect.
 */
export function estimatePointsCost(pointsAmount: number): number {
    // Validate amount is multiple of 100
    if (pointsAmount % POINTS_UNIT !== 0) {
        throw new Error(`Points must be in multiples of ${POINTS_UNIT}`);
    }

    const units = pointsAmount / POINTS_UNIT;
    // Base price estimate (actual price may vary due to bonding curve)
    return units * POINTS_BASE_PRICE_MIST;
}

/**
 * Convert MIST to SUI for display
 */
export function mistToSui(mist: number): number {
    return mist / MIST_PER_SUI;
}

/**
 * Convert SUI to MIST
 */
export function suiToMist(sui: number): number {
    return Math.floor(sui * MIST_PER_SUI);
}

// ============================================================
// TRANSACTION BUILDERS
// ============================================================

/**
 * Build transaction to create a PointsBalance for the user.
 * 
 * Call this FIRST if the user doesn't have a PointsBalance yet.
 * Most users should use buildCreateBalanceAndBuyPointsTx instead.
 */
export function buildCreateBalanceTx(
    balanceRegistryId: string
): Transaction {
    const tx = new Transaction();
    const packageId = getPackageId(DEFAULT_NETWORK);

    tx.moveCall({
        target: `${packageId}::points_market::create_balance`,
        arguments: [
            tx.object(balanceRegistryId),
        ],
    });

    return tx;
}

/**
 * Build transaction to buy points with SUI.
 * 
 * Requires user to already have a PointsBalance.
 * 
 * @param treasuryId - Treasury shared object
 * @param marketConfigId - PointsMarketConfig shared object
 * @param pointsBalanceId - User's existing PointsBalance object
 * @param suiAmountMist - Amount of SUI to spend (in MIST)
 * @param desiredPoints - Points to buy (must be multiple of 100)
 */
export function buildBuyPointsTx(
    treasuryId: string,
    marketConfigId: string,
    pointsBalanceId: string,
    suiAmountMist: number,
    desiredPoints: number
): Transaction {
    const tx = new Transaction();
    const packageId = getPackageId(DEFAULT_NETWORK);

    // Split SUI from gas for payment
    const [payment] = tx.splitCoins(tx.gas, [tx.pure.u64(suiAmountMist)]);

    tx.moveCall({
        target: `${packageId}::points_market::buy_points`,
        arguments: [
            tx.object(marketConfigId),
            tx.object(treasuryId),
            tx.object(pointsBalanceId),
            payment,
            tx.pure.u64(desiredPoints),
        ],
    });

    return tx;
}

/**
 * Build transaction to create PointsBalance AND buy points in one tx.
 * 
 * Use this for first-time buyers who don't have a PointsBalance yet.
 * 
 * @param treasuryId - Treasury shared object
 * @param marketConfigId - PointsMarketConfig shared object
 * @param balanceRegistryId - BalanceRegistry shared object
 * @param suiAmountMist - Amount of SUI to spend (in MIST)
 * @param desiredPoints - Points to buy (must be multiple of 100)
 */
export function buildCreateBalanceAndBuyPointsTx(
    treasuryId: string,
    marketConfigId: string,
    balanceRegistryId: string,
    suiAmountMist: number,
    desiredPoints: number
): Transaction {
    const tx = new Transaction();
    const packageId = getPackageId(DEFAULT_NETWORK);

    // Split SUI from gas for payment
    const [payment] = tx.splitCoins(tx.gas, [tx.pure.u64(suiAmountMist)]);

    tx.moveCall({
        target: `${packageId}::points_market::create_balance_and_buy`,
        arguments: [
            tx.object(marketConfigId),
            tx.object(treasuryId),
            tx.object(balanceRegistryId),
            payment,
            tx.pure.u64(desiredPoints),
        ],
    });

    return tx;
}

/**
 * Build transaction to place a prediction using the Points Economy.
 * 
 * This version deducts 100 points from the user's PointsBalance.
 */
export function buildPlacePredictionWithPointsTx(
    profileId: string,
    marketId: string,
    pointsBalanceId: string,
    side: boolean,
    confidence: number
): Transaction {
    const tx = new Transaction();
    const packageId = getPackageId(DEFAULT_NETWORK);

    tx.moveCall({
        target: `${packageId}::prediction::place_prediction_with_points`,
        arguments: [
            tx.object(profileId),
            tx.object(marketId),
            tx.object(pointsBalanceId),
            tx.pure.bool(side),
            tx.pure.u64(confidence),
        ],
    });

    return tx;
}

/**
 * Build transaction to settle a prediction with Points Economy.
 * 
 * This version credits payout to the user's PointsBalance.
 */
export function buildSettlePredictionWithPointsTx(
    profileId: string,
    predictionId: string,
    marketId: string,
    pointsBalanceId: string
): Transaction {
    const tx = new Transaction();
    const packageId = getPackageId(DEFAULT_NETWORK);

    tx.moveCall({
        target: `${packageId}::prediction::settle_prediction_with_points`,
        arguments: [
            tx.object(profileId),
            tx.object(predictionId),
            tx.object(marketId),
            tx.object(pointsBalanceId),
        ],
    });

    return tx;
}

// ============================================================
// REDEMPTION CONSTANTS & FUNCTIONS
// ============================================================

// Redemption requirements (Relaxed for demo)
export const REDEMPTION_REQUIREMENTS = {
    minReputation: 0,        // Demo: 0, Production: 800 (Proven tier)
    minPredictions: 1,       // Demo: 1, Production: 20
    minEpochsHeld: 0,        // Demo: 0, Production: 4 (~4 weeks)
    maxWeeklyPct: 50,        // 50% of balance per week
    feePct: 5,               // 5% redemption fee
    minRedemption: 100,      // Minimum redeemable
};

/**
 * Calculate estimated SUI payout after 5% fee.
 * 
 * @param pointsAmount - Points to redeem (must be multiple of 100)
 * @returns Estimated net SUI payout in MIST
 */
export function estimateRedemptionPayout(pointsAmount: number): {
    grossMist: number;
    feeMist: number;
    netMist: number;
} {
    if (pointsAmount % POINTS_UNIT !== 0) {
        throw new Error(`Points must be in multiples of ${POINTS_UNIT}`);
    }

    const units = pointsAmount / POINTS_UNIT;
    const grossMist = units * POINTS_BASE_PRICE_MIST;
    const feeMist = Math.floor((grossMist * REDEMPTION_REQUIREMENTS.feePct) / 100);
    const netMist = grossMist - feeMist;

    return { grossMist, feeMist, netMist };
}

/**
 * Build transaction to redeem points for SUI.
 * 
 * Requirements (enforced on-chain):
 * - Reputation >= 800
 * - Predictions >= 20
 * - Epochs held >= 4
 * - Within weekly 10% limit
 * - Amount >= 100 and multiple of 100
 * 
 * @param profileId - User's UserProfile object
 * @param pointsBalanceId - User's PointsBalance object
 * @param treasuryId - Treasury shared object
 * @param marketConfigId - PointsMarketConfig shared object
 * @param amount - Points to redeem (multiple of 100)
 */
export function buildRedeemPointsTx(
    profileId: string,
    pointsBalanceId: string,
    treasuryId: string,
    marketConfigId: string,
    amount: number
): Transaction {
    const tx = new Transaction();
    const packageId = getPackageId(DEFAULT_NETWORK);

    tx.moveCall({
        target: `${packageId}::redemption::redeem_points`,
        arguments: [
            tx.object(profileId),
            tx.object(pointsBalanceId),
            tx.object(treasuryId),
            tx.object(marketConfigId),
            tx.pure.u64(amount),
        ],
    });

    return tx;
}

