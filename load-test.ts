
// Native fetch is used.

const API_URL = "http://localhost:3005/ingest";
const TARGET_COUNT = 1_000_000;
const CONCURRENCY = 100;

// Read API Key from args
const apiKey = process.argv[2];

if (!apiKey) {
    console.error("Please provide an API Key as the first argument.");
    console.error("Usage: npx tsx load-test.ts <API_KEY>");
    process.exit(1);
}

const METHODS = ["GET", "POST", "PUT", "DELETE", "PATCH"];
const STATUS_CODES = [200, 201, 204, 400, 401, 403, 404, 500, 502, 503];
const PATHS = [
    "/api/users",
    "/api/posts",
    "/api/comments",
    "/auth/login",
    "/auth/register",
    "/dashboard/settings",
    "/v1/ingest",
    "/health"
];
const ENVS = ["production", "staging", "development"];

function getRandomElement<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
}

function generateEvent() {
    return {
        event: "api_request",
        timestamp: new Date().toISOString(),
        properties: {
            method: getRandomElement(METHODS),
            status_code: getRandomElement(STATUS_CODES),
            path: getRandomElement(PATHS),
            duration_ms: Math.floor(Math.random() * 1000),
            user_id: `user_${Math.floor(Math.random() * 10000)}`,
            env: getRandomElement(ENVS),
            browser: getRandomElement(["Chrome", "Firefox", "Safari", "Edge"]),
            region: getRandomElement(["us-east-1", "eu-west-1", "ap-northeast-1"]),
            outcome: Math.random() > 0.1 ? "success" : "error"
        }
    };
}

async function sendEvent() {
    const payload = generateEvent();
    try {
        const res = await fetch(API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`
            },
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            const text = await res.text();
            throw new Error(`HTTP ${res.status}: ${text}`);
        }
    } catch (err: any) {
        throw new Error(err.message);
    }
}

async function main() {
    console.log(`Checking connectivity...`);
    // Send 10 initial test events synchronously
    for (let i = 0; i < 10; i++) {
        try {
            await sendEvent();
            process.stdout.write(".");
        } catch (err: any) {
            console.error(`\nInitial check failed: ${err.message}`);
            process.exit(1);
        }
    }
    console.log(`\nConnectivity confirmed. Starting load test against ${API_URL}`);
    console.log(`Target: ${TARGET_COUNT} events`);
    console.log(`Concurrency: ${CONCURRENCY}`);

    let completed = 0;
    let errors = 0;
    const startTime = Date.now();
    let pending = 0;

    const runWorker = async () => {
        while (completed + errors < TARGET_COUNT) {
            try {
                await sendEvent();
                completed++;
            } catch (e) {
                errors++;
            }

            if (completed % 1000 === 0) {
                const elapsed = (Date.now() - startTime) / 1000;
                const rate = completed / elapsed;
                const progress = ((completed / TARGET_COUNT) * 100).toFixed(1);
                process.stdout.write(`\rProgress: ${progress}% | Sent: ${completed} | Errors: ${errors} | Rate: ${Math.round(rate)} req/s`);
            }
        }
    };


    const workers = [];
    for (let i = 0; i < CONCURRENCY; i++) {
        workers.push(runWorker());
    }

    await Promise.all(workers);

    const totalTime = (Date.now() - startTime) / 1000;
    console.log(`\n\nLoad test complete!`);
    console.log(`Total Sent: ${completed}`);
    console.log(`Total Errors: ${errors}`);
    console.log(`Total Time: ${totalTime.toFixed(2)}s`);
    console.log(`Average Rate: ${Math.round(completed / totalTime)} req/s`);
}

main().catch(console.error);
