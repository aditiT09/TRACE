import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { network } from "hardhat";
import { parseAbiItem } from "viem";
import { parseAction } from "../agent/actionParser.js";
import { TraceClient } from "../agent/traceClient.js";
import { MiraAgent } from "../agent/mira.js";

describe("Mira Agent Security & Permissions", async function () {
    // Connect to Hardhat network
    const {
        viem,
        networkHelpers,
    } = await network.connect();

    const publicClient = await viem.getPublicClient();
    const wallets = await viem.getWalletClients();

    const owner = wallets[0];
    const agent = wallets[1];

    // Deploy contract helper
    async function deployContract() {
        return await viem.deployContract(
            "TracePermissions",
            [agent.account.address]
        );
    }

    async function setupAgent() {
        const contract = await deployContract();
        const traceClient = new TraceClient({
            contractAddress: contract.address,
            publicClient,
            agentWallet: agent,
            ownerWallet: owner
        });
        const mira = new MiraAgent(traceClient);
        return { contract, traceClient, mira };
    }

    // 1. Natural-language SEND_MESSAGE is parsed correctly.
    it("parses natural-language SEND_MESSAGE requests correctly", function () {
        assert.equal(parseAction("send a message to the client"), "SEND_MESSAGE");
        assert.equal(parseAction("send the client a reminder"), "SEND_MESSAGE");
    });

    // 2. Natural-language SCHEDULE_MEETING is parsed correctly.
    it("parses natural-language SCHEDULE_MEETING requests correctly", function () {
        assert.equal(parseAction("schedule a meeting with the client"), "SCHEDULE_MEETING");
        assert.equal(parseAction("book a meeting"), "SCHEDULE_MEETING");
    });

    // 3. Natural-language APPROVE_INVOICE is parsed correctly.
    it("parses natural-language APPROVE_INVOICE requests correctly", function () {
        assert.equal(parseAction("approve the invoice"), "APPROVE_INVOICE");
        assert.equal(parseAction("approve this client's invoice"), "APPROVE_INVOICE");
    });

    // 4. Unknown request becomes UNKNOWN_ACTION.
    it("parses unknown requests as UNKNOWN_ACTION", function () {
        assert.equal(parseAction("something completely random"), "UNKNOWN_ACTION");
        assert.equal(parseAction("hello world"), "UNKNOWN_ACTION");
    });

    // 5. Mira can execute SEND_MESSAGE under FULL.
    it("allows execution of SEND_MESSAGE under FULL permission", async function () {
        const { traceClient, mira } = await setupAgent();
        await traceClient.heartbeat(); // Ensure FULL

        const result = await mira.processRequest("Send a reminder to the client.");
        assert.equal(result.success, true);
        assert.equal(result.status, "VERIFIED");
        assert.equal(result.action, "SEND_MESSAGE");
        assert.equal(result.permission, "FULL");
        assert.ok(result.transactionHash);
    });

    // 6. Mira can approve invoice under FULL.
    it("allows execution of APPROVE_INVOICE under FULL permission", async function () {
        const { traceClient, mira } = await setupAgent();
        await traceClient.heartbeat(); // Ensure FULL

        const result = await mira.processRequest("approve the invoice");
        assert.equal(result.success, true);
        assert.equal(result.status, "VERIFIED");
        assert.equal(result.action, "APPROVE_INVOICE");
        assert.equal(result.permission, "FULL");
        assert.ok(result.transactionHash);
    });

    // 7. After time decay to RESTRICTED: SEND_MESSAGE and SCHEDULE_MEETING succeed, APPROVE_INVOICE is blocked.
    it("handles actions correctly under RESTRICTED permission (after decay)", async function () {
        const { traceClient, mira } = await setupAgent();
        await traceClient.heartbeat(); // Ensure FULL
        
        // Decay to RESTRICTED (121 seconds)
        await networkHelpers.time.increase(121);

        // SEND_MESSAGE should succeed
        const resMsg = await mira.processRequest("send the client a reminder");
        assert.equal(resMsg.success, true);
        assert.equal(resMsg.permission, "RESTRICTED");
        assert.equal(resMsg.status, "VERIFIED");

        // SCHEDULE_MEETING should succeed
        const resMeet = await mira.processRequest("book a meeting");
        assert.equal(resMeet.success, true);
        assert.equal(resMeet.permission, "RESTRICTED");
        assert.equal(resMeet.status, "VERIFIED");

        // APPROVE_INVOICE should be blocked
        const resInv = await mira.processRequest("approve the invoice");
        assert.equal(resInv.success, false);
        assert.equal(resInv.permission, "RESTRICTED");
        assert.equal(resInv.status, "BLOCKED");
        assert.equal(resInv.requiredPermission, "FULL");
    });

    // 8. After READ_ONLY: all actions are blocked.
    it("blocks all actions under READ_ONLY permission", async function () {
        const { traceClient, mira } = await setupAgent();
        await traceClient.heartbeat(); // Ensure FULL
        
        // Decay to READ_ONLY (241 seconds)
        await networkHelpers.time.increase(241);

        const resMsg = await mira.processRequest("send a message");
        assert.equal(resMsg.success, false);
        assert.equal(resMsg.status, "BLOCKED");

        const resMeet = await mira.processRequest("book a meeting");
        assert.equal(resMeet.success, false);
        assert.equal(resMeet.status, "BLOCKED");

        const resInv = await mira.processRequest("approve the invoice");
        assert.equal(resInv.success, false);
        assert.equal(resInv.status, "BLOCKED");
    });

    // 9. After LOCKED: all actions are blocked.
    it("blocks all actions under LOCKED permission", async function () {
        const { traceClient, mira } = await setupAgent();
        await traceClient.heartbeat(); // Ensure FULL
        
        // Decay to LOCKED (361 seconds)
        await networkHelpers.time.increase(361);

        const resMsg = await mira.processRequest("send a message");
        assert.equal(resMsg.success, false);
        assert.equal(resMsg.status, "BLOCKED");

        const resMeet = await mira.processRequest("book a meeting");
        assert.equal(resMeet.success, false);
        assert.equal(resMeet.status, "BLOCKED");

        const resInv = await mira.processRequest("approve the invoice");
        assert.equal(resInv.success, false);
        assert.equal(resInv.status, "BLOCKED");
    });

    // 10. A successful action creates an attestation.
    it("creates a blockchain attestation for successful action", async function () {
        const { contract, traceClient, mira } = await setupAgent();
        await traceClient.heartbeat();

        const result = await mira.processRequest("Send a reminder to the client.");
        assert.equal(result.success, true);

        // Verify the attestation event exists in transaction receipt
        const receipt = await publicClient.getTransactionReceipt({
            hash: result.transactionHash
        });

        const actionAttestedEvent = parseAbiItem(
            "event ActionAttested(address indexed agent, string action, uint8 permission, uint256 timestamp)"
        );

        const logs = await publicClient.getLogs({
            address: contract.address,
            event: actionAttestedEvent,
            fromBlock: receipt.blockNumber,
            toBlock: receipt.blockNumber
        });

        assert.equal(logs.length, 1);
        assert.equal(logs[0].args.action, "SEND_MESSAGE");
        assert.equal(logs[0].args.permission, 3); // FULL
    });

    // 11. A blocked action does NOT create an attestation.
    it("does not create a blockchain attestation for blocked action", async function () {
        const { contract, traceClient, mira } = await setupAgent();
        await traceClient.heartbeat();
        
        // Decay to RESTRICTED (121 seconds)
        await networkHelpers.time.increase(121);

        // Try to approve invoice (blocked)
        const result = await mira.processRequest("approve the invoice");
        assert.equal(result.success, false);
        assert.equal(result.status, "BLOCKED");
        assert.ok(!result.transactionHash);

        // Verify no ActionAttested event exists for agent
        const actionAttestedEvent = parseAbiItem(
            "event ActionAttested(address indexed agent, string action, uint8 permission, uint256 timestamp)"
        );

        // Fetch logs for the current block height
        const blockNumber = await publicClient.getBlockNumber();
        const logs = await publicClient.getLogs({
            address: contract.address,
            event: actionAttestedEvent,
            fromBlock: blockNumber - 10n > 0n ? blockNumber - 10n : 0n,
            toBlock: blockNumber
        });

        // Ensure no APPROVE_INVOICE event was emitted
        const attestationExists = logs.some(log => log.args.action === "APPROVE_INVOICE");
        assert.equal(attestationExists, false);
    });

    // 12. Heartbeat restores FULL and allows APPROVE_INVOICE again.
    it("restores FULL permission and allows blocked action after heartbeat", async function () {
        const { traceClient, mira } = await setupAgent();
        await traceClient.heartbeat();
        
        // Decay to RESTRICTED
        await networkHelpers.time.increase(121);
        let result = await mira.processRequest("approve the invoice");
        assert.equal(result.success, false);

        // Restore FULL via owner heartbeat
        await traceClient.heartbeat();
        
        result = await mira.processRequest("approve the invoice");
        assert.equal(result.success, true);
        assert.equal(result.permission, "FULL");
        assert.equal(result.status, "VERIFIED");
    });
});
