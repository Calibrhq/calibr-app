/// events.move
/// 
/// Event definitions for Calibr protocol.
/// 
/// Responsibilities:
/// - Define all event structs emitted by the protocol
/// - Events are used for indexing, analytics, and frontend updates
/// - No logic, no state - struct definitions only
/// 
/// Events enable off-chain indexing without querying object state.
/// All events include relevant IDs for correlation.

module calibr::events {
    // === Market Events ===
    
    // MarketCreated
    //   - market_id: ID
    //   - question: String
    //   - creator: address
    //   - resolve_by: u64 (timestamp)
    
    // MarketLocked
    //   - market_id: ID
    //   - locked_at: u64
    
    // MarketResolved
    //   - market_id: ID
    //   - outcome: bool (true = YES, false = NO)
    //   - resolved_at: u64
    //   - total_pool: u64
    //   - winner_count: u64
    //   - loser_count: u64
    
    // === Prediction Events ===
    
    // PredictionPlaced
    //   - prediction_id: ID
    //   - market_id: ID
    //   - user: address
    //   - side: bool
    //   - confidence: u64
    //   - risk: u64
    //   - stake: u64
    
    // PredictionSettled
    //   - prediction_id: ID
    //   - market_id: ID
    //   - user: address
    //   - won: bool
    //   - payout: u64
    //   - skill_score: u64
    
    // === Reputation Events ===
    
    // ReputationCreated
    //   - user: address
    //   - reputation_id: ID
    
    // ReputationUpdated
    //   - user: address
    //   - old_score: u64
    //   - new_score: u64
    //   - skill_delta: u64
    //   - new_max_confidence: u64
}
