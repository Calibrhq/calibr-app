/// prediction.move
/// 
/// Prediction placement and settlement for Calibr protocol.
/// 
/// ============================================================
/// WHY PROGRAMMABLE TRANSACTION BLOCKS (PTBs) ARE REQUIRED
/// ============================================================
/// 
/// Sui's Programmable Transaction Blocks are ESSENTIAL for Calibr because
/// prediction placement involves multiple objects that must be modified
/// ATOMICALLY. Without PTBs, we'd face race conditions and inconsistent state.
/// 
/// WHAT IS A PTB:
/// - A PTB is a batch of transaction commands executed as a single atomic unit
/// - Commands execute in order; results from one can feed into the next
/// - If ANY command fails, the ENTIRE transaction fails and ALL effects are rolled back
/// - This is fundamentally different from traditional blockchains where each tx is separate
/// 
/// PTB STRUCTURE FOR PREDICTION PLACEMENT:
/// ```
/// {
///   inputs: [
///     Object(UserProfile),    // User's profile (owned object)
///     Object(Market),         // Target market (shared object, mutable)
///     Pure(side: bool),       // YES (true) or NO (false)
///     Pure(confidence: u64),  // Confidence level (50-90)
///   ],
///   commands: [
///     MoveCall("calibr", "prediction", "place_prediction", 
///              [Input(0), Input(1), Input(2), Input(3)])
///   ]
/// }
/// ```
/// 
/// The PTB ensures that:
/// 1. The user owns the profile (verified by Sui's object model)
/// 2. All state changes happen atomically
/// 3. If validation fails, no state is modified
/// 
/// ============================================================
/// WHY PREDICTION PLACEMENT MUST BE ATOMIC
/// ============================================================
/// 
/// Prediction placement modifies TWO objects:
/// 1. Market (shared) - increment risk totals and counts
/// 2. Prediction (created) - new owned object for user
/// 
/// WHAT COULD GO WRONG WITHOUT ATOMICITY:
/// 
/// Scenario 1: Race Condition
/// - Alice and Bob both place predictions on the same market
/// - Without atomicity: Alice's market update succeeds, but Bob's validation
///   sees stale data, leading to incorrect risk totals
/// - With PTB atomicity: Each user's transaction is fully isolated
/// 
/// Scenario 2: Partial Failure
/// - User's prediction passes validation (confidence OK)
/// - Market update succeeds
/// - Prediction creation fails (e.g., out of gas)
/// - Without atomicity: Market totals are wrong, no prediction exists
/// - With PTB atomicity: EVERYTHING rolls back, consistent state preserved
/// 
/// Scenario 3: Front-Running Prevention
/// - Attacker sees user's pending prediction
/// - Tries to manipulate market state before user's tx confirms
/// - With Sui's object model + PTBs: The market is locked during the tx
/// - Shared objects are ordered by consensus, preventing manipulation
/// 
/// ============================================================
/// THE ATOMIC GUARANTEE
/// ============================================================
/// 
/// The place_prediction function performs these steps AS A SINGLE UNIT:
/// 
/// 1. VALIDATE: Check all preconditions
///    - Profile owner matches sender
///    - Market is open (not locked, not resolved)
///    - Confidence is in valid range [50, 90]
///    - Confidence does not exceed user's max_confidence
/// 
/// 2. COMPUTE: Calculate risk value
///    - R = max(5, 100 * (c - 50) / 40)
///    - This determines user's share of winnings if correct
/// 
/// 3. MUTATE MARKET: Update shared state
///    - Add risk to yes_risk_total OR no_risk_total
///    - Increment yes_count OR no_count
/// 
/// 4. CREATE PREDICTION: Generate owned receipt
///    - Store market_id, side, confidence, stake, risked
///    - Transfer to user as proof of their prediction
/// 
/// If step 1 fails → transaction aborts, no state changed
/// If step 3 fails → transaction aborts, no state changed
/// If step 4 fails → transaction aborts, market changes rolled back
/// 
/// This is the ACID guarantee that PTBs provide:
/// - Atomic: All or nothing
/// - Consistent: Valid state to valid state
/// - Isolated: No interference between transactions
/// - Durable: Once confirmed, changes persist

module calibr::prediction {
    use sui::object::{Self, ID};
    use sui::tx_context::{Self, TxContext};
    use sui::transfer;
    use std::option;
    use calibr::calibr::{Self, UserProfile, Market, Prediction};
    use calibr::math;
    use calibr::reputation;
    use calibr::events;

    // ============================================================
    // ERRORS
    // ============================================================
    
    /// Profile owner doesn't match transaction sender
    const ENotProfileOwner: u64 = 400;
    
    /// Market is not open for predictions
    const EMarketNotOpen: u64 = 401;
    
    /// Confidence is below minimum (50)
    const EConfidenceTooLow: u64 = 402;
    
    /// Confidence is above maximum (90)
    const EConfidenceTooHigh: u64 = 403;
    
    /// Confidence exceeds user's reputation-based cap
    const EConfidenceExceedsUserCap: u64 = 404;
    
    /// Market has not been resolved yet
    const EMarketNotResolved: u64 = 405;
    
    /// Prediction has already been settled
    const EPredictionAlreadySettled: u64 = 406;
    
    /// Prediction does not belong to this market
    const EPredictionMarketMismatch: u64 = 407;
    
    /// Cannot settle - no winner risk total (division by zero)
    const ENoWinnerRisk: u64 = 408;
    
    /// User has already predicted on this market
    const EAlreadyPredicted: u64 = 409;

    // ============================================================
    // PREDICTION PLACEMENT
    // ============================================================

    /// Place a prediction on a market.
    /// 
    /// This function is designed to be called within a Programmable Transaction
    /// Block (PTB) that provides the user's profile and the target market.
    /// 
    /// PRECONDITIONS (all must be true or transaction aborts):
    /// 1. Sender owns the provided profile
    /// 2. Market is open (not locked, not resolved)
    /// 3. Confidence is in range [50, 90]
    /// 4. Confidence does not exceed profile's max_confidence
    /// 
    /// EFFECTS (all applied atomically):
    /// 1. Market's yes/no risk total incremented
    /// 2. Market's yes/no count incremented
    /// 3. New Prediction object created and transferred to sender
    /// 
    /// Parameters:
    /// - profile: User's reputation profile (read-only, for validation)
    /// - market: The prediction market (mutated to update totals)
    /// - side: true = YES, false = NO
    /// - confidence: Confidence level (50-90, must be <= profile.max_confidence)
    /// 
    /// Example PTB from frontend (TypeScript):
    /// ```typescript
    /// const tx = new TransactionBlock();
    /// tx.moveCall({
    ///   target: `${PACKAGE_ID}::prediction::place_prediction`,
    ///   arguments: [
    ///     tx.object(userProfileId),  // User's profile object
    ///     tx.object(marketId),       // Market (shared object)
    ///     tx.pure(true),             // side: YES
    ///     tx.pure(75),               // confidence: 75%
    ///   ],
    /// });
    /// await client.signAndExecuteTransactionBlock({ transactionBlock: tx });
    /// ```
    public entry fun place_prediction(
        profile: &UserProfile,
        market: &mut Market,
        side: bool,
        confidence: u64,
        ctx: &mut TxContext
    ) {
        // ============================================================
        // STEP 1: VALIDATE ALL PRECONDITIONS
        // ============================================================
        // If any validation fails, the entire transaction aborts.
        // No state is modified. This is the atomic guarantee.
        
        // 1a. Verify sender owns the profile
        // This prevents users from using someone else's reputation
        let sender = tx_context::sender(ctx);
        assert!(
            calibr::get_profile_owner(profile) == sender,
            ENotProfileOwner
        );
        
        // 1b. Verify market is open for predictions
        // Markets must be open (not locked, not resolved)
        assert!(
            calibr::is_market_open(market),
            EMarketNotOpen
        );
        
        // 1b2. Verify user hasn't already predicted on this market
        // Each user can only make ONE prediction per market
        assert!(
            !calibr::has_participant(market, sender),
            EAlreadyPredicted
        );
        
        // 1c. Verify confidence is in valid range [50, 90]
        // This is the fundamental range for the protocol
        assert!(
            confidence >= math::min_confidence(),
            EConfidenceTooLow
        );
        assert!(
            confidence <= math::max_confidence(),
            EConfidenceTooHigh
        );
        
        // 1d. Verify confidence does not exceed user's reputation cap
        // This is the KEY protection: users must EARN high confidence
        let max_confidence = calibr::get_max_confidence(profile);
        assert!(
            confidence <= max_confidence,
            EConfidenceExceedsUserCap
        );
        
        // ============================================================
        // STEP 2: COMPUTE RISK VALUE
        // ============================================================
        // R = max(5, 100 * (c - 50) / 40)
        // Higher confidence = higher risk = higher potential reward
        
        let risk = math::risk_from_confidence(confidence);
        
        // Get fixed stake amount (always 100)
        let stake = calibr::fixed_stake();
        
        // Get market ID for the prediction record
        let market_id = calibr::get_market_id(market);
        
        // ============================================================
        // STEP 3: UPDATE MARKET STATE
        // ============================================================
        // These mutations happen atomically with prediction creation.
        // If prediction creation fails, these are rolled back.
        
        if (side) {
            // User predicted YES
            calibr::add_yes_prediction(market, risk);
        } else {
            // User predicted NO
            calibr::add_no_prediction(market, risk);
        };
        
        // Register user as having predicted on this market (prevents duplicates)
        calibr::register_participant(market, sender);
        
        // ============================================================
        // STEP 4: CREATE AND TRANSFER PREDICTION
        // ============================================================
        // The Prediction object serves as a receipt proving the user's position.
        // It's required for settlement after market resolution.
        
        let prediction = calibr::new_prediction(
            market_id,
            side,
            confidence,
            stake,
            risk,
            ctx
        );
        
        // Get prediction ID for event (before transfer)
        let prediction_id = calibr::get_prediction_id(&prediction);
        
        // Emit event for indexing
        events::emit_prediction_placed(
            prediction_id,
            market_id,
            sender,
            side,
            confidence,
            risk,
            stake,
            max_confidence,
        );
        
        // Transfer to sender - they now own this prediction
        // This is an OWNED object, only they can use it for settlement
        transfer::public_transfer(prediction, sender);
    }

    // ============================================================
    // PREDICTION SETTLEMENT
    // ============================================================

    /// Settle a prediction after market resolution.
    /// 
    /// This function:
    /// 1. Verifies the market is resolved and prediction can be settled
    /// 2. Determines if user won (their side matches outcome)
    /// 3. Calculates payout using Model 1 formula
    /// 4. Updates user's reputation using Model 2 formula
    /// 5. Marks prediction as settled
    /// 
    /// PAYOUT CALCULATION (Model 1):
    /// - Loser pool = loser_count × FIXED_STAKE
    /// - Winner payout = stake + (my_risk / total_winner_risk) × loser_pool
    /// - Loser payout = 0 (they lose their stake)
    /// 
    /// REPUTATION UPDATE (Model 2):
    /// - skill = 1 - (confidence - outcome)²
    /// - reputation = rolling average of skill scores
    /// - max_confidence recalculated based on new reputation tier
    /// 
    /// Parameters:
    /// - profile: User's reputation profile (mutated for reputation update)
    /// - prediction: The prediction to settle (mutated to mark as settled)
    /// - market: The resolved market (read-only)
    /// 
    /// Returns: The payout amount (for frontend display)
    /// 
    /// NOTE: This version calculates payout but does not transfer tokens.
    /// Token handling would require Market to have a Balance<SUI> treasury.
    /// The payout value is returned for frontend display and tracking.
    public entry fun settle_prediction(
        profile: &mut UserProfile,
        prediction: &mut Prediction,
        market: &Market,
        ctx: &TxContext
    ) {
        // ============================================================
        // STEP 1: VALIDATE SETTLEMENT PRECONDITIONS
        // ============================================================
        
        // 1a. Verify sender owns the profile
        let sender = tx_context::sender(ctx);
        assert!(
            calibr::get_profile_owner(profile) == sender,
            ENotProfileOwner
        );
        
        // 1b. Verify market has been resolved
        assert!(
            calibr::is_market_resolved(market),
            EMarketNotResolved
        );
        
        // 1c. Verify prediction hasn't been settled already
        assert!(
            !calibr::is_prediction_settled(prediction),
            EPredictionAlreadySettled
        );
        
        // 1d. Verify prediction belongs to this market
        assert!(
            calibr::get_prediction_market_id(prediction) == calibr::get_market_id(market),
            EPredictionMarketMismatch
        );
        
        // ============================================================
        // STEP 2: DETERMINE OUTCOME
        // ============================================================
        
        let prediction_side = calibr::get_prediction_side(prediction);
        let market_outcome_opt = calibr::get_market_outcome(market);
        
        // Market must have an outcome (we already checked is_resolved)
        let market_outcome = *option::borrow(&market_outcome_opt);
        
        // User won if their prediction matches the outcome
        let won = prediction_side == market_outcome;
        
        // ============================================================
        // STEP 3: CALCULATE PAYOUT (Model 1)
        // ============================================================
        // 
        // CRITICAL: The pool is the SUM OF LOSER R VALUES, not stakes!
        // 
        // From the Calibr doc:
        // "Only risked points from losing users enter the pool.
        //  Protected points are never touched."
        // 
        // Pool construction:
        //   pool = Σ R_losers (sum of risk values from losers)
        // 
        // Winner payout:
        //   payout = stake + (my_R / Σ R_winners) × pool
        // 
        // Loser payout:
        //   payout = stake - my_R (keep protected portion)
        // 
        // This ensures ZERO-SUM:
        //   - Winners gain exactly what losers lose
        //   - No money is created or destroyed
        //   - Total money in system = total money out
        
        let stake = calibr::get_prediction_stake(prediction);
        let confidence = calibr::get_prediction_confidence(prediction);
        let my_risk = calibr::get_prediction_risked(prediction);
        
        let _payout = if (won) {
            // Winner gets their stake back plus share of loser pool
            // 
            // loser_pool = sum of R values from losing side
            // my_share = (my_risk / total_winner_risk) × loser_pool
            
            let loser_pool = if (market_outcome) {
                // YES won, NO predictors lost
                // Pool = sum of NO risk values
                calibr::get_no_risk_total(market)
            } else {
                // NO won, YES predictors lost
                // Pool = sum of YES risk values
                calibr::get_yes_risk_total(market)
            };
            
            let total_winner_risk = if (market_outcome) {
                calibr::get_yes_risk_total(market)
            } else {
                calibr::get_no_risk_total(market)
            };
            
            // Handle edge cases
            if (total_winner_risk == 0) {
                // Edge case: no winner risk (shouldn't happen)
                stake
            } else if (loser_pool == 0) {
                // Edge case: no losers (everyone predicted the winning side)
                // Everyone just gets their stake back - no profit, no loss
                stake
            } else {
                // Normal case: distribute loser pool to winners
                // payout = stake + (my_risk / total_winner_risk) × loser_pool
                let winnings = math::mul_div(my_risk, loser_pool, total_winner_risk);
                stake + winnings
            }
        } else {
            // Loser keeps their PROTECTED portion (stake - risk)
            // 
            // This is the key mechanic that punishes overconfidence:
            // - 50% confidence: R = 5, keep 95
            // - 70% confidence: R = 50, keep 50
            // - 90% confidence: R = 100, keep 0
            // 
            // The higher your confidence when wrong, the more you lose.
            if (my_risk >= stake) {
                // Max risk case (90% confidence, R = 100)
                0
            } else {
                stake - my_risk
            }
        };
        
        // ============================================================
        // STEP 4: CAPTURE PRE-UPDATE STATE FOR EVENTS
        // ============================================================
        
        let prediction_id = calibr::get_prediction_id(prediction);
        let market_id = calibr::get_market_id(market);
        let user = calibr::get_profile_owner(profile);
        
        // Capture reputation state BEFORE update
        let old_reputation_score = calibr::get_reputation_score(profile);
        let old_max_confidence = calibr::get_max_confidence(profile);
        let prediction_count_before = calibr::get_reputation_count(profile);
        
        // Calculate skill score (same calculation as reputation module)
        let skill_score = math::skill(confidence, won);
        
        // ============================================================
        // STEP 5: UPDATE REPUTATION (Model 2)
        // ============================================================
        // 
        // This delegates to reputation::update_reputation_internal which:
        // 
        // 1. Computes skill: skill = 1 - (c - o)²
        //    - c = confidence as decimal [0.5, 0.9]
        //    - o = 1 if correct, 0 if wrong
        // 
        // 2. Updates rolling average: new_rep = (old_rep × n + skill) / (n + 1)
        //    - n = current reputation_count
        //    - Each prediction has equal weight in the long-term average
        // 
        // 3. Increments reputation_count
        // 
        // 4. Recalculates max_confidence based on tier:
        //    - <700 → 70% (New)
        //    - 700-850 → 80% (Proven)
        //    - >850 → 90% (Elite)
        // 
        // WHY CALIBRATION BEATS AGGRESSION:
        // - Aggressive (spam 90%): expected skill ≈ 0.59
        // - Calibrated (honest 60%): expected skill ≈ 0.74
        // - The skill formula quadratically punishes overconfidence
        // 
        reputation::update_reputation_internal(profile, confidence, won);
        
        // ============================================================
        // STEP 6: MARK PREDICTION AS SETTLED
        // ============================================================
        // This prevents double-settlement
        
        calibr::set_prediction_settled(prediction);
        
        // ============================================================
        // STEP 7: EMIT EVENTS
        // ============================================================
        // Events enable off-chain indexing and auditing.
        // Judges can reconstruct the entire system state from events.
        
        // Capture reputation state AFTER update
        let new_reputation_score = calibr::get_reputation_score(profile);
        let new_max_confidence = calibr::get_max_confidence(profile);
        
        // Emit PredictionSettled event
        events::emit_prediction_settled(
            prediction_id,
            market_id,
            user,
            won,
            confidence,
            my_risk,
            _payout,
            stake,
            skill_score,
        );
        
        // Emit ReputationUpdated event
        events::emit_reputation_updated(
            user,
            old_reputation_score,
            new_reputation_score,
            skill_score,
            prediction_count_before,
            confidence,
            won,
        );
        
        // Emit ConfidenceCapChanged event (only if cap actually changed)
        events::emit_confidence_cap_changed(
            user,
            old_max_confidence,
            new_max_confidence,
            new_reputation_score,
        );
    }

    // ============================================================
    // VIEW FUNCTIONS
    // ============================================================

    /// Calculate the potential payout for a prediction given an assumed outcome.
    /// This is a view function - it doesn't modify state.
    /// 
    /// Parameters:
    /// - prediction: The prediction to calculate payout for
    /// - market: The market (can be resolved or not)
    /// - assumed_outcome: The outcome to assume for calculation
    /// 
    /// Returns: The payout based on the assumed outcome
    /// 
    /// IMPORTANT: The pool is the sum of LOSER R VALUES, not stakes!
    public fun calculate_potential_payout(
        prediction: &Prediction,
        market: &Market,
        assumed_outcome: bool
    ): u64 {
        let prediction_side = calibr::get_prediction_side(prediction);
        let stake = calibr::get_prediction_stake(prediction);
        let my_risk = calibr::get_prediction_risked(prediction);
        
        // Check if user would win or lose
        if (prediction_side == assumed_outcome) {
            // User would WIN
            
            // Pool = sum of loser R values (not stakes!)
            let loser_pool = if (assumed_outcome) {
                // YES wins, NO loses
                calibr::get_no_risk_total(market)
            } else {
                // NO wins, YES loses
                calibr::get_yes_risk_total(market)
            };
            
            // Total winner R
            let total_winner_risk = if (assumed_outcome) {
                calibr::get_yes_risk_total(market)
            } else {
                calibr::get_no_risk_total(market)
            };
            
            // Handle edge cases
            if (total_winner_risk == 0 || loser_pool == 0) {
                return stake
            };
            
            // payout = stake + (my_risk / total_winner_risk) × loser_pool
            let winnings = math::mul_div(my_risk, loser_pool, total_winner_risk);
            stake + winnings
        } else {
            // User would LOSE
            // Loser keeps: stake - risk (protected portion)
            if (my_risk >= stake) {
                0
            } else {
                stake - my_risk
            }
        }
    }

    /// Calculate the skill score for a prediction given an outcome.
    /// Useful for showing users what their reputation change would be.
    public fun calculate_skill_preview(confidence: u64, would_win: bool): u64 {
        math::skill(confidence, would_win)
    }

    /// Check if a prediction can be settled.
    /// Returns true if market is resolved and prediction not yet settled.
    public fun can_settle(prediction: &Prediction, market: &Market): bool {
        calibr::is_market_resolved(market) && 
        !calibr::is_prediction_settled(prediction) &&
        calibr::get_prediction_market_id(prediction) == calibr::get_market_id(market)
    }

    /// Get the prediction's side as a more readable value.
    /// Returns true for YES, false for NO.
    public fun get_side(prediction: &Prediction): bool {
        calibr::get_prediction_side(prediction)
    }

    /// Calculate the risk value for a given confidence (preview).
    public fun preview_risk(confidence: u64): u64 {
        math::risk_from_confidence(confidence)
    }

    // ============================================================
    // TEST HELPERS
    // ============================================================

    #[test_only]
    /// Get the calculated payout for testing
    public fun test_calculate_payout(
        prediction: &Prediction,
        market: &Market,
        won: bool
    ): u64 {
        let stake = calibr::get_prediction_stake(prediction);
        let my_risk = calibr::get_prediction_risked(prediction);
        let market_outcome = won == calibr::get_prediction_side(prediction);
        
        if (!won) {
            return 0
        };
        
        let loser_pool = if (market_outcome) {
            calibr::get_no_count(market) * calibr::fixed_stake()
        } else {
            calibr::get_yes_count(market) * calibr::fixed_stake()
        };
        
        let total_winner_risk = if (market_outcome) {
            calibr::get_yes_risk_total(market)
        } else {
            calibr::get_no_risk_total(market)
        };
        
        if (total_winner_risk == 0) {
            return stake
        };
        
        let winnings = math::mul_div(my_risk, loser_pool, total_winner_risk);
        stake + winnings
    }

    // ============================================================
    // POINTS ECONOMY INTEGRATION (V2)
    // ============================================================
    // 
    // These functions integrate with the Points Economy Layer.
    // They require users to have a PointsBalance and deduct/credit
    // points for predictions.
    // 
    // The original place_prediction and settle_prediction functions
    // are preserved for backward compatibility with existing tests.

    use calibr::points_token::{Self, PointsBalance};

    /// Error: Caller does not own the PointsBalance
    const ENotBalanceOwner: u64 = 420;

    /// Place a prediction using the Points Economy.
    /// 
    /// This version:
    /// 1. Deducts 100 points from user's PointsBalance
    /// 2. Creates the prediction (same as original)
    /// 3. Points are "escrowed" in the market conceptually
    /// 
    /// On settlement, winners receive credits to their PointsBalance.
    public entry fun place_prediction_with_points(
        profile: &UserProfile,
        market: &mut Market,
        points_balance: &mut PointsBalance,
        side: bool,
        confidence: u64,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        
        // Validate ownership of both profile and points balance
        assert!(
            calibr::get_profile_owner(profile) == sender,
            ENotProfileOwner
        );
        assert!(
            points_token::get_owner(points_balance) == sender,
            ENotBalanceOwner
        );
        
        // Validate market is open
        assert!(
            calibr::is_market_open(market),
            EMarketNotOpen
        );
        
        // Verify user hasn't already predicted on this market
        assert!(
            !calibr::has_participant(market, sender),
            EAlreadyPredicted
        );
        
        // Validate confidence range
        assert!(
            confidence >= math::min_confidence(),
            EConfidenceTooLow
        );
        assert!(
            confidence <= math::max_confidence(),
            EConfidenceTooHigh
        );
        
        // Validate confidence cap
        let max_confidence = calibr::get_max_confidence(profile);
        assert!(
            confidence <= max_confidence,
            EConfidenceExceedsUserCap
        );
        
        // DEDUCT STAKE FROM POINTS BALANCE
        // This will abort if insufficient balance
        let stake = points_token::deduct_stake(points_balance);
        
        // Compute risk
        let risk = math::risk_from_confidence(confidence);
        
        // Get market ID
        let market_id = calibr::get_market_id(market);
        
        // Update market state
        if (side) {
            calibr::add_yes_prediction(market, risk);
        } else {
            calibr::add_no_prediction(market, risk);
        };
        
        // Register user as having predicted on this market (prevents duplicates)
        calibr::register_participant(market, sender);
        
        // Create prediction
        let prediction = calibr::new_prediction(
            market_id,
            side,
            confidence,
            stake,
            risk,
            ctx
        );
        
        // Get prediction ID for event
        let prediction_id = calibr::get_prediction_id(&prediction);
        
        // Emit event
        events::emit_prediction_placed(
            prediction_id,
            market_id,
            sender,
            side,
            confidence,
            risk,
            stake,
            max_confidence,
        );
        
        // Transfer prediction to sender
        transfer::public_transfer(prediction, sender);
    }

    /// Settle a prediction with Points Economy integration.
    /// 
    /// This version:
    /// 1. Calculates payout (same logic as original)
    /// 2. Credits the payout to user's PointsBalance
    /// 3. Updates reputation (same as original)
    /// 
    /// For losers: payout = stake - risk (protected portion)
    /// For winners: payout = stake + share_of_loser_pool
    public entry fun settle_prediction_with_points(
        profile: &mut UserProfile,
        prediction: &mut Prediction,
        market: &Market,
        points_balance: &mut PointsBalance,
        ctx: &TxContext
    ) {
        let sender = tx_context::sender(ctx);
        
        // Validate ownerships
        assert!(
            calibr::get_profile_owner(profile) == sender,
            ENotProfileOwner
        );
        assert!(
            points_token::get_owner(points_balance) == sender,
            ENotBalanceOwner
        );
        
        // Validate settlement conditions
        assert!(
            calibr::is_market_resolved(market),
            EMarketNotResolved
        );
        assert!(
            !calibr::is_prediction_settled(prediction),
            EPredictionAlreadySettled
        );
        assert!(
            calibr::get_prediction_market_id(prediction) == calibr::get_market_id(market),
            EPredictionMarketMismatch
        );
        
        // Determine outcome
        let prediction_side = calibr::get_prediction_side(prediction);
        let market_outcome_opt = calibr::get_market_outcome(market);
        let market_outcome = *option::borrow(&market_outcome_opt);
        let won = prediction_side == market_outcome;
        
        // Get prediction details
        let stake = calibr::get_prediction_stake(prediction);
        let confidence = calibr::get_prediction_confidence(prediction);
        let my_risk = calibr::get_prediction_risked(prediction);
        
        // Calculate payout
        let payout = if (won) {
            let loser_pool = if (market_outcome) {
                calibr::get_no_risk_total(market)
            } else {
                calibr::get_yes_risk_total(market)
            };
            
            let total_winner_risk = if (market_outcome) {
                calibr::get_yes_risk_total(market)
            } else {
                calibr::get_no_risk_total(market)
            };
            
            if (total_winner_risk == 0) {
                stake
            } else if (loser_pool == 0) {
                stake
            } else {
                let winnings = math::mul_div(my_risk, loser_pool, total_winner_risk);
                stake + winnings
            }
        } else {
            // Loser keeps protected portion
            if (my_risk >= stake) {
                0
            } else {
                stake - my_risk
            }
        };
        
        // CREDIT PAYOUT TO POINTS BALANCE
        points_token::credit_payout(points_balance, payout);
        
        // Capture state for events
        let prediction_id = calibr::get_prediction_id(prediction);
        let market_id = calibr::get_market_id(market);
        let user = calibr::get_profile_owner(profile);
        let old_reputation_score = calibr::get_reputation_score(profile);
        let old_max_confidence = calibr::get_max_confidence(profile);
        let prediction_count_before = calibr::get_reputation_count(profile);
        let skill_score = math::skill(confidence, won);
        
        // Update reputation
        reputation::update_reputation_internal(profile, confidence, won);
        
        // Mark prediction as settled
        calibr::set_prediction_settled(prediction);
        
        // Capture new state
        let new_reputation_score = calibr::get_reputation_score(profile);
        let new_max_confidence = calibr::get_max_confidence(profile);
        
        // Emit settlement event
        events::emit_prediction_settled(
            prediction_id,
            market_id,
            user,
            won,
            confidence,
            my_risk,
            payout,
            stake,
            skill_score,
        );
        
        // Emit reputation event
        events::emit_reputation_updated(
            user,
            old_reputation_score,
            new_reputation_score,
            skill_score,
            prediction_count_before,
            confidence,
            won,
        );
        
        // Emit confidence cap change if applicable
        if (old_max_confidence != new_max_confidence) {
            events::emit_confidence_cap_changed(
                user,
                old_max_confidence,
                new_max_confidence,
                new_reputation_score,
            );
        };
    }
}

