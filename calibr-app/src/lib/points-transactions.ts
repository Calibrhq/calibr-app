/**
 * Points Economy Transaction Builders
 * 
 * PTB builders for the Points Economy Layer.
 */

import { Transaction } from "@mysten/sui/transactions";
import { getPackageId, DEFAULT_NETWORK } from "./sui-config";

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
// SHARED OBJECT IDS (will be updated after deployment)
// These are placeholder values - update after deploying contracts
// ============================================================

export const POINTS_ECONOMY_OBJECTS = {
    testnet: {
        treasury: "0x9a8afaabb366e3efffba7b5a0565bdf86d224c24b255c129acc3be7ee9febcac", // Treasury shared object ID
        marketConfig: "0xa759101831a5e08e1ab3a8771f6c94dd1d1c9cfb9608a771b6036c0b2928157c", // PointsMarketConfig shared object ID
        balanceRegistry: "0x1aabc8902e78648fd61d1dae77dd3a762a84615ed6fa1f88b1f14b5a1a3ae837", // BalanceRegistry shared object ID
    },
    mainnet: {
        treasury: "",
        marketConfig: "",
        balanceRegistry: "",
    },
    devnet: {
        treasury: "",
        marketConfig: "",
        balanceRegistry: "",
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
