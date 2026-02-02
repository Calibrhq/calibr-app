import { SuiClient, getFullnodeUrl } from "@mysten/sui/client";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { Transaction } from "@mysten/sui/transactions";
import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

// --- CONFIGURATION ---
const NETWORK = "testnet";
const PACKAGE_ID = "0xf4963058f286a7da4a0e8b5e766523815f4d5f60b6e3cecdc10b32fbf72ccf70";
const ADMIN_CAP_ID = "0xc293b77b644f967095f155b8bf162458e296f5d3023e2f91e4b2b05ed4d763bf";
const MODULE_NAME = "market";
const MARKET_TYPE = `${PACKAGE_ID}::calibr::Market`;

const client = new SuiClient({ url: getFullnodeUrl(NETWORK) });

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

async function main() {
    console.log("🤖 AI Oracle Agent Starting...");

    // 1. Setup Wallet
    const privateKey = process.env.ADMIN_PRIVATE_KEY;
    if (!privateKey) {
        console.error("❌ ADMIN_PRIVATE_KEY not found in .env");
        process.exit(1);
    }
    const keypair = Ed25519Keypair.fromSecretKey(privateKey);
    console.log(`🔹 Admin Address: ${keypair.getPublicKey().toSuiAddress()}`);

    // 2. Fetch Active Markets
    console.log("🔍 Scanning for markets...");
    // Note: In production we'd use an indexer. Here we fetch filtered objects if possible or just recent shared objects.
    // For simplicity efficiently, we'll try to get objects owned by the package or just known markets if we had a registry.
    // Since we don't have a registry, I'll fetch *some* shared objects or rely on the user passing IDs for now, 
    // BUT for the "Magic" demo, let's try to query events or just assume we know the IDs. 
    // actually, `getOwnedObjects` won't work for shared objects. 
    // We will use `client.getDetails` if we knew IDs. 
    // BETTER STRATEGY FOR HACKATHON: Hardcode the market ID we want to resolve OR fetch events to find markets.
    // Let's implement a "Resolve Specific Market" mode or "Scan Recent" if we can.

    // Fallback: We'll accept a MARKET_ID arg, or try to find some. 
    // To make it truly autonomous, we would need a registry. 
    // For this script, I'll fetch events 'MarketCreated' to find ID.

    const events = await client.queryEvents({
        query: { MoveModule: { package: PACKAGE_ID, module: MODULE_NAME } },
        limit: 10,
        order: "descending"
    });

    console.log(`Found ${events.data.length} recent market events.`);

    for (const event of events.data) {
        if (event.type.includes("MarketCreated")) {
            const marketId = (event.parsedJson as any).market_id;
            await checkAndResolveMarket(marketId, keypair);
        }
    }
}

async function checkAndResolveMarket(marketId: string, keypair: Ed25519Keypair) {
    // 3. Get Market Data
    const marketObj = await client.getObject({
        id: marketId,
        options: { showContent: true }
    });

    if (!marketObj.data || !marketObj.data.content) return;

    const fields = (marketObj.data.content as any).fields;
    const questionBytes = fields.question;
    const isLocked = fields.locked;
    const isResolved = fields.resolved;

    // Convert generic vector<u8> to string
    const question = Buffer.from(questionBytes).toString('utf8');

    console.log(`\n📄 Market: ${question} [ID: ${marketId.slice(0, 6)}...]`);
    console.log(`   Status: Locked=${isLocked}, Resolved=${isResolved}`);

    // FILTER: Only resolve LOCKED and UNRESOLVED markets
    if (!isLocked || isResolved) {
        console.log("   ⏭️  Skipping (Not locked or already resolved)");
        return;
    }

    // 4. AI Analysis
    console.log("   🧠 AI Agent analyzing truth...");
    const prompt = `
    You are an AI Oracle for a Prediction Market. 
    Question: "${question}"
    
    Task: Search your knowledge base (or simulate a search) to determine the outcome.
    Rules:
    - Answer ONLY "YES" or "NO".
    - If strictly unknown, answer "UNKNOWN".
    - Be decisive based on latest data up to 2025/2026.
    `;

    const completion = await openai.chat.completions.create({
        messages: [{ role: "user", content: prompt }],
        model: "gpt-4-turbo",
    });

    const decision = completion.choices[0].message.content?.trim().toUpperCase();
    console.log(`   💡 AI Decision: ${decision}`);

    if (decision !== "YES" && decision !== "NO") {
        console.log("   ⚠️  AI could not decide. Skipping.");
        return;
    }

    const outcomeBool = decision === "YES";

    // 5. Execute Resolution
    console.log(`   🚀 Submitting resolution tx (Outcome: ${decision})...`);

    const tx = new Transaction();
    tx.moveCall({
        target: `${PACKAGE_ID}::market::resolve_market`,
        arguments: [
            tx.object(ADMIN_CAP_ID),
            tx.object(marketId),
            tx.pure.bool(outcomeBool)
        ]
    });

    try {
        const result = await client.signAndExecuteTransaction({
            signer: keypair,
            transaction: tx,
            options: { showEffects: true }
        });
        console.log(`   ✅ Resolved! Tx Digest: ${result.digest}`);
    } catch (e) {
        console.error(`   ❌ Verification Failed: ${e}`);
    }
}

main().catch(console.error);
