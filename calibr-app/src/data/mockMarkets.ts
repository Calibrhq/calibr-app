export interface Market {
  id: string;
  question: string;
  category: "Macro" | "Crypto" | "Governance" | "Tech" | "Climate";
  yesPercentage: number;
  volume: number;
  isTrending: boolean;
  resolutionCriteria: string;
  status: "active" | "resolving" | "resolved";
  startDate: string;
  resolveDate: string;
  outcome?: boolean | null; // true=YES, false=NO, null=Unresolved/None
}

export const mockMarkets: Market[] = [
  {
    id: "1",
    question: "Will the Federal Reserve cut interest rates by June 2026?",
    category: "Macro",
    yesPercentage: 62,
    volume: 2450000,
    isTrending: true,
    resolutionCriteria: "Resolves YES if the Federal Reserve announces at least one 25 basis point rate cut at any FOMC meeting before July 1, 2026.",
    status: "active",
    startDate: "2025-01-15",
    resolveDate: "2026-06-30",
  },
  {
    id: "2",
    question: "Will Ethereum maintain its position as the second-largest cryptocurrency by market cap through Q2 2026?",
    category: "Crypto",
    yesPercentage: 78,
    volume: 890000,
    isTrending: false,
    resolutionCriteria: "Resolves YES if Ethereum remains #2 by market capitalization on CoinMarketCap as of June 30, 2026.",
    status: "active",
    startDate: "2025-02-01",
    resolveDate: "2026-06-30",
  },
  {
    id: "3",
    question: "Will the EU pass comprehensive AI regulation before 2027?",
    category: "Governance",
    yesPercentage: 85,
    volume: 340000,
    isTrending: true,
    resolutionCriteria: "Resolves YES if the European Union officially adopts binding AI legislation applicable to all member states before January 1, 2027.",
    status: "active",
    startDate: "2025-01-01",
    resolveDate: "2026-12-31",
  },
  {
    id: "4",
    question: "Will global average temperature exceed 1.5°C above pre-industrial levels in 2026?",
    category: "Climate",
    yesPercentage: 41,
    volume: 1200000,
    isTrending: false,
    resolutionCriteria: "Resolves YES if NASA GISS or NOAA reports annual global temperature anomaly exceeding 1.5°C for calendar year 2026.",
    status: "active",
    startDate: "2025-03-10",
    resolveDate: "2027-01-15",
  },
  {
    id: "5",
    question: "Will Apple release a foldable device in 2026?",
    category: "Tech",
    yesPercentage: 28,
    volume: 560000,
    isTrending: false,
    resolutionCriteria: "Resolves YES if Apple officially announces and ships a device with a foldable display before December 31, 2026.",
    status: "active",
    startDate: "2025-02-20",
    resolveDate: "2026-12-31",
  },
  {
    id: "6",
    question: "Will Bitcoin reach a new all-time high in Q1 2026?",
    category: "Crypto",
    yesPercentage: 55,
    volume: 4200000,
    isTrending: true,
    resolutionCriteria: "Resolves YES if Bitcoin price exceeds previous ATH on any major exchange before April 1, 2026.",
    status: "resolving",
    startDate: "2025-01-05",
    resolveDate: "2026-04-01",
  },
  {
    id: "7",
    question: "Will US unemployment rate exceed 5% at any point in 2026?",
    category: "Macro",
    yesPercentage: 35,
    volume: 780000,
    isTrending: false,
    resolutionCriteria: "Resolves YES if BLS reports U-3 unemployment rate at or above 5.0% for any month in 2026.",
    status: "active",
    startDate: "2025-04-01",
    resolveDate: "2027-01-05",
  },
  {
    id: "8",
    question: "Will any country adopt Bitcoin as legal tender in 2026?",
    category: "Governance",
    yesPercentage: 22,
    volume: 290000,
    isTrending: false,
    resolutionCriteria: "Resolves YES if any sovereign nation (excluding El Salvador) officially designates Bitcoin as legal tender before December 31, 2026.",
    status: "resolved",
    startDate: "2024-06-01",
    resolveDate: "2025-12-31",
  },
];

export interface UserPrediction {
  id: string;
  marketId: string;
  question: string;
  side: "yes" | "no";
  confidence: number;
  status: "active" | "won" | "lost";
  resolvedAt?: string;
  pointsWon?: number;
  pointsLost?: number;
  repGained?: number;
  repLost?: number;
  stakeAmount?: number;
}

export const mockUserPredictions: UserPrediction[] = [
  {
    id: "p1",
    marketId: "1",
    question: "Will the Federal Reserve cut interest rates by June 2026?",
    side: "yes",
    confidence: 70,
    status: "active",
    stakeAmount: 50,
  },
  {
    id: "p2",
    marketId: "3",
    question: "Will the EU pass comprehensive AI regulation before 2027?",
    side: "yes",
    confidence: 85,
    status: "active",
    stakeAmount: 100,
  },
  {
    id: "p3",
    marketId: "5",
    question: "Will Apple release a foldable device in 2026?",
    side: "no",
    confidence: 75,
    status: "won",
    resolvedAt: "2 days ago",
    pointsWon: 45,
    repGained: 12,
    stakeAmount: 30,
  },
  {
    id: "p4",
    marketId: "8",
    question: "Will any country adopt Bitcoin as legal tender in 2026?",
    side: "yes",
    confidence: 60,
    status: "lost",
    resolvedAt: "1 week ago",
    pointsLost: 20,
    repLost: 8,
    stakeAmount: 25,
  },
  {
    id: "p5",
    marketId: "6",
    question: "Will Bitcoin reach a new all-time high in Q1 2026?",
    side: "yes",
    confidence: 65,
    status: "won",
    resolvedAt: "3 days ago",
    pointsWon: 35,
    repGained: 8,
    stakeAmount: 40,
  },
];

export const userStats = {
  totalPredictions: 24,
  averageConfidence: 68,
  winRate: 71,
  reputationScore: 847,
  tier: "calibrated" as const,
  maxConfidence: 85,
  netProfitLoss: 180,
  repChangeThisWeek: 24,
};

export const reputationHistory = [
  { date: "Jan", score: 720 },
  { date: "Feb", score: 745 },
  { date: "Mar", score: 780 },
  { date: "Apr", score: 765 },
  { date: "May", score: 810 },
  { date: "Jun", score: 847 },
];

export const confidenceAccuracy = [
  { confidence: "50-60%", predicted: 55, actual: 58 },
  { confidence: "60-70%", predicted: 65, actual: 68 },
  { confidence: "70-80%", predicted: 75, actual: 72 },
  { confidence: "80-90%", predicted: 85, actual: 78 },
];

export const bestPredictions = [
  { question: "EU AI Regulation passage", repGained: 45, confidence: 85 },
  { question: "Fed rate decision Q1", repGained: 38, confidence: 72 },
  { question: "ETH maintains #2 position", repGained: 32, confidence: 78 },
];

export const worstPredictions = [
  { question: "New country adopts BTC", repLost: 28, confidence: 75 },
  { question: "Apple foldable 2025", repLost: 22, confidence: 68 },
];
