/// calibr.move
/// 
/// Core data objects for the Calibr protocol.
/// 
/// This module defines the three fundamental objects:
/// - UserProfile (owned) - persistent user reputation state
/// - Market (shared) - prediction market that multiple users interact with
/// - Prediction (owned) - individual user's prediction receipt
/// 
/// Object ownership model:
/// - Owned objects can only be modified by their owner
/// - Shared objects can be accessed by anyone (with proper access control)
/// - This separation ensures user state is protected while markets are collaborative

module calibr::calibr {
    use sui::object::{Self, UID, ID};
    use sui::tx_context::TxContext;
    use std::option::Option;

    // ============================================================
    // CONSTANTS
    // ============================================================
    
    /// Fixed stake amount for all predictions (Model 1: S = 100)
    const FIXED_STAKE: u64 = 100;
    
    /// Default max confidence for new users (Novice tier)
    const DEFAULT_MAX_CONFIDENCE: u64 = 70;
    
    /// Reputation score scale (0-1000 represents 0.0-1.0)
    const REPUTATION_SCALE: u64 = 1000;
    
    // ============================================================
    // REPUTATION TIER THRESHOLDS (Model 2)
    // ============================================================
    // 
    // Calibr uses exactly 3 tiers as specified in the documentation:
    // - New: score < 700 → max 70% confidence
    // - Proven: 700 ≤ score ≤ 850 → max 80% confidence
    // - Elite: score > 850 → max 90% confidence
    //
    // These thresholds are carefully chosen:
    // 1. 700 is the starting point - new users begin at the "New/Proven" boundary
    // 2. Reaching "Proven" (80%) requires consistent calibration above 700
    // 3. Reaching "Elite" (90%) requires exceptional, sustained performance (>850)
    //
    const TIER_NEW_MAX: u64 = 699;      // Below 700 = New tier
    const TIER_PROVEN_MAX: u64 = 850;   // 700-850 = Proven tier, >850 = Elite tier
    
    // Confidence caps per tier (these are HARD LIMITS)
    const CAP_NEW: u64 = 70;            // New users: max 70%
    const CAP_PROVEN: u64 = 80;         // Proven users: max 80%
    const CAP_ELITE: u64 = 90;          // Elite users: max 90%

    // ============================================================
    // ERRORS
    // ============================================================
    
    /// Confidence value is outside valid range [50, 90]
    const EInvalidConfidence: u64 = 0;
    
    /// User already has a profile
    const EProfileAlreadyExists: u64 = 1;
    
    /// Market is not open for predictions (either locked or resolved)
    const EMarketNotOpen: u64 = 2;
    
    /// Market has not been resolved yet
    const EMarketNotResolved: u64 = 3;
    
    /// Prediction has already been settled
    const EPredictionAlreadySettled: u64 = 4;
    
    /// Caller is not authorized for this action
    const EUnauthorized: u64 = 5;
    
    /// Market is locked and not accepting new predictions
    const EMarketLocked: u64 = 6;
    
    /// Market is already resolved
    const EMarketAlreadyResolved: u64 = 7;
    
    /// Confidence exceeds user's maximum allowed
    const EConfidenceExceedsMax: u64 = 8;

    // ============================================================
    // CORE DATA OBJECTS
    // ============================================================

    /// UserProfile - OWNED OBJECT
    /// 
    /// Represents a user's persistent reputation state in the Calibr protocol.
    /// 
    /// WHY OWNED:
    /// - Each user has exactly one profile tied to their address
    /// - Only the owner can use their reputation to place predictions
    /// - Prevents unauthorized modification of reputation scores
    /// - Owned objects have single-writer semantics = no contention
    /// 
    /// WHY REPUTATION IS PERSISTENT:
    /// - Calibration is measured over time, not per-market
    /// - Users build trust through consistent, well-calibrated predictions
    /// - Reputation unlocks higher confidence caps (skin in the game)
    /// - Historical performance cannot be erased or reset
    /// - This creates accountability and rewards long-term thinking
    /// 
    /// Reputation score uses Model 2:
    /// - skill = 1 - (confidence - outcome)²
    /// - reputation_score = rolling average of skill scores
    /// - Higher reputation → higher max_confidence cap
    public struct UserProfile has key, store {
        id: UID,
        
        /// Address that owns this profile
        owner: address,
        
        /// Reputation score scaled 0-1000 (represents 0.0 to 1.0)
        /// Updated after each prediction settles using Model 2 skill formula
        reputation_score: u64,
        
        /// Total number of settled predictions
        /// Used to calculate rolling average: new_score = (old_score * count + skill) / (count + 1)
        reputation_count: u64,
        
        /// Maximum confidence this user can select (50-90)
        /// Determined by reputation tier:
        /// - New (score < 700): max 70%
        /// - Proven (700 ≤ score ≤ 850): max 80%
        /// - Elite (score > 850): max 90%
        max_confidence: u64,
    }

    /// Market - SHARED OBJECT
    /// 
    /// Represents a prediction market that multiple users can participate in.
    /// 
    /// WHY SHARED:
    /// - Multiple users place predictions on the same market concurrently
    /// - Aggregate risk totals must be updated atomically
    /// - Resolution affects all participants simultaneously
    /// - Shared objects allow controlled concurrent access
    /// 
    /// Lifecycle: Created → Open → Locked → Resolved
    /// - Created/Open: Market accepts predictions
    /// - Locked: No new predictions (close to resolution time)
    /// - Resolved: Outcome set, settlements can occur
    /// 
    /// Settlement uses Model 1:
    /// - Losers fund the pool (their stakes: loser_count × 100)
    /// - Winners split pool proportional to their R (risk) values
    /// - Payout = (my_risk / total_winner_risk) × loser_pool
    public struct Market has key, store {
        id: UID,
        
        /// The prediction question (e.g., "Will BTC exceed $100k by Dec 2025?")
        question: vector<u8>,
        
        /// Sum of all R values for YES predictions
        /// Used to calculate winner payouts if YES wins
        yes_risk_total: u64,
        
        /// Sum of all R values for NO predictions
        /// Used to calculate winner payouts if NO wins
        no_risk_total: u64,
        
        /// Number of YES predictions placed
        /// Used to calculate loser pool if NO wins: yes_count × FIXED_STAKE
        yes_count: u64,
        
        /// Number of NO predictions placed
        /// Used to calculate loser pool if YES wins: no_count × FIXED_STAKE
        no_count: u64,
        
        /// Whether the market is locked (no new predictions allowed)
        /// Set to true before resolution to prevent last-minute gaming
        locked: bool,
        
        /// Whether the market has been resolved
        /// Once true, settlements can occur
        resolved: bool,
        
        /// The outcome after resolution
        /// Some(true) = YES won, Some(false) = NO won, None = not yet resolved
        outcome: Option<bool>,
        
        /// Address authorized to resolve this market
        /// Typically the market creator or a trusted oracle
        authority: address,
    }

    /// Prediction - OWNED OBJECT
    /// 
    /// Represents a single user's prediction on a specific market.
    /// 
    /// WHY OWNED:
    /// - Only the prediction owner can settle and claim winnings
    /// - Serves as a "receipt" proving the user's position
    /// - Cannot be transferred or modified after creation
    /// - Single-writer = no race conditions on settlement
    /// 
    /// Created when user places prediction via PTB:
    /// 1. Validate confidence against user's max_confidence
    /// 2. Calculate R = max(5, 100 * (c - 50) / 40)
    /// 3. Transfer stake (100 units) to market escrow
    /// 4. Update market's yes/no risk totals and counts
    /// 5. Create and transfer Prediction object to user
    public struct Prediction has key, store {
        id: UID,
        
        /// ID of the market this prediction is for
        /// Used to look up market state during settlement
        market_id: ID,
        
        /// The side predicted: true = YES, false = NO
        side: bool,
        
        /// Confidence level chosen (50-90)
        /// Capped by user's max_confidence from reputation
        confidence: u64,
        
        /// Stake amount (always FIXED_STAKE = 100)
        /// Stored explicitly for settlement verification
        stake: u64,
        
        /// Risk value R = max(5, 100 * (c - 50) / 40)
        /// Determines share of loser pool if user wins
        risked: u64,
        
        /// Whether this prediction has been settled
        /// Prevents double-claiming after market resolution
        settled: bool,
    }

    // ============================================================
    // HELPER FUNCTIONS
    // ============================================================
    
    /// Calculate max confidence cap based on reputation score.
    /// 
    /// Tier system (from Calibr documentation):
    /// - New: score < 700 → max 70%
    /// - Proven: 700 ≤ score ≤ 850 → max 80%
    /// - Elite: score > 850 → max 90%
    /// 
    /// This function enforces the core protection mechanism:
    /// - New users CANNOT bet above 70% regardless of how "sure" they are
    /// - Users must PROVE calibration over time to unlock higher caps
    /// - Elite status (90% access) requires sustained excellent performance
    public fun calculate_max_confidence(reputation_score: u64): u64 {
        if (reputation_score > TIER_PROVEN_MAX) {
            // Elite tier: score > 850
            CAP_ELITE
        } else if (reputation_score > TIER_NEW_MAX) {
            // Proven tier: 700 ≤ score ≤ 850
            CAP_PROVEN
        } else {
            // New tier: score < 700
            CAP_NEW
        }
    }

    // ============================================================
    // GETTER FUNCTIONS FOR CONSTANTS
    // ============================================================
    
    public fun fixed_stake(): u64 { FIXED_STAKE }
    public fun default_max_confidence(): u64 { DEFAULT_MAX_CONFIDENCE }
    public fun reputation_scale(): u64 { REPUTATION_SCALE }
    
    // Tier threshold getters (3-tier system)
    public fun tier_new_max(): u64 { TIER_NEW_MAX }
    public fun tier_proven_max(): u64 { TIER_PROVEN_MAX }
    
    // Confidence cap getters (3-tier system)
    public fun cap_new(): u64 { CAP_NEW }
    public fun cap_proven(): u64 { CAP_PROVEN }
    public fun cap_elite(): u64 { CAP_ELITE }
    
    // ============================================================
    // CONSTRUCTOR FUNCTIONS
    // ============================================================
    
    /// Create a new UserProfile object.
    /// 
    /// This is a package-internal function - only modules within the calibr
    /// package can call this. External contracts cannot create UserProfiles.
    /// 
    /// The reputation.move module uses this to implement create_profile().
    public(package) fun new_user_profile(
        owner: address,
        reputation_score: u64,
        reputation_count: u64,
        max_confidence: u64,
        ctx: &mut TxContext
    ): UserProfile {
        UserProfile {
            id: object::new(ctx),
            owner,
            reputation_score,
            reputation_count,
            max_confidence,
        }
    }
    
    /// Create a new Market object.
    /// 
    /// This is a package-internal function - only modules within the calibr
    /// package can call this. External contracts cannot create Markets.
    /// 
    /// The market.move module uses this to implement create_market().
    public(package) fun new_market(
        question: vector<u8>,
        authority: address,
        ctx: &mut TxContext
    ): Market {
        Market {
            id: object::new(ctx),
            question,
            yes_risk_total: 0,
            no_risk_total: 0,
            yes_count: 0,
            no_count: 0,
            locked: false,
            resolved: false,
            outcome: std::option::none(),
            authority,
        }
    }
    
    /// Create a new Prediction object.
    /// 
    /// This is a package-internal function - only modules within the calibr
    /// package can call this. External contracts cannot create Predictions.
    /// 
    /// The prediction.move module uses this to implement place_prediction().
    public(package) fun new_prediction(
        market_id: ID,
        side: bool,
        confidence: u64,
        stake: u64,
        risked: u64,
        ctx: &mut TxContext
    ): Prediction {
        Prediction {
            id: object::new(ctx),
            market_id,
            side,
            confidence,
            stake,
            risked,
            settled: false,
        }
    }
    
    // ============================================================
    // MUTABLE ACCESSOR FUNCTIONS (package-internal)
    // ============================================================
    
    /// Update reputation score - only callable within package
    public(package) fun set_reputation_score(profile: &mut UserProfile, score: u64) {
        profile.reputation_score = score;
    }
    
    /// Increment reputation count - only callable within package
    public(package) fun increment_reputation_count(profile: &mut UserProfile) {
        profile.reputation_count = profile.reputation_count + 1;
    }
    
    /// Update max confidence - only callable within package
    public(package) fun set_max_confidence(profile: &mut UserProfile, max_conf: u64) {
        profile.max_confidence = max_conf;
    }
    
    // ============================================================
    // MUTABLE ACCESSOR FUNCTIONS - Market (package-internal)
    // ============================================================
    
    /// Add a YES prediction to market totals
    public(package) fun add_yes_prediction(market: &mut Market, risk: u64) {
        market.yes_risk_total = market.yes_risk_total + risk;
        market.yes_count = market.yes_count + 1;
    }
    
    /// Add a NO prediction to market totals
    public(package) fun add_no_prediction(market: &mut Market, risk: u64) {
        market.no_risk_total = market.no_risk_total + risk;
        market.no_count = market.no_count + 1;
    }
    
    /// Lock the market (prevent new predictions)
    public(package) fun lock_market(market: &mut Market) {
        market.locked = true;
    }
    
    /// Resolve the market with an outcome
    public(package) fun resolve_market(market: &mut Market, outcome_value: bool) {
        market.resolved = true;
        market.outcome = std::option::some(outcome_value);
    }
    
    // ============================================================
    // MUTABLE ACCESSOR FUNCTIONS - Prediction (package-internal)
    // ============================================================
    
    /// Mark prediction as settled
    public(package) fun set_prediction_settled(prediction: &mut Prediction) {
        prediction.settled = true;
    }

    // ============================================================
    // ACCESSOR FUNCTIONS - UserProfile
    // ============================================================
    
    /// Get the owner address of a profile
    public fun get_profile_owner(profile: &UserProfile): address {
        profile.owner
    }
    
    /// Get the reputation score (0-1000)
    public fun get_reputation_score(profile: &UserProfile): u64 {
        profile.reputation_score
    }
    
    /// Get the number of settled predictions
    public fun get_reputation_count(profile: &UserProfile): u64 {
        profile.reputation_count
    }
    
    /// Get the max confidence cap for this user
    public fun get_max_confidence(profile: &UserProfile): u64 {
        profile.max_confidence
    }
    
    // ============================================================
    // ACCESSOR FUNCTIONS - Market
    // ============================================================
    
    /// Get the Market's object ID
    public fun get_market_id(market: &Market): ID {
        object::uid_to_inner(&market.id)
    }
    
    /// Get the market question
    public fun get_market_question(market: &Market): vector<u8> {
        market.question
    }
    
    /// Check if market is locked
    public fun is_market_locked(market: &Market): bool {
        market.locked
    }
    
    /// Check if market is open for predictions (not locked and not resolved)
    public fun is_market_open(market: &Market): bool {
        !market.locked && !market.resolved
    }
    
    /// Check if market has been resolved
    public fun is_market_resolved(market: &Market): bool {
        market.resolved
    }
    
    /// Get market outcome (None if not resolved)
    public fun get_market_outcome(market: &Market): Option<bool> {
        market.outcome
    }
    
    /// Get the authority address for this market
    public fun get_market_authority(market: &Market): address {
        market.authority
    }
    
    /// Get YES risk total
    public fun get_yes_risk_total(market: &Market): u64 {
        market.yes_risk_total
    }
    
    /// Get NO risk total
    public fun get_no_risk_total(market: &Market): u64 {
        market.no_risk_total
    }
    
    /// Get YES count
    public fun get_yes_count(market: &Market): u64 {
        market.yes_count
    }
    
    /// Get NO count
    public fun get_no_count(market: &Market): u64 {
        market.no_count
    }
    
    // ============================================================
    // ACCESSOR FUNCTIONS - Prediction
    // ============================================================
    
    /// Check if prediction has been settled
    public fun is_prediction_settled(prediction: &Prediction): bool {
        prediction.settled
    }
    
    /// Get the market ID this prediction is for
    public fun get_prediction_market_id(prediction: &Prediction): ID {
        prediction.market_id
    }
    
    /// Get the side (true = YES, false = NO)
    public fun get_prediction_side(prediction: &Prediction): bool {
        prediction.side
    }
    
    /// Get the confidence level
    public fun get_prediction_confidence(prediction: &Prediction): u64 {
        prediction.confidence
    }
    
    /// Get the stake amount
    public fun get_prediction_stake(prediction: &Prediction): u64 {
        prediction.stake
    }
    
    /// Get the risk value
    public fun get_prediction_risked(prediction: &Prediction): u64 {
        prediction.risked
    }
    
    /// Get the prediction's object ID
    public fun get_prediction_id(prediction: &Prediction): ID {
        object::uid_to_inner(&prediction.id)
    }
    
    // ============================================================
    // ACCESSOR FUNCTIONS - UserProfile
    // ============================================================
    
    /// Get the profile's object ID
    public fun get_profile_id(profile: &UserProfile): ID {
        object::uid_to_inner(&profile.id)
    }
}
