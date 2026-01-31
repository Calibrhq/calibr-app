/**
 * Calibr Protocol - Transaction Builders
 * 
 * Programmable Transaction Block (PTB) builders for contract interactions.
 * Uses @mysten/sui/transactions for Sui SDK v2.x
 */

import { Transaction } from "@mysten/sui/transactions";
import { getPackageId, DEFAULT_NETWORK } from "./sui-config";

// ============================================================
// TRANSACTION BUILDERS
// ============================================================

/**
 * Build a transaction to create a new user profile.
 * 
 * Entry point: reputation::create_profile
 * Args: none (sender from wallet context)
 * 
 * Creates a UserProfile with:
 * - reputation_score = 700 (neutral starting point)
 * - reputation_count = 0
 * - max_confidence = 70 (new tier cap)
 */
export function buildCreateProfileTx(): Transaction {
    const tx = new Transaction();
    const packageId = getPackageId(DEFAULT_NETWORK);

    tx.moveCall({
        target: `${packageId}::reputation::create_profile`,
        arguments: [],
    });

    return tx;
}

/**
 * Build a transaction to place a prediction on a market.
 * 
 * Entry point: prediction::place_prediction
 * Args:
 *   - profile: &UserProfile (object ref, owned by sender)
 *   - market: &mut Market (object ref, shared)
 *   - side: bool (true = YES, false = NO)
 *   - confidence: u64 (50-90, must be <= profile.max_confidence)
 * 
 * Effects:
 *   - Increments market's yes/no risk totals and counts
 *   - Creates new Prediction object transferred to sender
 */
export function buildPlacePredictionTx(
    profileId: string,
    marketId: string,
    side: boolean,
    confidence: number
): Transaction {
    const tx = new Transaction();
    const packageId = getPackageId(DEFAULT_NETWORK);

    tx.moveCall({
        target: `${packageId}::prediction::place_prediction`,
        arguments: [
            tx.object(profileId),     // User's profile
            tx.object(marketId),      // Market (shared object)
            tx.pure.bool(side),       // true = YES, false = NO
            tx.pure.u64(confidence),  // Confidence level
        ],
    });

    return tx;
}

/**
 * Build a transaction to settle a prediction after market resolution.
 * 
 * Entry point: prediction::settle_prediction
 * Args:
 *   - profile: &mut UserProfile (object ref, mutable)
 *   - prediction: &mut Prediction (object ref, mutable)  
 *   - market: &Market (object ref, immutable)
 * 
 * Effects:
 *   - Calculates payout based on Model 1 formula
 *   - Updates user reputation based on Model 2 skill formula
 *   - Marks prediction as settled
 */
export function buildSettlePredictionTx(
    profileId: string,
    predictionId: string,
    marketId: string
): Transaction {
    const tx = new Transaction();
    const packageId = getPackageId(DEFAULT_NETWORK);

    tx.moveCall({
        target: `${packageId}::prediction::settle_prediction`,
        arguments: [
            tx.object(profileId),     // User's profile (mut)
            tx.object(predictionId),  // Prediction to settle (mut)
            tx.object(marketId),      // Market (immutable)
        ],
    });

    return tx;
}

// ============================================================
// ADMIN TRANSACTION BUILDERS
// ============================================================

/**
 * Build a transaction to create a new market.
 * 
 * Entry point: market::create_market
 * Args:
 *   - admin_cap: &AdminCap (object ref)
 *   - question: vector<u8> (UTF-8 encoded question)
 *   - authority: address (usually admin address)
 * 
 * Effects:
 *   - Creates new Market as shared object
 *   - Emits MarketCreated event
 */
export function buildCreateMarketTx(
    adminCapId: string,
    question: string,
    authority: string
): Transaction {
    const tx = new Transaction();
    const packageId = getPackageId(DEFAULT_NETWORK);

    // Convert question string to bytes
    const questionBytes = new TextEncoder().encode(question);

    tx.moveCall({
        target: `${packageId}::market::create_market`,
        arguments: [
            tx.object(adminCapId),
            tx.pure.vector('u8', Array.from(questionBytes)),
            tx.pure.address(authority),
        ],
    });

    return tx;
}

/**
 * Build a transaction to lock a market (prevent new predictions).
 * 
 * Entry point: market::lock_market
 * Args:
 *   - admin_cap: &AdminCap
 *   - market: &mut Market
 */
export function buildLockMarketTx(
    adminCapId: string,
    marketId: string
): Transaction {
    const tx = new Transaction();
    const packageId = getPackageId(DEFAULT_NETWORK);

    tx.moveCall({
        target: `${packageId}::market::lock_market`,
        arguments: [
            tx.object(adminCapId),
            tx.object(marketId),
        ],
    });

    return tx;
}

/**
 * Build a transaction to resolve a market with an outcome.
 * 
 * Entry point: market::resolve_market
 * Args:
 *   - admin_cap: &AdminCap
 *   - market: &mut Market
 *   - outcome: bool (true = YES won, false = NO won)
 */
export function buildResolveMarketTx(
    adminCapId: string,
    marketId: string,
    outcome: boolean
): Transaction {
    const tx = new Transaction();
    const packageId = getPackageId(DEFAULT_NETWORK);

    tx.moveCall({
        target: `${packageId}::market::resolve_market`,
        arguments: [
            tx.object(adminCapId),
            tx.object(marketId),
            tx.pure.bool(outcome),
        ],
    });

    return tx;
}
