import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

async function testOracle(question: string) {
    console.log(`\n❓ Question: "${question}"`);
    console.log("🧠 Thinking...");

    const prompt = `
    You are an AI Oracle for a Prediction Market. 
    Question: "${question}"
    
    Task: Determine the outcome based on real-world facts.
    Rules:
    - Answer ONLY "YES" or "NO".
    - If the event is in the future, predict the most likely outcome based on current trends.
    `;

    try {
        const completion = await openai.chat.completions.create({
            messages: [{ role: "user", content: prompt }],
            model: "gpt-4-turbo",
        });

        const decision = completion.choices[0].message.content?.trim().toUpperCase();
        console.log(`💡 Decision: ${decision}`);
    } catch (e) {
        console.error("❌ Error query OpenAI:", e);
    }
}

async function main() {
    console.log("🧪 Testing AI Oracle Logic (Dry Run)");

    // Test Cases
    await testOracle("Did the Golden State Warriors win the 2022 NBA Finals?"); // YES
    await testOracle("Is the price of Bitcoin above $1 million today?");         // NO
    await testOracle("Will humans land on Mars in 2024?");                      // NO
}

main();
