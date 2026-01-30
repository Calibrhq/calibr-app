/// reputation.move
/// 
/// Model 2: Reputation and calibration tracking.
/// 
/// This module handles:
/// - Creating new user profiles with neutral starting reputation
/// - Updating reputation after predictions settle
/// - Calculating and updating max confidence caps
/// 
/// ============================================================
/// WHY NEUTRAL STARTING POINT MATTERS (reputation_score = 700)
/// ============================================================
/// 
/// Starting at 700 (70% on 0-1000 scale) is intentionally "neutral":
/// 
/// 1. NOT TOO HIGH (prevents abuse):
///    - If we started at 900+, new users could immediately access 90% confidence
///    - This would allow Sybil attacks: create account → bet 90% → get lucky → profit
///    - Starting lower forces users to EARN high confidence caps
/// 
/// 2. NOT TOO LOW (fair to new users):
///    - If we started at 0 or 300, new users would be heavily penalized
///    - Their first wrong prediction would crater their score
///    - This discourages participation
/// 
/// 3. 700 IS "BENEFIT OF THE DOUBT":
///    - We assume new users are ~70% calibrated (reasonable for humans)
///    - This matches the DEFAULT_MAX_CONFIDENCE of 70%
///    - First few predictions will reveal their true calibration
/// 
/// ============================================================
/// HOW THIS PREVENTS EARLY OVERCONFIDENCE ABUSE
/// ============================================================
/// 
/// The key protection is the SEPARATION of reputation_score and max_confidence:
/// 
/// 1. NEW USER STATE:
///    - reputation_score = 700 (decent assumed calibration)
///    - max_confidence = 70 (hard cap regardless of score)
///    - reputation_count = 0 (no track record)
/// 
/// 2. ABUSE SCENARIO BLOCKED:
///    - Attacker creates new account
///    - Wants to bet 90% on something they're "sure" about
///    - BLOCKED: max_confidence = 70, can only bet up to 70%
///    - Even if they're right, they only get 70% confidence rewards
///    - They must make MANY well-calibrated predictions to unlock 90%
/// 
/// 3. EARNING TRUST:
///    - After N predictions, reputation_score reflects TRUE calibration
///    - max_confidence is recalculated based on reputation tier
///    - Well-calibrated users gradually unlock higher caps
///    - Overconfident users get locked at lower caps
/// 
/// 4. ROLLING AVERAGE SMOOTHING:
///    - new_score = (old_score * count + skill) / (count + 1)
///    - Early predictions have high impact (count is small)
///    - Later predictions have diminishing impact (count is large)
///    - This prevents both lucky streaks AND unlucky streaks from dominating

module calibr::reputation {
    use sui::tx_context::{Self, TxContext};
    use sui::transfer;
    use calibr::calibr::{Self, UserProfile};
    use calibr::math;

    // ============================================================
    // CONSTANTS
    // ============================================================
    
    /// Starting reputation score for new users (700 = 70% calibration assumed)
    /// This is a neutral starting point - neither punishing nor rewarding
    const STARTING_REPUTATION: u64 = 700;
    
    /// Starting prediction count (no history yet)
    const STARTING_COUNT: u64 = 0;
    
    /// Starting max confidence (Novice cap, regardless of reputation_score)
    /// This is the KEY protection against early overconfidence abuse
    const STARTING_MAX_CONFIDENCE: u64 = 70;

    // ============================================================
    // ERRORS
    // ============================================================
    
    /// Profile owner doesn't match transaction sender
    const ENotProfileOwner: u64 = 200;

    // ============================================================
    // PROFILE CREATION
    // ============================================================

    /// Create a new UserProfile for the transaction sender.
    /// 
    /// This is a ONE-TIME operation per user. The profile is transferred
    /// to the sender and becomes an owned object they must provide
    /// when placing predictions.
    /// 
    /// Initial values:
    /// - reputation_score = 700 (neutral starting point)
    /// - reputation_count = 0 (no predictions yet)
    /// - max_confidence = 70 (novice cap to prevent abuse)
    /// 
    /// Note: In Sui, we cannot prevent a user from calling this multiple times
    /// and creating multiple profiles. However:
    /// - Each profile tracks reputation independently
    /// - Users must explicitly provide a profile when predicting
    /// - There's no benefit to having multiple low-reputation profiles
    /// - The "one profile per user" is enforced socially/by frontend
    public entry fun create_profile(ctx: &mut TxContext) {
        let sender = tx_context::sender(ctx);
        
        // Create profile with neutral starting values
        let profile = calibr::new_user_profile(
            sender,                    // owner
            STARTING_REPUTATION,       // 700 - neutral calibration assumed
            STARTING_COUNT,            // 0 - no predictions yet
            STARTING_MAX_CONFIDENCE,   // 70 - novice cap (abuse prevention)
            ctx
        );
        
        // Transfer to sender - they now own this profile
        transfer::public_transfer(profile, sender);
    }

    // ============================================================
    // REPUTATION UPDATES
    // ============================================================

    /// Update user's reputation after a prediction settles.
    /// 
    /// This function:
    /// 1. Calculates skill score using Model 2 formula
    /// 2. Updates reputation as rolling average
    /// 3. Recalculates max_confidence based on new reputation tier
    /// 
    /// Parameters:
    /// - profile: User's profile (must be owned by sender)
    /// - confidence: The confidence level of the settled prediction (50-90)
    /// - was_correct: Whether the prediction was correct
    /// 
    /// Rolling average formula:
    /// new_score = (old_score * count + skill) / (count + 1)
    /// 
    /// This ensures:
    /// - Early predictions have high impact (establishing baseline)
    /// - Later predictions smooth out (preventing manipulation)
    public entry fun update_after_settlement(
        profile: &mut UserProfile,
        confidence: u64,
        was_correct: bool,
        ctx: &TxContext
    ) {
        // Verify caller owns this profile
        assert!(calibr::get_profile_owner(profile) == tx_context::sender(ctx), ENotProfileOwner);
        
        // Calculate skill score using Model 2
        // skill = 1 - (c - o)² scaled to 0-1000
        let skill_score = math::skill(confidence, was_correct);
        
        // Get current values
        let old_score = calibr::get_reputation_score(profile);
        let old_count = calibr::get_reputation_count(profile);
        
        // Calculate new reputation as rolling average
        // 
        // KEY INSIGHT: STARTING_REPUTATION (700) counts as "sample 0"
        // This means the effective sample count is always (prediction_count + 1)
        //
        // Formula: new_score = (old_score * effective_count + skill) / (effective_count + 1)
        //
        // Example trace with skills [800, 900, 600]:
        //   Start: score=700, count=0 (700 is sample 0)
        //   After 800: (700*1 + 800) / 2 = 750, count=1
        //   After 900: (750*2 + 900) / 3 = 800, count=2  
        //   After 600: (800*3 + 600) / 4 = 750, count=3
        //   Verify: avg(700,800,900,600) = 3000/4 = 750 ✓
        //
        let new_score = if (old_count == 0) {
            // First prediction: blend starting reputation with skill
            // effective_count = 1 (just the starting rep), so divide by 2
            (STARTING_REPUTATION + skill_score) / 2
        } else {
            // Subsequent predictions: proper rolling average
            // effective_count = old_count + 1 (because starting rep counts as 1)
            let effective_count = old_count + 1;
            let weighted_old = old_score * effective_count;
            let total = weighted_old + skill_score;
            total / (effective_count + 1)
        };
        
        // Update profile
        calibr::set_reputation_score(profile, new_score);
        calibr::increment_reputation_count(profile);
        
        // Recalculate max confidence based on new reputation tier
        let new_max_confidence = calibr::calculate_max_confidence(new_score);
        calibr::set_max_confidence(profile, new_max_confidence);
    }

    // ============================================================
    // VIEW FUNCTIONS
    // ============================================================

    /// Get the reputation tier name for display purposes.
    /// Returns a u8 representing the tier:
    /// 0 = Novice, 1 = Calibrated, 2 = Expert, 3 = Oracle
    public fun get_tier(profile: &UserProfile): u8 {
        let score = calibr::get_reputation_score(profile);
        
        if (score >= calibr::tier_expert_max()) {
            3 // Oracle
        } else if (score >= calibr::tier_calibrated_max()) {
            2 // Expert
        } else if (score >= calibr::tier_novice_max()) {
            1 // Calibrated
        } else {
            0 // Novice
        }
    }

    /// Check if a confidence level is allowed for this user.
    public fun is_confidence_allowed(profile: &UserProfile, confidence: u64): bool {
        confidence >= math::min_confidence() && 
        confidence <= calibr::get_max_confidence(profile)
    }

    // ============================================================
    // GETTER FUNCTIONS FOR CONSTANTS
    // ============================================================
    
    public fun starting_reputation(): u64 { STARTING_REPUTATION }
    public fun starting_count(): u64 { STARTING_COUNT }
    public fun starting_max_confidence(): u64 { STARTING_MAX_CONFIDENCE }
}
