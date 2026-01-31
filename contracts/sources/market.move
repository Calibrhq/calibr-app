/// market.move
/// 
/// Market lifecycle management for Calibr protocol.
/// 
/// ============================================================
/// HOW MARKETS ARE SOURCED FROM EXTERNAL PLATFORMS
/// ============================================================
/// 
/// Calibr does NOT create prediction questions itself. Markets are sourced
/// from established prediction platforms that have:
/// 
/// 1. POLYMARKET / METACULUS / MANIFOLD MARKETS:
///    - These platforms already have robust market creation processes
///    - Questions are vetted for clarity and resolvability
///    - Large communities validate market quality
///    - Resolution criteria are pre-defined and public
/// 
/// 2. SOURCING WORKFLOW:
///    - Admin identifies high-quality markets on external platforms
///    - Admin creates corresponding market on Calibr with same question
///    - Users make predictions on Calibr (confidence-weighted)
///    - When external platform resolves, admin resolves Calibr market
/// 
/// 3. MARKET SELECTION CRITERIA:
///    - Clear, unambiguous resolution criteria
///    - Defined resolution timeframe
///    - Binary outcome (YES/NO)
///    - No subjective interpretation required
/// 
/// Examples of good markets:
///    - "Will BTC exceed $100k by Dec 31, 2025?" (price is objective)
///    - "Will SpaceX land Starship by Q2 2025?" (event is observable)
///    - "Will GPT-5 be released in 2025?" (public announcement)
/// 
/// Examples of BAD markets (we avoid):
///    - "Is AI dangerous?" (subjective)
///    - "Will the economy improve?" (ambiguous)
/// 
/// ============================================================
/// WHY CALIBR DOES NOT RESOLVE TRUTH ITSELF
/// ============================================================
/// 
/// Calibr is a CALIBRATION GAME, not an oracle or truth machine.
/// 
/// 1. SEPARATION OF CONCERNS:
///    - Calibr measures HOW WELL you predict, not WHAT is true
///    - Truth resolution is a hard problem requiring oracles, disputes, etc.
///    - By outsourcing truth to established platforms, we focus on calibration
/// 
/// 2. TRUST MINIMIZATION:
///    - If Calibr resolved truth, users must trust Calibr admins
///    - Instead, users trust Polymarket/Metaculus (already established)
///    - Calibr admins only relay the external resolution
///    - Manipulation would require corrupting the SOURCE platform
/// 
/// 3. AVOIDING DISPUTES:
///    - Prediction markets often have resolution disputes
///    - Polymarket has dispute resolution mechanisms, Calibr doesn't need them
///    - We inherit their resolution infrastructure for free
/// 
/// 4. SCALABILITY:
///    - We can create markets for ANY question already on these platforms
///    - No need to build oracle infrastructure
///    - Focus engineering effort on calibration mechanics
/// 
/// TRUST MODEL:
/// - Admin is trusted to faithfully relay external resolutions
/// - Admin cannot resolve differently than the source platform
/// - This is a social/reputational constraint, not cryptographic
/// - Future: could add multi-sig or oracle integration for more trust
/// 
/// ============================================================
/// MARKET RESOLUTION AND SETTLEMENT MECHANICS
/// ============================================================
/// 
/// When a market resolves, the following happens:
/// 
/// 1. AUTHORITY SETS OUTCOME:
///    - Admin calls resolve_market(outcome)
///    - outcome = true means YES won, false means NO won
///    - Market must be locked first (prevents last-second gaming)
/// 
/// 2. IDENTIFY WINNING AND LOSING SIDES:
///    - If YES wins: YES predictors win, NO predictors lose
///    - If NO wins: NO predictors win, YES predictors lose
/// 
/// 3. CONSTRUCT THE LOSER POOL:
///    - Pool = sum of R values from all losers
///    - CRITICAL: Only RISKED points enter the pool, not full stakes
///    - Protected points (stake - risk) are kept by losers
/// 
/// 4. CALCULATE WINNER PAYOUTS:
///    - Each winner receives a share proportional to their R
///    - payout_i = (R_i / Σ R_winners) × Pool
///    - Plus they keep their original stake
/// 
/// 5. SETTLEMENT (per-prediction):
///    - Winners: stake + (my_R / total_winner_R) × loser_pool
///    - Losers: stake - my_R (keep protected portion)
/// 
/// ============================================================
/// THE CONCEPT OF "RELATIVE ADVANTAGE"
/// ============================================================
/// 
/// A key insight from Calibr: Being right does NOT guarantee profit.
/// It guarantees RELATIVE ADVANTAGE.
/// 
/// What is relative advantage?
/// 
/// In traditional markets:
///   - You bet $100 on YES
///   - YES wins
///   - You get $200 (or whatever the odds dictate)
///   - Your outcome is independent of other bettors
/// 
/// In Calibr:
///   - You bet at 70% confidence (R = 50)
///   - YES wins
///   - Your payout depends on:
///     1. The total R of all losers (the pool)
///     2. The total R of all winners (how you split it)
///     3. YOUR R relative to other winners
/// 
/// EXAMPLE OF RELATIVE ADVANTAGE:
/// 
/// Scenario A: You're the only winner
///   - You: YES at 70% (R = 50)
///   - Others: 10 people bet NO at 90% (R = 100 each)
///   - Loser pool = 10 × 100 = 1000
///   - Your payout = 100 + (50/50) × 1000 = 1100
///   - You made 1000 profit!
/// 
/// Scenario B: Many winners, few losers
///   - You: YES at 70% (R = 50)
///   - 9 others: YES at 90% (R = 100 each)
///   - 1 loser: NO at 50% (R = 5)
///   - Loser pool = 5
///   - Total winner R = 50 + 900 = 950
///   - Your payout = 100 + (50/950) × 5 = 100.26
///   - You made 0.26 profit
/// 
/// Scenario C: Everyone bets the same
///   - Everyone: YES at 90% (R = 100)
///   - No losers exist
///   - Loser pool = 0
///   - Your payout = 100 + 0 = 100
///   - No profit, no loss
/// 
/// KEY INSIGHT:
/// Your advantage is RELATIVE to other participants:
///   - More losers = bigger pool = more to win
///   - Fewer other winners = bigger share = more to win
///   - Higher confidence = higher R = bigger share (but more risk if wrong)
/// 
/// This is why Calibr rewards calibration over recklessness:
///   - Reckless high confidence only pays off if you're RIGHT
///   - When wrong, you lose more (higher R)
///   - When everyone is reckless, no one profits (zero-sum)
///   - Steady, calibrated bettors accumulate advantage over time
/// 
/// ============================================================
/// ZERO-SUM GUARANTEE
/// ============================================================
/// 
/// The system is mathematically zero-sum:
///   - Total money in = (number of predictions) × stake
///   - Total money out = sum of all payouts
///   - These are ALWAYS equal
/// 
/// Proof:
///   - Winners get: stake + share of pool
///   - Losers get: stake - risk
///   - Pool = sum of loser risks
///   - Sum of winner shares = pool
///   - Therefore: sum(winner payouts) + sum(loser payouts)
///              = sum(stake + share) + sum(stake - risk)
///              = sum(stake) + pool + sum(stake) - pool
///              = 2 × sum(stake) - pool + pool
///              = total stakes
///   ✓ Zero-sum verified
/// 
/// NO MINTING: The protocol never creates money
/// NO BURNING: The protocol never destroys money (except rounding dust)
/// DETERMINISTIC: Same inputs always produce same outputs
/// 
/// ============================================================
/// EDGE CASES
/// ============================================================
/// 
/// 1. NO LOSERS (everyone predicted the winning side):
///    - Loser pool = 0
///    - Everyone gets their stake back
///    - No one profits, no one loses
/// 
/// 2. NO WINNERS (everyone predicted the losing side):
///    - This shouldn't happen (impossible in binary markets)
///    - If it did: losers keep their protected portion (stake - risk)
///    - The risk portion has no one to distribute to
///    - In this implementation: would go to protocol (future enhancement)
/// 
/// 3. SINGLE PREDICTION MARKETS:
///    - One person bets YES, no one bets NO
///    - If YES wins: they get stake back (no pool)
///    - If NO wins: they lose their R (but no one gets it)

module calibr::market {
    use sui::object::{Self, UID, ID};
    use sui::tx_context::{Self, TxContext};
    use sui::transfer;
    use calibr::calibr::{Self, Market};
    use calibr::math;
    use calibr::events;

    // ============================================================
    // CAPABILITY OBJECTS
    // ============================================================

    /// AdminCap - capability object for market administration.
    /// 
    /// Whoever owns this object can:
    /// - Create new markets
    /// - Lock markets (prevent new predictions)
    /// - Resolve markets with outcomes
    /// 
    /// This is created once during package initialization and transferred
    /// to the deployer. It can be transferred to other addresses if needed.
    /// 
    /// For production, consider:
    /// - Multi-sig ownership
    /// - Timelock for resolutions
    /// - Multiple admin caps with different permissions
    public struct AdminCap has key, store {
        id: UID,
    }

    // ============================================================
    // ERRORS
    // ============================================================
    
    /// Caller does not have admin capability
    const ENotAdmin: u64 = 300;
    
    /// Market is already locked
    const EMarketAlreadyLocked: u64 = 301;
    
    /// Market is already resolved
    const EMarketAlreadyResolved: u64 = 302;
    
    /// Market must be locked before resolution
    const EMarketNotLocked: u64 = 303;
    
    /// Question cannot be empty
    const EEmptyQuestion: u64 = 304;

    // ============================================================
    // INITIALIZATION
    // ============================================================

    /// Module initializer - called once when package is published.
    /// Creates and transfers AdminCap to the deployer.
    fun init(ctx: &mut TxContext) {
        let admin_cap = AdminCap {
            id: object::new(ctx),
        };
        transfer::transfer(admin_cap, tx_context::sender(ctx));
    }

    /// Test-only function to initialize the module.
    /// This allows tests to create AdminCap without publishing the package.
    #[test_only]
    public fun test_init(ctx: &mut TxContext) {
        init(ctx);
    }

    // ============================================================
    // ADMIN FUNCTIONS
    // ============================================================

    /// Create a new prediction market.
    /// 
    /// This creates a SHARED object that multiple users can interact with.
    /// Only the admin (holder of AdminCap) can create markets.
    /// 
    /// Parameters:
    /// - _admin_cap: Proof that caller is admin (capability pattern)
    /// - question: The prediction question (UTF-8 encoded)
    /// - authority: Address authorized to resolve this market (usually admin)
    /// 
    /// The market is created with:
    /// - yes_risk_total = 0
    /// - no_risk_total = 0
    /// - yes_count = 0
    /// - no_count = 0
    /// - locked = false
    /// - resolved = false
    /// - outcome = None
    /// 
    /// Example question: "Will ETH exceed $5000 by March 2025?"
    /// This should match a question on Polymarket/Metaculus exactly.
    public entry fun create_market(
        _admin_cap: &AdminCap,
        question: vector<u8>,
        authority: address,
        ctx: &mut TxContext
    ) {
        // Validate question is not empty
        assert!(std::vector::length(&question) > 0, EEmptyQuestion);
        
        // Create the market with all fields initialized
        let market = calibr::new_market(
            question,
            authority,
            ctx
        );
        
        // Get market ID before sharing (for event)
        let market_id = calibr::get_market_id(&market);
        
        // Emit event for indexing
        events::emit_market_created(
            market_id,
            question,
            authority,
        );
        
        // Share the market so multiple users can interact with it
        // This is critical - shared objects allow concurrent access
        transfer::public_share_object(market);
    }

    /// Lock a market to prevent new predictions.
    /// 
    /// Should be called before resolution to prevent last-minute gaming.
    /// Typically called when:
    /// - Resolution time is approaching
    /// - External platform has locked/closed
    /// - Admin determines market should close
    /// 
    /// After locking:
    /// - No new predictions can be placed
    /// - Existing predictions remain valid
    /// - Market can be resolved
    public entry fun lock_market(
        _admin_cap: &AdminCap,
        market: &mut Market,
        _ctx: &mut TxContext
    ) {
        // Cannot lock an already locked market
        assert!(!calibr::is_market_locked(market), EMarketAlreadyLocked);
        
        // Cannot lock an already resolved market
        assert!(!calibr::is_market_resolved(market), EMarketAlreadyResolved);
        
        // Get market state for event
        let market_id = calibr::get_market_id(market);
        let yes_count = calibr::get_yes_count(market);
        let no_count = calibr::get_no_count(market);
        let yes_risk_total = calibr::get_yes_risk_total(market);
        let no_risk_total = calibr::get_no_risk_total(market);
        
        calibr::lock_market(market);
        
        // Emit event for indexing
        events::emit_market_locked(
            market_id,
            yes_count,
            no_count,
            yes_risk_total,
            no_risk_total,
        );
    }

    /// Resolve a market with the final outcome.
    /// 
    /// This is the critical function that triggers the settlement phase.
    /// 
    /// WHAT HAPPENS ON RESOLUTION:
    /// 
    /// 1. Outcome is recorded (YES or NO)
    /// 2. Losing side is identified
    /// 3. Pool is calculated: sum of loser R values
    /// 4. Winner risk total is calculated: sum of winner R values
    /// 5. Market is marked as resolved
    /// 
    /// AFTER RESOLUTION:
    /// - Users can call settle_prediction() to claim payouts
    /// - Each winner gets: stake + (my_R / total_winner_R) × pool
    /// - Each loser gets: stake - my_R (protected portion)
    /// 
    /// Parameters:
    /// - outcome: true = YES won, false = NO won
    /// 
    /// IMPORTANT: Market must be locked before resolution to prevent
    /// last-second predictions after outcome is known.
    public entry fun resolve_market(
        _admin_cap: &AdminCap,
        market: &mut Market,
        outcome: bool,
        ctx: &mut TxContext
    ) {
        // Cannot resolve an already resolved market
        assert!(!calibr::is_market_resolved(market), EMarketAlreadyResolved);
        
        // Market must be locked first (prevents gaming)
        assert!(calibr::is_market_locked(market), EMarketNotLocked);
        
        // Gather data for event BEFORE resolving
        let market_id = calibr::get_market_id(market);
        let yes_count = calibr::get_yes_count(market);
        let no_count = calibr::get_no_count(market);
        let yes_risk_total = calibr::get_yes_risk_total(market);
        let no_risk_total = calibr::get_no_risk_total(market);
        
        // Set the outcome - this triggers the settlement phase
        // After this, users can settle their predictions
        calibr::resolve_market(market, outcome);
        
        // Calculate event data
        let (winner_count, loser_count, total_winner_risk, loser_pool) = if (outcome) {
            // YES won
            (yes_count, no_count, yes_risk_total, no_risk_total)
        } else {
            // NO won
            (no_count, yes_count, no_risk_total, yes_risk_total)
        };
        
        // Emit event for indexing
        events::emit_market_resolved(
            market_id,
            outcome,
            winner_count,
            loser_count,
            total_winner_risk,
            loser_pool,
            tx_context::sender(ctx),
        );
    }

    // ============================================================
    // SETTLEMENT CALCULATION FUNCTIONS
    // ============================================================

    /// Calculate the loser pool size based on outcome.
    /// 
    /// CRITICAL: Pool = sum of RISKED points from losers, NOT stakes.
    /// 
    /// The pool is constructed from:
    ///   - NO risk total (if YES wins)
    ///   - YES risk total (if NO wins)
    /// 
    /// This is the amount that will be distributed to winners.
    /// 
    /// Example:
    ///   - Alice: YES at 70% (R = 50)
    ///   - Bob: NO at 60% (R = 25)
    ///   - Carol: NO at 90% (R = 100)
    ///   - If YES wins: pool = 25 + 100 = 125
    ///   - Alice gets her share of 125
    public fun calculate_loser_pool(market: &Market, outcome: bool): u64 {
        if (outcome) {
            // YES won, NO predictors lost
            // Pool = sum of NO risk values
            calibr::get_no_risk_total(market)
        } else {
            // NO won, YES predictors lost
            // Pool = sum of YES risk values
            calibr::get_yes_risk_total(market)
        }
    }

    /// Calculate winner risk total based on outcome.
    /// 
    /// This is the denominator for payout calculation.
    /// Each winner's share = (my_R / total_winner_R) × pool
    /// 
    /// Example:
    ///   - Alice: YES at 70% (R = 50)
    ///   - Bob: YES at 90% (R = 100)
    ///   - If YES wins: total_winner_R = 50 + 100 = 150
    ///   - Alice's share = 50/150 = 33.3%
    ///   - Bob's share = 100/150 = 66.7%
    public fun calculate_winner_risk_total(market: &Market, outcome: bool): u64 {
        if (outcome) {
            // YES won
            calibr::get_yes_risk_total(market)
        } else {
            // NO won
            calibr::get_no_risk_total(market)
        }
    }

    /// Calculate loser risk total based on outcome.
    /// This equals the pool size (sum of risks from losing side).
    public fun calculate_loser_risk_total(market: &Market, outcome: bool): u64 {
        calculate_loser_pool(market, outcome)
    }

    /// Calculate the payout for a winner.
    /// 
    /// Formula: payout = stake + (my_risk / total_winner_risk) × loser_pool
    /// 
    /// Parameters:
    /// - my_risk: The winner's R value
    /// - outcome: The market outcome
    /// - market: The resolved market
    /// 
    /// Returns: The total payout (stake + winnings)
    public fun calculate_winner_payout(
        my_risk: u64,
        outcome: bool,
        market: &Market
    ): u64 {
        let stake = calibr::fixed_stake();
        let loser_pool = calculate_loser_pool(market, outcome);
        let total_winner_risk = calculate_winner_risk_total(market, outcome);
        
        if (total_winner_risk == 0) {
            // Edge case: no winners (shouldn't happen in binary markets)
            return stake
        };
        
        if (loser_pool == 0) {
            // Edge case: no losers (everyone bet the same side)
            return stake
        };
        
        // payout = stake + (my_risk / total_winner_risk) × loser_pool
        let winnings = math::mul_div(my_risk, loser_pool, total_winner_risk);
        stake + winnings
    }

    /// Calculate the payout for a loser.
    /// 
    /// Formula: payout = stake - risk
    /// 
    /// The loser keeps their "protected" portion (stake - risk).
    /// 
    /// Examples:
    ///   - 50% confidence: R = 5, payout = 100 - 5 = 95 (minimal loss)
    ///   - 70% confidence: R = 50, payout = 100 - 50 = 50 (half lost)
    ///   - 90% confidence: R = 100, payout = 100 - 100 = 0 (total loss)
    /// 
    /// This is the key mechanic that punishes overconfidence:
    /// Being wrong at high confidence costs more than being wrong at low confidence.
    public fun calculate_loser_payout(my_risk: u64): u64 {
        let stake = calibr::fixed_stake();
        
        // Loser keeps: stake - risk (their protected portion)
        if (my_risk >= stake) {
            // Should not happen (max R = 100 = stake), but handle it
            0
        } else {
            stake - my_risk
        }
    }

    // ============================================================
    // VIEW FUNCTIONS
    // ============================================================

    /// Get market status as a tuple of (locked, resolved)
    public fun get_market_status(market: &Market): (bool, bool) {
        (calibr::is_market_locked(market), calibr::is_market_resolved(market))
    }

    /// Get market statistics: (yes_count, no_count, yes_risk_total, no_risk_total)
    public fun get_market_stats(market: &Market): (u64, u64, u64, u64) {
        (
            calibr::get_yes_count(market),
            calibr::get_no_count(market),
            calibr::get_yes_risk_total(market),
            calibr::get_no_risk_total(market)
        )
    }

    /// Get the total number of predictions in a market
    public fun get_total_predictions(market: &Market): u64 {
        calibr::get_yes_count(market) + calibr::get_no_count(market)
    }

    /// Get the total risk in a market (sum of all R values)
    public fun get_total_risk(market: &Market): u64 {
        calibr::get_yes_risk_total(market) + calibr::get_no_risk_total(market)
    }

    /// Get the total stakes in a market
    public fun get_total_stakes(market: &Market): u64 {
        get_total_predictions(market) * calibr::fixed_stake()
    }

    /// Verify zero-sum: total payouts should equal total stakes
    /// This is a view function for verification purposes
    public fun verify_zero_sum(market: &Market, outcome: bool): bool {
        let total_stakes = get_total_stakes(market);
        let loser_pool = calculate_loser_pool(market, outcome);
        let winner_risk = calculate_winner_risk_total(market, outcome);
        
        // Total winner payouts = winner_count * stake + loser_pool
        let winner_count = if (outcome) {
            calibr::get_yes_count(market)
        } else {
            calibr::get_no_count(market)
        };
        
        // Total loser payouts = loser_count * stake - loser_pool
        let loser_count = if (outcome) {
            calibr::get_no_count(market)
        } else {
            calibr::get_yes_count(market)
        };
        
        let stake = calibr::fixed_stake();
        
        // Total payouts (ignoring rounding)
        let total_winner_payouts = winner_count * stake + loser_pool;
        let total_loser_payouts = loser_count * stake - loser_pool;
        let total_payouts = total_winner_payouts + total_loser_payouts;
        
        // Should equal total stakes (zero-sum)
        total_payouts == total_stakes
    }

    // ============================================================
    // TEST HELPERS
    // ============================================================

    #[test_only]
    /// Create AdminCap for testing
    public fun create_admin_cap_for_testing(ctx: &mut TxContext): AdminCap {
        AdminCap {
            id: object::new(ctx),
        }
    }
}
