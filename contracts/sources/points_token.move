/// points_token.move
/// 
/// Internal non-transferable points accounting for Calibr protocol.
/// 
/// ============================================================
/// PURPOSE
/// ============================================================
/// 
/// Points represent "judgment capacity" in Calibr:
/// - Users buy points with SUI
/// - Points are consumed when placing predictions
/// - Points are burned on loss, redistributed on win
/// - Points can be redeemed back to SUI (with restrictions)
/// 
/// CRITICAL: Points are NOT tradable, NOT transferable between users.
/// This prevents secondary markets, MEV, and speculation.
/// 
/// ============================================================
/// OWNERSHIP MODEL
/// ============================================================
/// 
/// PointsBalance is an OWNED object:
/// - Each user has exactly one PointsBalance
/// - Only the owner can use their points
/// - No transfer function exists
/// - Points can only be minted/burned by package-internal calls

#[allow(duplicate_alias)]
module calibr::points_token {
    use sui::object::{Self, UID};
    use sui::tx_context::{Self, TxContext};
    use sui::transfer;
    
    // ============================================================
    // CONSTANTS
    // ============================================================
    
    /// Fixed stake per prediction (must match calibr.move)
    const FIXED_STAKE: u64 = 100;
    
    /// Minimum balance to maintain
    const MIN_BALANCE: u64 = 100;
    
    // ============================================================
    // ERRORS
    // ============================================================
    
    /// User has insufficient points balance
    const EInsufficientBalance: u64 = 500;
    
    /// Balance already exists for this user
    const EBalanceAlreadyExists: u64 = 501;
    
    /// No balance found for user
    const ENoBalanceFound: u64 = 502;
    
    /// Operation would leave balance below minimum
    const EBelowMinimumBalance: u64 = 503;
    
    /// Caller is not the owner of this balance
    const ENotOwner: u64 = 504;
    
    /// Zero amount operation not allowed
    const EZeroAmount: u64 = 505;
    
    // ============================================================
    // DATA STRUCTURES
    // ============================================================
    
    /// Per-user points balance. Non-transferable.
    /// 
    /// This object tracks:
    /// - Current spendable balance
    /// - When points were first acquired (for time lock)
    /// - Redemption history (for rate limiting)
    /// 
    /// The object has NO public_transfer - it cannot be transferred!
    public struct PointsBalance has key {
        id: UID,
        /// Owner of this balance
        owner: address,
        /// Current spendable points
        balance: u64,
        /// Epoch when points were first acquired (for time lock)
        first_deposit_epoch: u64,
        /// Total points ever redeemed (lifetime)
        total_redeemed: u64,
        /// Epoch of last redemption (for weekly reset)
        last_redemption_epoch: u64,
        /// Points redeemed in current epoch/week
        redeemed_this_week: u64,
    }
    
    // ============================================================
    // CONSTRUCTOR
    // ============================================================
    
    /// Create a new PointsBalance for the sender.
    /// 
    /// Called by points_market.move on first purchase.
    /// The balance starts at 0 - points are minted separately.
    /// 
    /// Note: We do NOT prevent multiple balances per user at this level.
    /// That check happens in points_market.move via BalanceRegistry.
    public(package) fun create_balance(ctx: &mut TxContext): PointsBalance {
        let sender = tx_context::sender(ctx);
        
        PointsBalance {
            id: object::new(ctx),
            owner: sender,
            balance: 0,
            first_deposit_epoch: 0, // Set on first mint
            total_redeemed: 0,
            last_redemption_epoch: 0,
            redeemed_this_week: 0,
        }
    }
    
    /// Create and transfer balance to owner.
    /// Used by points_market.move.
    public(package) fun create_and_transfer_balance(ctx: &mut TxContext) {
        let balance = create_balance(ctx);
        let owner = balance.owner;
        transfer::transfer(balance, owner);
    }
    
    /// Transfer a PointsBalance to its owner.
    /// This is package-internal to ensure only authorized code can transfer.
    /// Since PointsBalance lacks `store`, only this module can transfer it.
    public(package) fun transfer_balance_to_owner(balance: PointsBalance) {
        let owner = balance.owner;
        transfer::transfer(balance, owner);
    }
    
    // ============================================================
    // CORE OPERATIONS (Package-internal only)
    // ============================================================
    
    /// Add points to user's balance.
    /// 
    /// Called by PointsMarket after SUI payment verified.
    /// Updates first_deposit_epoch if this is the first mint.
    public(package) fun mint(
        balance: &mut PointsBalance, 
        amount: u64,
        current_epoch: u64
    ) {
        assert!(amount > 0, EZeroAmount);
        
        balance.balance = balance.balance + amount;
        
        // Set first deposit epoch if not set
        if (balance.first_deposit_epoch == 0) {
            balance.first_deposit_epoch = current_epoch;
        };
    }
    
    /// Remove points from user's balance.
    /// 
    /// Called on:
    /// - Prediction loss (burned permanently)
    /// - Redemption (converted back to SUI)
    public(package) fun burn(balance: &mut PointsBalance, amount: u64) {
        assert!(amount > 0, EZeroAmount);
        assert!(balance.balance >= amount, EInsufficientBalance);
        
        balance.balance = balance.balance - amount;
    }
    
    /// Deduct fixed stake (100 points) for placing a prediction.
    /// 
    /// This is a convenience function that:
    /// 1. Verifies sufficient balance
    /// 2. Deducts exactly FIXED_STAKE (100)
    /// 3. Returns the stake amount
    /// 
    /// The returned value is always 100, but we return it for clarity.
    public(package) fun deduct_stake(balance: &mut PointsBalance): u64 {
        assert!(balance.balance >= FIXED_STAKE, EInsufficientBalance);
        
        balance.balance = balance.balance - FIXED_STAKE;
        
        FIXED_STAKE
    }
    
    /// Credit payout to user's balance after prediction settlement.
    /// 
    /// Called by prediction.move for:
    /// - Winners: stake + share of loser pool
    /// - Losers: stake - risk (protected portion)
    /// 
    /// For losers with 0 payout, this function is NOT called.
    public(package) fun credit_payout(balance: &mut PointsBalance, amount: u64) {
        if (amount > 0) {
            balance.balance = balance.balance + amount;
        }
    }
    
    // ============================================================
    // REDEMPTION TRACKING (Package-internal)
    // ============================================================
    
    /// Record a redemption and update tracking fields.
    /// Called by redemption.move.
    public(package) fun record_redemption(
        balance: &mut PointsBalance,
        amount: u64,
        current_epoch: u64
    ) {
        // Reset weekly counter if new epoch
        if (current_epoch > balance.last_redemption_epoch) {
            balance.redeemed_this_week = 0;
        };
        
        balance.redeemed_this_week = balance.redeemed_this_week + amount;
        balance.last_redemption_epoch = current_epoch;
        balance.total_redeemed = balance.total_redeemed + amount;
    }
    
    /// Calculate how many points can be redeemed this week.
    /// Returns: (max_redeemable, already_redeemed_this_week)
    public fun calculate_weekly_allowance(
        balance: &PointsBalance,
        current_epoch: u64
    ): (u64, u64) {
        // Reset if new epoch
        let already_redeemed = if (current_epoch > balance.last_redemption_epoch) {
            0
        } else {
            balance.redeemed_this_week
        };
        
        // 10% of current balance
        let max_this_week = balance.balance / 10;
        
        let remaining = if (max_this_week > already_redeemed) {
            max_this_week - already_redeemed
        } else {
            0
        };
        
        (remaining, already_redeemed)
    }
    
    // ============================================================
    // ACCESSOR FUNCTIONS (Read-only)
    // ============================================================
    
    /// Get current spendable balance
    public fun get_balance(bal: &PointsBalance): u64 {
        bal.balance
    }
    
    /// Get owner address
    public fun get_owner(bal: &PointsBalance): address {
        bal.owner
    }
    
    /// Get epoch of first deposit
    public fun get_first_deposit_epoch(bal: &PointsBalance): u64 {
        bal.first_deposit_epoch
    }
    
    /// Get total lifetime redeemed
    public fun get_total_redeemed(bal: &PointsBalance): u64 {
        bal.total_redeemed
    }
    
    /// Get last redemption epoch
    public fun get_last_redemption_epoch(bal: &PointsBalance): u64 {
        bal.last_redemption_epoch
    }
    
    /// Get amount redeemed this week
    public fun get_redeemed_this_week(bal: &PointsBalance): u64 {
        bal.redeemed_this_week
    }
    
    /// Check if user can afford a prediction (has >= 100 points)
    public fun can_predict(bal: &PointsBalance): bool {
        bal.balance >= FIXED_STAKE
    }
    
    // ============================================================
    // CONSTANT GETTERS
    // ============================================================
    
    public fun fixed_stake(): u64 { FIXED_STAKE }
    public fun min_balance(): u64 { MIN_BALANCE }
}
