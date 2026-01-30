/// reputation.move
/// 
/// Model 2: Reputation and calibration tracking.
/// 
/// Responsibilities:
/// - Create and manage user reputation objects (owned)
/// - Calculate skill score after each resolved prediction
/// - Maintain rolling average of skill scores
/// - Determine max confidence cap based on reputation
/// - Track prediction history for calibration analysis
/// 
/// Reputation objects are OWNED - each user has exactly one.
/// Reputation persists across all markets and cannot be transferred.
/// 
/// Model 2 (Reputation):
/// - skill = 1 - (c - o)² 
///   where c = confidence (as decimal 0.5-0.9), o = outcome (0 or 1)
/// - reputation = rolling average of skill scores
/// - Higher reputation unlocks higher max confidence
/// 
/// Confidence caps by reputation tier:
/// - Novice (0-500): max 70%
/// - Calibrated (500-750): max 80%
/// - Expert (750-900): max 85%
/// - Oracle (900+): max 90%

module calibr::reputation {
    // === Constants ===
    
    // Reputation thresholds
    // TIER_NOVICE_MAX = 500
    // TIER_CALIBRATED_MAX = 750
    // TIER_EXPERT_MAX = 900
    
    // Confidence caps per tier
    // CAP_NOVICE = 70
    // CAP_CALIBRATED = 80
    // CAP_EXPERT = 85
    // CAP_ORACLE = 90
    
    // === Errors ===
    
    // EReputationAlreadyExists
    // EReputationNotFound
    
    // === Structs ===
    
    // Reputation - owned object for user calibration data
    //   - score: u64 (scaled, e.g., 0-1000)
    //   - total_predictions: u64
    //   - skill_sum: u64 (for rolling average)
    //   - created_at: u64
    
    // === Public Functions ===
    
    // create_reputation - one-time creation for new users
    // update_reputation - called after prediction settlement
    // get_max_confidence - returns confidence cap based on score
    
    // === View Functions ===
    
    // get_reputation_score
    // get_tier
    // get_prediction_count
}
