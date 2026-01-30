/// events.move
/// 
/// Event definitions for Calibr protocol.
/// 
/// ============================================================
/// PURPOSE
/// ============================================================
/// 
/// Events enable off-chain indexing and auditing of the protocol.
/// A judge or auditor should be able to reconstruct the ENTIRE
/// system state and verify correctness using ONLY these events.
/// 
/// Design principles:
/// 1. HUMAN-READABLE: Field names explain what they mean
/// 2. COMPLETE: All relevant data is included
/// 3. CORRELATABLE: IDs link related events
/// 4. AUDITABLE: Judges can verify math correctness
/// 
/// ============================================================
/// EVENT FLOW
/// ============================================================
/// 
/// Market lifecycle:
///   MarketCreated → MarketLocked → MarketResolved
/// 
/// User lifecycle:
///   ProfileCreated → (predictions...) → ReputationUpdated
/// 
/// Prediction lifecycle:
///   PredictionPlaced → PredictionSettled
/// 
/// Each event contains enough context to be understood in isolation.

module calibr::events {
    use sui::event;
    use sui::object::ID;

    // ============================================================
    // MARKET EVENTS
    // ============================================================

    /// Emitted when a new prediction market is created.
    /// 
    /// This event allows indexers to:
    /// - Track all markets in the system
    /// - Display market questions to users
    /// - Know who can resolve the market
    public struct MarketCreated has copy, drop {
        /// Unique identifier for the market
        market_id: ID,
        
        /// The prediction question (e.g., "Will BTC > $100k by Dec 2025?")
        question: vector<u8>,
        
        /// Address authorized to resolve this market
        authority: address,
    }

    /// Emitted when a market is locked (no more predictions allowed).
    /// 
    /// Locking typically happens before resolution to prevent
    /// last-minute gaming when the outcome becomes obvious.
    public struct MarketLocked has copy, drop {
        /// The market that was locked
        market_id: ID,
        
        /// Total YES predictions at lock time
        yes_count: u64,
        
        /// Total NO predictions at lock time
        no_count: u64,
        
        /// Total risk staked on YES side
        yes_risk_total: u64,
        
        /// Total risk staked on NO side
        no_risk_total: u64,
    }

    /// Emitted when a market is resolved with an outcome.
    /// 
    /// CRITICAL EVENT: Allows judges to verify settlement math.
    /// Contains all data needed to calculate payouts.
    public struct MarketResolved has copy, drop {
        /// The market that was resolved
        market_id: ID,
        
        /// The outcome: true = YES won, false = NO won
        outcome: bool,
        
        /// Human-readable outcome description
        outcome_description: vector<u8>,
        
        /// Number of winning predictions
        winner_count: u64,
        
        /// Number of losing predictions
        loser_count: u64,
        
        /// Total risk from winning side (denominator for payout calculation)
        total_winner_risk: u64,
        
        /// Total risk from losing side (the pool to distribute)
        /// Pool = Σ R_losers (sum of loser risk values, NOT stakes)
        loser_pool: u64,
        
        /// Address that resolved the market
        resolved_by: address,
    }

    // ============================================================
    // PREDICTION EVENTS
    // ============================================================

    /// Emitted when a user places a prediction.
    /// 
    /// Contains all Model 1 (Money) parameters for the prediction.
    /// Judges can verify: risk = max(5, 100 × (confidence - 50) / 40)
    public struct PredictionPlaced has copy, drop {
        /// Unique identifier for this prediction
        prediction_id: ID,
        
        /// The market this prediction is for
        market_id: ID,
        
        /// The user who placed the prediction
        user: address,
        
        /// The side: true = YES, false = NO
        side: bool,
        
        /// Human-readable side description ("YES" or "NO")
        side_description: vector<u8>,
        
        /// Confidence level (50-90)
        confidence: u64,
        
        /// Risk value: R = max(5, 100 × (c - 50) / 40)
        /// This determines:
        /// - How much user loses if wrong
        /// - User's share of winner pool if right
        risk: u64,
        
        /// Protected amount: stake - risk
        /// This portion is NEVER at risk
        protected: u64,
        
        /// Fixed stake amount (always 100)
        stake: u64,
        
        /// User's max allowed confidence at time of prediction
        user_max_confidence: u64,
    }

    /// Emitted when a prediction is settled after market resolution.
    /// 
    /// Contains complete settlement details for audit.
    /// Judges can verify the zero-sum property using these events.
    public struct PredictionSettled has copy, drop {
        /// The prediction that was settled
        prediction_id: ID,
        
        /// The resolved market
        market_id: ID,
        
        /// The user who owned the prediction
        user: address,
        
        /// Whether the user won (prediction_side == market_outcome)
        won: bool,
        
        /// Human-readable result ("WON" or "LOST")
        result_description: vector<u8>,
        
        /// The user's original confidence
        confidence: u64,
        
        /// The user's risk value
        risk: u64,
        
        /// The payout amount
        /// Winner: stake + (risk / total_winner_risk) × loser_pool
        /// Loser: stake - risk (protected portion)
        payout: u64,
        
        /// Profit or loss amount (payout - stake)
        /// Positive = profit, negative would be represented as loss_amount
        profit: u64,
        
        /// Loss amount (stake - payout) if user lost
        /// Zero if user won
        loss: u64,
        
        /// Skill score earned (Model 2)
        /// skill = 1 - (c - o)² scaled to 0-1000
        skill_score: u64,
    }

    // ============================================================
    // REPUTATION EVENTS
    // ============================================================

    /// Emitted when a new user profile is created.
    public struct ProfileCreated has copy, drop {
        /// The user's address
        user: address,
        
        /// The profile object ID
        profile_id: ID,
        
        /// Initial reputation score (default: 700)
        initial_reputation: u64,
        
        /// Initial max confidence (default: 70)
        initial_max_confidence: u64,
        
        /// Human-readable tier name
        tier: vector<u8>,
    }

    /// Emitted when a user's reputation is updated after settlement.
    /// 
    /// Contains Model 2 (Reputation) details for audit.
    /// Judges can verify:
    /// - skill = 1 - (c - o)²
    /// - new_reputation = (old_reputation × n + skill) / (n + 1)
    public struct ReputationUpdated has copy, drop {
        /// The user whose reputation changed
        user: address,
        
        /// Reputation score BEFORE this update
        old_score: u64,
        
        /// Reputation score AFTER this update
        new_score: u64,
        
        /// Direction of change ("INCREASED", "DECREASED", or "UNCHANGED")
        change_direction: vector<u8>,
        
        /// Absolute change amount
        change_amount: u64,
        
        /// The skill score that caused this update
        skill_score: u64,
        
        /// Number of predictions before this one
        prediction_count_before: u64,
        
        /// Number of predictions after (count_before + 1)
        prediction_count_after: u64,
        
        /// The confidence level of the settled prediction
        prediction_confidence: u64,
        
        /// Whether the prediction was correct
        prediction_was_correct: bool,
    }

    /// Emitted when a user's max confidence cap changes.
    /// 
    /// This happens when reputation crosses a tier boundary.
    /// Tier thresholds:
    /// - New (score < 700): max 70%
    /// - Proven (700 ≤ score ≤ 850): max 80%
    /// - Elite (score > 850): max 90%
    public struct ConfidenceCapChanged has copy, drop {
        /// The user whose cap changed
        user: address,
        
        /// Previous max confidence (50-90)
        old_cap: u64,
        
        /// New max confidence (50-90)
        new_cap: u64,
        
        /// Previous tier name
        old_tier: vector<u8>,
        
        /// New tier name  
        new_tier: vector<u8>,
        
        /// The reputation score that triggered this change
        reputation_score: u64,
        
        /// Direction: "PROMOTED" (higher cap) or "DEMOTED" (lower cap)
        direction: vector<u8>,
    }

    // ============================================================
    // EMIT FUNCTIONS
    // ============================================================
    // 
    // These are package-internal functions called by other modules.
    // They construct and emit the events.

    /// Emit MarketCreated event
    public(package) fun emit_market_created(
        market_id: ID,
        question: vector<u8>,
        authority: address,
    ) {
        event::emit(MarketCreated {
            market_id,
            question,
            authority,
        });
    }

    /// Emit MarketLocked event
    public(package) fun emit_market_locked(
        market_id: ID,
        yes_count: u64,
        no_count: u64,
        yes_risk_total: u64,
        no_risk_total: u64,
    ) {
        event::emit(MarketLocked {
            market_id,
            yes_count,
            no_count,
            yes_risk_total,
            no_risk_total,
        });
    }

    /// Emit MarketResolved event
    public(package) fun emit_market_resolved(
        market_id: ID,
        outcome: bool,
        winner_count: u64,
        loser_count: u64,
        total_winner_risk: u64,
        loser_pool: u64,
        resolved_by: address,
    ) {
        let outcome_description = if (outcome) { b"YES" } else { b"NO" };
        
        event::emit(MarketResolved {
            market_id,
            outcome,
            outcome_description,
            winner_count,
            loser_count,
            total_winner_risk,
            loser_pool,
            resolved_by,
        });
    }

    /// Emit PredictionPlaced event
    public(package) fun emit_prediction_placed(
        prediction_id: ID,
        market_id: ID,
        user: address,
        side: bool,
        confidence: u64,
        risk: u64,
        stake: u64,
        user_max_confidence: u64,
    ) {
        let side_description = if (side) { b"YES" } else { b"NO" };
        let protected = if (risk >= stake) { 0 } else { stake - risk };
        
        event::emit(PredictionPlaced {
            prediction_id,
            market_id,
            user,
            side,
            side_description,
            confidence,
            risk,
            protected,
            stake,
            user_max_confidence,
        });
    }

    /// Emit PredictionSettled event
    public(package) fun emit_prediction_settled(
        prediction_id: ID,
        market_id: ID,
        user: address,
        won: bool,
        confidence: u64,
        risk: u64,
        payout: u64,
        stake: u64,
        skill_score: u64,
    ) {
        let result_description = if (won) { b"WON" } else { b"LOST" };
        
        // Calculate profit and loss
        let (profit, loss) = if (payout >= stake) {
            (payout - stake, 0u64)
        } else {
            (0u64, stake - payout)
        };
        
        event::emit(PredictionSettled {
            prediction_id,
            market_id,
            user,
            won,
            result_description,
            confidence,
            risk,
            payout,
            profit,
            loss,
            skill_score,
        });
    }

    /// Emit ProfileCreated event
    public(package) fun emit_profile_created(
        user: address,
        profile_id: ID,
        initial_reputation: u64,
        initial_max_confidence: u64,
    ) {
        let tier = get_tier_name(initial_reputation);
        
        event::emit(ProfileCreated {
            user,
            profile_id,
            initial_reputation,
            initial_max_confidence,
            tier,
        });
    }

    /// Emit ReputationUpdated event
    public(package) fun emit_reputation_updated(
        user: address,
        old_score: u64,
        new_score: u64,
        skill_score: u64,
        prediction_count_before: u64,
        prediction_confidence: u64,
        prediction_was_correct: bool,
    ) {
        let (change_direction, change_amount) = if (new_score > old_score) {
            (b"INCREASED", new_score - old_score)
        } else if (new_score < old_score) {
            (b"DECREASED", old_score - new_score)
        } else {
            (b"UNCHANGED", 0u64)
        };
        
        event::emit(ReputationUpdated {
            user,
            old_score,
            new_score,
            change_direction,
            change_amount,
            skill_score,
            prediction_count_before,
            prediction_count_after: prediction_count_before + 1,
            prediction_confidence,
            prediction_was_correct,
        });
    }

    /// Emit ConfidenceCapChanged event
    public(package) fun emit_confidence_cap_changed(
        user: address,
        old_cap: u64,
        new_cap: u64,
        reputation_score: u64,
    ) {
        // Only emit if cap actually changed
        if (old_cap == new_cap) {
            return
        };
        
        let old_tier = get_tier_name_from_cap(old_cap);
        let new_tier = get_tier_name_from_cap(new_cap);
        
        let direction = if (new_cap > old_cap) {
            b"PROMOTED"
        } else {
            b"DEMOTED"
        };
        
        event::emit(ConfidenceCapChanged {
            user,
            old_cap,
            new_cap,
            old_tier,
            new_tier,
            reputation_score,
            direction,
        });
    }

    // ============================================================
    // HELPER FUNCTIONS
    // ============================================================

    /// Get tier name from reputation score
    fun get_tier_name(score: u64): vector<u8> {
        if (score > 850) {
            b"Elite"
        } else if (score >= 700) {
            b"Proven"
        } else {
            b"New"
        }
    }

    /// Get tier name from confidence cap
    fun get_tier_name_from_cap(cap: u64): vector<u8> {
        if (cap >= 90) {
            b"Elite"
        } else if (cap >= 80) {
            b"Proven"
        } else {
            b"New"
        }
    }
}
