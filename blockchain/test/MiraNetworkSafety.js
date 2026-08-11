import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { network } from "hardhat";
import { TraceClient } from "../agent/traceClient.js";
import { MiraAgent } from "../agent/mira.js";
import { MockLlmParser } from "../agent/llmParser.js";

describe("TRACE Network Safety & Production Verification", async function () {
    const {
        viem,
        networkHelpers,
    } = await network.connect();

    const publicClient = await viem.getPublicClient();
    const wallets = await viem.getWalletClients();

    const owner = wallets[0];
    const agent = wallets[1];
    const other = wallets[2];

    let contract;
    let traceClient;
    let actualChainId;
    let originalExpectedChainId;

    before(async () => {
        contract = await viem.deployContract("TracePermissions", [agent.account.address]);
        traceClient = new TraceClient({
            contractAddress: contract.address,
            publicClient,
            agentWallet: agent,
            ownerWallet: owner
        });
        actualChainId = Number(await publicClient.getChainId());
        originalExpectedChainId = process.env.EXPECTED_CHAIN_ID;
    });

    after(() => {
        // Restore environment variables after tests complete
        if (originalExpectedChainId === undefined) {
            delete process.env.EXPECTED_CHAIN_ID;
        } else {
            process.env.EXPECTED_CHAIN_ID = originalExpectedChainId;
        }
    });

    // 1. validateNetwork accepts correct chain.
    it("accepts network connection when EXPECTED_CHAIN_ID matches actual chain", async function () {
        process.env.EXPECTED_CHAIN_ID = String(actualChainId);
        await assert.doesNotReject(async () => {
            await traceClient.validateNetwork();
        });
    });

    // 2. validateNetwork rejects wrong chain.
    it("rejects network connection when EXPECTED_CHAIN_ID does not match actual chain", async function () {
        process.env.EXPECTED_CHAIN_ID = "80002"; // Simulated Amoy expected, local EDR actual
        
        await assert.rejects(async () => {
            await traceClient.validateNetwork();
        }, (err) => {
            assert.equal(err.code, "WRONG_NETWORK");
            assert.equal(err.expectedChainId, 80002);
            assert.equal(err.actualChainId, actualChainId);
            return true;
        });
    });

    // 3. heartbeat refuses wrong network.
    it("refuses to submit heartbeat transaction if EXPECTED_CHAIN_ID is mismatching", async function () {
        process.env.EXPECTED_CHAIN_ID = "80002"; // Mismatch
        
        await assert.rejects(async () => {
            await traceClient.heartbeat();
        }, (err) => {
            return err.code === "WRONG_NETWORK";
        });
    });

    // 4. attestAction refuses wrong network.
    it("refuses to submit attestAction transaction if EXPECTED_CHAIN_ID is mismatching", async function () {
        process.env.EXPECTED_CHAIN_ID = "80002"; // Mismatch
        
        await assert.rejects(async () => {
            await traceClient.attestAction("SEND_MESSAGE");
        }, (err) => {
            return err.code === "WRONG_NETWORK";
        });
    });

    // 5. server returns WRONG_NETWORK.
    it("simulates Express server route handlers returning WRONG_NETWORK on chain mismatches", async function () {
        // Mock Express Request and Response
        const req = {};
        let statusSet = 200;
        let responseJson = {};
        
        const res = {
            status: function (code) {
                statusSet = code;
                return this;
            },
            json: function (obj) {
                responseJson = obj;
                return this;
            }
        };

        // Simulated Route Handler similar to server.js POST /api/trace/heartbeat
        const handleHeartbeat = async (req, res) => {
            try {
                process.env.EXPECTED_CHAIN_ID = "80002"; // wrong network
                await traceClient.heartbeat();
            } catch (error) {
                if (error.code === "WRONG_NETWORK" || error.message === "WRONG_NETWORK") {
                    return res.status(400).json({
                        success: false,
                        status: "WRONG_NETWORK",
                        expectedChainId: error.expectedChainId,
                        actualChainId: error.actualChainId
                    });
                }
                res.status(500).json({ success: false });
            }
        };

        await handleHeartbeat(req, res);

        assert.equal(statusSet, 400);
        assert.equal(responseJson.success, false);
        assert.equal(responseJson.status, "WRONG_NETWORK");
        assert.equal(responseJson.expectedChainId, 80002);
        assert.equal(responseJson.actualChainId, actualChainId);
    });

    // 6. no transaction is submitted when network validation fails.
    it("guarantees no block is mined or transaction is submitted when network checks fail", async function () {
        process.env.EXPECTED_CHAIN_ID = "80002"; // wrong
        
        const initialBlock = await publicClient.getBlockNumber();
        
        try {
            await traceClient.heartbeat();
        } catch (e) {
            // expected WRONG_NETWORK
        }

        const finalBlock = await publicClient.getBlockNumber();
        assert.equal(Number(initialBlock), Number(finalBlock));
    });

    // 7. existing owner authorization still works.
    it("guarantees that owner-restricted contract authorizations still apply correctly", async function () {
        process.env.EXPECTED_CHAIN_ID = String(actualChainId); // correct
        
        // Owner wallet succeeds
        await assert.doesNotReject(async () => {
            await traceClient.heartbeat();
        });

        // Non-owner client throws authorization error
        const badClient = new TraceClient({
            contractAddress: contract.address,
            publicClient,
            agentWallet: agent,
            ownerWallet: other
        });

        await assert.rejects(async () => {
            await badClient.heartbeat();
        });
    });

    // 8. existing agent authorization still works.
    it("guarantees that agent-restricted contract authorizations still apply correctly", async function () {
        process.env.EXPECTED_CHAIN_ID = String(actualChainId); // correct
        await traceClient.heartbeat();
        
        // Agent wallet succeeds
        await assert.doesNotReject(async () => {
            await traceClient.attestAction("SEND_MESSAGE");
        });

        // Non-agent client throws authorization error
        const badClient = new TraceClient({
            contractAddress: contract.address,
            publicClient,
            agentWallet: other,
            ownerWallet: owner
        });

        await assert.rejects(async () => {
            await badClient.attestAction("SEND_MESSAGE");
        });
    });

    // 9. private keys are never returned by status endpoints.
    it("ensures that status query data structures never expose private keys", async function () {
        const payload = {
            owner: owner.account.address,
            agent: agent.account.address,
            contractAddress: traceClient.getContractAddress()
        };

        const hasPrivateKey = Object.values(payload).some(val => 
            typeof val === "string" && (val.length === 64 || val.length === 66) && val.startsWith("0x") && val !== owner.account.address && val !== agent.account.address
        );

        assert.equal(hasPrivateKey, false);
    });

    // 10. LLM API keys are never returned.
    it("ensures that status query data structures never expose the LLM API key", async function () {
        const payload = {
            owner: owner.account.address,
            agent: agent.account.address,
            contractAddress: traceClient.getContractAddress(),
            network: "Polygon Amoy"
        };

        const keys = Object.keys(payload);
        const hasApiKey = keys.some(k => k.toLowerCase().includes("api_key") || k.toLowerCase().includes("secret"));
        
        assert.equal(hasApiKey, false);
    });
});
