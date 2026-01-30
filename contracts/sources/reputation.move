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
/// WHY CALIBRATION BEATS AGGRESSION
/// ============================================================
/// 
/// In Calibr, being CALIBRATED is more valuable than being AGGRESSIVE.
/// 
/// Consider two users predicting the same market:
/// 
/// AGGRESSIVE USER (spams 90%):
///   - If right: skill = 1 - (0.9 - 1)² = 0.99
///   - If wrong: skill = 1 - (0.9 - 0)² = 0.19
///   - Expected skill at 50% base rate: (0.99 + 0.19) / 2 = 0.59
/// 
/// CALIBRATED USER (honest 60% when uncertain):
///   - If right: skill = 1 - (0.6 - 1)² = 0.84
///   - If wrong: skill = 1 - (0.6 - 0)² = 0.64
///   - Expected skill at 50% base rate: (0.84 + 0.64) / 2 = 0.74
/// 
/// The calibrated user has HIGHER EXPECTED SKILL (0.74 > 0.59)!
/// 
/// Why? The skill formula punishes overconfidence quadratically:
/// - Being 40% off when wrong (0.9 vs 0.0) = penalty of 0.81
/// - Being 40% off when wrong (0.6 vs 0.0) = penalty of 0.36
/// 
/// The penalty for overconfident mistakes DOMINATES the reward for
/// overconfident correct guesses. Over many predictions, honest
/// confidence will always win.
/// 
/// ============================================================
/// WHY REPUTATION COMPOUNDS SLOWLY
/// ============================================================
/// 
/// Reputation uses a ROLLING AVERAGE, not a running total:
/// 
///   new_rep = (old_rep × n + skill) / (n + 1)
/// 
/// Where n = number of predictions already made.
/// 
/// This creates SLOW, STABLE compounding:
/// 
/// 1. EARLY PREDICTIONS MATTER MORE:
///    - Prediction #1: weight = 1/2 = 50%
///    - Prediction #10: weight = 1/11 ≈ 9%
///    - Prediction #100: weight = 1/101 ≈ 1%
/// 
/// 2. PREVENTS MANIPULATION:
///    - Lucky streaks can't create fake "oracles"
///    - Unlucky streaks can't destroy earned reputation
///    - True calibration emerges over time
/// 
/// 3. REWARDS CONSISTENCY:
///    - One bad prediction doesn't ruin you (after many good ones)
///    - One good prediction doesn't save you (after many bad ones)
///    - Your reputation converges to your TRUE calibration ability
/// 
/// Example trajectory:
///   Start: rep=700, n=0
///   After skill=800: rep = (700×0 + 800) / 1 = 800, n=1
///   After skill=900: rep = (800×1 + 900) / 2 = 850, n=2
///   After skill=600: rep = (850×2 + 600) / 3 = 766, n=3
///   After skill=700: rep = (766×3 + 700) / 4 = 750, n=4
///   After skill=850: rep = (750×4 + 850) / 5 = 770, n=5
/// 
/// Notice how:
/// - Early swings are large (800 → 850 → 766)
/// - Later swings are smaller (750 → 770)
/// - The score stabilizes toward true performance
/// 
/// ============================================================
/// PREVENTING EARLY OVERCONFIDENCE ABUSE
/// ============================================================
/// 
/// The key protection is the SEPARATION of reputation_score and max_confidence:
/// 
/// 1. NEW USER STATE:
///    - reputation_score = 700 (neutral starting point)
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
/// 3. TIER PROGRESSION:
///    - <700: New tier → max 70%
///    - 700-850: Proven tier → max 80%
///    - >850: Elite tier → max 90%
/// 
/// To reach Elite (90% confidence):
///    - Starting at 700, you need sustained skill > 850
///    - This means consistently correct high-confidence predictions
///    - OR very well-calibrated moderate-confidence predictions
///    - Random guessing will NEVER get you there

module calibr::reputation {
    use sui::tx_context::{Self, TxContext};
    use sui::transfer;
    use calibr::calibr::{Self, UserProfile};
    use calibr::math;
    use calibr::events;

    // ============================================================
    // CONSTANTS
    // ============================================================
    
    /// Starting reputation score for new users (700 = 70% calibration assumed)
    /// This places new users at the boundary between "New" and "Proven" tiers.
    /// They start with benefit of the doubt, but must prove themselves.
    const STARTING_REPUTATION: u64 = 700;
    
    /// Starting prediction count (no history yet)
    const STARTING_COUNT: u64 = 0;
    
    /// Starting max confidence (New tier cap)
    /// This is the KEY protection against early overconfidence abuse.
    /// Even though starting reputation is 700, new users get 70% cap
    /// until they build a track record.
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
    /// - max_confidence = 70 (new tier cap to prevent abuse)
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
            STARTING_MAX_CONFIDENCE,   // 70 - new tier cap (abuse prevention)
            ctx
        );
        
        // Get profile ID for event (before transfer)
        let profile_id = calibr::get_profile_id(&profile);
        
        // Emit event for indexing
        events::emit_profile_created(
            sender,
            profile_id,
            STARTING_REPUTATION,
            STARTING_MAX_CONFIDENCE,
        );
        
        // Transfer to sender - they now own this profile
        transfer::public_transfer(profile, sender);
    }

    // ============================================================
    // REPUTATION UPDATES
    // ============================================================

    /// Update user's reputation after a prediction settles.
    /// 
    /// This function implements the CORE of Model 2:
    /// 
    /// Step 1: Compute skill via math.move
    ///   skill = 1 - (c - o)² where c = confidence, o = outcome (0 or 1)
    ///   Scaled to 0-1000 (e.g., 0.84 → 840)
    /// 
    /// Step 2: Update rolling average
    ///   new_rep = (old_rep × n + skill) / (n + 1)
    ///   Where n = current reputation_count (predictions so far)
    /// 
    /// Step 3: Increment reputation_count
    ///   n → n + 1
    /// 
    /// Step 4: Update max_confidence based on new tier
    ///   - score < 700 → max 70 (New)
    ///   - 700 ≤ score ≤ 850 → max 80 (Proven)
    ///   - score > 850 → max 90 (Elite)
    /// 
    /// Parameters:
    /// - profile: User's profile (must be owned by sender)
    /// - confidence: The confidence level of the settled prediction (50-90)
    /// - was_correct: Whether the prediction was correct
    /// 
    /// ============================================================
    /// ROLLING AVERAGE FORMULA EXPLAINED
    /// ============================================================
    /// 
    /// Formula: new_rep = (old_rep × n + skill) / (n + 1)
    /// 
    /// This is the standard incremental mean formula:
    /// - n = number of data points already in the average
    /// - old_rep = current average (of n points)
    /// - skill = new data point
    /// - new_rep = new average (of n+1 points)
    /// 
    /// Special case when n=0 (first prediction):
    /// - new_rep = (old_rep × 0 + skill) / 1 = skill
    /// - The first skill score BECOMES the new reputation
    /// - This gives maximum weight to the first real data point
    /// 
    /// Example trace:
    ///   Start: rep=700, n=0
    ///   Predict 80% correct → skill = 1 - (0.8-1)² = 0.96 → 960
    ///   new_rep = (700×0 + 960) / 1 = 960, n=1
    ///   
    ///   Predict 70% wrong → skill = 1 - (0.7-0)² = 0.51 → 510
    ///   new_rep = (960×1 + 510) / 2 = 735, n=2
    ///   
    ///   Predict 60% correct → skill = 1 - (0.6-1)² = 0.84 → 840
    ///   new_rep = (735×2 + 840) / 3 = 770, n=3
    /// 
    public entry fun update_after_settlement(
        profile: &mut UserProfile,
        confidence: u64,
        was_correct: bool,
        ctx: &TxContext
    ) {
        // Verify caller owns this profile
        let user = tx_context::sender(ctx);
        assert!(calibr::get_profile_owner(profile) == user, ENotProfileOwner);
        
        // ============================================================
        // STEP 1: CAPTURE PRE-UPDATE STATE FOR EVENTS
        // ============================================================
        let old_score = calibr::get_reputation_score(profile);
        let old_max_confidence = calibr::get_max_confidence(profile);
        let n = calibr::get_reputation_count(profile);
        
        // ============================================================
        // STEP 2: COMPUTE SKILL (Model 2)
        // ============================================================
        // 
        // skill = 1 - (c - o)² where:
        // - c = confidence as decimal [0.5, 0.9]
        // - o = 1 if correct, 0 if wrong
        // 
        // Returns scaled 0-1000 (e.g., 0.84 → 840)
        //
        let skill_score = math::skill(confidence, was_correct);
        
        // ============================================================
        // STEP 3: UPDATE ROLLING AVERAGE
        // ============================================================
        // 
        // Formula: new_rep = (old_rep × n + skill) / (n + 1)
        // 
        // This is the incremental mean formula that ensures:
        // - Each prediction has equal weight in the final average
        // - Early predictions have high initial impact
        // - Impact diminishes as more predictions accumulate
        //
        // Calculate new reputation score
        // Note: When n=0, this gives: (old_score × 0 + skill) / 1 = skill
        // This means the first prediction's skill becomes the new reputation
        let weighted_old = old_score * n;
        let total = weighted_old + skill_score;
        let new_score = total / (n + 1);
        
        // ============================================================
        // STEP 4: INCREMENT REPUTATION COUNT
        // ============================================================
        // 
        // This must happen AFTER calculating new_score (uses old n)
        // The count represents how many predictions contributed to the average
        //
        calibr::set_reputation_score(profile, new_score);
        calibr::increment_reputation_count(profile);
        
        // ============================================================
        // STEP 5: UPDATE MAX CONFIDENCE TIER
        // ============================================================
        // 
        // Tier thresholds:
        // - score < 700 → New tier → max 70%
        // - 700 ≤ score ≤ 850 → Proven tier → max 80%
        // - score > 850 → Elite tier → max 90%
        // 
        // This recalculation ensures confidence caps stay in sync
        // with reputation. As users improve, they unlock higher caps.
        // As users decline, they lose access to high confidence.
        //
        let new_max_confidence = calibr::calculate_max_confidence(new_score);
        calibr::set_max_confidence(profile, new_max_confidence);
        
        // ============================================================
        // STEP 6: EMIT EVENTS
        // ============================================================
        // Events enable off-chain indexing and auditing.
        
        // Emit ReputationUpdated event
        events::emit_reputation_updated(
            user,
            old_score,
            new_score,
            skill_score,
            n,
            confidence,
            was_correct,
        );
        
        // Emit ConfidenceCapChanged event (only if cap actually changed)
        events::emit_confidence_cap_changed(
            user,
            old_max_confidence,
            new_max_confidence,
            new_score,
        );
    }

    // ============================================================
    // INTERNAL HELPER: Used by prediction.move
    // ============================================================

    /// Internal function to update reputation without ownership check.
    /// 
    /// This is called by prediction.move during settle_prediction,
    /// where the prediction owner (not necessarily the caller) owns the profile.
    /// The caller validation happens in settle_prediction.
    /// 
    /// Parameters:
    /// - profile: User's profile (ownership validated by caller)
    /// - confidence: The confidence level (50-90)
    /// - was_correct: Whether the prediction was correct
    public(package) fun update_reputation_internal(
        profile: &mut UserProfile,
        confidence: u64,
        was_correct: bool
    ) {
        // Step 1: Compute skill
        let skill_score = math::skill(confidence, was_correct);
        
        // Step 2: Get current values
        let old_score = calibr::get_reputation_score(profile);
        let n = calibr::get_reputation_count(profile);
        
        // Step 3: Calculate new reputation (rolling average)
        let weighted_old = old_score * n;
        let total = weighted_old + skill_score;
        let new_score = total / (n + 1);
        
        // Step 4: Update profile
        calibr::set_reputation_score(profile, new_score);
        calibr::increment_reputation_count(profile);
        
        // Step 5: Update max confidence tier
        let new_max_confidence = calibr::calculate_max_confidence(new_score);
        calibr::set_max_confidence(profile, new_max_confidence);
    }

    // ============================================================
    // VIEW FUNCTIONS
    // ============================================================

    /// Get the reputation tier for a profile.
    /// Returns: 0 = New, 1 = Proven, 2 = Elite
    public fun get_tier(profile: &UserProfile): u8 {
        let score = calibr::get_reputation_score(profile);
        
        if (score > calibr::tier_proven_max()) {
            2 // Elite (score > 850)
        } else if (score > calibr::tier_new_max()) {
            1 // Proven (700 ≤ score ≤ 850)
        } else {
            0 // New (score < 700)
        }
    }

    /// Get the tier name as a string (for display purposes).
    /// Returns bytes representing: "New", "Proven", or "Elite"
    public fun get_tier_name(profile: &UserProfile): vector<u8> {
        let tier = get_tier(profile);
        
        if (tier == 2) {
            b"Elite"
        } else if (tier == 1) {
            b"Proven"
        } else {
            b"New"
        }
    }

    /// Check if a confidence level is allowed for this user.
    public fun is_confidence_allowed(profile: &UserProfile, confidence: u64): bool {
        confidence >= math::min_confidence() && 
        confidence <= calibr::get_max_confidence(profile)
    }

    /// Calculate what the new reputation would be given a skill score.
    /// This is useful for UI to show "what if" scenarios.
    public fun preview_reputation_update(
        profile: &UserProfile,
        skill_score: u64
    ): u64 {
        let old_score = calibr::get_reputation_score(profile);
        let n = calibr::get_reputation_count(profile);
        
        let weighted_old = old_score * n;
        let total = weighted_old + skill_score;
        total / (n + 1)
    }

    // ============================================================
    // GETTER FUNCTIONS FOR CONSTANTS
    // ============================================================
    
    public fun starting_reputation(): u64 { STARTING_REPUTATION }
    public fun starting_count(): u64 { STARTING_COUNT }
    public fun starting_max_confidence(): u64 { STARTING_MAX_CONFIDENCE }
}
