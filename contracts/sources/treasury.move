/// treasury.move
/// 
/// Treasury for Calibr Points Economy.
/// Holds all SUI backing for the points system.
/// 
/// ============================================================
/// PURPOSE
/// ============================================================
/// 
/// The Treasury is the ONLY place where real money (SUI) is held:
/// - Receives SUI when users buy points
/// - Sends SUI when users redeem points
/// - Accumulates fees from redemptions
/// 
/// CRITICAL RULES:
/// - Treasury does NOT subsidize gameplay
/// - Treasury is NOT used for prediction payouts
/// - Money flows: BUY → Treasury || Treasury → REDEEM
/// 
/// ============================================================
/// OWNERSHIP MODEL
/// ============================================================
/// 
/// Treasury is a SHARED object (singleton):
/// - Only one Treasury exists
/// - Any user can deposit (via buy_points)
/// - Only qualified users can withdraw (via redeem_points)
/// - Admin can withdraw accumulated fees

module calibr::treasury {
    use sui::object::{Self, UID};
    use sui::tx_context::{Self, TxContext};
    use sui::transfer;
    use sui::balance::{Self, Balance};
    use sui::coin::{Self, Coin};
    use sui::sui::SUI;
    use calibr::market::AdminCap;
    
    // ============================================================
    // ERRORS
    // ============================================================
    
    /// Caller is not authorized for this action
    const EUnauthorized: u64 = 600;
    
    /// Insufficient balance in treasury
    const EInsufficientTreasuryBalance: u64 = 601;
    
    /// No fees to withdraw
    const ENoFeesToWithdraw: u64 = 602;
    
    // ============================================================
    // DATA STRUCTURES
    // ============================================================
    
    /// Main treasury holding all SUI backing.
    /// 
    /// This is a SHARED object - created once at deploy.
    public struct Treasury has key {
        id: UID,
        /// SUI balance held as backing for all points
        balance: Balance<SUI>,
        /// Total points ever minted (for bonding curve calculation)
        total_minted: u64,
        /// Currently circulating points (minted - burned)
        circulating_supply: u64,
        /// Total points burned (from losses + redemption)
        total_burned: u64,
        /// Accumulated fees from redemptions (in MIST)
        accumulated_fees: u64,
    }
    
    // ============================================================
    // INITIALIZATION
    // ============================================================
    
    /// Initialize the Treasury singleton.
    /// Called automatically when package is published.
    fun init(ctx: &mut TxContext) {
        let treasury = Treasury {
            id: object::new(ctx),
            balance: balance::zero<SUI>(),
            total_minted: 0,
            circulating_supply: 0,
            total_burned: 0,
            accumulated_fees: 0,
        };
        
        transfer::share_object(treasury);
    }
    
    // ============================================================
    // DEPOSIT (Package-internal)
    // ============================================================
    
    /// Deposit SUI into treasury.
    /// Called by points_market.move when user buys points.
    /// 
    /// Returns the amount deposited (in MIST).
    public(package) fun deposit(
        treasury: &mut Treasury,
        payment: Coin<SUI>
    ): u64 {
        let amount = coin::value(&payment);
        let payment_balance = coin::into_balance(payment);
        balance::join(&mut treasury.balance, payment_balance);
        amount
    }
    
    /// Record points minted.
    /// Called after successful purchase.
    public(package) fun record_mint(treasury: &mut Treasury, points: u64) {
        treasury.total_minted = treasury.total_minted + points;
        treasury.circulating_supply = treasury.circulating_supply + points;
    }
    
    // ============================================================
    // WITHDRAWAL (Package-internal)
    // ============================================================
    
    /// Withdraw SUI from treasury for redemption.
    /// Called by redemption.move when user redeems points.
    /// 
    /// Verifies sufficient balance before withdrawal.
    public(package) fun withdraw(
        treasury: &mut Treasury,
        amount: u64,
        ctx: &mut TxContext
    ): Coin<SUI> {
        assert!(
            balance::value(&treasury.balance) >= amount,
            EInsufficientTreasuryBalance
        );
        
        coin::take(&mut treasury.balance, amount, ctx)
    }
    
    /// Record points burned (from loss or redemption).
    public(package) fun record_burn(treasury: &mut Treasury, points: u64) {
        treasury.total_burned = treasury.total_burned + points;
        treasury.circulating_supply = treasury.circulating_supply - points;
    }
    
    /// Record accumulated fees from redemption.
    /// Fee is kept in treasury balance, just tracked separately.
    public(package) fun record_fee(treasury: &mut Treasury, fee_amount: u64) {
        treasury.accumulated_fees = treasury.accumulated_fees + fee_amount;
    }
    
    // ============================================================
    // ADMIN FUNCTIONS
    // ============================================================
    
    /// Admin function to withdraw accumulated fees.
    /// Requires AdminCap from market.move.
    public entry fun withdraw_fees(
        treasury: &mut Treasury,
        _admin_cap: &AdminCap,
        ctx: &mut TxContext
    ) {
        let fee_amount = treasury.accumulated_fees;
        assert!(fee_amount > 0, ENoFeesToWithdraw);
        
        // Check treasury has enough balance
        assert!(
            balance::value(&treasury.balance) >= fee_amount,
            EInsufficientTreasuryBalance
        );
        
        // Reset accumulated fees
        treasury.accumulated_fees = 0;
        
        // Withdraw and transfer to sender (admin)
        let fees = coin::take(&mut treasury.balance, fee_amount, ctx);
        transfer::public_transfer(fees, tx_context::sender(ctx));
    }
    
    // ============================================================
    // VIEW FUNCTIONS
    // ============================================================
    
    /// Get total SUI balance in treasury (in MIST)
    public fun get_total_backing(treasury: &Treasury): u64 {
        balance::value(&treasury.balance)
    }
    
    /// Get total points ever minted
    public fun get_total_minted(treasury: &Treasury): u64 {
        treasury.total_minted
    }
    
    /// Get currently circulating points
    public fun get_circulating_supply(treasury: &Treasury): u64 {
        treasury.circulating_supply
    }
    
    /// Get total points burned
    public fun get_total_burned(treasury: &Treasury): u64 {
        treasury.total_burned
    }
    
    /// Get accumulated fees (in MIST)
    public fun get_accumulated_fees(treasury: &Treasury): u64 {
        treasury.accumulated_fees
    }
    
    /// Calculate backing ratio (SUI per point, scaled by 1_000_000)
    /// Returns 0 if no points in circulation.
    public fun get_backing_ratio(treasury: &Treasury): u64 {
        if (treasury.circulating_supply == 0) {
            return 0
        };
        
        (balance::value(&treasury.balance) * 1_000_000) / treasury.circulating_supply
    }
    
    // ============================================================
    // TEST HELPERS
    // ============================================================
    
    #[test_only]
    public fun create_treasury_for_testing(ctx: &mut TxContext): Treasury {
        Treasury {
            id: object::new(ctx),
            balance: balance::zero<SUI>(),
            total_minted: 0,
            circulating_supply: 0,
            total_burned: 0,
            accumulated_fees: 0,
        }
    }
}
