/// math.move
/// 
/// Pure math functions for Calibr protocol.
/// 
/// NO STATE. NO OBJECTS. PURE FUNCTIONS ONLY.
/// 
/// All calculations use integer arithmetic with defined scale factors.
/// These functions are deterministic and can be tested independently.

module calibr::math {
    // ============================================================
    // CONSTANTS
    // ============================================================
    
    /// Minimum confidence level (50%)
    const MIN_CONFIDENCE: u64 = 50;
    
    /// Maximum confidence level (90%)
    const MAX_CONFIDENCE: u64 = 90;
    
    /// Minimum risk value (floor)
    const MIN_RISK: u64 = 5;
    
    /// Maximum risk value (at 90% confidence)
    const MAX_RISK: u64 = 100;
    
    /// Confidence range for risk calculation (90 - 50 = 40)
    const CONFIDENCE_RANGE: u64 = 40;
    
    /// Scale factor for skill calculation (represents 1.0)
    const SKILL_SCALE: u64 = 1000;
    
    /// Scale factor for intermediate calculations (100² = 10000)
    const INTERMEDIATE_SCALE: u64 = 10000;
    
    /// Outcome value when prediction is correct (1.0 * 100)
    const OUTCOME_CORRECT: u64 = 100;
    
    /// Outcome value when prediction is wrong (0.0 * 100)
    const OUTCOME_WRONG: u64 = 0;

    // ============================================================
    // ERRORS
    // ============================================================
    
    /// Confidence is below minimum (50)
    const EConfidenceTooLow: u64 = 100;
    
    /// Confidence is above maximum (90)
    const EConfidenceTooHigh: u64 = 101;

    // ============================================================
    // MODEL 1: RISK CALCULATION
    // ============================================================

    /// Calculate risk (R) from confidence level.
    /// 
    /// Formula: R = max(5, 100 * (confidence - 50) / 40)
    /// 
    /// The risk value determines:
    /// - How much the user stands to lose if wrong
    /// - Their share of the winner pool if correct
    /// 
    /// Examples:
    /// - confidence = 50 → R = max(5, 100 * 0 / 40) = max(5, 0) = 5
    /// - confidence = 60 → R = max(5, 100 * 10 / 40) = max(5, 25) = 25
    /// - confidence = 70 → R = max(5, 100 * 20 / 40) = max(5, 50) = 50
    /// - confidence = 80 → R = max(5, 100 * 30 / 40) = max(5, 75) = 75
    /// - confidence = 90 → R = max(5, 100 * 40 / 40) = max(5, 100) = 100
    /// 
    /// Aborts if confidence is not in range [50, 90].
    public fun risk_from_confidence(confidence: u64): u64 {
        // Validate confidence range
        assert!(confidence >= MIN_CONFIDENCE, EConfidenceTooLow);
        assert!(confidence <= MAX_CONFIDENCE, EConfidenceTooHigh);
        
        // R = 100 * (confidence - 50) / 40
        let numerator = MAX_RISK * (confidence - MIN_CONFIDENCE);
        let calculated_risk = numerator / CONFIDENCE_RANGE;
        
        // Return max(5, calculated_risk)
        if (calculated_risk > MIN_RISK) {
            calculated_risk
        } else {
            MIN_RISK
        }
    }

    // ============================================================
    // MODEL 2: SKILL CALCULATION
    // ============================================================

    /// Calculate skill score from confidence and outcome.
    /// 
    /// Formula: skill = 1 - (c - o)²
    /// Where:
    /// - c = confidence as decimal [0.5, 0.9]
    /// - o = 1 if prediction was correct, 0 if wrong
    /// 
    /// Returns skill scaled to 0-1000 (where 1000 = perfect calibration).
    /// 
    /// The skill formula rewards CALIBRATION, not just being right:
    /// - High confidence + correct = high skill (you knew you knew)
    /// - High confidence + wrong = low skill (overconfident)
    /// - Low confidence + correct = medium skill (underconfident)
    /// - Low confidence + wrong = medium skill (appropriately uncertain)
    /// 
    /// ============================================================
    /// EXAMPLES:
    /// ============================================================
    /// 
    /// Example 1: 90% confidence, CORRECT
    /// - c = 0.90, o = 1.0
    /// - skill = 1 - (0.90 - 1.0)² = 1 - (-0.10)² = 1 - 0.01 = 0.99
    /// - scaled: 990
    /// - Interpretation: Excellent! High confidence was justified.
    /// 
    /// Example 2: 90% confidence, WRONG
    /// - c = 0.90, o = 0.0
    /// - skill = 1 - (0.90 - 0.0)² = 1 - 0.81 = 0.19
    /// - scaled: 190
    /// - Interpretation: Severe penalty for overconfidence.
    /// 
    /// Example 3: 55% confidence, CORRECT
    /// - c = 0.55, o = 1.0
    /// - skill = 1 - (0.55 - 1.0)² = 1 - (-0.45)² = 1 - 0.2025 = 0.7975
    /// - scaled: 797
    /// - Interpretation: Good outcome, but underconfident. Room to improve.
    /// 
    /// Example 4: 55% confidence, WRONG
    /// - c = 0.55, o = 0.0
    /// - skill = 1 - (0.55 - 0.0)² = 1 - 0.3025 = 0.6975
    /// - scaled: 697
    /// - Interpretation: Wrong, but appropriate uncertainty. Modest penalty.
    /// 
    /// Example 5: 70% confidence, CORRECT
    /// - c = 0.70, o = 1.0
    /// - skill = 1 - (0.70 - 1.0)² = 1 - 0.09 = 0.91
    /// - scaled: 910
    /// - Interpretation: Well calibrated prediction.
    /// 
    public fun skill(confidence: u64, outcome: bool): u64 {
        // Validate confidence range
        assert!(confidence >= MIN_CONFIDENCE, EConfidenceTooLow);
        assert!(confidence <= MAX_CONFIDENCE, EConfidenceTooHigh);
        
        // Convert outcome to scaled value (100 = 1.0, 0 = 0.0)
        let o_scaled = if (outcome) { OUTCOME_CORRECT } else { OUTCOME_WRONG };
        
        // confidence is already in range [50, 90], representing [0.50, 0.90]
        // We use it directly since it's already scaled by 100
        let c_scaled = confidence;
        
        // Calculate |c - o| (absolute difference)
        // c_scaled is in [50, 90], o_scaled is 0 or 100
        let diff = if (c_scaled >= o_scaled) {
            c_scaled - o_scaled
        } else {
            o_scaled - c_scaled
        };
        
        // Calculate diff² 
        // Max diff is 90 (when c=90, o=0), so max diff² = 8100
        let diff_squared = diff * diff;
        
        // skill = 1 - (diff/100)² = 1 - diff²/10000
        // Scaled: skill_raw = 10000 - diff²
        // Then convert to 0-1000 scale: skill = skill_raw / 10
        let skill_raw = INTERMEDIATE_SCALE - diff_squared;
        
        // Scale down to 0-1000 range
        skill_raw / 10
    }

    // ============================================================
    // HELPER FUNCTIONS
    // ============================================================

    /// Return the maximum of two u64 values.
    public fun max(a: u64, b: u64): u64 {
        if (a >= b) { a } else { b }
    }

    /// Return the minimum of two u64 values.
    public fun min(a: u64, b: u64): u64 {
        if (a <= b) { a } else { b }
    }

    /// Safe multiply then divide to avoid overflow.
    /// Calculates (a * b) / c with intermediate u128 to prevent overflow.
    public fun mul_div(a: u64, b: u64, c: u64): u64 {
        let result = ((a as u128) * (b as u128)) / (c as u128);
        (result as u64)
    }

    // ============================================================
    // GETTER FUNCTIONS FOR CONSTANTS
    // ============================================================

    public fun min_confidence(): u64 { MIN_CONFIDENCE }
    public fun max_confidence(): u64 { MAX_CONFIDENCE }
    public fun min_risk(): u64 { MIN_RISK }
    public fun max_risk(): u64 { MAX_RISK }
    public fun skill_scale(): u64 { SKILL_SCALE }
}
