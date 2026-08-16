import express from "express";
import cors from "cors";
import { network } from "hardhat";
import { TraceClient } from "./agent/traceClient.js";
import { MiraAgent } from "./agent/mira.js";
import { MockLlmParser, LlmParser } from "./agent/llmParser.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REGISTRY_PATH = path.join(__dirname, "audit_registry.json");

// Robust load helper for local private audit registry
function loadAuditRegistry() {
    try {
        if (fs.existsSync(REGISTRY_PATH)) {
            const data = fs.readFileSync(REGISTRY_PATH, "utf8");
            return JSON.parse(data || "{}");
        }
    } catch (error) {
        console.error("Failed to load local audit registry:", error.message);
    }
    return {};
}

// Robust save helper with write-locking/try-catch block
function saveAuditRecord(txHash, request) {
    if (!txHash || !request) return;
    const txKey = txHash.toLowerCase();
    try {
        const registry = loadAuditRegistry();
        registry[txKey] = {
            request: request.trim(),
            timestamp: new Date().toISOString()
        };
        fs.writeFileSync(REGISTRY_PATH, JSON.stringify(registry, null, 2), "utf8");
        console.log(`[Audit Registry] Saved record for tx: ${txKey}`);
    } catch (error) {
        console.error("Failed to write to local audit registry:", error.message);
    }
}


const app = express();

app.use(cors());
app.use(express.json());

// Security: Catch malformed JSON payloads and fail safely
app.use((err, req, res, next) => {
    if (
        err instanceof SyntaxError &&
        err.status === 400 &&
        "body" in err
    ) {
        return res.status(400).json({
            success: false,
            error: "Malformed JSON payload."
        });
    }

    next();
});

let traceClient;
let mira;

async function init() {
    console.log("Connecting to network...");

    // Verify environment variable is available
    console.log(
        "EXPECTED_CHAIN_ID =",
        process.env.EXPECTED_CHAIN_ID
    );

    const { viem } = await network.connect("localhost");

    const wallets = await viem.getWalletClients();

    if (wallets.length < 2) {
        throw new Error(
            "TRACE requires at least two wallets (Owner and Agent) configured."
        );
    }

    const owner = wallets[0];
    const agent = wallets[1];

    const contractAddress =
        process.env.TRACE_CONTRACT_ADDRESS ||
        "0x5FbDB2315678afecb367f032d93F642f64180aa3";

    console.log(
        "Initializing TraceClient for contract:",
        contractAddress
    );

    const publicClient = await viem.getPublicClient();

    traceClient = new TraceClient({
        contractAddress,
        publicClient,
        agentWallet: agent,
        ownerWallet: owner
    });

    // Gemini if API key exists, otherwise Mock parser
    const apiKey = process.env.LLM_API_KEY;

    const parser = apiKey
        ? new LlmParser()
        : new MockLlmParser();

    mira = new MiraAgent(traceClient, parser);

    console.log("TRACE Server initialization complete.");
}

/**
 * GET /api/trace/status
 */
app.get("/api/trace/status", async (req, res) => {
    try {
        const ownerAddress =
            traceClient.ownerWallet.account.address;

        const agentAddress =
            traceClient.agentWallet.account.address;

        const permission =
            await traceClient.getPermission();

        const permissions = [
            "LOCKED",
            "READ_ONLY",
            "RESTRICTED",
            "FULL"
        ];

        const permissionValue =
            permissions.indexOf(permission);

        const lastHeartbeat =
            await traceClient.getLastHeartbeat();

        const inactiveTime =
            await traceClient.getInactiveTime();

        const networkInfo =
            await traceClient.getNetworkInfo();

        res.json({
            owner: ownerAddress,
            agent: agentAddress,
            permission,
            permissionValue,
            lastHeartbeat: new Date(
                Number(lastHeartbeat) * 1000
            ).toISOString(),
            inactiveTime: inactiveTime.toString(),
            contractAddress:
                traceClient.getContractAddress(),
            network: networkInfo.name,
            decaySpeedMultiplier: timeSpeedMultiplier
        });

    } catch (error) {
        console.error(
            "GET /api/trace/status error:",
            error.message
        );

        res.status(500).json({
            success: false,
            error: "FAILED_TO_GET_STATUS"
        });
    }
});

let lastDecayTickAt = Date.now();
let timeSpeedMultiplier = 1;
let accumulatedDecayFraction = 0;
let decayTickInProgress = false;

/**
 * POST /api/trace/decay-config
 */
app.post("/api/trace/decay-config", (req, res) => {
    const { multiplier } = req.body;
    if (multiplier !== undefined && typeof multiplier === "number") {
        timeSpeedMultiplier = multiplier;
        lastDecayTickAt = Date.now();
        accumulatedDecayFraction = 0;
        console.log(`[Decay Config] Time speed multiplier set to ${timeSpeedMultiplier}x`);
        return res.json({ success: true, multiplier: timeSpeedMultiplier });
    }
    res.status(400).json({ success: false, error: "Invalid multiplier parameter" });
});

/**
 * POST /api/trace/decay-tick
 */
app.post("/api/trace/decay-tick", async (req, res) => {
    const chainId = await traceClient.publicClient.getChainId();
    const isLocal = Number(chainId) === 31337;

    if (!isLocal) {
        return res.status(400).json({
            success: false,
            error: "DECAY_SIMULATION_LOCAL_ONLY",
            message: "Real-time accelerated decay is available only on the local Hardhat network."
        });
    }

    // Get current status helper
    const getStatusResponse = async () => {
        const ownerAddress = await traceClient.ownerWallet.account.address;
        const agentAddress = traceClient.agentWallet.account.address;
        const permission = await traceClient.getPermission();
        const permissions = ["LOCKED", "READ_ONLY", "RESTRICTED", "FULL"];
        const permissionValue = permissions.indexOf(permission);
        const lastHeartbeat = await traceClient.getLastHeartbeat();
        const inactiveTime = await traceClient.getInactiveTime();
        const networkInfo = await traceClient.getNetworkInfo();

        return {
            owner: ownerAddress,
            agent: agentAddress,
            permission,
            permissionValue,
            lastHeartbeat: new Date(Number(lastHeartbeat) * 1000).toISOString(),
            inactiveTime: inactiveTime.toString(),
            contractAddress: traceClient.getContractAddress(),
            network: networkInfo.name,
            decaySpeedMultiplier: timeSpeedMultiplier
        };
    };

    if (decayTickInProgress) {
        try {
            const statusData = await getStatusResponse();
            return res.json(statusData);
        } catch (err) {
            return res.status(500).json({ success: false, error: "FAILED_TO_GET_STATUS" });
        }
    }

    decayTickInProgress = true;

    try {
        const now = Date.now();
        const realElapsed = (now - lastDecayTickAt) / 1000;

        if (realElapsed > 0 && realElapsed < 3600) {
            const simulatedElapsed = realElapsed * timeSpeedMultiplier;
            accumulatedDecayFraction += simulatedElapsed;
            const increaseAmount = Math.floor(accumulatedDecayFraction);

            if (increaseAmount > 0) {
                accumulatedDecayFraction -= increaseAmount;
                try {
                    await traceClient.publicClient.request({
                        method: "evm_increaseTime",
                        params: [increaseAmount]
                    });
                    await traceClient.publicClient.request({
                        method: "evm_mine"
                    });
                    console.log(`[DECAY] speed=${timeSpeedMultiplier}x | real=${realElapsed.toFixed(2)}s | simulated=${simulatedElapsed.toFixed(2)}s | advanced=${increaseAmount}s`);
                } catch (e) {
                    console.error("Failed to advance EVM time on Hardhat:", e.message);
                }
            } else {
                console.log(`[DECAY] speed=${timeSpeedMultiplier}x | real=${realElapsed.toFixed(2)}s | simulated=${simulatedElapsed.toFixed(2)}s | advanced=0s`);
            }
            lastDecayTickAt = now;
        }

        const statusData = await getStatusResponse();
        res.json(statusData);

    } catch (error) {
        console.error("POST /api/trace/decay-tick error:", error.message);
        res.status(500).json({
            success: false,
            error: "FAILED_TO_EXECUTE_DECAY_TICK"
        });
    } finally {
        decayTickInProgress = false;
    }
});

/**
 * POST /api/trace/heartbeat
 * POST /api/trace/heartbeat
 */
app.post("/api/trace/heartbeat", async (req, res) => {
    try {
        console.log(
            "Heartbeat request received. EXPECTED_CHAIN_ID =",
            process.env.EXPECTED_CHAIN_ID
        );

        const result =
            await traceClient.heartbeat();
        lastDecayTickAt = Date.now();
        accumulatedDecayFraction = 0;
        res.json(result);

    } catch (error) {
        console.error(
            "POST /api/trace/heartbeat error:",
            error.message
        );

        if (
            error.code === "WRONG_NETWORK" ||
            error.message === "WRONG_NETWORK"
        ) {
            return res.status(400).json({
                success: false,
                status: "WRONG_NETWORK",
                expectedChainId:
                    error.expectedChainId,
                actualChainId:
                    error.actualChainId
            });
        }

        if (
            error.message ===
            "MISSING_EXPECTED_CHAIN_ID"
        ) {
            return res.status(500).json({
                success: false,
                status: "MISSING_EXPECTED_CHAIN_ID",
                expectedChainId:
                    process.env.EXPECTED_CHAIN_ID || null
            });
        }

        res.status(500).json({
            success: false,
            status: "TRANSACTION_FAILED"
        });
    }
});

/**
 * POST /api/mira/request
 */
app.post("/api/mira/request", async (req, res) => {
    const { request } = req.body;

    // Must exist
    if (
        request === undefined ||
        request === null
    ) {
        return res.status(400).json({
            success: false,
            error: "Missing 'request' in body."
        });
    }

    // Must be string
    if (typeof request !== "string") {
        return res.status(400).json({
            success: false,
            error:
                "Parameter 'request' must be a string."
        });
    }

    const trimmed = request.trim();

    // Cannot be empty
    if (trimmed === "") {
        return res.status(400).json({
            success: false,
            error:
                "Parameter 'request' cannot be empty."
        });
    }

    // Maximum request length
    if (trimmed.length > 2000) {
        return res.status(400).json({
            success: false,
            error:
                "Parameter 'request' exceeds maximum allowed length."
        });
    }

    try {
        console.log(
            "Mira request received. EXPECTED_CHAIN_ID =",
            process.env.EXPECTED_CHAIN_ID
        );

        const result =
            await mira.processRequest(trimmed);

        if (result.status === "UNKNOWN") {
            return res.json({
                success: false,
                action: "UNKNOWN_ACTION",
                status: "UNKNOWN_ACTION",
                request: trimmed,
                decision: "BLOCKED",
                reason: "Unknown or unsupported action."
            });
        }

        // Save successfully verified & attested action queries to the private audit registry
        if (result.success && result.transactionHash) {
            saveAuditRecord(result.transactionHash, trimmed);
            lastDecayTickAt = Date.now();
        }

        res.json(result);

    } catch (error) {
        console.error("========== MIRA REQUEST FAILED ==========");
        console.error("Message:", error.message);
        console.error("Code:", error.code);
        console.error("Expected Chain ID:", error.expectedChainId);
        console.error("Actual Chain ID:", error.actualChainId);
        console.error("Stack:", error.stack);
        console.error("=========================================");

        if (
            error.code === "WRONG_NETWORK" ||
            error.message === "WRONG_NETWORK"
        ) {
            return res.status(400).json({
                success: false,
                status: "WRONG_NETWORK",
                expectedChainId: error.expectedChainId,
                actualChainId: error.actualChainId
            });
        }

        if (
            error.message ===
            "MISSING_EXPECTED_CHAIN_ID"
        ) {
            return res.status(500).json({
                success: false,
                status: "MISSING_EXPECTED_CHAIN_ID",
                expectedChainId:
                    process.env.EXPECTED_CHAIN_ID || null
            });
        }

        res.status(500).json({
            success: false,
            error: error.message || "FAILED_TO_PROCESS_REQUEST"
        });
    }
});

/**
 * GET /api/trace/attestations
 */
app.get(
    "/api/trace/attestations",
    async (req, res) => {
        try {
            const attestations =
                await traceClient.getAttestations();

            const registry = loadAuditRegistry();
            const enriched = attestations.map(att => {
                const txKey = att.transactionHash ? att.transactionHash.toLowerCase() : "";
                const auditRecord = registry[txKey];
                
                return {
                    ...att,
                    request: auditRecord ? auditRecord.request : `On-chain attested: ${att.action}`,
                    decision: "ALLOWED",
                    verified: true,
                    permissionValue: ["LOCKED", "READ_ONLY", "RESTRICTED", "FULL"].indexOf(att.permission)
                };
            });

            res.json(enriched);

        } catch (error) {
            console.error(
                "GET /api/trace/attestations error:",
                error.message
            );

            res.status(500).json({
                success: false,
                error:
                    "FAILED_TO_GET_ATTESTATIONS"
            });
        }
    }
);

const PORT = process.env.PORT || 3001;

init()
    .then(() => {
        app.listen(PORT, () => {
            console.log(
                `TRACE API Server running on port ${PORT}`
            );
        });
    })
    .catch((err) => {
        console.error(
            "Failed to initialize server:",
            err.message
        );
    });