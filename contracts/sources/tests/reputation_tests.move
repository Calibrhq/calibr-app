/// reputation_tests.move
/// 
/// Unit tests for the reputation module.
/// 
/// Tests cover:
/// - Profile creation with correct initial values
/// - Rolling average calculation
/// - Tier progression and max confidence updates
/// - Edge cases (first prediction, many predictions)
/// - Calibration vs aggression scenarios

#[test_only]
module calibr::reputation_tests {
    use sui::test_scenario::{Self as ts, Scenario};
    use calibr::calibr::{Self, UserProfile};
    use calibr::reputation;
    use calibr::math;

    // Test addresses
    const ALICE: address = @0xA11CE;
    const BOB: address = @0xB0B;

    // ============================================================
    // HELPER FUNCTIONS
    // ============================================================

    fun setup_profile(scenario: &mut Scenario, user: address): UserProfile {
        ts::next_tx(scenario, user);
        {
            reputation::create_profile(ts::ctx(scenario));
        };
        
        ts::next_tx(scenario, user);
        ts::take_from_sender<UserProfile>(scenario)
    }

    // ============================================================
    // PROFILE CREATION TESTS
    // ============================================================

    #[test]
    fun test_create_profile_initial_values() {
        let mut scenario = ts::begin(ALICE);
        
        let profile = setup_profile(&mut scenario, ALICE);
        
        // Verify initial values
        assert!(calibr::get_profile_owner(&profile) == ALICE, 0);
        assert!(calibr::get_reputation_score(&profile) == 700, 1);
        assert!(calibr::get_reputation_count(&profile) == 0, 2);
        assert!(calibr::get_max_confidence(&profile) == 70, 3);
        
        ts::return_to_sender(&scenario, profile);
        ts::end(scenario);
    }

    #[test]
    fun test_get_tier_new_user() {
        let mut scenario = ts::begin(ALICE);
        
        let profile = setup_profile(&mut scenario, ALICE);
        
        // Starting reputation is 700, which is at Proven tier boundary
        // According to our rules: 700 > 699 (TIER_NEW_MAX) → Proven tier
        let tier = reputation::get_tier(&profile);
        assert!(tier == 1, 0); // Proven tier
        
        ts::return_to_sender(&scenario, profile);
        ts::end(scenario);
    }

    // ============================================================
    // ROLLING AVERAGE TESTS
    // ============================================================

    #[test]
    fun test_rolling_average_first_prediction() {
        let mut scenario = ts::begin(ALICE);
        
        let mut profile = setup_profile(&mut scenario, ALICE);
        
        // First prediction: 80% correct → skill = 960
        // Formula: new_rep = (700 × 0 + 960) / 1 = 960
        ts::next_tx(&mut scenario, ALICE);
        {
            reputation::update_after_settlement(&mut profile, 80, true, ts::ctx(&mut scenario));
        };
        
        let new_score = calibr::get_reputation_score(&profile);
        let new_count = calibr::get_reputation_count(&profile);
        
        // Verify skill calculation: 1 - (0.8 - 1)² = 1 - 0.04 = 0.96 → 960
        assert!(new_score == 960, 0);
        assert!(new_count == 1, 1);
        
        // Score 960 > 850 → Elite tier → max 90%
        assert!(calibr::get_max_confidence(&profile) == 90, 2);
        
        ts::return_to_sender(&scenario, profile);
        ts::end(scenario);
    }

    #[test]
    fun test_rolling_average_second_prediction() {
        let mut scenario = ts::begin(ALICE);
        
        let mut profile = setup_profile(&mut scenario, ALICE);
        
        // First prediction: 80% correct → skill = 960
        ts::next_tx(&mut scenario, ALICE);
        {
            reputation::update_after_settlement(&mut profile, 80, true, ts::ctx(&mut scenario));
        };
        
        // Verify first update
        assert!(calibr::get_reputation_score(&profile) == 960, 0);
        assert!(calibr::get_reputation_count(&profile) == 1, 1);
        
        // Second prediction: 70% wrong → skill = 510
        // skill = 1 - (0.7 - 0)² = 1 - 0.49 = 0.51 → 510
        // Formula: new_rep = (960 × 1 + 510) / 2 = 1470 / 2 = 735
        ts::next_tx(&mut scenario, ALICE);
        {
            reputation::update_after_settlement(&mut profile, 70, false, ts::ctx(&mut scenario));
        };
        
        let new_score = calibr::get_reputation_score(&profile);
        let new_count = calibr::get_reputation_count(&profile);
        
        assert!(new_score == 735, 2);
        assert!(new_count == 2, 3);
        
        // Score 735: 700 < 735 ≤ 850 → Proven tier → max 80%
        assert!(calibr::get_max_confidence(&profile) == 80, 4);
        
        ts::return_to_sender(&scenario, profile);
        ts::end(scenario);
    }

    #[test]
    fun test_rolling_average_three_predictions() {
        let mut scenario = ts::begin(ALICE);
        
        let mut profile = setup_profile(&mut scenario, ALICE);
        
        // Prediction 1: 80% correct → skill = 960
        // new_rep = (700×0 + 960) / 1 = 960
        ts::next_tx(&mut scenario, ALICE);
        {
            reputation::update_after_settlement(&mut profile, 80, true, ts::ctx(&mut scenario));
        };
        assert!(calibr::get_reputation_score(&profile) == 960, 0);
        
        // Prediction 2: 70% wrong → skill = 510
        // new_rep = (960×1 + 510) / 2 = 735
        ts::next_tx(&mut scenario, ALICE);
        {
            reputation::update_after_settlement(&mut profile, 70, false, ts::ctx(&mut scenario));
        };
        assert!(calibr::get_reputation_score(&profile) == 735, 1);
        
        // Prediction 3: 60% correct → skill = 840
        // skill = 1 - (0.6 - 1)² = 1 - 0.16 = 0.84 → 840
        // new_rep = (735×2 + 840) / 3 = (1470 + 840) / 3 = 2310 / 3 = 770
        ts::next_tx(&mut scenario, ALICE);
        {
            reputation::update_after_settlement(&mut profile, 60, true, ts::ctx(&mut scenario));
        };
        
        assert!(calibr::get_reputation_score(&profile) == 770, 2);
        assert!(calibr::get_reputation_count(&profile) == 3, 3);
        
        ts::return_to_sender(&scenario, profile);
        ts::end(scenario);
    }

    // ============================================================
    // TIER TRANSITION TESTS
    // ============================================================

    #[test]
    fun test_tier_transition_to_elite() {
        let mut scenario = ts::begin(ALICE);
        
        let mut profile = setup_profile(&mut scenario, ALICE);
        
        // Make several high-skill predictions to reach Elite tier
        // 90% correct repeatedly → skill = 990 each time
        
        // Prediction 1: skill = 990 → rep = 990
        ts::next_tx(&mut scenario, ALICE);
        {
            reputation::update_after_settlement(&mut profile, 90, true, ts::ctx(&mut scenario));
        };
        assert!(calibr::get_max_confidence(&profile) == 90, 0); // Elite
        
        ts::return_to_sender(&scenario, profile);
        ts::end(scenario);
    }

    #[test]
    fun test_tier_transition_to_new() {
        let mut scenario = ts::begin(ALICE);
        
        let mut profile = setup_profile(&mut scenario, ALICE);
        
        // Make a very bad prediction to drop below 700
        // 90% wrong → skill = 190
        // new_rep = (700×0 + 190) / 1 = 190
        ts::next_tx(&mut scenario, ALICE);
        {
            reputation::update_after_settlement(&mut profile, 90, false, ts::ctx(&mut scenario));
        };
        
        assert!(calibr::get_reputation_score(&profile) == 190, 0);
        assert!(calibr::get_max_confidence(&profile) == 70, 1); // New tier
        assert!(reputation::get_tier(&profile) == 0, 2); // New tier = 0
        
        ts::return_to_sender(&scenario, profile);
        ts::end(scenario);
    }

    #[test]
    fun test_tier_boundary_700() {
        let mut scenario = ts::begin(ALICE);
        
        let mut profile = setup_profile(&mut scenario, ALICE);
        
        // Make prediction that lands exactly at 700
        // skill = 700 → new_rep = 700
        // We need skill = 700 which means 1 - (c-o)² = 0.7
        // For correct: (c-1)² = 0.3, c = 1 - sqrt(0.3) ≈ 0.452... not valid
        // For wrong: c² = 0.3, c = sqrt(0.3) ≈ 0.548... not exact
        
        // Instead, let's test the boundary by making predictions that
        // result in scores around 700
        
        // First: 55% wrong → skill = 1 - 0.55² = 1 - 0.3025 = 0.6975 → 697
        ts::next_tx(&mut scenario, ALICE);
        {
            reputation::update_after_settlement(&mut profile, 55, false, ts::ctx(&mut scenario));
        };
        
        // Score = 697 < 700 → New tier → max 70%
        assert!(calibr::get_reputation_score(&profile) == 697, 0);
        assert!(calibr::get_max_confidence(&profile) == 70, 1);
        assert!(reputation::get_tier(&profile) == 0, 2); // New
        
        ts::return_to_sender(&scenario, profile);
        ts::end(scenario);
    }

    #[test]
    fun test_tier_boundary_850() {
        let mut scenario = ts::begin(ALICE);
        
        let mut profile = setup_profile(&mut scenario, ALICE);
        
        // First prediction: 85% correct → skill = 1 - (0.85-1)² = 1 - 0.0225 = 0.9775 → 977
        ts::next_tx(&mut scenario, ALICE);
        {
            reputation::update_after_settlement(&mut profile, 85, true, ts::ctx(&mut scenario));
        };
        
        // Score = 977 > 850 → Elite → max 90%
        assert!(calibr::get_reputation_score(&profile) == 977, 0);
        assert!(calibr::get_max_confidence(&profile) == 90, 1);
        assert!(reputation::get_tier(&profile) == 2, 2); // Elite
        
        // Second prediction that brings score close to 850
        // Need skill such that (977 + skill) / 2 ≈ 850
        // skill ≈ 1700 - 977 = 723
        // 60% wrong → skill = 640
        ts::next_tx(&mut scenario, ALICE);
        {
            reputation::update_after_settlement(&mut profile, 60, false, ts::ctx(&mut scenario));
        };
        
        // new_rep = (977 + 640) / 2 = 808 (Proven tier)
        assert!(calibr::get_reputation_score(&profile) == 808, 3);
        assert!(calibr::get_max_confidence(&profile) == 80, 4);
        assert!(reputation::get_tier(&profile) == 1, 5); // Proven
        
        ts::return_to_sender(&scenario, profile);
        ts::end(scenario);
    }

    // ============================================================
    // CALIBRATION VS AGGRESSION TESTS
    // ============================================================

    #[test]
    fun test_calibrated_vs_aggressive_scenario() {
        // This test demonstrates why calibration beats aggression
        // 
        // AGGRESSIVE: Always predicts 90% (high confidence)
        // CALIBRATED: Predicts based on actual confidence (60-70%)
        //
        // Over multiple predictions with 50% base rate (random outcomes),
        // the calibrated user should have higher expected reputation.
        
        let mut scenario = ts::begin(ALICE);
        let mut scenario2 = ts::begin(BOB);
        
        // Alice = Aggressive (always 90%)
        let mut alice_profile = setup_profile(&mut scenario, ALICE);
        
        // Bob = Calibrated (honest 60-70%)
        let mut bob_profile = setup_profile(&mut scenario2, BOB);
        
        // Simulation: 4 predictions, 2 correct, 2 wrong (50% rate)
        
        // --- Alice (Aggressive: 90% always) ---
        // Correct: skill = 990
        ts::next_tx(&mut scenario, ALICE);
        {
            reputation::update_after_settlement(&mut alice_profile, 90, true, ts::ctx(&mut scenario));
        };
        // Wrong: skill = 190
        ts::next_tx(&mut scenario, ALICE);
        {
            reputation::update_after_settlement(&mut alice_profile, 90, false, ts::ctx(&mut scenario));
        };
        // Correct: skill = 990
        ts::next_tx(&mut scenario, ALICE);
        {
            reputation::update_after_settlement(&mut alice_profile, 90, true, ts::ctx(&mut scenario));
        };
        // Wrong: skill = 190
        ts::next_tx(&mut scenario, ALICE);
        {
            reputation::update_after_settlement(&mut alice_profile, 90, false, ts::ctx(&mut scenario));
        };
        
        // --- Bob (Calibrated: 60% when unsure) ---
        // Correct: skill = 840
        ts::next_tx(&mut scenario2, BOB);
        {
            reputation::update_after_settlement(&mut bob_profile, 60, true, ts::ctx(&mut scenario2));
        };
        // Wrong: skill = 640
        ts::next_tx(&mut scenario2, BOB);
        {
            reputation::update_after_settlement(&mut bob_profile, 60, false, ts::ctx(&mut scenario2));
        };
        // Correct: skill = 840
        ts::next_tx(&mut scenario2, BOB);
        {
            reputation::update_after_settlement(&mut bob_profile, 60, true, ts::ctx(&mut scenario2));
        };
        // Wrong: skill = 640
        ts::next_tx(&mut scenario2, BOB);
        {
            reputation::update_after_settlement(&mut bob_profile, 60, false, ts::ctx(&mut scenario2));
        };
        
        // Calculate expected final reputations
        // Alice: (990 + 190 + 990 + 190) / 4 = 2360 / 4 = 590
        // But with rolling average from 700 starting point...
        // Actually, first prediction replaces: rep = skill
        // So Alice: rep₁=990, rep₂=(990+190)/2=590, rep₃=(590×2+990)/3=723, rep₄=(723×3+190)/4=589
        
        // Bob: rep₁=840, rep₂=(840+640)/2=740, rep₃=(740×2+840)/3=773, rep₄=(773×3+640)/4=739
        
        let alice_rep = calibr::get_reputation_score(&alice_profile);
        let bob_rep = calibr::get_reputation_score(&bob_profile);
        
        // Bob (calibrated) should have higher reputation than Alice (aggressive)
        assert!(bob_rep > alice_rep, 0);
        
        // Verify exact values
        assert!(alice_rep == 589, 1);
        assert!(bob_rep == 739, 2);
        
        ts::return_to_sender(&scenario, alice_profile);
        ts::return_to_sender(&scenario2, bob_profile);
        ts::end(scenario);
        ts::end(scenario2);
    }

    // ============================================================
    // REPUTATION COMPOUNDING TESTS
    // ============================================================

    #[test]
    fun test_reputation_compounds_slowly() {
        let mut scenario = ts::begin(ALICE);
        
        let mut profile = setup_profile(&mut scenario, ALICE);
        
        // Make 10 predictions to show diminishing impact
        // All predictions: 70% correct → skill = 910
        
        let skill_70_correct = math::skill(70, true);
        assert!(skill_70_correct == 910, 0);
        
        // Track how much reputation changes with each prediction
        let mut prev_rep = 700u64;
        let mut i = 0u64;
        
        while (i < 10) {
            ts::next_tx(&mut scenario, ALICE);
            {
                reputation::update_after_settlement(&mut profile, 70, true, ts::ctx(&mut scenario));
            };
            
            let new_rep = calibr::get_reputation_score(&profile);
            let change = if (new_rep > prev_rep) { new_rep - prev_rep } else { prev_rep - new_rep };
            
            // Early predictions cause larger changes
            // Later predictions cause smaller changes
            if (i == 0) {
                // First: 700 → 910 (change = 210)
                assert!(change == 210, 1);
            };
            if (i == 4) {
                // Fifth: change should be smaller
                // (rep×4 + 910) / 5 - rep = (910 - rep) / 5
                // Much smaller than early changes
                assert!(change < 50, 2);
            };
            
            prev_rep = new_rep;
            i = i + 1;
        };
        
        // After 10 consistent predictions, reputation should be close to skill (910)
        let final_rep = calibr::get_reputation_score(&profile);
        // Should be between 900 and 910
        assert!(final_rep >= 900, 3);
        assert!(final_rep <= 910, 4);
        
        ts::return_to_sender(&scenario, profile);
        ts::end(scenario);
    }

    // ============================================================
    // VIEW FUNCTION TESTS
    // ============================================================

    #[test]
    fun test_is_confidence_allowed() {
        let mut scenario = ts::begin(ALICE);
        
        let profile = setup_profile(&mut scenario, ALICE);
        
        // New user has max_confidence = 70
        assert!(reputation::is_confidence_allowed(&profile, 50) == true, 0);
        assert!(reputation::is_confidence_allowed(&profile, 60) == true, 1);
        assert!(reputation::is_confidence_allowed(&profile, 70) == true, 2);
        assert!(reputation::is_confidence_allowed(&profile, 80) == false, 3);
        assert!(reputation::is_confidence_allowed(&profile, 90) == false, 4);
        
        // Below minimum is also not allowed
        assert!(reputation::is_confidence_allowed(&profile, 49) == false, 5);
        
        ts::return_to_sender(&scenario, profile);
        ts::end(scenario);
    }

    #[test]
    fun test_preview_reputation_update() {
        let mut scenario = ts::begin(ALICE);
        
        let profile = setup_profile(&mut scenario, ALICE);
        
        // Preview what reputation would be after skill = 900
        // new_rep = (700 × 0 + 900) / 1 = 900
        let preview = reputation::preview_reputation_update(&profile, 900);
        assert!(preview == 900, 0);
        
        ts::return_to_sender(&scenario, profile);
        ts::end(scenario);
    }

    #[test]
    fun test_get_tier_name() {
        let mut scenario = ts::begin(ALICE);
        
        let mut profile = setup_profile(&mut scenario, ALICE);
        
        // Starting tier (700) should be "Proven"
        let name = reputation::get_tier_name(&profile);
        assert!(name == b"Proven", 0);
        
        // Drop to New tier
        ts::next_tx(&mut scenario, ALICE);
        {
            reputation::update_after_settlement(&mut profile, 90, false, ts::ctx(&mut scenario));
        };
        
        let name = reputation::get_tier_name(&profile);
        assert!(name == b"New", 1);
        
        ts::return_to_sender(&scenario, profile);
        ts::end(scenario);
    }

    // ============================================================
    // EDGE CASE TESTS
    // ============================================================

    #[test]
    fun test_many_predictions_convergence() {
        let mut scenario = ts::begin(ALICE);
        
        let mut profile = setup_profile(&mut scenario, ALICE);
        
        // Make 20 predictions all with skill = 800
        // Should converge toward 800
        let mut i = 0u64;
        
        while (i < 20) {
            // 72% correct gives skill ≈ 922
            // 65% wrong gives skill ≈ 578
            // Average: 750
            
            // Let's use alternating to test convergence
            // Even: 80% correct → 960
            // Odd: 60% wrong → 640
            // Average skill = 800
            
            ts::next_tx(&mut scenario, ALICE);
            {
                if (i % 2 == 0) {
                    reputation::update_after_settlement(&mut profile, 80, true, ts::ctx(&mut scenario));
                } else {
                    reputation::update_after_settlement(&mut profile, 60, false, ts::ctx(&mut scenario));
                };
            };
            
            i = i + 1;
        };
        
        let final_rep = calibr::get_reputation_score(&profile);
        
        // Should be close to average of 960 and 640 = 800
        // Allow some variance due to rolling average mechanics
        assert!(final_rep >= 780, 0);
        assert!(final_rep <= 820, 1);
        
        ts::return_to_sender(&scenario, profile);
        ts::end(scenario);
    }

    #[test]
    fun test_worst_case_overconfidence() {
        let mut scenario = ts::begin(ALICE);
        
        let mut profile = setup_profile(&mut scenario, ALICE);
        
        // Worst case: 90% confidence, wrong
        // skill = 1 - 0.9² = 1 - 0.81 = 0.19 → 190
        ts::next_tx(&mut scenario, ALICE);
        {
            reputation::update_after_settlement(&mut profile, 90, false, ts::ctx(&mut scenario));
        };
        
        assert!(calibr::get_reputation_score(&profile) == 190, 0);
        assert!(calibr::get_max_confidence(&profile) == 70, 1); // Dropped to New tier
        
        ts::return_to_sender(&scenario, profile);
        ts::end(scenario);
    }

    #[test]
    fun test_best_case_calibration() {
        let mut scenario = ts::begin(ALICE);
        
        let mut profile = setup_profile(&mut scenario, ALICE);
        
        // Best case: 90% confidence, correct
        // skill = 1 - (0.9-1)² = 1 - 0.01 = 0.99 → 990
        ts::next_tx(&mut scenario, ALICE);
        {
            reputation::update_after_settlement(&mut profile, 90, true, ts::ctx(&mut scenario));
        };
        
        assert!(calibr::get_reputation_score(&profile) == 990, 0);
        assert!(calibr::get_max_confidence(&profile) == 90, 1); // Elite tier!
        
        ts::return_to_sender(&scenario, profile);
        ts::end(scenario);
    }
}
