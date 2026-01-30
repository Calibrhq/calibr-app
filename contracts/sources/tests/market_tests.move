/// market_tests.move
/// 
/// Unit tests for the market module.
/// Run with: sui move test

#[test_only]
module calibr::market_tests {
    use sui::test_scenario::{Self as ts, Scenario};
    use calibr::market::{Self, AdminCap};
    use calibr::calibr::{Self, Market};

    // Test addresses
    const ADMIN: address = @0xAD;
    const USER1: address = @0x1;

    // ============================================================
    // HELPER FUNCTIONS
    // ============================================================

    fun setup_test(): Scenario {
        let mut scenario = ts::begin(ADMIN);
        {
            // Create admin cap
            let ctx = ts::ctx(&mut scenario);
            let admin_cap = market::create_admin_cap_for_testing(ctx);
            sui::transfer::public_transfer(admin_cap, ADMIN);
        };
        scenario
    }

    // ============================================================
    // MARKET CREATION TESTS
    // ============================================================

    #[test]
    fun test_create_market() {
        let mut scenario = setup_test();
        
        // Admin creates a market
        ts::next_tx(&mut scenario, ADMIN);
        {
            let admin_cap = ts::take_from_sender<AdminCap>(&scenario);
            let ctx = ts::ctx(&mut scenario);
            
            market::create_market(
                &admin_cap,
                b"Will BTC exceed $100k by Dec 2025?",
                ADMIN,
                ctx
            );
            
            ts::return_to_sender(&scenario, admin_cap);
        };
        
        // Verify market was created
        ts::next_tx(&mut scenario, USER1);
        {
            let market = ts::take_shared<Market>(&scenario);
            
            // Check initial state
            assert!(calibr::get_yes_count(&market) == 0, 0);
            assert!(calibr::get_no_count(&market) == 0, 1);
            assert!(calibr::get_yes_risk_total(&market) == 0, 2);
            assert!(calibr::get_no_risk_total(&market) == 0, 3);
            assert!(!calibr::is_market_locked(&market), 4);
            assert!(!calibr::is_market_resolved(&market), 5);
            assert!(calibr::is_market_open(&market), 6);
            assert!(calibr::get_market_authority(&market) == ADMIN, 7);
            
            ts::return_shared(market);
        };
        
        ts::end(scenario);
    }

    #[test]
    fun test_lock_market() {
        let mut scenario = setup_test();
        
        // Create market
        ts::next_tx(&mut scenario, ADMIN);
        {
            let admin_cap = ts::take_from_sender<AdminCap>(&scenario);
            let ctx = ts::ctx(&mut scenario);
            market::create_market(&admin_cap, b"Test market", ADMIN, ctx);
            ts::return_to_sender(&scenario, admin_cap);
        };
        
        // Lock market
        ts::next_tx(&mut scenario, ADMIN);
        {
            let admin_cap = ts::take_from_sender<AdminCap>(&scenario);
            let mut market = ts::take_shared<Market>(&scenario);
            let ctx = ts::ctx(&mut scenario);
            
            // Verify market is open
            assert!(!calibr::is_market_locked(&market), 0);
            
            // Lock it
            market::lock_market(&admin_cap, &mut market, ctx);
            
            // Verify market is now locked
            assert!(calibr::is_market_locked(&market), 1);
            assert!(!calibr::is_market_open(&market), 2);
            
            ts::return_shared(market);
            ts::return_to_sender(&scenario, admin_cap);
        };
        
        ts::end(scenario);
    }

    #[test]
    fun test_resolve_market_yes() {
        let mut scenario = setup_test();
        
        // Create and lock market
        ts::next_tx(&mut scenario, ADMIN);
        {
            let admin_cap = ts::take_from_sender<AdminCap>(&scenario);
            let ctx = ts::ctx(&mut scenario);
            market::create_market(&admin_cap, b"Test market", ADMIN, ctx);
            ts::return_to_sender(&scenario, admin_cap);
        };
        
        ts::next_tx(&mut scenario, ADMIN);
        {
            let admin_cap = ts::take_from_sender<AdminCap>(&scenario);
            let mut market = ts::take_shared<Market>(&scenario);
            let ctx = ts::ctx(&mut scenario);
            market::lock_market(&admin_cap, &mut market, ctx);
            ts::return_shared(market);
            ts::return_to_sender(&scenario, admin_cap);
        };
        
        // Resolve market as YES
        ts::next_tx(&mut scenario, ADMIN);
        {
            let admin_cap = ts::take_from_sender<AdminCap>(&scenario);
            let mut market = ts::take_shared<Market>(&scenario);
            let ctx = ts::ctx(&mut scenario);
            
            market::resolve_market(&admin_cap, &mut market, true, ctx);
            
            assert!(calibr::is_market_resolved(&market), 0);
            let outcome = calibr::get_market_outcome(&market);
            assert!(std::option::is_some(&outcome), 1);
            assert!(*std::option::borrow(&outcome) == true, 2);
            
            ts::return_shared(market);
            ts::return_to_sender(&scenario, admin_cap);
        };
        
        ts::end(scenario);
    }

    #[test]
    fun test_resolve_market_no() {
        let mut scenario = setup_test();
        
        // Create and lock market
        ts::next_tx(&mut scenario, ADMIN);
        {
            let admin_cap = ts::take_from_sender<AdminCap>(&scenario);
            let ctx = ts::ctx(&mut scenario);
            market::create_market(&admin_cap, b"Test market", ADMIN, ctx);
            ts::return_to_sender(&scenario, admin_cap);
        };
        
        ts::next_tx(&mut scenario, ADMIN);
        {
            let admin_cap = ts::take_from_sender<AdminCap>(&scenario);
            let mut market = ts::take_shared<Market>(&scenario);
            let ctx = ts::ctx(&mut scenario);
            market::lock_market(&admin_cap, &mut market, ctx);
            ts::return_shared(market);
            ts::return_to_sender(&scenario, admin_cap);
        };
        
        // Resolve market as NO
        ts::next_tx(&mut scenario, ADMIN);
        {
            let admin_cap = ts::take_from_sender<AdminCap>(&scenario);
            let mut market = ts::take_shared<Market>(&scenario);
            let ctx = ts::ctx(&mut scenario);
            
            market::resolve_market(&admin_cap, &mut market, false, ctx);
            
            assert!(calibr::is_market_resolved(&market), 0);
            let outcome = calibr::get_market_outcome(&market);
            assert!(std::option::is_some(&outcome), 1);
            assert!(*std::option::borrow(&outcome) == false, 2);
            
            ts::return_shared(market);
            ts::return_to_sender(&scenario, admin_cap);
        };
        
        ts::end(scenario);
    }

    // ============================================================
    // FAILURE TESTS
    // ============================================================

    #[test]
    #[expected_failure(abort_code = 304)] // EEmptyQuestion
    fun test_create_market_empty_question_fails() {
        let mut scenario = setup_test();
        
        ts::next_tx(&mut scenario, ADMIN);
        {
            let admin_cap = ts::take_from_sender<AdminCap>(&scenario);
            let ctx = ts::ctx(&mut scenario);
            
            // Should fail - empty question
            market::create_market(&admin_cap, b"", ADMIN, ctx);
            
            ts::return_to_sender(&scenario, admin_cap);
        };
        
        ts::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = 301)] // EMarketAlreadyLocked
    fun test_lock_already_locked_market_fails() {
        let mut scenario = setup_test();
        
        // Create and lock market
        ts::next_tx(&mut scenario, ADMIN);
        {
            let admin_cap = ts::take_from_sender<AdminCap>(&scenario);
            let ctx = ts::ctx(&mut scenario);
            market::create_market(&admin_cap, b"Test", ADMIN, ctx);
            ts::return_to_sender(&scenario, admin_cap);
        };
        
        ts::next_tx(&mut scenario, ADMIN);
        {
            let admin_cap = ts::take_from_sender<AdminCap>(&scenario);
            let mut market = ts::take_shared<Market>(&scenario);
            let ctx = ts::ctx(&mut scenario);
            market::lock_market(&admin_cap, &mut market, ctx);
            ts::return_shared(market);
            ts::return_to_sender(&scenario, admin_cap);
        };
        
        // Try to lock again - should fail
        ts::next_tx(&mut scenario, ADMIN);
        {
            let admin_cap = ts::take_from_sender<AdminCap>(&scenario);
            let mut market = ts::take_shared<Market>(&scenario);
            let ctx = ts::ctx(&mut scenario);
            
            market::lock_market(&admin_cap, &mut market, ctx);
            
            ts::return_shared(market);
            ts::return_to_sender(&scenario, admin_cap);
        };
        
        ts::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = 303)] // EMarketNotLocked
    fun test_resolve_unlocked_market_fails() {
        let mut scenario = setup_test();
        
        // Create market (don't lock)
        ts::next_tx(&mut scenario, ADMIN);
        {
            let admin_cap = ts::take_from_sender<AdminCap>(&scenario);
            let ctx = ts::ctx(&mut scenario);
            market::create_market(&admin_cap, b"Test", ADMIN, ctx);
            ts::return_to_sender(&scenario, admin_cap);
        };
        
        // Try to resolve without locking - should fail
        ts::next_tx(&mut scenario, ADMIN);
        {
            let admin_cap = ts::take_from_sender<AdminCap>(&scenario);
            let mut market = ts::take_shared<Market>(&scenario);
            let ctx = ts::ctx(&mut scenario);
            
            market::resolve_market(&admin_cap, &mut market, true, ctx);
            
            ts::return_shared(market);
            ts::return_to_sender(&scenario, admin_cap);
        };
        
        ts::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = 302)] // EMarketAlreadyResolved
    fun test_resolve_already_resolved_market_fails() {
        let mut scenario = setup_test();
        
        // Create, lock, and resolve market
        ts::next_tx(&mut scenario, ADMIN);
        {
            let admin_cap = ts::take_from_sender<AdminCap>(&scenario);
            let ctx = ts::ctx(&mut scenario);
            market::create_market(&admin_cap, b"Test", ADMIN, ctx);
            ts::return_to_sender(&scenario, admin_cap);
        };
        
        ts::next_tx(&mut scenario, ADMIN);
        {
            let admin_cap = ts::take_from_sender<AdminCap>(&scenario);
            let mut market = ts::take_shared<Market>(&scenario);
            let ctx = ts::ctx(&mut scenario);
            market::lock_market(&admin_cap, &mut market, ctx);
            ts::return_shared(market);
            ts::return_to_sender(&scenario, admin_cap);
        };
        
        ts::next_tx(&mut scenario, ADMIN);
        {
            let admin_cap = ts::take_from_sender<AdminCap>(&scenario);
            let mut market = ts::take_shared<Market>(&scenario);
            let ctx = ts::ctx(&mut scenario);
            market::resolve_market(&admin_cap, &mut market, true, ctx);
            ts::return_shared(market);
            ts::return_to_sender(&scenario, admin_cap);
        };
        
        // Try to resolve again - should fail
        ts::next_tx(&mut scenario, ADMIN);
        {
            let admin_cap = ts::take_from_sender<AdminCap>(&scenario);
            let mut market = ts::take_shared<Market>(&scenario);
            let ctx = ts::ctx(&mut scenario);
            
            market::resolve_market(&admin_cap, &mut market, false, ctx);
            
            ts::return_shared(market);
            ts::return_to_sender(&scenario, admin_cap);
        };
        
        ts::end(scenario);
    }

    // ============================================================
    // VIEW FUNCTION TESTS
    // ============================================================

    #[test]
    fun test_calculate_loser_pool() {
        let mut scenario = setup_test();
        
        // Create market
        ts::next_tx(&mut scenario, ADMIN);
        {
            let admin_cap = ts::take_from_sender<AdminCap>(&scenario);
            let ctx = ts::ctx(&mut scenario);
            market::create_market(&admin_cap, b"Test", ADMIN, ctx);
            ts::return_to_sender(&scenario, admin_cap);
        };
        
        // Manually add some predictions for testing
        ts::next_tx(&mut scenario, ADMIN);
        {
            let mut market = ts::take_shared<Market>(&scenario);
            
            // Simulate 3 YES predictions and 2 NO predictions
            calibr::add_yes_prediction(&mut market, 50);
            calibr::add_yes_prediction(&mut market, 75);
            calibr::add_yes_prediction(&mut market, 100);
            calibr::add_no_prediction(&mut market, 25);
            calibr::add_no_prediction(&mut market, 50);
            
            // If YES wins, loser pool = no_count * 100 = 2 * 100 = 200
            assert!(market::calculate_loser_pool(&market, true) == 200, 0);
            
            // If NO wins, loser pool = yes_count * 100 = 3 * 100 = 300
            assert!(market::calculate_loser_pool(&market, false) == 300, 1);
            
            // Winner risk totals
            assert!(market::calculate_winner_risk_total(&market, true) == 225, 2); // 50+75+100
            assert!(market::calculate_winner_risk_total(&market, false) == 75, 3); // 25+50
            
            ts::return_shared(market);
        };
        
        ts::end(scenario);
    }
}
