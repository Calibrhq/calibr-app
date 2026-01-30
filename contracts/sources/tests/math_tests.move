/// math_tests.move
/// 
/// Unit tests for the math module.
/// Run with: sui move test

#[test_only]
module calibr::math_tests {
    use calibr::math;

    // ============================================================
    // RISK CALCULATION TESTS
    // ============================================================

    #[test]
    fun test_risk_at_50_confidence() {
        // At 50% confidence, R = max(5, 0) = 5
        let risk = math::risk_from_confidence(50);
        assert!(risk == 5, 0);
    }

    #[test]
    fun test_risk_at_60_confidence() {
        // At 60% confidence, R = max(5, 100 * 10 / 40) = max(5, 25) = 25
        let risk = math::risk_from_confidence(60);
        assert!(risk == 25, 0);
    }

    #[test]
    fun test_risk_at_70_confidence() {
        // At 70% confidence, R = max(5, 100 * 20 / 40) = max(5, 50) = 50
        let risk = math::risk_from_confidence(70);
        assert!(risk == 50, 0);
    }

    #[test]
    fun test_risk_at_80_confidence() {
        // At 80% confidence, R = max(5, 100 * 30 / 40) = max(5, 75) = 75
        let risk = math::risk_from_confidence(80);
        assert!(risk == 75, 0);
    }

    #[test]
    fun test_risk_at_90_confidence() {
        // At 90% confidence, R = max(5, 100 * 40 / 40) = max(5, 100) = 100
        let risk = math::risk_from_confidence(90);
        assert!(risk == 100, 0);
    }

    #[test]
    #[expected_failure(abort_code = 100)] // EConfidenceTooLow
    fun test_risk_below_50_fails() {
        math::risk_from_confidence(49);
    }

    #[test]
    #[expected_failure(abort_code = 101)] // EConfidenceTooHigh
    fun test_risk_above_90_fails() {
        math::risk_from_confidence(91);
    }

    // ============================================================
    // SKILL CALCULATION TESTS
    // ============================================================

    #[test]
    fun test_skill_90_correct() {
        // 90% confidence, correct: skill = 1 - (0.9 - 1)² = 0.99 → 990
        let skill = math::skill(90, true);
        assert!(skill == 990, 0);
    }

    #[test]
    fun test_skill_90_wrong() {
        // 90% confidence, wrong: skill = 1 - (0.9 - 0)² = 0.19 → 190
        let skill = math::skill(90, false);
        assert!(skill == 190, 0);
    }

    #[test]
    fun test_skill_55_correct() {
        // 55% confidence, correct: skill = 1 - (0.55 - 1)² = 0.7975 → 797
        let skill = math::skill(55, true);
        assert!(skill == 797, 0);
    }

    #[test]
    fun test_skill_55_wrong() {
        // 55% confidence, wrong: skill = 1 - (0.55 - 0)² = 0.6975 → 697
        let skill = math::skill(55, false);
        assert!(skill == 697, 0);
    }

    #[test]
    fun test_skill_50_correct() {
        // 50% confidence, correct: skill = 1 - (0.5 - 1)² = 0.75 → 750
        let skill = math::skill(50, true);
        assert!(skill == 750, 0);
    }

    #[test]
    fun test_skill_50_wrong() {
        // 50% confidence, wrong: skill = 1 - (0.5 - 0)² = 0.75 → 750
        // Note: At 50%, outcome doesn't matter - skill is always 750
        let skill = math::skill(50, false);
        assert!(skill == 750, 0);
    }

    #[test]
    fun test_skill_70_correct() {
        // 70% confidence, correct: skill = 1 - (0.7 - 1)² = 0.91 → 910
        let skill = math::skill(70, true);
        assert!(skill == 910, 0);
    }

    // ============================================================
    // HELPER FUNCTION TESTS
    // ============================================================

    #[test]
    fun test_max() {
        assert!(math::max(5, 10) == 10, 0);
        assert!(math::max(10, 5) == 10, 0);
        assert!(math::max(5, 5) == 5, 0);
    }

    #[test]
    fun test_min() {
        assert!(math::min(5, 10) == 5, 0);
        assert!(math::min(10, 5) == 5, 0);
        assert!(math::min(5, 5) == 5, 0);
    }

    #[test]
    fun test_mul_div() {
        // (100 * 50) / 200 = 25
        assert!(math::mul_div(100, 50, 200) == 25, 0);
        
        // (1000 * 1000) / 100 = 10000
        assert!(math::mul_div(1000, 1000, 100) == 10000, 0);
    }
}
