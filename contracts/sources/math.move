/// math.move
/// 
/// Pure math functions for Calibr protocol.
/// 
/// Responsibilities:
/// - Risk calculation (Model 1)
/// - Skill calculation (Model 2)
/// - Fixed-point arithmetic helpers
/// - No state, no objects - pure functions only
/// 
/// All math uses fixed-point integers to avoid floating point.
/// Scale factor: 1000 (so 0.75 = 750, 1.0 = 1000)
/// 
/// Model 1 Formula:
/// R = max(5, 100 * (c - 50) / 40)
/// - c = 50 → R = 5 (minimum risk)
/// - c = 70 → R = 50
/// - c = 90 → R = 100 (maximum risk)
/// 
/// Model 2 Formula:
/// skill = 1 - (c - o)²
/// - c = 0.7, o = 1, correct → skill = 1 - (0.7 - 1)² = 1 - 0.09 = 0.91
/// - c = 0.9, o = 0, wrong → skill = 1 - (0.9 - 0)² = 1 - 0.81 = 0.19

module calibr::math {
    // === Constants ===
    
    // SCALE = 1000 (fixed-point scale factor)
    // MIN_RISK = 5
    // MAX_RISK = 100
    // CONFIDENCE_MIN = 50
    // CONFIDENCE_MAX = 90
    // CONFIDENCE_RANGE = 40 (90 - 50)
    
    // === Pure Functions ===
    
    // calculate_risk(confidence: u64) -> u64
    // Returns R = max(5, 100 * (c - 50) / 40)
    
    // calculate_skill(confidence: u64, outcome: bool) -> u64
    // Returns skill score scaled by SCALE
    // skill = SCALE - ((c_scaled - o_scaled)² / SCALE)
    
    // calculate_winnings(risk: u64, total_risk: u64, pool: u64) -> u64
    // Returns winner's share of loser pool
    // share = (risk * pool) / total_risk
    
    // === Helper Functions ===
    
    // min(a: u64, b: u64) -> u64
    // max(a: u64, b: u64) -> u64
    // mul_div(a: u64, b: u64, c: u64) -> u64 (safe multiply then divide)
}
