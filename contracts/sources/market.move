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

module calibr::market {
    use sui::object::{Self, UID};
    use sui::tx_context::{Self, TxContext};
    use sui::transfer;
    use calibr::calibr::{Self, Market};

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
        
        calibr::lock_market(market);
    }

    /// Resolve a market with the final outcome.
    /// 
    /// This should ONLY be called after the external platform (Polymarket,
    /// Metaculus, etc.) has resolved the market. The admin is trusted to
    /// faithfully relay the external resolution.
    /// 
    /// Parameters:
    /// - outcome: true = YES won, false = NO won
    /// 
    /// After resolution:
    /// - Users can settle their predictions
    /// - Winners receive payouts from loser pool
    /// - Reputation updates occur
    /// 
    /// IMPORTANT: Market must be locked before resolution to prevent
    /// last-second predictions after outcome is known.
    public entry fun resolve_market(
        _admin_cap: &AdminCap,
        market: &mut Market,
        outcome: bool,
        _ctx: &mut TxContext
    ) {
        // Cannot resolve an already resolved market
        assert!(!calibr::is_market_resolved(market), EMarketAlreadyResolved);
        
        // Market must be locked first (prevents gaming)
        assert!(calibr::is_market_locked(market), EMarketNotLocked);
        
        calibr::resolve_market(market, outcome);
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

    /// Calculate loser pool size based on outcome.
    /// Losers fund the pool: loser_count × FIXED_STAKE (100)
    public fun calculate_loser_pool(market: &Market, outcome: bool): u64 {
        let fixed_stake = calibr::fixed_stake();
        if (outcome) {
            // YES won, so NO predictors lost
            calibr::get_no_count(market) * fixed_stake
        } else {
            // NO won, so YES predictors lost
            calibr::get_yes_count(market) * fixed_stake
        }
    }

    /// Calculate winner risk total based on outcome.
    /// Used to determine each winner's share of the pool.
    public fun calculate_winner_risk_total(market: &Market, outcome: bool): u64 {
        if (outcome) {
            // YES won
            calibr::get_yes_risk_total(market)
        } else {
            // NO won
            calibr::get_no_risk_total(market)
        }
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
