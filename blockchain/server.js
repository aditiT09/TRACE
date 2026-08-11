import express from "express";
import cors from "cors";
import { network } from "hardhat";
import { TraceClient } from "./agent/traceClient.js";
import { MiraAgent } from "./agent/mira.js";
import { MockLlmParser, LlmParser } from "./agent/llmParser.js";

const app = express();
app.use(cors());
app.use(express.json());

// Security: Catch malformed JSON payloads and fail safely without leaking details
app.use((err, req, res, next) => {
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
        return res.status(400).json({ success: false, error: "Malformed JSON payload." });
    }
    next();
});

let traceClient;
let mira;

async function init() {
    console.log("Connecting to network...");
    const { viem } = await network.connect();
    
    const wallets = await viem.getWalletClients();
    if (wallets.length < 2) {
        throw new Error("TRACE requires at least two wallets (Owner and Agent) configured.");
    }
    const owner = wallets[0];
    const agent = wallets[1];
    
    // Read contract address from env, fallback to standard Hardhat deploy address
    const contractAddress = process.env.TRACE_CONTRACT_ADDRESS || "0x5FbDB2315678afecb367f032d93F642f64180aa3";
    console.log("Initializing TraceClient for contract:", contractAddress);

    const publicClient = await viem.getPublicClient();
    
    traceClient = new TraceClient({
        contractAddress,
        publicClient,
        agentWallet: agent,
        ownerWallet: owner
    });

    // Instantiate Gemini parser if key is configured, fallback to Mock parser for tests/demos
    const apiKey = process.env.LLM_API_KEY;
    const parser = apiKey ? new LlmParser() : new MockLlmParser();
    
    mira = new MiraAgent(traceClient, parser);
    
    console.log("TRACE Server initialization complete.");
}

/**
 * GET /api/trace/status
 * Exposes current permissions, heartbeat, and network configuration stats.
 * SECURITY: Never returns private keys, mnemonics, or Gemini API keys.
 */
app.get("/api/trace/status", async (req, res) => {
    try {
        const ownerAddress = traceClient.ownerWallet.account.address;
        const agentAddress = traceClient.agentWallet.account.address;
        const permission = await traceClient.getPermission();
        
        const permissions = ["LOCKED", "READ_ONLY", "RESTRICTED", "FULL"];
        const permissionValue = permissions.indexOf(permission);
        
        const lastHeartbeat = await traceClient.getLastHeartbeat();
        const inactiveTime = await traceClient.getInactiveTime();
        const networkInfo = await traceClient.getNetworkInfo();
        
        res.json({
            owner: ownerAddress,
            agent: agentAddress,
            permission,
            permissionValue,
            lastHeartbeat: new Date(lastHeartbeat * 1000).toISOString(),
            inactiveTime: inactiveTime.toString(),
            contractAddress: traceClient.getContractAddress(),
            network: networkInfo.name
        });
    } catch (error) {
        console.error("GET /api/trace/status error:", error.message);
        res.status(500).json({ success: false, error: "FAILED_TO_GET_STATUS" });
    }
});

/**
 * POST /api/trace/heartbeat
 * Triggers the owner check-in heartbeat transaction on-chain.
 * SECURITY: Handles network safety validations.
 */
app.post("/api/trace/heartbeat", async (req, res) => {
    try {
        const result = await traceClient.heartbeat();
        res.json(result);
    } catch (error) {
        console.error("POST /api/trace/heartbeat error:", error.message);
        if (error.code === "WRONG_NETWORK" || error.message === "WRONG_NETWORK") {
            return res.status(400).json({
                success: false,
                status: "WRONG_NETWORK",
                expectedChainId: error.expectedChainId,
                actualChainId: error.actualChainId
            });
        }
        res.status(500).json({ success: false, status: "TRANSACTION_FAILED" });
    }
});

/**
 * POST /api/mira/request
 * Evaluates natural-language request via Mira agent, checks permission, and signs attestation.
 * SECURITY: Incorporates request presence, type, length validation, and network safety.
 */
app.post("/api/mira/request", async (req, res) => {
    const { request } = req.body;
    
    // INPUT VALIDATION: Ensure exists
    if (request === undefined || request === null) {
        return res.status(400).json({ success: false, error: "Missing 'request' in body." });
    }
    
    // INPUT VALIDATION: Must be string
    if (typeof request !== "string") {
        return res.status(400).json({ success: false, error: "Parameter 'request' must be a string." });
    }
    
    // INPUT VALIDATION: Cannot be empty
    const trimmed = request.trim();
    if (trimmed === "") {
        return res.status(400).json({ success: false, error: "Parameter 'request' cannot be empty." });
    }
    
    // INPUT VALIDATION: Enforce maximum length safety limit
    if (trimmed.length > 2000) {
        return res.status(400).json({ success: false, error: "Parameter 'request' exceeds maximum allowed length." });
    }
    
    try {
        const result = await mira.processRequest(trimmed);
        if (result.status === "UNKNOWN") {
            return res.json({
                success: false,
                action: "UNKNOWN_ACTION",
                status: "UNKNOWN_ACTION"
            });
        }
        res.json(result);
    } catch (error) {
        console.error("POST /api/mira/request error:", error.message);
        if (error.code === "WRONG_NETWORK" || error.message === "WRONG_NETWORK") {
            return res.status(400).json({
                success: false,
                status: "WRONG_NETWORK",
                expectedChainId: error.expectedChainId,
                actualChainId: error.actualChainId
            });
        }
        res.status(500).json({ success: false, error: "FAILED_TO_PROCESS_REQUEST" });
    }
});

/**
 * GET /api/trace/attestations
 * Retrieves real ActionAttested logs directly from the blockchain.
 */
app.get("/api/trace/attestations", async (req, res) => {
    try {
        const attestations = await traceClient.getAttestations();
        res.json(attestations);
    } catch (error) {
        console.error("GET /api/trace/attestations error:", error.message);
        res.status(500).json({ success: false, error: "FAILED_TO_GET_ATTESTATIONS" });
    }
});

const PORT = process.env.PORT || 3001;
init().then(() => {
    app.listen(PORT, () => {
        console.log(`TRACE API Server running on port ${PORT}`);
    });
}).catch(err => {
    console.error("Failed to initialize server:", err.message);
});
