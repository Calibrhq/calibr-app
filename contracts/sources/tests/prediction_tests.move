/// prediction_tests.move
/// 
/// Comprehensive unit tests for prediction placement and settlement.
/// Run with: sui move test
/// 
/// These tests verify:
/// 1. Normal prediction flow
/// 2. Validation failures
/// 3. Payout calculations
/// 4. Reputation updates
/// 5. Edge cases

#[test_only]
module calibr::prediction_tests {
    use sui::test_scenario::{Self as ts, Scenario};
    use calibr::calibr::{Self, UserProfile, Market, Prediction};
    use calibr::market::{Self, AdminCap};
    use calibr::reputation;
    use calibr::prediction;
    use calibr::math;

    // Test addresses
    const ADMIN: address = @0xAD;
    const ALICE: address = @0xA;
    const BOB: address = @0xB;

    // ============================================================
    // SETUP HELPERS
    // ============================================================

    fun setup_test(): Scenario {
        let mut scenario = ts::begin(ADMIN);
        
        // Create admin cap
        ts::next_tx(&mut scenario, ADMIN);
        {
            let ctx = ts::ctx(&mut scenario);
            let admin_cap = market::create_admin_cap_for_testing(ctx);
            sui::transfer::public_transfer(admin_cap, ADMIN);
        };
        
        scenario
    }

    fun create_market(scenario: &mut Scenario, question: vector<u8>) {
        ts::next_tx(scenario, ADMIN);
        {
            let admin_cap = ts::take_from_sender<AdminCap>(scenario);
            let ctx = ts::ctx(scenario);
            market::create_market(&admin_cap, question, 0, ADMIN, ctx);
            ts::return_to_sender(scenario, admin_cap);
        };
    }

    fun create_user_profile(scenario: &mut Scenario, user: address) {
        ts::next_tx(scenario, user);
        {
            let ctx = ts::ctx(scenario);
            reputation::create_profile(ctx);
        };
    }

    // ============================================================
    // BASIC PREDICTION TESTS
    // ============================================================

    #[test]
    fun test_place_prediction_yes() {
        let mut scenario = setup_test();
        create_market(&mut scenario, b"Will BTC exceed $100k?");
        create_user_profile(&mut scenario, ALICE);
        
        // Alice places a YES prediction at 60% confidence
        ts::next_tx(&mut scenario, ALICE);
        {
            let profile = ts::take_from_sender<UserProfile>(&scenario);
            let mut market = ts::take_shared<Market>(&scenario);
            let ctx = ts::ctx(&mut scenario);
            
            prediction::place_prediction(
                &profile,
                &mut market,
                true,   // YES
                60,     // 60% confidence
                ctx
            );
            
            // Verify market state updated
            assert!(calibr::get_yes_count(&market) == 1, 0);
            assert!(calibr::get_no_count(&market) == 0, 1);
            // Risk at 60% = max(5, 100 * 10 / 40) = 25
            assert!(calibr::get_yes_risk_total(&market) == 25, 2);
            
            ts::return_to_sender(&scenario, profile);
            ts::return_shared(market);
        };
        
        // Verify prediction was created
        ts::next_tx(&mut scenario, ALICE);
        {
            let prediction = ts::take_from_sender<Prediction>(&scenario);
            
            assert!(calibr::get_prediction_side(&prediction) == true, 3);
            assert!(calibr::get_prediction_confidence(&prediction) == 60, 4);
            assert!(calibr::get_prediction_stake(&prediction) == 100, 5);
            assert!(calibr::get_prediction_risked(&prediction) == 25, 6);
            assert!(!calibr::is_prediction_settled(&prediction), 7);
            
            ts::return_to_sender(&scenario, prediction);
        };
        
        ts::end(scenario);
    }

    #[test]
    fun test_place_prediction_no() {
        let mut scenario = setup_test();
        create_market(&mut scenario, b"Will BTC exceed $100k?");
        create_user_profile(&mut scenario, BOB);
        
        // Bob places a NO prediction at 70% confidence
        ts::next_tx(&mut scenario, BOB);
        {
            let profile = ts::take_from_sender<UserProfile>(&scenario);
            let mut market = ts::take_shared<Market>(&scenario);
            let ctx = ts::ctx(&mut scenario);
            
            prediction::place_prediction(
                &profile,
                &mut market,
                false,  // NO
                70,     // 70% confidence (max for Novice)
                ctx
            );
            
            // Verify market state
            assert!(calibr::get_yes_count(&market) == 0, 0);
            assert!(calibr::get_no_count(&market) == 1, 1);
            // Risk at 70% = max(5, 100 * 20 / 40) = 50
            assert!(calibr::get_no_risk_total(&market) == 50, 2);
            
            ts::return_to_sender(&scenario, profile);
            ts::return_shared(market);
        };
        
        ts::end(scenario);
    }

    #[test]
    fun test_place_prediction_min_confidence() {
        let mut scenario = setup_test();
        create_market(&mut scenario, b"Test market");
        create_user_profile(&mut scenario, ALICE);
        
        // Place prediction at minimum confidence (50%)
        ts::next_tx(&mut scenario, ALICE);
        {
            let profile = ts::take_from_sender<UserProfile>(&scenario);
            let mut market = ts::take_shared<Market>(&scenario);
            let ctx = ts::ctx(&mut scenario);
            
            prediction::place_prediction(
                &profile,
                &mut market,
                true,
                50,     // Minimum confidence
                ctx
            );
            
            // Risk at 50% = max(5, 0) = 5
            assert!(calibr::get_yes_risk_total(&market) == 5, 0);
            
            ts::return_to_sender(&scenario, profile);
            ts::return_shared(market);
        };
        
        ts::end(scenario);
    }

    // ============================================================
    // VALIDATION FAILURE TESTS
    // ============================================================

    #[test]
    #[expected_failure(abort_code = 404)] // EConfidenceExceedsUserCap
    fun test_confidence_exceeds_user_cap_fails() {
        let mut scenario = setup_test();
        create_market(&mut scenario, b"Test market");
        create_user_profile(&mut scenario, ALICE);
        
        // Alice (Novice, max 70%) tries to predict at 80%
        ts::next_tx(&mut scenario, ALICE);
        {
            let profile = ts::take_from_sender<UserProfile>(&scenario);
            let mut market = ts::take_shared<Market>(&scenario);
            let ctx = ts::ctx(&mut scenario);
            
            // This should fail - 80% > max_confidence (70%)
            prediction::place_prediction(
                &profile,
                &mut market,
                true,
                80,     // Exceeds Novice cap of 70%
                ctx
            );
            
            ts::return_to_sender(&scenario, profile);
            ts::return_shared(market);
        };
        
        ts::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = 402)] // EConfidenceTooLow
    fun test_confidence_below_minimum_fails() {
        let mut scenario = setup_test();
        create_market(&mut scenario, b"Test market");
        create_user_profile(&mut scenario, ALICE);
        
        ts::next_tx(&mut scenario, ALICE);
        {
            let profile = ts::take_from_sender<UserProfile>(&scenario);
            let mut market = ts::take_shared<Market>(&scenario);
            let ctx = ts::ctx(&mut scenario);
            
            // This should fail - 49% < minimum (50%)
            prediction::place_prediction(
                &profile,
                &mut market,
                true,
                49,
                ctx
            );
            
            ts::return_to_sender(&scenario, profile);
            ts::return_shared(market);
        };
        
        ts::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = 401)] // EMarketNotOpen
    fun test_locked_market_fails() {
        let mut scenario = setup_test();
        create_market(&mut scenario, b"Test market");
        create_user_profile(&mut scenario, ALICE);
        
        // Lock the market
        ts::next_tx(&mut scenario, ADMIN);
        {
            let admin_cap = ts::take_from_sender<AdminCap>(&scenario);
            let mut market = ts::take_shared<Market>(&scenario);
            let ctx = ts::ctx(&mut scenario);
            market::lock_market(&admin_cap, &mut market, ctx);
            ts::return_shared(market);
            ts::return_to_sender(&scenario, admin_cap);
        };
        
        // Try to place prediction on locked market
        ts::next_tx(&mut scenario, ALICE);
        {
            let profile = ts::take_from_sender<UserProfile>(&scenario);
            let mut market = ts::take_shared<Market>(&scenario);
            let ctx = ts::ctx(&mut scenario);
            
            // Should fail - market is locked
            prediction::place_prediction(
                &profile,
                &mut market,
                true,
                60,
                ctx
            );
            
            ts::return_to_sender(&scenario, profile);
            ts::return_shared(market);
        };
        
        ts::end(scenario);
    }

    // ============================================================
    // SETTLEMENT TESTS
    // ============================================================

    #[test]
    fun test_settle_winning_prediction() {
        let mut scenario = setup_test();
        create_market(&mut scenario, b"Test market");
        create_user_profile(&mut scenario, ALICE);
        create_user_profile(&mut scenario, BOB);
        
        // Alice predicts YES at 70%
        ts::next_tx(&mut scenario, ALICE);
        {
            let profile = ts::take_from_sender<UserProfile>(&scenario);
            let mut market = ts::take_shared<Market>(&scenario);
            let ctx = ts::ctx(&mut scenario);
            prediction::place_prediction(&profile, &mut market, true, 70, ctx);
            ts::return_to_sender(&scenario, profile);
            ts::return_shared(market);
        };
        
        // Bob predicts NO at 60%
        ts::next_tx(&mut scenario, BOB);
        {
            let profile = ts::take_from_sender<UserProfile>(&scenario);
            let mut market = ts::take_shared<Market>(&scenario);
            let ctx = ts::ctx(&mut scenario);
            prediction::place_prediction(&profile, &mut market, false, 60, ctx);
            ts::return_to_sender(&scenario, profile);
            ts::return_shared(market);
        };
        
        // Lock and resolve market as YES
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
        
        // Alice settles - she won!
        ts::next_tx(&mut scenario, ALICE);
        {
            let mut profile = ts::take_from_sender<UserProfile>(&scenario);
            let mut prediction = ts::take_from_sender<Prediction>(&scenario);
            let market = ts::take_shared<Market>(&scenario);
            let ctx = ts::ctx(&mut scenario);
            
            // Before settlement
            let old_score = calibr::get_reputation_score(&profile);
            let old_count = calibr::get_reputation_count(&profile);
            assert!(old_score == 700, 0); // Starting reputation
            assert!(old_count == 0, 1);
            
            prediction::settle_prediction(&mut profile, &mut prediction, &market, ctx);
            
            // After settlement
            assert!(calibr::is_prediction_settled(&prediction), 2);
            
            // Reputation should be updated
            // skill(70, true) = 1 - (0.7 - 1)² = 1 - 0.09 = 0.91 = 910
            // Rolling average formula: new_rep = (old_rep × n + skill) / (n + 1)
            // First prediction (n=0): new_rep = (700 × 0 + 910) / 1 = 910
            let new_score = calibr::get_reputation_score(&profile);
            assert!(new_score == 910, 3);
            assert!(calibr::get_reputation_count(&profile) == 1, 4);
            
            ts::return_to_sender(&scenario, profile);
            ts::return_to_sender(&scenario, prediction);
            ts::return_shared(market);
        };
        
        ts::end(scenario);
    }

    #[test]
    fun test_settle_losing_prediction() {
        let mut scenario = setup_test();
        create_market(&mut scenario, b"Test market");
        create_user_profile(&mut scenario, ALICE);
        create_user_profile(&mut scenario, BOB);
        
        // Alice predicts YES at 70% (risk = 50)
        ts::next_tx(&mut scenario, ALICE);
        {
            let profile = ts::take_from_sender<UserProfile>(&scenario);
            let mut market = ts::take_shared<Market>(&scenario);
            let ctx = ts::ctx(&mut scenario);
            prediction::place_prediction(&profile, &mut market, true, 70, ctx);
            ts::return_to_sender(&scenario, profile);
            ts::return_shared(market);
        };
        
        // Bob predicts NO at 60% (risk = 25)
        ts::next_tx(&mut scenario, BOB);
        {
            let profile = ts::take_from_sender<UserProfile>(&scenario);
            let mut market = ts::take_shared<Market>(&scenario);
            let ctx = ts::ctx(&mut scenario);
            prediction::place_prediction(&profile, &mut market, false, 60, ctx);
            ts::return_to_sender(&scenario, profile);
            ts::return_shared(market);
        };
        
        // Lock and resolve market as NO (Alice loses, Bob wins)
        ts::next_tx(&mut scenario, ADMIN);
        {
            let admin_cap = ts::take_from_sender<AdminCap>(&scenario);
            let mut market = ts::take_shared<Market>(&scenario);
            let ctx = ts::ctx(&mut scenario);
            market::lock_market(&admin_cap, &mut market, ctx);
            market::resolve_market(&admin_cap, &mut market, false, ctx);
            ts::return_shared(market);
            ts::return_to_sender(&scenario, admin_cap);
        };
        
        // Alice settles - she LOST
        // Alice at 70%: risk = 50
        // Loser payout = stake - risk = 100 - 50 = 50
        ts::next_tx(&mut scenario, ALICE);
        {
            let mut profile = ts::take_from_sender<UserProfile>(&scenario);
            let mut prediction = ts::take_from_sender<Prediction>(&scenario);
            let market = ts::take_shared<Market>(&scenario);
            let ctx = ts::ctx(&mut scenario);
            
            // Verify prediction state before settlement
            assert!(calibr::get_prediction_risked(&prediction) == 50, 10);
            
            prediction::settle_prediction(&mut profile, &mut prediction, &market, ctx);
            
            // Reputation should decrease
            // skill(70, false) = 1 - (0.7 - 0)² = 1 - 0.49 = 0.51 = 510
            // Rolling average formula: new_rep = (old_rep × n + skill) / (n + 1)
            // First prediction (n=0): new_rep = (700 × 0 + 510) / 1 = 510
            let new_score = calibr::get_reputation_score(&profile);
            assert!(new_score == 510, 0);
            
            ts::return_to_sender(&scenario, profile);
            ts::return_to_sender(&scenario, prediction);
            ts::return_shared(market);
        };
        
        // Bob settles - he WON
        // Bob at 60%: risk = 25
        // Loser pool = yes_risk_total = 50 (Alice's risk)
        // Winner payout = 100 + (25/25) * 50 = 150
        ts::next_tx(&mut scenario, BOB);
        {
            let mut profile = ts::take_from_sender<UserProfile>(&scenario);
            let mut prediction = ts::take_from_sender<Prediction>(&scenario);
            let market = ts::take_shared<Market>(&scenario);
            let ctx = ts::ctx(&mut scenario);
            
            prediction::settle_prediction(&mut profile, &mut prediction, &market, ctx);
            
            // Reputation should increase
            // skill(60, true) = 1 - (0.6 - 1)² = 1 - 0.16 = 0.84 = 840
            // Rolling average formula: new_rep = (old_rep × n + skill) / (n + 1)
            // First prediction (n=0): new_rep = (700 × 0 + 840) / 1 = 840
            let new_score = calibr::get_reputation_score(&profile);
            assert!(new_score == 840, 1);
            
            ts::return_to_sender(&scenario, profile);
            ts::return_to_sender(&scenario, prediction);
            ts::return_shared(market);
        };
        
        ts::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = 406)] // EPredictionAlreadySettled
    fun test_double_settlement_fails() {
        let mut scenario = setup_test();
        create_market(&mut scenario, b"Test market");
        create_user_profile(&mut scenario, ALICE);
        
        // Alice places prediction
        ts::next_tx(&mut scenario, ALICE);
        {
            let profile = ts::take_from_sender<UserProfile>(&scenario);
            let mut market = ts::take_shared<Market>(&scenario);
            let ctx = ts::ctx(&mut scenario);
            prediction::place_prediction(&profile, &mut market, true, 60, ctx);
            ts::return_to_sender(&scenario, profile);
            ts::return_shared(market);
        };
        
        // Lock and resolve
        ts::next_tx(&mut scenario, ADMIN);
        {
            let admin_cap = ts::take_from_sender<AdminCap>(&scenario);
            let mut market = ts::take_shared<Market>(&scenario);
            let ctx = ts::ctx(&mut scenario);
            market::lock_market(&admin_cap, &mut market, ctx);
            market::resolve_market(&admin_cap, &mut market, true, ctx);
            ts::return_shared(market);
            ts::return_to_sender(&scenario, admin_cap);
        };
        
        // First settlement
        ts::next_tx(&mut scenario, ALICE);
        {
            let mut profile = ts::take_from_sender<UserProfile>(&scenario);
            let mut prediction = ts::take_from_sender<Prediction>(&scenario);
            let market = ts::take_shared<Market>(&scenario);
            let ctx = ts::ctx(&mut scenario);
            prediction::settle_prediction(&mut profile, &mut prediction, &market, ctx);
            ts::return_to_sender(&scenario, profile);
            ts::return_to_sender(&scenario, prediction);
            ts::return_shared(market);
        };
        
        // Second settlement - should fail
        ts::next_tx(&mut scenario, ALICE);
        {
            let mut profile = ts::take_from_sender<UserProfile>(&scenario);
            let mut prediction = ts::take_from_sender<Prediction>(&scenario);
            let market = ts::take_shared<Market>(&scenario);
            let ctx = ts::ctx(&mut scenario);
            prediction::settle_prediction(&mut profile, &mut prediction, &market, ctx);
            ts::return_to_sender(&scenario, profile);
            ts::return_to_sender(&scenario, prediction);
            ts::return_shared(market);
        };
        
        ts::end(scenario);
    }

    // ============================================================
    // PAYOUT CALCULATION TESTS
    // ============================================================

    #[test]
    fun test_payout_calculation_winner() {
        let mut scenario = setup_test();
        create_market(&mut scenario, b"Test market");
        create_user_profile(&mut scenario, ALICE);
        create_user_profile(&mut scenario, BOB);
        
        // Alice: YES at 70% (risk = 50)
        ts::next_tx(&mut scenario, ALICE);
        {
            let profile = ts::take_from_sender<UserProfile>(&scenario);
            let mut market = ts::take_shared<Market>(&scenario);
            let ctx = ts::ctx(&mut scenario);
            prediction::place_prediction(&profile, &mut market, true, 70, ctx);
            ts::return_to_sender(&scenario, profile);
            ts::return_shared(market);
        };
        
        // Bob: NO at 60% (risk = 25)
        ts::next_tx(&mut scenario, BOB);
        {
            let profile = ts::take_from_sender<UserProfile>(&scenario);
            let mut market = ts::take_shared<Market>(&scenario);
            let ctx = ts::ctx(&mut scenario);
            prediction::place_prediction(&profile, &mut market, false, 60, ctx);
            ts::return_to_sender(&scenario, profile);
            ts::return_shared(market);
        };
        
        // Check potential payouts before resolution
        ts::next_tx(&mut scenario, ALICE);
        {
            let prediction = ts::take_from_sender<Prediction>(&scenario);
            let market = ts::take_shared<Market>(&scenario);
            
            // If YES wins:
            // - Loser pool = no_risk_total = 25 (Bob's R)
            // - Total winner risk = yes_risk_total = 50
            // - Alice's payout = 100 + (50/50) * 25 = 100 + 25 = 125
            let payout_if_yes = prediction::calculate_potential_payout(&prediction, &market, true);
            assert!(payout_if_yes == 125, 0);
            
            // If NO wins, Alice loses, keeps stake - risk = 100 - 50 = 50
            let payout_if_no = prediction::calculate_potential_payout(&prediction, &market, false);
            assert!(payout_if_no == 50, 1);
            
            ts::return_to_sender(&scenario, prediction);
            ts::return_shared(market);
        };
        
        // Check Bob's payouts
        ts::next_tx(&mut scenario, BOB);
        {
            let prediction = ts::take_from_sender<Prediction>(&scenario);
            let market = ts::take_shared<Market>(&scenario);
            
            // If NO wins:
            // - Loser pool = yes_risk_total = 50 (Alice's R)
            // - Total winner risk = no_risk_total = 25
            // - Bob's payout = 100 + (25/25) * 50 = 100 + 50 = 150
            let payout_if_no = prediction::calculate_potential_payout(&prediction, &market, false);
            assert!(payout_if_no == 150, 2);
            
            // If YES wins, Bob loses, keeps stake - risk = 100 - 25 = 75
            let payout_if_yes = prediction::calculate_potential_payout(&prediction, &market, true);
            assert!(payout_if_yes == 75, 3);
            
            ts::return_to_sender(&scenario, prediction);
            ts::return_shared(market);
        };
        
        ts::end(scenario);
    }

    #[test]
    fun test_payout_multiple_winners() {
        let mut scenario = setup_test();
        create_market(&mut scenario, b"Test market");
        create_user_profile(&mut scenario, ALICE);
        create_user_profile(&mut scenario, BOB);
        
        // Alice: YES at 70% (risk = 50)
        ts::next_tx(&mut scenario, ALICE);
        {
            let profile = ts::take_from_sender<UserProfile>(&scenario);
            let mut market = ts::take_shared<Market>(&scenario);
            let ctx = ts::ctx(&mut scenario);
            prediction::place_prediction(&profile, &mut market, true, 70, ctx);
            ts::return_to_sender(&scenario, profile);
            ts::return_shared(market);
        };
        
        // Bob: YES at 60% (risk = 25)
        ts::next_tx(&mut scenario, BOB);
        {
            let profile = ts::take_from_sender<UserProfile>(&scenario);
            let mut market = ts::take_shared<Market>(&scenario);
            let ctx = ts::ctx(&mut scenario);
            prediction::place_prediction(&profile, &mut market, true, 60, ctx);
            ts::return_to_sender(&scenario, profile);
            ts::return_shared(market);
        };
        
        // Manually add NO predictions (simulate other users)
        // 2 NO predictions with risk 40 each
        ts::next_tx(&mut scenario, ADMIN);
        {
            let mut market = ts::take_shared<Market>(&scenario);
            calibr::add_no_prediction(&mut market, 40);
            calibr::add_no_prediction(&mut market, 40);
            ts::return_shared(market);
        };
        
        // Check Alice's payout if YES wins
        ts::next_tx(&mut scenario, ALICE);
        {
            let prediction = ts::take_from_sender<Prediction>(&scenario);
            let market = ts::take_shared<Market>(&scenario);
            
            // If YES wins:
            // - Loser pool = no_risk_total = 40 + 40 = 80
            // - Total winner risk = yes_risk_total = 50 + 25 = 75
            // - Alice's share = (50/75) * 80 = 53 (integer division)
            // - Alice's payout = 100 + 53 = 153
            let payout = prediction::calculate_potential_payout(&prediction, &market, true);
            assert!(payout == 153, 0);
            
            ts::return_to_sender(&scenario, prediction);
            ts::return_shared(market);
        };
        
        // Check Bob's payout if YES wins
        ts::next_tx(&mut scenario, BOB);
        {
            let prediction = ts::take_from_sender<Prediction>(&scenario);
            let market = ts::take_shared<Market>(&scenario);
            
            // Bob's share = (25/75) * 80 = 26 (integer division)
            // Bob's payout = 100 + 26 = 126
            let payout = prediction::calculate_potential_payout(&prediction, &market, true);
            assert!(payout == 126, 0);
            
            ts::return_to_sender(&scenario, prediction);
            ts::return_shared(market);
        };
        
        ts::end(scenario);
    }
    
    #[test]
    fun test_loser_payout_varies_by_confidence() {
        let mut scenario = setup_test();
        create_market(&mut scenario, b"Test market");
        create_user_profile(&mut scenario, ALICE);
        create_user_profile(&mut scenario, BOB);
        
        // Alice: YES at 50% (risk = 5, minimal)
        ts::next_tx(&mut scenario, ALICE);
        {
            let profile = ts::take_from_sender<UserProfile>(&scenario);
            let mut market = ts::take_shared<Market>(&scenario);
            let ctx = ts::ctx(&mut scenario);
            prediction::place_prediction(&profile, &mut market, true, 50, ctx);
            ts::return_to_sender(&scenario, profile);
            ts::return_shared(market);
        };
        
        // Bob: YES at 70% (risk = 50)
        ts::next_tx(&mut scenario, BOB);
        {
            let profile = ts::take_from_sender<UserProfile>(&scenario);
            let mut market = ts::take_shared<Market>(&scenario);
            let ctx = ts::ctx(&mut scenario);
            prediction::place_prediction(&profile, &mut market, true, 70, ctx);
            ts::return_to_sender(&scenario, profile);
            ts::return_shared(market);
        };
        
        // Check Alice's loser payout (if NO wins)
        ts::next_tx(&mut scenario, ALICE);
        {
            let prediction = ts::take_from_sender<Prediction>(&scenario);
            let market = ts::take_shared<Market>(&scenario);
            
            // Alice at 50%: risk = 5
            // If NO wins: Alice keeps 100 - 5 = 95
            let payout_if_no = prediction::calculate_potential_payout(&prediction, &market, false);
            assert!(payout_if_no == 95, 0);
            
            ts::return_to_sender(&scenario, prediction);
            ts::return_shared(market);
        };
        
        // Check Bob's loser payout (if NO wins)
        ts::next_tx(&mut scenario, BOB);
        {
            let prediction = ts::take_from_sender<Prediction>(&scenario);
            let market = ts::take_shared<Market>(&scenario);
            
            // Bob at 70%: risk = 50
            // If NO wins: Bob keeps 100 - 50 = 50
            let payout_if_no = prediction::calculate_potential_payout(&prediction, &market, false);
            assert!(payout_if_no == 50, 0);
            
            ts::return_to_sender(&scenario, prediction);
            ts::return_shared(market);
        };
        
        ts::end(scenario);
    }

    // ============================================================
    // ZERO-SUM VERIFICATION TESTS
    // ============================================================

    #[test]
    fun test_zero_sum_property() {
        let mut scenario = setup_test();
        create_market(&mut scenario, b"Test market");
        create_user_profile(&mut scenario, ALICE);
        create_user_profile(&mut scenario, BOB);
        
        // Alice: YES at 70% (risk = 50, stake = 100)
        ts::next_tx(&mut scenario, ALICE);
        {
            let profile = ts::take_from_sender<UserProfile>(&scenario);
            let mut market = ts::take_shared<Market>(&scenario);
            let ctx = ts::ctx(&mut scenario);
            prediction::place_prediction(&profile, &mut market, true, 70, ctx);
            ts::return_to_sender(&scenario, profile);
            ts::return_shared(market);
        };
        
        // Bob: NO at 60% (risk = 25, stake = 100)
        ts::next_tx(&mut scenario, BOB);
        {
            let profile = ts::take_from_sender<UserProfile>(&scenario);
            let mut market = ts::take_shared<Market>(&scenario);
            let ctx = ts::ctx(&mut scenario);
            prediction::place_prediction(&profile, &mut market, false, 60, ctx);
            ts::return_to_sender(&scenario, profile);
            ts::return_shared(market);
        };
        
        // Total stakes = 2 * 100 = 200
        
        // Check payouts if YES wins
        ts::next_tx(&mut scenario, ALICE);
        {
            let alice_pred = ts::take_from_sender<Prediction>(&scenario);
            let market = ts::take_shared<Market>(&scenario);
            
            // Alice wins: 100 + (50/50) * 25 = 125
            let alice_payout_yes = prediction::calculate_potential_payout(&alice_pred, &market, true);
            assert!(alice_payout_yes == 125, 0);
            
            ts::return_to_sender(&scenario, alice_pred);
            ts::return_shared(market);
        };
        
        ts::next_tx(&mut scenario, BOB);
        {
            let bob_pred = ts::take_from_sender<Prediction>(&scenario);
            let market = ts::take_shared<Market>(&scenario);
            
            // Bob loses: 100 - 25 = 75
            let bob_payout_yes = prediction::calculate_potential_payout(&bob_pred, &market, true);
            assert!(bob_payout_yes == 75, 1);
            
            // Zero-sum: 125 + 75 = 200 = total stakes ✓
            
            ts::return_to_sender(&scenario, bob_pred);
            ts::return_shared(market);
        };
        
        // Check payouts if NO wins
        ts::next_tx(&mut scenario, ALICE);
        {
            let alice_pred = ts::take_from_sender<Prediction>(&scenario);
            let market = ts::take_shared<Market>(&scenario);
            
            // Alice loses: 100 - 50 = 50
            let alice_payout_no = prediction::calculate_potential_payout(&alice_pred, &market, false);
            assert!(alice_payout_no == 50, 2);
            
            ts::return_to_sender(&scenario, alice_pred);
            ts::return_shared(market);
        };
        
        ts::next_tx(&mut scenario, BOB);
        {
            let bob_pred = ts::take_from_sender<Prediction>(&scenario);
            let market = ts::take_shared<Market>(&scenario);
            
            // Bob wins: 100 + (25/25) * 50 = 150
            let bob_payout_no = prediction::calculate_potential_payout(&bob_pred, &market, false);
            assert!(bob_payout_no == 150, 3);
            
            // Zero-sum: 50 + 150 = 200 = total stakes ✓
            
            ts::return_to_sender(&scenario, bob_pred);
            ts::return_shared(market);
        };
        
        ts::end(scenario);
    }

    #[test]
    fun test_no_losers_everyone_gets_stake_back() {
        let mut scenario = setup_test();
        create_market(&mut scenario, b"Test market");
        create_user_profile(&mut scenario, ALICE);
        create_user_profile(&mut scenario, BOB);
        
        // Both predict YES
        ts::next_tx(&mut scenario, ALICE);
        {
            let profile = ts::take_from_sender<UserProfile>(&scenario);
            let mut market = ts::take_shared<Market>(&scenario);
            let ctx = ts::ctx(&mut scenario);
            prediction::place_prediction(&profile, &mut market, true, 70, ctx);
            ts::return_to_sender(&scenario, profile);
            ts::return_shared(market);
        };
        
        ts::next_tx(&mut scenario, BOB);
        {
            let profile = ts::take_from_sender<UserProfile>(&scenario);
            let mut market = ts::take_shared<Market>(&scenario);
            let ctx = ts::ctx(&mut scenario);
            prediction::place_prediction(&profile, &mut market, true, 60, ctx);
            ts::return_to_sender(&scenario, profile);
            ts::return_shared(market);
        };
        
        // Check payouts if YES wins (no losers!)
        ts::next_tx(&mut scenario, ALICE);
        {
            let pred = ts::take_from_sender<Prediction>(&scenario);
            let market = ts::take_shared<Market>(&scenario);
            
            // No losers means loser_pool = 0
            // Everyone just gets their stake back
            let payout = prediction::calculate_potential_payout(&pred, &market, true);
            assert!(payout == 100, 0);  // Just stake, no winnings
            
            ts::return_to_sender(&scenario, pred);
            ts::return_shared(market);
        };
        
        ts::end(scenario);
    }

    // ============================================================
    // RISK CALCULATION VERIFICATION
    // ============================================================

    #[test]
    fun test_risk_values_at_all_confidence_levels() {
        // Verify risk calculation matches expected values
        // R = max(5, 100 * (c - 50) / 40)
        
        // 50% → max(5, 0) = 5
        assert!(math::risk_from_confidence(50) == 5, 0);
        
        // 52% → max(5, 100 * 2 / 40) = max(5, 5) = 5
        assert!(math::risk_from_confidence(52) == 5, 1);
        
        // 55% → max(5, 100 * 5 / 40) = max(5, 12) = 12
        assert!(math::risk_from_confidence(55) == 12, 2);
        
        // 60% → max(5, 100 * 10 / 40) = max(5, 25) = 25
        assert!(math::risk_from_confidence(60) == 25, 3);
        
        // 70% → max(5, 100 * 20 / 40) = max(5, 50) = 50
        assert!(math::risk_from_confidence(70) == 50, 4);
        
        // 80% → max(5, 100 * 30 / 40) = max(5, 75) = 75
        assert!(math::risk_from_confidence(80) == 75, 5);
        
        // 90% → max(5, 100 * 40 / 40) = max(5, 100) = 100
        assert!(math::risk_from_confidence(90) == 100, 6);
    }

    // ============================================================
    // SKILL CALCULATION VERIFICATION
    // ============================================================

    #[test]
    fun test_skill_values() {
        // Verify skill calculation matches expected values
        // skill = 1 - (c - o)² where c in [0.5, 0.9], o in {0, 1}
        
        // 70% correct: 1 - (0.7 - 1)² = 1 - 0.09 = 0.91 = 910
        assert!(math::skill(70, true) == 910, 0);
        
        // 70% wrong: 1 - (0.7 - 0)² = 1 - 0.49 = 0.51 = 510
        assert!(math::skill(70, false) == 510, 1);
        
        // 60% correct: 1 - (0.6 - 1)² = 1 - 0.16 = 0.84 = 840
        assert!(math::skill(60, true) == 840, 2);
        
        // 60% wrong: 1 - (0.6 - 0)² = 1 - 0.36 = 0.64 = 640
        assert!(math::skill(60, false) == 640, 3);
    }
}
