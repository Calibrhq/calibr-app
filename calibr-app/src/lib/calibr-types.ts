/**
 * Calibr Protocol - Chain Types and Helpers
 * 
 * TypeScript types matching the Sui Move contract structs,
 * and helper functions for struct type strings.
 */

import { DEFAULT_NETWORK, getPackageId } from "./sui-config";

// ============================================================
// STRUCT TYPE HELPERS
// ============================================================

/**
 * Get the full struct type string for a Calibr module type.
 * Example: getCalibrStructType("UserProfile") => "0x...::calibr::UserProfile"
 */
export function getCalibrStructType(typeName: string, module: string = "calibr"): string {
    return `${getPackageId(DEFAULT_NETWORK)}::${module}::${typeName}`;
}

export function getUserProfileStructType(): string {
    return getCalibrStructType("UserProfile", "calibr");
}

export function getMarketStructType(): string {
    return getCalibrStructType("Market", "calibr");
}

export function getPredictionStructType(): string {
    return getCalibrStructType("Prediction", "calibr");
}

export function getAdminCapStructType(): string {
    return getCalibrStructType("AdminCap", "market");
}

// ============================================================
// CHAIN RESPONSE TYPES
// ============================================================

/**
 * UserProfile as returned from chain (getOwnedObjects with showContent)
 */
export interface ChainUserProfile {
    id: string;
    owner: string;
    reputation_score: number;
    reputation_count: number;
    max_confidence: number;
}

/**
 * Market as returned from chain (getObject with showContent)
 */
export interface ChainMarket {
    id: string;
    question: number[]; // UTF-8 bytes, need to decode
    deadline: number;   // Resolution deadline (milliseconds since epoch)
    yes_risk_total: number;
    no_risk_total: number;
    yes_count: number;
    no_count: number;
    locked: boolean;
    resolved: boolean;
    outcome: { Some: boolean } | { None: null } | null;
    authority: string;
}

/**
 * Prediction as returned from chain (getOwnedObjects with showContent)
 */
export interface ChainPrediction {
    id: string;
    market_id: string;
    side: boolean; // true = YES, false = NO
    confidence: number;
    stake: number;
    risked: number;
    settled: boolean;
}

// ============================================================
// PARSED TYPES (Frontend-friendly)
// ============================================================

export type UserTier = "New" | "Proven" | "Elite";

export interface ParsedUserProfile {
    id: string;
    owner: string;
    reputationScore: number;
    reputationCount: number;
    maxConfidence: number;
    tier: UserTier;
}

export interface ParsedMarket {
    id: string;
    question: string;
    deadline?: number;  // Optional as older markets might not have it
    yesRiskTotal: number;
    noRiskTotal: number;
    yesCount: number;
    noCount: number;
    locked: boolean;
    resolved: boolean;
    outcome: boolean | null;
    authority: string;
    // Calculated fields
    totalPredictions: number;
    yesPercentage: number;
}

export interface ParsedPrediction {
    id: string;
    marketId: string;
    side: "yes" | "no";
    confidence: number;
    stake: number;
    risked: number;
    settled: boolean;
}

// ============================================================
// PARSING HELPERS
// ============================================================

/**
 * Calculate tier from reputation score
 */
export function getTierFromScore(score: number): UserTier {
    if (score > 850) return "Elite";
    if (score >= 700) return "Proven";
    return "New";
}

/**
 * Decode market question from on-chain format.
 * The question is stored as array of ASCII codes representing a hex string,
 * which then needs to be decoded from hex to get the actual UTF-8 text.
 */
export function decodeQuestion(bytes: number[] | string): string {
    try {
        let hexString: string;

        if (Array.isArray(bytes)) {
            // Step 1: Convert array of ASCII codes to string (gives us hex string like "57696c6c...")
            hexString = String.fromCharCode(...bytes);
        } else if (typeof bytes === 'string') {
            hexString = bytes;
        } else {
            return "";
        }

        // Step 2: Check if it's hex-encoded and decode
        if (/^[0-9a-fA-F]+$/.test(hexString) && hexString.length > 20) {
            const decodedBytes = new Uint8Array(
                hexString.match(/.{1,2}/g)!.map((byte: string) => parseInt(byte, 16))
            );
            return new TextDecoder().decode(decodedBytes);
        }

        // Already plain text
        return hexString;
    } catch {
        return "";
    }
}

/**
 * Parse chain UserProfile to frontend-friendly format
 */
export function parseUserProfile(fields: ChainUserProfile): ParsedUserProfile {
    const score = Number(fields.reputation_score);
    return {
        id: fields.id,
        owner: fields.owner,
        reputationScore: score,
        reputationCount: Number(fields.reputation_count),
        maxConfidence: Number(fields.max_confidence),
        tier: getTierFromScore(score),
    };
}

/**
 * Parse chain Market to frontend-friendly format
 */
export function parseMarket(id: string, fields: ChainMarket): ParsedMarket {
    const yesCount = Number(fields.yes_count);
    const noCount = Number(fields.no_count);
    const totalPredictions = yesCount + noCount;

    // Calculate yes percentage based on risk totals
    const yesRisk = Number(fields.yes_risk_total);
    const noRisk = Number(fields.no_risk_total);
    const totalRisk = yesRisk + noRisk;
    const yesPercentage = totalRisk > 0 ? Math.round((yesRisk / totalRisk) * 100) : 50;

    // Parse outcome
    let outcome: boolean | null = null;
    if (fields.outcome !== undefined && fields.outcome !== null) {
        if (typeof fields.outcome === 'boolean') {
            outcome = fields.outcome;
        } else if (typeof fields.outcome === 'object' && 'Some' in fields.outcome) {
            outcome = fields.outcome.Some;
        }
    }

    return {
        id,
        question: decodeQuestion(fields.question),
        deadline: fields.deadline ? Number(fields.deadline) : undefined,
        yesRiskTotal: yesRisk,
        noRiskTotal: noRisk,
        yesCount,
        noCount,
        locked: fields.locked,
        resolved: fields.resolved,
        outcome,
        authority: fields.authority,
        totalPredictions,
        yesPercentage,
    };
}

/**
 * Parse chain Prediction to frontend-friendly format
 */
export function parsePrediction(fields: ChainPrediction): ParsedPrediction {
    return {
        id: fields.id,
        marketId: fields.market_id,
        side: fields.side ? "yes" : "no",
        confidence: Number(fields.confidence),
        stake: Number(fields.stake),
        risked: Number(fields.risked),
        settled: fields.settled,
    };
}

// ============================================================
// ERROR CODE MAPPING
// ============================================================

/**
 * Map contract abort codes to user-friendly messages
 */
export const CONTRACT_ERRORS: Record<number, string> = {
    // calibr.move errors
    0: "Invalid confidence value (must be 50-90)",
    1: "Profile already exists",
    2: "Market is not open for predictions",
    3: "Market has not been resolved yet",
    4: "Prediction has already been settled",
    5: "Unauthorized action",
    6: "Market is locked",
    7: "Market is already resolved",
    8: "Confidence exceeds your maximum allowed",

    // market.move errors (300+)
    300: "Admin capability required",
    301: "Market is already locked",
    302: "Market is already resolved",
    303: "Market must be locked before resolution",
    304: "Question cannot be empty",

    // prediction.move errors (400+)
    400: "Profile ownership verification failed",
    401: "Market is not open",
    402: "Confidence too low (minimum 50%)",
    403: "Confidence too high (maximum 90%)",
    404: "Confidence exceeds your reputation-based cap",
    405: "Market not resolved yet",
    406: "Prediction already settled",
    407: "Prediction does not belong to this market",
    408: "No winner risk total",
    409: "You have already placed a prediction on this market",
};

export function getErrorMessage(code: number): string {
    return CONTRACT_ERRORS[code] ?? `Transaction failed (error code: ${code})`;
}
