/// points_market.move
/// 
/// Buy points with SUI using a bonding curve.
/// 
/// ============================================================
/// PURPOSE
/// ============================================================
/// 
/// The Points Market allows users to:
/// - Purchase points with SUI at a dynamic price
/// - Price increases with total supply (bonding curve)
/// - Creates demand-driven pricing without speculation
/// 
/// CRITICAL RULES:
/// - Points ONLY enter the system through buy_points
/// - Pricing is monotonically increasing with demand
/// - No arbitrage loops (redemption has restrictions)
/// 
/// ============================================================
/// BONDING CURVE
/// ============================================================
/// 
/// Formula: price_per_100 = base_price × (1 + alpha × total_minted / supply_cap)
/// 
/// Example with default values:
/// - base_price = 10_000_000 MIST (0.01 SUI per 100 points)
/// - alpha = 1 (scaled)
/// - supply_cap = 100_000_000 points
/// 
/// | Total Minted | Price per 100 Points |
/// |--------------|---------------------|
/// | 0            | 0.01 SUI            |
/// | 10M          | 0.011 SUI           |
/// | 50M          | 0.015 SUI           |
/// | 100M         | 0.02 SUI            |

#[allow(duplicate_alias, lint(public_entry))]
module calibr::points_market {
    use sui::object::{Self, UID, ID};
    use sui::tx_context::{Self, TxContext};
    use sui::transfer;
    use sui::coin::{Self, Coin};
    use sui::sui::SUI;
    use sui::table::{Self, Table};
    use calibr::treasury::{Self, Treasury};
    use calibr::points_token::{Self, PointsBalance};
    use calibr::events;
    
    // ============================================================
    // CONSTANTS
    // ============================================================
    
    /// Default base price: 0.01 SUI per 100 points = 10_000_000 MIST
    const DEFAULT_BASE_PRICE: u64 = 10_000_000;
    
    /// Default alpha coefficient (scaled by 1_000_000)
    /// 1 means 100% increase at supply_cap
    const DEFAULT_ALPHA: u64 = 1_000_000;
    
    /// Default supply cap: 100 million points
    const DEFAULT_SUPPLY_CAP: u64 = 100_000_000;
    
    /// Points are bought in multiples of 100
    const POINTS_UNIT: u64 = 100;
    
    /// Scaling factor for price calculations
    const SCALE: u64 = 1_000_000;
    
    // ============================================================
    // ERRORS
    // ============================================================
    
    /// Payment is insufficient for desired points
    const EInsufficientPayment: u64 = 510;
    
    /// Amount must be multiple of 100
    const EInvalidAmount: u64 = 511;
    
    /// Amount must be greater than zero
    const EZeroAmount: u64 = 512;
    
    /// User already has a PointsBalance
    const EBalanceAlreadyExists: u64 = 513;
    
    /// User does not have a PointsBalance
    const ENoBalance: u64 = 514;
    
    // ============================================================
    // DATA STRUCTURES
    // ============================================================
    
    /// Configuration for bonding curve pricing.
    /// Shared singleton object.
    public struct PointsMarketConfig has key {
        id: UID,
        /// Base price per 100 points in MIST
        base_price_mist: u64,
        /// Alpha coefficient (scaled by 1_000_000)
        alpha: u64,
        /// Supply cap for pricing curve
        supply_cap: u64,
    }
    
    /// Registry tracking which addresses have PointsBalance.
    /// Prevents multiple balances per user.
    public struct BalanceRegistry has key {
        id: UID,
        /// Map of address -> PointsBalance object ID
        balances: Table<address, ID>,
    }
    
    // ============================================================
    // INITIALIZATION
    // ============================================================
    
    /// Initialize PointsMarketConfig and BalanceRegistry.
    fun init(ctx: &mut TxContext) {
        // Create market config
        let config = PointsMarketConfig {
            id: object::new(ctx),
            base_price_mist: DEFAULT_BASE_PRICE,
            alpha: DEFAULT_ALPHA,
            supply_cap: DEFAULT_SUPPLY_CAP,
        };
        transfer::share_object(config);
        
        // Create balance registry
        let registry = BalanceRegistry {
            id: object::new(ctx),
            balances: table::new(ctx),
        };
        transfer::share_object(registry);
    }
    
    // ============================================================
    // PRICING FUNCTIONS
    // ============================================================
    
    /// Calculate cost in MIST for purchasing `points` amount.
    /// 
    /// Formula: price_per_100 = base_price × (1 + alpha × total_minted / supply_cap)
    /// 
    /// Uses current total_minted from treasury for bonding curve.
    public fun calculate_price(
        config: &PointsMarketConfig,
        treasury: &Treasury,
        points: u64
    ): u64 {
        assert!(points % POINTS_UNIT == 0, EInvalidAmount);
        assert!(points > 0, EZeroAmount);
        
        let units = points / POINTS_UNIT;
        let total_minted = treasury::get_total_minted(treasury);
        
        // Calculate bonding curve multiplier (scaled)
        // multiplier = 1 + (alpha × total_minted / supply_cap)
        // All scaled by SCALE (1_000_000)
        let alpha_effect = (config.alpha * total_minted) / config.supply_cap;
        let multiplier = SCALE + alpha_effect;
        
        // price_per_100 = base_price × multiplier / SCALE
        let price_per_unit = (config.base_price_mist * multiplier) / SCALE;
        
        // Total cost for all units
        price_per_unit * units
    }
    
    /// Get current price per 100 points in MIST.
    public fun get_current_price(
        config: &PointsMarketConfig,
        treasury: &Treasury
    ): u64 {
        calculate_price(config, treasury, POINTS_UNIT)
    }
    
    // ============================================================
    // BALANCE CREATION
    // ============================================================
    
    /// Check if address has a PointsBalance.
    public fun has_balance(registry: &BalanceRegistry, addr: address): bool {
        table::contains(&registry.balances, addr)
    }
    
    /// Get PointsBalance ID for address (if exists).
    public fun get_balance_id(registry: &BalanceRegistry, addr: address): ID {
        *table::borrow(&registry.balances, addr)
    }
    
    /// Create a new PointsBalance for sender.
    /// Reverts if user already has a balance.
    public entry fun create_balance(
        registry: &mut BalanceRegistry,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        
        // Check user doesn't already have a balance
        assert!(!table::contains(&registry.balances, sender), EBalanceAlreadyExists);
        
        // Create balance
        let balance = points_token::create_balance(ctx);
        let balance_id = object::id(&balance);
        
        // Register
        table::add(&mut registry.balances, sender, balance_id);
        
        // Transfer to owner (must use package function since PointsBalance lacks `store`)
        points_token::transfer_balance_to_owner(balance);
    }
    
    // ============================================================
    // BUY POINTS
    // ============================================================
    
    /// Purchase points with SUI.
    /// 
    /// Process:
    /// 1. Validate points amount (must be multiple of 100)
    /// 2. Calculate cost using bonding curve
    /// 3. Verify payment is sufficient
    /// 4. Deposit SUI to treasury
    /// 5. Mint points to user's balance
    /// 6. Return excess payment
    /// 
    /// User must already have a PointsBalance (call create_balance first).
    public entry fun buy_points(
        config: &PointsMarketConfig,
        treasury: &mut Treasury,
        balance: &mut PointsBalance,
        payment: Coin<SUI>,
        desired_points: u64,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        
        // Validate ownership
        assert!(points_token::get_owner(balance) == sender, ENoBalance);
        
        // Validate points amount
        assert!(desired_points % POINTS_UNIT == 0, EInvalidAmount);
        assert!(desired_points > 0, EZeroAmount);
        
        // Calculate cost at current price
        let cost = calculate_price(config, treasury, desired_points);
        let payment_value = coin::value(&payment);
        
        // Verify sufficient payment
        assert!(payment_value >= cost, EInsufficientPayment);
        
        // Split exact cost from payment
        let mut remaining = payment;
        let paid = coin::split(&mut remaining, cost, ctx);
        
        // Deposit to treasury
        treasury::deposit(treasury, paid);
        
        // Record mint in treasury
        treasury::record_mint(treasury, desired_points);
        
        // Mint points to user's balance
        let current_epoch = tx_context::epoch(ctx);
        points_token::mint(balance, desired_points, current_epoch);
        
        // Return excess payment to sender
        if (coin::value(&remaining) > 0) {
            transfer::public_transfer(remaining, sender);
        } else {
            coin::destroy_zero(remaining);
        };
        
        // Emit event
        events::emit_points_purchased(
            sender,
            desired_points,
            cost,
        );
    }
    
    /// Convenience function: Create balance and buy points in one transaction.
    public entry fun create_balance_and_buy(
        config: &PointsMarketConfig,
        treasury: &mut Treasury,
        registry: &mut BalanceRegistry,
        payment: Coin<SUI>,
        desired_points: u64,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        
        // Check user doesn't already have a balance
        assert!(!table::contains(&registry.balances, sender), EBalanceAlreadyExists);
        
        // Validate points amount
        assert!(desired_points % POINTS_UNIT == 0, EInvalidAmount);
        assert!(desired_points > 0, EZeroAmount);
        
        // Calculate cost
        let cost = calculate_price(config, treasury, desired_points);
        let payment_value = coin::value(&payment);
        assert!(payment_value >= cost, EInsufficientPayment);
        
        // Split payment
        let mut remaining = payment;
        let paid = coin::split(&mut remaining, cost, ctx);
        
        // Deposit to treasury
        treasury::deposit(treasury, paid);
        treasury::record_mint(treasury, desired_points);
        
        // Create balance
        let mut balance = points_token::create_balance(ctx);
        let balance_id = object::id(&balance);
        
        // Register balance
        table::add(&mut registry.balances, sender, balance_id);
        
        // Mint points
        let current_epoch = tx_context::epoch(ctx);
        points_token::mint(&mut balance, desired_points, current_epoch);
        
        // Transfer balance to owner (must use package function since PointsBalance lacks `store`)
        points_token::transfer_balance_to_owner(balance);
        
        // Return excess payment
        if (coin::value(&remaining) > 0) {
            transfer::public_transfer(remaining, sender);
        } else {
            coin::destroy_zero(remaining);
        };
        
        // Emit event
        events::emit_points_purchased(sender, desired_points, cost);
    }
    
    // ============================================================
    // VIEW FUNCTIONS
    // ============================================================
    
    /// Get base price from config
    public fun get_base_price(config: &PointsMarketConfig): u64 {
        config.base_price_mist
    }
    
    /// Get alpha from config
    public fun get_alpha(config: &PointsMarketConfig): u64 {
        config.alpha
    }
    
    /// Get supply cap from config
    public fun get_supply_cap(config: &PointsMarketConfig): u64 {
        config.supply_cap
    }
    
    /// Get constants
    public fun points_unit(): u64 { POINTS_UNIT }
    public fun scale(): u64 { SCALE }
    
    // ============================================================
    // TEST HELPERS
    // ============================================================
    
    #[test_only]
    public fun create_config_for_testing(ctx: &mut TxContext): PointsMarketConfig {
        PointsMarketConfig {
            id: object::new(ctx),
            base_price_mist: DEFAULT_BASE_PRICE,
            alpha: DEFAULT_ALPHA,
            supply_cap: DEFAULT_SUPPLY_CAP,
        }
    }
    
    #[test_only]
    public fun create_registry_for_testing(ctx: &mut TxContext): BalanceRegistry {
        BalanceRegistry {
            id: object::new(ctx),
            balances: table::new(ctx),
        }
    }
}
