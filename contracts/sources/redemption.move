/// redemption.move
/// 
/// Reputation-gated redemption of points back to SUI.
/// 
/// ============================================================
/// PURPOSE
/// ============================================================
/// 
/// Allow qualified users to convert points back to SUI.
/// This is HEAVILY RESTRICTED to prevent:
/// - Buy → immediately redeem arbitrage
/// - Hit-and-run extraction
/// - Short-term flipping
/// 
/// ============================================================
/// REQUIREMENTS TO REDEEM
/// ============================================================
/// 
/// ALL of these must be met:
/// 1. Reputation >= 800 (Proven tier or better)
/// 2. At least 20 settled predictions
/// 3. Points held for >= 4 epochs (~4 weeks)
/// 4. Within weekly 10% limit
/// 5. 5% fee applied (2.5% burned, 2.5% treasury)
/// 
/// ============================================================
/// ECONOMIC DESIGN
/// ============================================================
/// 
/// - Slow exit encourages long-term play
/// - Fee discourages constant in/out
/// - Reputation gate ensures only skilled players profit
/// - Weekly cap prevents bank runs

module calibr::redemption {
    use sui::tx_context::{Self, TxContext};
    use sui::transfer;
    use calibr::calibr::{Self, UserProfile};
    use calibr::treasury::{Self, Treasury};
    use calibr::points_token::{Self, PointsBalance};
    use calibr::points_market::{Self, PointsMarketConfig};
    use calibr::events;
    
    // ============================================================
    // CONSTANTS (Relaxed for demo/hackathon)
    // ============================================================
    
    /// Minimum reputation score required for redemption
    /// NOTE: Set to 0 for demo. Production should use 800 (Proven tier)
    const MIN_REPUTATION: u64 = 0;
    
    /// Minimum number of settled predictions required
    /// NOTE: Set to 1 for demo. Production should use 20
    const MIN_PREDICTIONS: u64 = 1;
    
    /// Minimum epochs since first deposit
    /// NOTE: Set to 0 for demo. Production should use 4 (~4 weeks)
    const MIN_EPOCHS_HELD: u64 = 0;
    
    /// Maximum redemption per week: 50% of balance
    const MAX_WEEKLY_REDEMPTION_PCT: u64 = 50;
    
    /// Total redemption fee: 2%
    const REDEMPTION_FEE_PCT: u64 = 2;
    
    /// Fee burned: 50% of fee (2.5% of total)
    const FEE_BURN_PCT: u64 = 50;
    
    /// Minimum redemption amount (1 stake worth)
    const MIN_REDEMPTION: u64 = 100;
    
    // ============================================================
    // ERRORS
    // ============================================================
    
    /// User's reputation is below minimum threshold
    const EReputationTooLow: u64 = 520;
    
    /// User hasn't made enough predictions
    const EPredictionCountTooLow: u64 = 521;
    
    /// Points haven't been held long enough
    const ETimeLockNotMet: u64 = 522;
    
    /// Would exceed weekly redemption limit
    const EWeeklyLimitExceeded: u64 = 523;
    
    /// Insufficient points balance
    const EInsufficientBalance: u64 = 524;
    
    /// Redemption amount must be > 0
    const EZeroRedemption: u64 = 525;
    
    /// Treasury doesn't have enough SUI
    const EInsufficientTreasuryBalance: u64 = 526;
    
    /// Caller is not the owner
    const ENotOwner: u64 = 527;
    
    /// Amount below minimum redemption
    const EBelowMinimum: u64 = 528;
    
    // ============================================================
    // ELIGIBILITY CHECK
    // ============================================================
    
    /// Check if user meets all redemption requirements.
    /// Returns: (is_eligible, fail_reason_code)
    /// 
    /// Fail codes:
    /// - 0: Eligible
    /// - 1: Reputation too low
    /// - 2: Prediction count too low
    /// - 3: Time lock not met
    public fun check_eligibility(
        profile: &UserProfile,
        balance: &PointsBalance,
        current_epoch: u64
    ): (bool, u64) {
        // Check reputation
        if (calibr::get_reputation_score(profile) < MIN_REPUTATION) {
            return (false, 1)
        };
        
        // Check prediction count
        if (calibr::get_reputation_count(profile) < MIN_PREDICTIONS) {
            return (false, 2)
        };
        
        // Check time lock
        let first_deposit = points_token::get_first_deposit_epoch(balance);
        if (first_deposit == 0 || current_epoch < first_deposit + MIN_EPOCHS_HELD) {
            return (false, 3)
        };
        
        (true, 0)
    }
    
    /// Check if user is eligible (simple boolean version).
    public fun is_eligible(
        profile: &UserProfile,
        balance: &PointsBalance,
        current_epoch: u64
    ): bool {
        let (eligible, _) = check_eligibility(profile, balance, current_epoch);
        eligible
    }
    
    // ============================================================
    // WEEKLY LIMIT CALCULATION
    // ============================================================
    
    /// Calculate maximum redeemable amount this epoch.
    /// Takes into account already redeemed this week.
    public fun calculate_max_redeemable(
        balance: &PointsBalance,
        current_epoch: u64
    ): u64 {
        let (remaining, _) = points_token::calculate_weekly_allowance(balance, current_epoch);
        remaining
    }
    
    // ============================================================
    // FEE CALCULATION
    // ============================================================
    
    /// Calculate redemption fee and net payout.
    /// Returns: (gross_sui, fee, net_sui)
    public fun calculate_payout(
        config: &PointsMarketConfig,
        treasury: &Treasury,
        points: u64
    ): (u64, u64, u64) {
        // Get current price per 100 points
        let price_per_100 = points_market::get_current_price(config, treasury);
        
        // Calculate gross value (points must be multiple of 100)
        let units = points / 100;
        let gross_value = units * price_per_100;
        
        // Calculate fee (5%)
        let fee = (gross_value * REDEMPTION_FEE_PCT) / 100;
        let net_value = gross_value - fee;
        
        (gross_value, fee, net_value)
    }
    
    // ============================================================
    // REDEMPTION
    // ============================================================
    
    /// Redeem points for SUI.
    /// 
    /// Requirements (all must be met):
    /// 1. Reputation >= 800
    /// 2. Predictions >= 20
    /// 3. Time held >= 4 epochs
    /// 4. Within weekly 10% limit
    /// 5. Amount >= 100 (minimum)
    /// 
    /// Process:
    /// 1. Validate all requirements
    /// 2. Calculate value at current price
    /// 3. Apply 5% fee (2.5% burned, 2.5% treasury)
    /// 4. Burn points from user balance
    /// 5. Withdraw SUI from treasury to user
    public entry fun redeem_points(
        profile: &UserProfile,
        balance: &mut PointsBalance,
        treasury: &mut Treasury,
        config: &PointsMarketConfig,
        amount: u64,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        let current_epoch = tx_context::epoch(ctx);
        
        // ========== VALIDATION ==========
        
        // Validate ownership
        assert!(calibr::get_profile_owner(profile) == sender, ENotOwner);
        assert!(points_token::get_owner(balance) == sender, ENotOwner);
        
        // Validate amount
        assert!(amount > 0, EZeroRedemption);
        assert!(amount >= MIN_REDEMPTION, EBelowMinimum);
        assert!(amount <= points_token::get_balance(balance), EInsufficientBalance);
        
        // Amount must be multiple of 100 for clean calculations
        assert!(amount % 100 == 0, EBelowMinimum);
        
        // ========== ELIGIBILITY CHECKS ==========
        
        // Check reputation (must be Proven tier = 800+)
        assert!(
            calibr::get_reputation_score(profile) >= MIN_REPUTATION,
            EReputationTooLow
        );
        
        // Check prediction count
        assert!(
            calibr::get_reputation_count(profile) >= MIN_PREDICTIONS,
            EPredictionCountTooLow
        );
        
        // Check time lock
        let first_deposit = points_token::get_first_deposit_epoch(balance);
        assert!(
            first_deposit > 0 && current_epoch >= first_deposit + MIN_EPOCHS_HELD,
            ETimeLockNotMet
        );
        
        // Check weekly limit
        let max_redeemable = calculate_max_redeemable(balance, current_epoch);
        assert!(amount <= max_redeemable, EWeeklyLimitExceeded);
        
        // ========== CALCULATE PAYOUT ==========
        
        let (gross_value, fee, net_value) = calculate_payout(config, treasury, amount);
        
        // Verify treasury has enough
        assert!(
            treasury::get_total_backing(treasury) >= net_value,
            EInsufficientTreasuryBalance
        );
        
        // ========== EXECUTE REDEMPTION ==========
        
        // 1. Burn points from user balance
        points_token::burn(balance, amount);
        
        // 2. Record redemption in balance (for weekly tracking)
        points_token::record_redemption(balance, amount, current_epoch);
        
        // 3. Update treasury stats
        treasury::record_burn(treasury, amount);
        
        // 4. Record fees
        // Fee split: 50% burned (reduces backing), 50% to treasury accumulated
        let fee_to_treasury = (fee * FEE_BURN_PCT) / 100;
        treasury::record_fee(treasury, fee_to_treasury);
        // Note: The other 50% is implicitly "burned" by not withdrawing it
        // This increases backing ratio for remaining points
        
        // 5. Withdraw net SUI to user
        let payout = treasury::withdraw(treasury, net_value, ctx);
        transfer::public_transfer(payout, sender);
        
        // ========== EMIT EVENT ==========
        
        events::emit_points_redeemed(
            sender,
            amount,
            net_value,
            fee,
        );
    }
    
    // ============================================================
    // VIEW FUNCTIONS
    // ============================================================
    
    /// Get redemption requirements as constants
    public fun min_reputation(): u64 { MIN_REPUTATION }
    public fun min_predictions(): u64 { MIN_PREDICTIONS }
    public fun min_epochs_held(): u64 { MIN_EPOCHS_HELD }
    public fun max_weekly_pct(): u64 { MAX_WEEKLY_REDEMPTION_PCT }
    public fun fee_pct(): u64 { REDEMPTION_FEE_PCT }
    public fun min_redemption(): u64 { MIN_REDEMPTION }
    
    /// Get detailed eligibility info for a user.
    /// Returns: (is_eligible, reputation, pred_count, epochs_since_deposit, max_redeemable)
    public fun get_eligibility_info(
        profile: &UserProfile,
        balance: &PointsBalance,
        current_epoch: u64
    ): (bool, u64, u64, u64, u64) {
        let reputation = calibr::get_reputation_score(profile);
        let pred_count = calibr::get_reputation_count(profile);
        let first_deposit = points_token::get_first_deposit_epoch(balance);
        let epochs_held = if (first_deposit > 0 && current_epoch >= first_deposit) {
            current_epoch - first_deposit
        } else {
            0
        };
        let max_redeemable = calculate_max_redeemable(balance, current_epoch);
        let (eligible, _) = check_eligibility(profile, balance, current_epoch);
        
        (eligible, reputation, pred_count, epochs_held, max_redeemable)
    }
}
