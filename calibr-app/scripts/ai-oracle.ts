import { SuiJsonRpcClient as SuiClient, getJsonRpcFullnodeUrl } from "@mysten/sui/jsonRpc";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { Transaction } from "@mysten/sui/transactions";
import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

// --- CONFIGURATION ---
const NETWORK = "testnet";
// Replace with your latest package ID if changed
const PACKAGE_ID = process.env.NEXT_PUBLIC_PACKAGE_ID || "0xf4963058f286a7da4a0e8b5e766523815f4d5f60b6e3cecdc10b32fbf72ccf70";
const ADMIN_CAP_ID = process.env.ADMIN_CAP_ID || "0xc293b77b644f967095f155b8bf162458e296f5d3023e2f91e4b2b05ed4d763bf";
const MODULE_NAME = "market";

// Polling Interval
const POLLING_INTERVAL_MS = 60 * 1000; // 1 minute

// AI CONFIGURATION
// "MOCK" = Free, deterministic (Great for Demos)
// "OPENAI" = Needs API Key + Credits
const AI_PROVIDER: "MOCK" | "OPENAI" = "MOCK";
const MODEL = "gpt-3.5-turbo";

const client = new SuiClient({ url: getJsonRpcFullnodeUrl(NETWORK), network: NETWORK });

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || "sk-placeholder", // Safe for Mock mode
});

// In-memory cache of known market IDs to avoid re-fetching events constantly
const knownMarkets = new Set<string>();

async function main() {
    console.log(`🤖 Calibr AI Oracle Agent Starting...`);
    console.log(`🔹 Mode: ${AI_PROVIDER} ${AI_PROVIDER === "OPENAI" ? `(${MODEL})` : "(Zero Cost)"}`);
    console.log(`🔹 Network: ${NETWORK}`);
    console.log(`🔹 Package: ${PACKAGE_ID.slice(0, 10)}...`);
    console.log(`🔹 Polling Interval: ${POLLING_INTERVAL_MS / 1000}s`);

    // 1. Setup Wallet
    const privateKey = process.env.ADMIN_PRIVATE_KEY;
    if (!privateKey) {
        console.error("❌ ADMIN_PRIVATE_KEY not found in .env");
        process.exit(1);
    }
    const keypair = Ed25519Keypair.fromSecretKey(privateKey);
    console.log(`🔹 Admin Address: ${keypair.getPublicKey().toSuiAddress()}`);

    // Initial scan
    await scanForMarkets();

    // Start Loop
    setInterval(async () => {
        try {
            await scanForMarkets();
            await processMarkets(keypair);
        } catch (e) {
            console.error("⚠️ Error in loop:", e);
        }
    }, POLLING_INTERVAL_MS);

    // Run immediately first time
    await processMarkets(keypair);
}

// --- 1. DISCOVERY ---
async function scanForMarkets() {
    console.log("🔍 Scanning for new markets...");
    try {
        const events = await client.queryEvents({
            query: { MoveModule: { package: PACKAGE_ID, module: MODULE_NAME } },
            limit: 50,
            order: "descending"
        });

        for (const event of events.data) {
            if (event.type.includes("MarketCreated")) {
                const marketId = (event.parsedJson as any).market_id;
                if (!knownMarkets.has(marketId)) {
                    console.log(`   🆕 Found Market: ${marketId.slice(0, 8)}...`);
                    knownMarkets.add(marketId);
                }
            }
        }
    } catch (error) {
        console.error("   ❌ Error scanning events:", error);
    }
}

// --- 2. PROCESSING ---
async function processMarkets(keypair: Ed25519Keypair) {
    console.log(`🔄 Processing ${knownMarkets.size} known markets...`);

    for (const marketId of Array.from(knownMarkets)) {
        try {
            const marketObj = await client.getObject({
                id: marketId,
                options: { showContent: true }
            });

            if (!marketObj.data || !marketObj.data.content) {
                knownMarkets.delete(marketId);
                continue;
            }

            const fields = (marketObj.data.content as any).fields;
            const questionBytes = fields.question;
            const isLocked = fields.locked;
            const isResolved = fields.resolved;
            const deadline = parseInt(fields.deadline);
            const question = Buffer.from(questionBytes).toString('utf8');

            // CLEANUP: If resolved, stop tracking
            if (isResolved) {
                knownMarkets.delete(marketId);
                continue;
            }

            console.log(`   📄 Checking: "${question.slice(0, 40)}..."`);
            const now = Date.now();

            // A. CHECK IF NEEDS LOCKING
            if (!isLocked && now > deadline) {
                console.log(`   🔒 Deadline expired! Locking market...`);
                await lockMarket(marketId, keypair);
                console.log(`   ⏳ Waiting for lock to finalize...`);
                await new Promise(r => setTimeout(r, 2000));
            }
            else if (!isLocked) {
                console.log(`      Active (Limit: ${new Date(deadline).toLocaleTimeString()})`);
                continue; // Still active, skip
            }

            // B. RESOLVE (If Locked)
            console.log("   🧠 AI Agent analyzing truth...");
            const outcome = await getOutcome(question);

            if (outcome === "UNKNOWN") {
                console.log("   🤷‍♂️ AI unsure. Skipping.");
                continue;
            }

            console.log(`   💡 Verdict: ${outcome}`);
            await resolveMarket(marketId, outcome === "YES", keypair);

            // Mark as done
            knownMarkets.delete(marketId);

        } catch (e) {
            console.error(`   ❌ Error processing market ${marketId}:`, e);
        }
    }
}

// --- 3. ACTIONS ---

async function lockMarket(marketId: string, keypair: Ed25519Keypair) {
    const tx = new Transaction();
    tx.moveCall({
        target: `${PACKAGE_ID}::market::lock_market`,
        arguments: [
            tx.object(ADMIN_CAP_ID),
            tx.object(marketId),
        ]
    });

    const result = await client.signAndExecuteTransaction({
        signer: keypair,
        transaction: tx,
        options: { showEffects: true }
    });
    console.log(`      ✅ Locked! Digest: ${result.digest}`);
}

async function resolveMarket(marketId: string, outcome: boolean, keypair: Ed25519Keypair) {
    console.log(`      🚀 Submitting Resolution: ${outcome ? "YES" : "NO"}...`);

    const tx = new Transaction();
    tx.moveCall({
        target: `${PACKAGE_ID}::market::resolve_market`,
        arguments: [
            tx.object(ADMIN_CAP_ID),
            tx.object(marketId),
            tx.pure.bool(outcome)
        ]
    });

    const result = await client.signAndExecuteTransaction({
        signer: keypair,
        transaction: tx,
        options: { showEffects: true }
    });
    console.log(`      ✅ RESOLVED! Digest: ${result.digest}`);
}

// --- 4. INTELLIGENCE (ROUTER) ---
async function getOutcome(question: string): Promise<"YES" | "NO" | "UNKNOWN"> {
    if (AI_PROVIDER === "MOCK") {
        return getMockOutcome(question);
    } else {
        return getOpenAIOutcome(question);
    }
}

// --- 5. MOCK AI (FREE) ---
async function getMockOutcome(question: string): Promise<"YES" | "NO" | "UNKNOWN"> {
    console.log("      (Running in MOCK mode - Deterministic simulation)");
    await new Promise(r => setTimeout(r, 1000)); // Simulate thinking

    // Deterministic logic based on question length for demo consistency
    // Even length -> YES, Odd length -> NO
    // Or if contains certain keywords
    const lower = question.toLowerCase();

    if (lower.includes("no") || lower.includes("fail") || lower.includes("lose")) return "NO";
    if (lower.includes("yes") || lower.includes("pass") || lower.includes("win")) return "YES";

    // Fallback: Deterministic based on char code sum
    const sum = question.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return sum % 2 === 0 ? "YES" : "NO";
}

// --- 6. OPENAI (REAL) ---
async function getOpenAIOutcome(question: string): Promise<"YES" | "NO" | "UNKNOWN"> {
    const prompt = `
    You are the impartial AI Referee for a prediction market.
    Question: "${question}"
    Current Date: ${new Date().toISOString()}
    Output Rules: Respond ONLY with one word: "YES", "NO", or "UNKNOWN".
    `;

    try {
        const completion = await openai.chat.completions.create({
            messages: [{ role: "user", content: prompt }],
            model: MODEL,
            temperature: 0,
        });

        const text = completion.choices[0].message.content?.trim().toUpperCase();
        if (text === "YES" || text === "NO") return text;
        return "UNKNOWN";

    } catch (e) {
        console.error("      ⚠️ OpenAI Error:", e);
        return "UNKNOWN";
    }
}

// Start
main().catch(console.error);
