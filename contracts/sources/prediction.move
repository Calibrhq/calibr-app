/// prediction.move
/// 
/// Prediction placement and settlement.
/// 
/// Responsibilities:
/// - Create prediction objects (owned by user)
/// - Validate confidence range [50, 90] capped by user reputation
/// - Calculate and lock stake using Model 1 math
/// - Store prediction data (market_id, side, confidence, stake, risk)
/// - Settlement: distribute winnings from loser pool to winners proportional to R
/// 
/// Predictions are OWNED objects - each user owns their prediction receipts.
/// Settlement is atomic via PTB when market resolves.
/// 
/// Model 1 (Money):
/// - S = 100 (fixed stake in protocol units)
/// - R = max(5, 100 * (c - 50) / 40)
/// - Losers fund the pool
/// - Winners split pool proportional to their R

module calibr::prediction {
    // === Constants ===
    
    // FIXED_STAKE = 100
    // MIN_CONFIDENCE = 50
    // MAX_CONFIDENCE = 90
    
    // === Errors ===
    
    // EInvalidConfidence
    // EMarketNotOpen
    // EMarketNotResolved
    // EAlreadySettled
    
    // === Structs ===
    
    // Prediction - owned object representing a user's prediction
    //   - market_id: ID
    //   - side: bool (true = YES, false = NO)
    //   - confidence: u64 (50-90, capped by reputation)
    //   - stake: u64 (always 100)
    //   - risk: u64 (calculated R value)
    //   - settled: bool
    
    // === Public Functions ===
    
    // place_prediction - creates prediction, transfers stake
    // settle_prediction - called after market resolution, distributes winnings
    
    // === Internal Functions ===
    
    // validate_confidence
    // calculate_winnings
}
