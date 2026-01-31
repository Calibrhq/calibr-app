/// integration_tests.move
/// 
/// Comprehensive end-to-end tests verifying the entire Calibr protocol
/// against the exact specifications from the Calibr documentation.
/// 
/// These tests verify:
/// 1. Model 1 (Money): Risk calculation, pool construction, payouts
/// 2. Model 2 (Reputation): Skill calculation, rolling average, tiers
/// 3. Zero-sum property: Total payouts = total stakes
/// 4. Edge cases: No losers, single prediction, everyone same side
/// 5. Real-world scenarios from the Calibr documentation

#[test_only]
module calibr::integration_tests {
    use sui::test_scenario::{Self as ts, Scenario};
    use calibr::calibr::{Self, UserProfile, Market, Prediction};
    use calibr::market::{Self, AdminCap};
    use calibr::prediction;
    use calibr::reputation;
    use calibr::math;

    // Test addresses
    const ADMIN: address = @0xAD;
    const ALICE: address = @0xA1;
    const BOB: address = @0xB0;
    const CAROL: address = @0xC0;
    const DAVE: address = @0xDA;

    // ============================================================
    // HELPER FUNCTIONS
    // ============================================================

    fun setup_test(): Scenario {
        ts::begin(ADMIN)
    }

    fun create_admin_and_market(scenario: &mut Scenario, question: vector<u8>) {
        ts::next_tx(scenario, ADMIN);
        {
            market::test_init(ts::ctx(scenario));
        };
        
        ts::next_tx(scenario, ADMIN);
        {
            let admin_cap = ts::take_from_sender<AdminCap>(scenario);
            market::create_market(&admin_cap, question, ADMIN, ts::ctx(scenario));
            ts::return_to_sender(scenario, admin_cap);
        };
    }

    fun create_user_profile(scenario: &mut Scenario, user: address) {
        ts::next_tx(scenario, user);
        {
            reputation::create_profile(ts::ctx(scenario));
        };
    }

    fun place_prediction_for_user(
        scenario: &mut Scenario,
        user: address,
        side: bool,
        confidence: u64
    ) {
        ts::next_tx(scenario, user);
        {
            let profile = ts::take_from_sender<UserProfile>(scenario);
            let mut market = ts::take_shared<Market>(scenario);
            prediction::place_prediction(&profile, &mut market, side, confidence, ts::ctx(scenario));
            ts::return_to_sender(scenario, profile);
            ts::return_shared(market);
        };
    }

    fun lock_market_by_admin(scenario: &mut Scenario) {
        ts::next_tx(scenario, ADMIN);
        {
            let admin_cap = ts::take_from_sender<AdminCap>(scenario);
            let mut market = ts::take_shared<Market>(scenario);
            market::lock_market(&admin_cap, &mut market, ts::ctx(scenario));
            ts::return_shared(market);
            ts::return_to_sender(scenario, admin_cap);
        };
    }

    fun resolve_market_by_admin(scenario: &mut Scenario, outcome: bool) {
        ts::next_tx(scenario, ADMIN);
        {
            let admin_cap = ts::take_from_sender<AdminCap>(scenario);
            let mut market = ts::take_shared<Market>(scenario);
            market::resolve_market(&admin_cap, &mut market, outcome, ts::ctx(scenario));
            ts::return_shared(market);
            ts::return_to_sender(scenario, admin_cap);
        };
    }

    fun settle_prediction_for_user(scenario: &mut Scenario, user: address) {
        ts::next_tx(scenario, user);
        {
            let mut profile = ts::take_from_sender<UserProfile>(scenario);
            let mut pred = ts::take_from_sender<Prediction>(scenario);
            let market = ts::take_shared<Market>(scenario);
            
            prediction::settle_prediction(&mut profile, &mut pred, &market, ts::ctx(scenario));
            
            ts::return_to_sender(scenario, profile);
            ts::return_to_sender(scenario, pred);
            ts::return_shared(market);
        };
    }

    // ============================================================
    // TEST 1: RISK CALCULATION FORMULA
    // ============================================================
    // Verify: R = max(5, 100 * (c - 50) / 40)

    #[test]
    fun test_risk_formula_all_values() {
        // From Calibr doc:
        // c=50 → R = max(5, 100*0/40) = max(5, 0) = 5
        assert!(math::risk_from_confidence(50) == 5, 0);
        
        // c=55 → R = max(5, 100*5/40) = max(5, 12.5) = 12 (integer)
        assert!(math::risk_from_confidence(55) == 12, 1);
        
        // c=60 → R = max(5, 100*10/40) = max(5, 25) = 25
        assert!(math::risk_from_confidence(60) == 25, 2);
        
        // c=65 → R = max(5, 100*15/40) = max(5, 37.5) = 37 (integer)
        assert!(math::risk_from_confidence(65) == 37, 3);
        
        // c=70 → R = max(5, 100*20/40) = max(5, 50) = 50
        assert!(math::risk_from_confidence(70) == 50, 4);
        
        // c=75 → R = max(5, 100*25/40) = max(5, 62.5) = 62 (integer)
        assert!(math::risk_from_confidence(75) == 62, 5);
        
        // c=80 → R = max(5, 100*30/40) = max(5, 75) = 75
        assert!(math::risk_from_confidence(80) == 75, 6);
        
        // c=85 → R = max(5, 100*35/40) = max(5, 87.5) = 87 (integer)
        assert!(math::risk_from_confidence(85) == 87, 7);
        
        // c=90 → R = max(5, 100*40/40) = max(5, 100) = 100
        assert!(math::risk_from_confidence(90) == 100, 8);
    }

    // ============================================================
    // TEST 2: SKILL CALCULATION FORMULA
    // ============================================================
    // Verify: skill = 1 - (c - o)² where c ∈ [0.5, 0.9], o ∈ {0, 1}
    // Scaled to 0-1000

    #[test]
    fun test_skill_formula_all_cases() {
        // Case 1: 90% correct → skill = 1 - (0.9-1)² = 1 - 0.01 = 0.99 → 990
        assert!(math::skill(90, true) == 990, 0);
        
        // Case 2: 90% wrong → skill = 1 - (0.9-0)² = 1 - 0.81 = 0.19 → 190
        assert!(math::skill(90, false) == 190, 1);
        
        // Case 3: 80% correct → skill = 1 - (0.8-1)² = 1 - 0.04 = 0.96 → 960
        assert!(math::skill(80, true) == 960, 2);
        
        // Case 4: 80% wrong → skill = 1 - (0.8-0)² = 1 - 0.64 = 0.36 → 360
        assert!(math::skill(80, false) == 360, 3);
        
        // Case 5: 70% correct → skill = 1 - (0.7-1)² = 1 - 0.09 = 0.91 → 910
        assert!(math::skill(70, true) == 910, 4);
        
        // Case 6: 70% wrong → skill = 1 - (0.7-0)² = 1 - 0.49 = 0.51 → 510
        assert!(math::skill(70, false) == 510, 5);
        
        // Case 7: 60% correct → skill = 1 - (0.6-1)² = 1 - 0.16 = 0.84 → 840
        assert!(math::skill(60, true) == 840, 6);
        
        // Case 8: 60% wrong → skill = 1 - (0.6-0)² = 1 - 0.36 = 0.64 → 640
        assert!(math::skill(60, false) == 640, 7);
        
        // Case 9: 50% correct → skill = 1 - (0.5-1)² = 1 - 0.25 = 0.75 → 750
        assert!(math::skill(50, true) == 750, 8);
        
        // Case 10: 50% wrong → skill = 1 - (0.5-0)² = 1 - 0.25 = 0.75 → 750
        assert!(math::skill(50, false) == 750, 9);
    }

    // ============================================================
    // TEST 3: CALIBR DOC EXACT EXAMPLE
    // ============================================================
    // From the Calibr documentation:
    // A: YES, 60%, R = 25
    // B: YES, 70%, R = 50
    // C: YES, 90%, R = 100
    // D: NO, 80%, R = 75 (LOSER)
    // YES wins
    // loser_pool = 75 (D's R, NOT stake)
    // winner_risk = 25 + 50 + 100 = 175
    // A: 100 + (25/175)*75 = 100 + 10 = 110
    // B: 100 + (50/175)*75 = 100 + 21 = 121
    // C: 100 + (100/175)*75 = 100 + 42 = 142
    // D: 100 - 75 = 25 (protected portion)

    #[test]
    fun test_calibr_doc_exact_example() {
        let mut scenario = setup_test();
        
        create_admin_and_market(&mut scenario, b"Test market from Calibr doc");
        create_user_profile(&mut scenario, ALICE);  // A
        create_user_profile(&mut scenario, BOB);    // B
        create_user_profile(&mut scenario, CAROL);  // C
        create_user_profile(&mut scenario, DAVE);   // D
        
        // Need to unlock higher confidence for C (90%)
        // First upgrade Carol's profile to Elite tier
        ts::next_tx(&mut scenario, CAROL);
        {
            let mut profile = ts::take_from_sender<UserProfile>(&scenario);
            // Manually set to Elite tier for this test
            calibr::set_reputation_score(&mut profile, 900);
            calibr::set_max_confidence(&mut profile, 90);
            ts::return_to_sender(&scenario, profile);
        };
        
        // Also need to upgrade Dave for 80%
        ts::next_tx(&mut scenario, DAVE);
        {
            let mut profile = ts::take_from_sender<UserProfile>(&scenario);
            calibr::set_reputation_score(&mut profile, 800);
            calibr::set_max_confidence(&mut profile, 80);
            ts::return_to_sender(&scenario, profile);
        };
        
        // A: YES at 60% (R=25)
        place_prediction_for_user(&mut scenario, ALICE, true, 60);
        
        // B: YES at 70% (R=50)
        place_prediction_for_user(&mut scenario, BOB, true, 70);
        
        // C: YES at 90% (R=100)
        place_prediction_for_user(&mut scenario, CAROL, true, 90);
        
        // D: NO at 80% (R=75)
        place_prediction_for_user(&mut scenario, DAVE, false, 80);
        
        // Verify market state
        ts::next_tx(&mut scenario, ADMIN);
        {
            let market = ts::take_shared<Market>(&scenario);
            
            // Verify risk totals
            assert!(calibr::get_yes_risk_total(&market) == 175, 0); // 25 + 50 + 100
            assert!(calibr::get_no_risk_total(&market) == 75, 1);   // 75
            
            // Verify counts
            assert!(calibr::get_yes_count(&market) == 3, 2);
            assert!(calibr::get_no_count(&market) == 1, 3);
            
            ts::return_shared(market);
        };
        
        // Lock and resolve (YES wins)
        lock_market_by_admin(&mut scenario);
        resolve_market_by_admin(&mut scenario, true);
        
        // Check Alice's payout (winner)
        ts::next_tx(&mut scenario, ALICE);
        {
            let pred = ts::take_from_sender<Prediction>(&scenario);
            let market = ts::take_shared<Market>(&scenario);
            
            // A: 100 + (25/175)*75 = 100 + 10 = 110
            let payout = prediction::calculate_potential_payout(&pred, &market, true);
            assert!(payout == 110, 4);
            
            ts::return_to_sender(&scenario, pred);
            ts::return_shared(market);
        };
        
        // Check Bob's payout (winner)
        ts::next_tx(&mut scenario, BOB);
        {
            let pred = ts::take_from_sender<Prediction>(&scenario);
            let market = ts::take_shared<Market>(&scenario);
            
            // B: 100 + (50/175)*75 = 100 + 21 = 121
            let payout = prediction::calculate_potential_payout(&pred, &market, true);
            assert!(payout == 121, 5);
            
            ts::return_to_sender(&scenario, pred);
            ts::return_shared(market);
        };
        
        // Check Carol's payout (winner)
        ts::next_tx(&mut scenario, CAROL);
        {
            let pred = ts::take_from_sender<Prediction>(&scenario);
            let market = ts::take_shared<Market>(&scenario);
            
            // C: 100 + (100/175)*75 = 100 + 42 = 142
            let payout = prediction::calculate_potential_payout(&pred, &market, true);
            assert!(payout == 142, 6);
            
            ts::return_to_sender(&scenario, pred);
            ts::return_shared(market);
        };
        
        // Check Dave's payout (loser)
        ts::next_tx(&mut scenario, DAVE);
        {
            let pred = ts::take_from_sender<Prediction>(&scenario);
            let market = ts::take_shared<Market>(&scenario);
            
            // D: 100 - 75 = 25 (protected portion)
            let payout = prediction::calculate_potential_payout(&pred, &market, true);
            assert!(payout == 25, 7);
            
            ts::return_to_sender(&scenario, pred);
            ts::return_shared(market);
        };
        
        // Verify zero-sum (within rounding tolerance)
        // Total stakes: 4 * 100 = 400
        // Total payouts: 110 + 121 + 142 + 25 = 398
        // Rounding dust: 2 (acceptable)
        let total_payouts = 110 + 121 + 142 + 25;
        let total_stakes = 400u64;
        assert!(total_stakes - total_payouts <= 2, 8);
        
        ts::end(scenario);
    }

    // ============================================================
    // TEST 4: ROLLING AVERAGE FORMULA
    // ============================================================
    // Verify: new_rep = (old_rep × n + skill) / (n + 1)
    // For n=0: new_rep = skill (first prediction becomes reputation)

    #[test]
    fun test_rolling_average_formula() {
        let mut scenario = setup_test();
        
        create_user_profile(&mut scenario, ALICE);
        
        // Initial state: rep=700, n=0
        ts::next_tx(&mut scenario, ALICE);
        {
            let profile = ts::take_from_sender<UserProfile>(&scenario);
            assert!(calibr::get_reputation_score(&profile) == 700, 0);
            assert!(calibr::get_reputation_count(&profile) == 0, 1);
            ts::return_to_sender(&scenario, profile);
        };
        
        // Prediction 1: 70% correct → skill = 910
        // n=0: new_rep = (700×0 + 910) / 1 = 910
        ts::next_tx(&mut scenario, ALICE);
        {
            let mut profile = ts::take_from_sender<UserProfile>(&scenario);
            reputation::update_after_settlement(&mut profile, 70, true, ts::ctx(&mut scenario));
            
            assert!(calibr::get_reputation_score(&profile) == 910, 2);
            assert!(calibr::get_reputation_count(&profile) == 1, 3);
            
            ts::return_to_sender(&scenario, profile);
        };
        
        // Prediction 2: 70% wrong → skill = 510
        // n=1: new_rep = (910×1 + 510) / 2 = 1420 / 2 = 710
        ts::next_tx(&mut scenario, ALICE);
        {
            let mut profile = ts::take_from_sender<UserProfile>(&scenario);
            reputation::update_after_settlement(&mut profile, 70, false, ts::ctx(&mut scenario));
            
            assert!(calibr::get_reputation_score(&profile) == 710, 4);
            assert!(calibr::get_reputation_count(&profile) == 2, 5);
            
            ts::return_to_sender(&scenario, profile);
        };
        
        // Prediction 3: 60% correct → skill = 840
        // n=2: new_rep = (710×2 + 840) / 3 = 2260 / 3 = 753
        ts::next_tx(&mut scenario, ALICE);
        {
            let mut profile = ts::take_from_sender<UserProfile>(&scenario);
            reputation::update_after_settlement(&mut profile, 60, true, ts::ctx(&mut scenario));
            
            assert!(calibr::get_reputation_score(&profile) == 753, 6);
            assert!(calibr::get_reputation_count(&profile) == 3, 7);
            
            ts::return_to_sender(&scenario, profile);
        };
        
        // Prediction 4: 80% correct → skill = 960
        // n=3: new_rep = (753×3 + 960) / 4 = 3219 / 4 = 804
        ts::next_tx(&mut scenario, ALICE);
        {
            let mut profile = ts::take_from_sender<UserProfile>(&scenario);
            reputation::update_after_settlement(&mut profile, 80, true, ts::ctx(&mut scenario));
            
            assert!(calibr::get_reputation_score(&profile) == 804, 8);
            assert!(calibr::get_reputation_count(&profile) == 4, 9);
            
            ts::return_to_sender(&scenario, profile);
        };
        
        ts::end(scenario);
    }

    // ============================================================
    // TEST 5: THREE-TIER SYSTEM
    // ============================================================
    // Verify: <700 → 70%, 700-850 → 80%, >850 → 90%

    #[test]
    fun test_three_tier_system() {
        let mut scenario = setup_test();
        
        create_user_profile(&mut scenario, ALICE);
        
        // Start: rep=700, max_conf=70 (New tier boundary)
        ts::next_tx(&mut scenario, ALICE);
        {
            let profile = ts::take_from_sender<UserProfile>(&scenario);
            assert!(calibr::get_reputation_score(&profile) == 700, 0);
            assert!(calibr::get_max_confidence(&profile) == 70, 1);
            ts::return_to_sender(&scenario, profile);
        };
        
        // 90% correct → skill=990 → rep=990 (n=0 case)
        // rep=990 > 850 → Elite tier → max_conf=90
        ts::next_tx(&mut scenario, ALICE);
        {
            let mut profile = ts::take_from_sender<UserProfile>(&scenario);
            reputation::update_after_settlement(&mut profile, 90, true, ts::ctx(&mut scenario));
            
            assert!(calibr::get_reputation_score(&profile) == 990, 2);
            assert!(calibr::get_max_confidence(&profile) == 90, 3); // Elite
            
            ts::return_to_sender(&scenario, profile);
        };
        
        // 90% wrong → skill=190 → rep=(990+190)/2=590
        // rep=590 < 700 → New tier → max_conf=70
        ts::next_tx(&mut scenario, ALICE);
        {
            let mut profile = ts::take_from_sender<UserProfile>(&scenario);
            reputation::update_after_settlement(&mut profile, 90, false, ts::ctx(&mut scenario));
            
            assert!(calibr::get_reputation_score(&profile) == 590, 4);
            assert!(calibr::get_max_confidence(&profile) == 70, 5); // New
            
            ts::return_to_sender(&scenario, profile);
        };
        
        // 70% correct → skill=910 → rep=(590×2+910)/3=696
        // rep=696 < 700 → Still New tier → max_conf=70
        ts::next_tx(&mut scenario, ALICE);
        {
            let mut profile = ts::take_from_sender<UserProfile>(&scenario);
            reputation::update_after_settlement(&mut profile, 70, true, ts::ctx(&mut scenario));
            
            assert!(calibr::get_reputation_score(&profile) == 696, 6);
            assert!(calibr::get_max_confidence(&profile) == 70, 7); // Still New
            
            ts::return_to_sender(&scenario, profile);
        };
        
        // 60% correct → skill=840 → rep=(696×3+840)/4=732
        // 700 ≤ rep=732 ≤ 850 → Proven tier → max_conf=80
        ts::next_tx(&mut scenario, ALICE);
        {
            let mut profile = ts::take_from_sender<UserProfile>(&scenario);
            reputation::update_after_settlement(&mut profile, 60, true, ts::ctx(&mut scenario));
            
            assert!(calibr::get_reputation_score(&profile) == 732, 8);
            assert!(calibr::get_max_confidence(&profile) == 80, 9); // Proven
            
            ts::return_to_sender(&scenario, profile);
        };
        
        ts::end(scenario);
    }

    // ============================================================
    // TEST 6: CALIBRATION BEATS AGGRESSION
    // ============================================================
    // From Calibr doc:
    // Aggressive (90%): expected skill = (990 + 190) / 2 = 590
    // Calibrated (60%): expected skill = (840 + 640) / 2 = 740
    // 740 > 590 → Calibration wins!

    #[test]
    fun test_calibration_beats_aggression() {
        let mut scenario = setup_test();
        
        create_user_profile(&mut scenario, ALICE); // Aggressive
        create_user_profile(&mut scenario, BOB);   // Calibrated
        
        // Round 1: Both correct
        ts::next_tx(&mut scenario, ALICE);
        {
            let mut profile = ts::take_from_sender<UserProfile>(&scenario);
            // Alice at 70% (max for new user) → skill=910
            reputation::update_after_settlement(&mut profile, 70, true, ts::ctx(&mut scenario));
            ts::return_to_sender(&scenario, profile);
        };
        ts::next_tx(&mut scenario, BOB);
        {
            let mut profile = ts::take_from_sender<UserProfile>(&scenario);
            // Bob at 60% → skill=840
            reputation::update_after_settlement(&mut profile, 60, true, ts::ctx(&mut scenario));
            ts::return_to_sender(&scenario, profile);
        };
        
        // Round 2: Both wrong
        ts::next_tx(&mut scenario, ALICE);
        {
            let mut profile = ts::take_from_sender<UserProfile>(&scenario);
            // Alice at 70% → skill=510
            reputation::update_after_settlement(&mut profile, 70, false, ts::ctx(&mut scenario));
            ts::return_to_sender(&scenario, profile);
        };
        ts::next_tx(&mut scenario, BOB);
        {
            let mut profile = ts::take_from_sender<UserProfile>(&scenario);
            // Bob at 60% → skill=640
            reputation::update_after_settlement(&mut profile, 60, false, ts::ctx(&mut scenario));
            ts::return_to_sender(&scenario, profile);
        };
        
        // Round 3: Both correct
        ts::next_tx(&mut scenario, ALICE);
        {
            let mut profile = ts::take_from_sender<UserProfile>(&scenario);
            reputation::update_after_settlement(&mut profile, 70, true, ts::ctx(&mut scenario));
            ts::return_to_sender(&scenario, profile);
        };
        ts::next_tx(&mut scenario, BOB);
        {
            let mut profile = ts::take_from_sender<UserProfile>(&scenario);
            reputation::update_after_settlement(&mut profile, 60, true, ts::ctx(&mut scenario));
            ts::return_to_sender(&scenario, profile);
        };
        
        // Round 4: Both wrong
        ts::next_tx(&mut scenario, ALICE);
        {
            let mut profile = ts::take_from_sender<UserProfile>(&scenario);
            reputation::update_after_settlement(&mut profile, 70, false, ts::ctx(&mut scenario));
            ts::return_to_sender(&scenario, profile);
        };
        ts::next_tx(&mut scenario, BOB);
        {
            let mut profile = ts::take_from_sender<UserProfile>(&scenario);
            reputation::update_after_settlement(&mut profile, 60, false, ts::ctx(&mut scenario));
            ts::return_to_sender(&scenario, profile);
        };
        
        // Compare final reputations
        // Alice: 70% with 50% accuracy
        // skill sequence: 910, 510, 910, 510
        // rep: 910 → (910+510)/2=710 → (710×2+910)/3=776 → (776×3+510)/4=709
        
        // Bob: 60% with 50% accuracy
        // skill sequence: 840, 640, 840, 640
        // rep: 840 → (840+640)/2=740 → (740×2+840)/3=773 → (773×3+640)/4=739
        
        ts::next_tx(&mut scenario, ALICE);
        {
            let profile = ts::take_from_sender<UserProfile>(&scenario);
            let alice_rep = calibr::get_reputation_score(&profile);
            assert!(alice_rep == 709, 0);
            ts::return_to_sender(&scenario, profile);
        };
        
        ts::next_tx(&mut scenario, BOB);
        {
            let profile = ts::take_from_sender<UserProfile>(&scenario);
            let bob_rep = calibr::get_reputation_score(&profile);
            assert!(bob_rep == 739, 1);
            ts::return_to_sender(&scenario, profile);
        };
        
        // Bob (739) > Alice (709) → CALIBRATION BEATS AGGRESSION!
        
        ts::end(scenario);
    }

    // ============================================================
    // TEST 7: NO LOSERS EDGE CASE
    // ============================================================
    // When everyone predicts the winning side, loser_pool = 0
    // Everyone gets their stake back (no profit, no loss)

    #[test]
    fun test_no_losers_edge_case() {
        let mut scenario = setup_test();
        
        create_admin_and_market(&mut scenario, b"Everyone agrees");
        create_user_profile(&mut scenario, ALICE);
        create_user_profile(&mut scenario, BOB);
        
        // Both predict YES
        place_prediction_for_user(&mut scenario, ALICE, true, 70);
        place_prediction_for_user(&mut scenario, BOB, true, 60);
        
        lock_market_by_admin(&mut scenario);
        resolve_market_by_admin(&mut scenario, true);
        
        // Check payouts: everyone gets stake back
        ts::next_tx(&mut scenario, ALICE);
        {
            let pred = ts::take_from_sender<Prediction>(&scenario);
            let market = ts::take_shared<Market>(&scenario);
            
            // No loser pool → payout = stake = 100
            let payout = prediction::calculate_potential_payout(&pred, &market, true);
            assert!(payout == 100, 0);
            
            ts::return_to_sender(&scenario, pred);
            ts::return_shared(market);
        };
        
        ts::next_tx(&mut scenario, BOB);
        {
            let pred = ts::take_from_sender<Prediction>(&scenario);
            let market = ts::take_shared<Market>(&scenario);
            
            let payout = prediction::calculate_potential_payout(&pred, &market, true);
            assert!(payout == 100, 1);
            
            ts::return_to_sender(&scenario, pred);
            ts::return_shared(market);
        };
        
        ts::end(scenario);
    }

    // ============================================================
    // TEST 8: ZERO-SUM PROPERTY
    // ============================================================
    // Total payouts must equal total stakes (within rounding)

    #[test]
    fun test_zero_sum_property() {
        let mut scenario = setup_test();
        
        create_admin_and_market(&mut scenario, b"Zero-sum test");
        create_user_profile(&mut scenario, ALICE);
        create_user_profile(&mut scenario, BOB);
        create_user_profile(&mut scenario, CAROL);
        
        // Alice: YES at 70% (R=50)
        // Bob: YES at 60% (R=25)
        // Carol: NO at 70% (R=50)
        place_prediction_for_user(&mut scenario, ALICE, true, 70);
        place_prediction_for_user(&mut scenario, BOB, true, 60);
        place_prediction_for_user(&mut scenario, CAROL, false, 70);
        
        lock_market_by_admin(&mut scenario);
        resolve_market_by_admin(&mut scenario, true); // YES wins
        
        // loser_pool = Carol's R = 50
        // winner_risk = Alice(50) + Bob(25) = 75
        // Alice: 100 + (50/75)*50 = 100 + 33 = 133
        // Bob: 100 + (25/75)*50 = 100 + 16 = 116
        // Carol: 100 - 50 = 50
        
        let mut alice_payout = 0u64;
        let mut bob_payout = 0u64;
        let mut carol_payout = 0u64;
        
        ts::next_tx(&mut scenario, ALICE);
        {
            let pred = ts::take_from_sender<Prediction>(&scenario);
            let market = ts::take_shared<Market>(&scenario);
            alice_payout = prediction::calculate_potential_payout(&pred, &market, true);
            assert!(alice_payout == 133, 0);
            ts::return_to_sender(&scenario, pred);
            ts::return_shared(market);
        };
        
        ts::next_tx(&mut scenario, BOB);
        {
            let pred = ts::take_from_sender<Prediction>(&scenario);
            let market = ts::take_shared<Market>(&scenario);
            bob_payout = prediction::calculate_potential_payout(&pred, &market, true);
            assert!(bob_payout == 116, 1);
            ts::return_to_sender(&scenario, pred);
            ts::return_shared(market);
        };
        
        ts::next_tx(&mut scenario, CAROL);
        {
            let pred = ts::take_from_sender<Prediction>(&scenario);
            let market = ts::take_shared<Market>(&scenario);
            carol_payout = prediction::calculate_potential_payout(&pred, &market, true);
            assert!(carol_payout == 50, 2);
            ts::return_to_sender(&scenario, pred);
            ts::return_shared(market);
        };
        
        // Verify zero-sum: 133 + 116 + 50 = 299
        // Total stakes: 300
        // Rounding dust: 1 (acceptable)
        let total_payouts = alice_payout + bob_payout + carol_payout;
        let total_stakes = 300u64;
        assert!(total_stakes - total_payouts <= 1, 3);
        
        ts::end(scenario);
    }

    // ============================================================
    // TEST 9: COMPLETE MARKET LIFECYCLE
    // ============================================================

    #[test]
    fun test_complete_market_lifecycle() {
        let mut scenario = setup_test();
        
        // Step 1: Admin creates market
        create_admin_and_market(&mut scenario, b"Will ETH exceed $5000?");
        
        // Verify market exists and is open
        ts::next_tx(&mut scenario, ADMIN);
        {
            let market = ts::take_shared<Market>(&scenario);
            assert!(calibr::is_market_open(&market), 0);
            assert!(!calibr::is_market_locked(&market), 1);
            assert!(!calibr::is_market_resolved(&market), 2);
            ts::return_shared(market);
        };
        
        // Step 2: Lock market
        lock_market_by_admin(&mut scenario);
        
        // Verify market is locked
        ts::next_tx(&mut scenario, ADMIN);
        {
            let market = ts::take_shared<Market>(&scenario);
            assert!(calibr::is_market_locked(&market), 3);
            assert!(!calibr::is_market_open(&market), 4);
            ts::return_shared(market);
        };
        
        // Step 3: Resolve market
        resolve_market_by_admin(&mut scenario, true);
        
        // Verify market is resolved
        ts::next_tx(&mut scenario, ADMIN);
        {
            let market = ts::take_shared<Market>(&scenario);
            assert!(calibr::is_market_resolved(&market), 5);
            let outcome = calibr::get_market_outcome(&market);
            assert!(std::option::is_some(&outcome), 6);
            assert!(*std::option::borrow(&outcome) == true, 7);
            ts::return_shared(market);
        };
        
        ts::end(scenario);
    }

    // ============================================================
    // TEST 10: FULL PREDICTION FLOW WITH SETTLEMENT
    // ============================================================

    #[test]
    fun test_full_prediction_flow_with_settlement() {
        let mut scenario = setup_test();
        
        create_admin_and_market(&mut scenario, b"Test market");
        create_user_profile(&mut scenario, ALICE);
        create_user_profile(&mut scenario, BOB);
        
        // Alice: YES at 70% (R=50)
        place_prediction_for_user(&mut scenario, ALICE, true, 70);
        
        // Bob: NO at 60% (R=25)
        place_prediction_for_user(&mut scenario, BOB, false, 60);
        
        // Verify market state
        ts::next_tx(&mut scenario, ADMIN);
        {
            let market = ts::take_shared<Market>(&scenario);
            assert!(calibr::get_yes_risk_total(&market) == 50, 0);
            assert!(calibr::get_no_risk_total(&market) == 25, 1);
            ts::return_shared(market);
        };
        
        // Lock and resolve (YES wins)
        lock_market_by_admin(&mut scenario);
        resolve_market_by_admin(&mut scenario, true);
        
        // Settle predictions
        settle_prediction_for_user(&mut scenario, ALICE);
        settle_prediction_for_user(&mut scenario, BOB);
        
        // Verify Alice's reputation (winner, 70% correct → skill=910)
        ts::next_tx(&mut scenario, ALICE);
        {
            let profile = ts::take_from_sender<UserProfile>(&scenario);
            // First prediction: n=0 → rep = skill = 910
            assert!(calibr::get_reputation_score(&profile) == 910, 2);
            assert!(calibr::get_max_confidence(&profile) == 90, 3); // Elite tier
            ts::return_to_sender(&scenario, profile);
        };
        
        // Verify Bob's reputation (loser, 60% wrong → skill=640)
        ts::next_tx(&mut scenario, BOB);
        {
            let profile = ts::take_from_sender<UserProfile>(&scenario);
            // First prediction: n=0 → rep = skill = 640
            assert!(calibr::get_reputation_score(&profile) == 640, 4);
            assert!(calibr::get_max_confidence(&profile) == 70, 5); // New tier
            ts::return_to_sender(&scenario, profile);
        };
        
        // Verify predictions are marked as settled
        ts::next_tx(&mut scenario, ALICE);
        {
            let pred = ts::take_from_sender<Prediction>(&scenario);
            assert!(calibr::is_prediction_settled(&pred), 6);
            ts::return_to_sender(&scenario, pred);
        };
        
        ts::end(scenario);
    }

    // ============================================================
    // TEST 11: LOSER PAYOUT VARIES BY CONFIDENCE
    // ============================================================
    // Higher confidence when wrong = more loss

    #[test]
    fun test_loser_payout_varies_by_confidence() {
        // 50% wrong: R=5, payout = 100-5 = 95
        let payout_50 = market::calculate_loser_payout(5);
        assert!(payout_50 == 95, 0);
        
        // 60% wrong: R=25, payout = 100-25 = 75
        let payout_60 = market::calculate_loser_payout(25);
        assert!(payout_60 == 75, 1);
        
        // 70% wrong: R=50, payout = 100-50 = 50
        let payout_70 = market::calculate_loser_payout(50);
        assert!(payout_70 == 50, 2);
        
        // 80% wrong: R=75, payout = 100-75 = 25
        let payout_80 = market::calculate_loser_payout(75);
        assert!(payout_80 == 25, 3);
        
        // 90% wrong: R=100, payout = 100-100 = 0
        let payout_90 = market::calculate_loser_payout(100);
        assert!(payout_90 == 0, 4);
    }

    // ============================================================
    // TEST 12: MARKET HELPER CALCULATIONS
    // ============================================================

    #[test]
    fun test_market_helper_calculations() {
        let mut scenario = setup_test();
        
        create_admin_and_market(&mut scenario, b"Helper test");
        create_user_profile(&mut scenario, ALICE);
        create_user_profile(&mut scenario, BOB);
        create_user_profile(&mut scenario, CAROL);
        
        // Alice: YES at 70% (R=50)
        // Bob: YES at 60% (R=25)
        // Carol: NO at 70% (R=50)
        place_prediction_for_user(&mut scenario, ALICE, true, 70);
        place_prediction_for_user(&mut scenario, BOB, true, 60);
        place_prediction_for_user(&mut scenario, CAROL, false, 70);
        
        ts::next_tx(&mut scenario, ADMIN);
        {
            let market = ts::take_shared<Market>(&scenario);
            
            // Test get_total_predictions
            assert!(market::get_total_predictions(&market) == 3, 0);
            
            // Test get_total_risk
            assert!(market::get_total_risk(&market) == 125, 1); // 50+25+50
            
            // Test get_total_stakes
            assert!(market::get_total_stakes(&market) == 300, 2); // 3 * 100
            
            // Test calculate_loser_pool (if YES wins)
            assert!(market::calculate_loser_pool(&market, true) == 50, 3); // NO risk
            
            // Test calculate_winner_risk_total (if YES wins)
            assert!(market::calculate_winner_risk_total(&market, true) == 75, 4); // YES risk
            
            ts::return_shared(market);
        };
        
        ts::end(scenario);
    }
}
