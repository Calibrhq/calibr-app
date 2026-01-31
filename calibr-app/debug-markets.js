const url = "https://fullnode.testnet.sui.io:443";
const packageId = "0x4c049202f74d232369834eb0590a572a9235e59bd9a17ff6ce52a10b3eff071e";

async function run() {
    try {
        console.log("Checking events for package:", packageId);

        // Query Events
        const query = { MoveEvent: `${packageId}::events::MarketCreated` };
        // Valid params for suix_queryEvents: [query, cursor, limit, descending]
        const params = [query, null, 10, true];

        console.log("Fetching events...");

        const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                jsonrpc: "2.0",
                id: 1,
                method: "suix_queryEvents",
                params: params
            })
        });

        const json = await res.json();

        if (json.error) {
            console.error("RPC Error (Events):", json.error);
            return;
        }

        console.log(`Found ${json.result.data.length} events.`);

        if (json.result && json.result.data.length > 0) {
            const ids = json.result.data.map(e => e.parsedJson.market_id);
            console.log("Market IDs:", ids);

            // MultiGetObjects
            // Valid params for sui_multiGetObjects: [object_ids, options]
            const objParams = [ids, { showContent: true, showDisplay: true }];

            console.log("Fetching objects...");

            const objRes = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    jsonrpc: "2.0",
                    id: 2,
                    method: "sui_multiGetObjects",
                    params: objParams
                })
            });
            const objJson = await objRes.json();

            if (objJson.error) {
                console.error("RPC Error (Objects):", objJson.error);
                return;
            }

            console.log("First Object Fields:", JSON.stringify(objJson.result[0].data.content.fields, null, 2));
        } else {
            console.log("No events found. Check Package ID or Network.");
        }
    } catch (e) {
        console.error("Script failed:", e);
    }
}

run();
