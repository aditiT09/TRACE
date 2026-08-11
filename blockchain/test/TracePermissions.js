import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { network } from "hardhat";
import { parseAbiItem } from "viem";

describe("TracePermissions", async function () {

    // =========================================================
    // HARDHAT 3 + VIEM
    // =========================================================

    const {
        viem,
        networkHelpers,
    } = await network.connect();

    const publicClient =
        await viem.getPublicClient();

    const wallets =
        await viem.getWalletClients();

    const owner = wallets[0];
    const agent = wallets[1];
    const other = wallets[2];

    // =========================================================
    // DEPLOY CONTRACT
    // =========================================================

    const contract =
        await viem.deployContract(
            "TracePermissions",
            [agent.account.address]
        );

    // =========================================================
    // TIME HELPER
    // =========================================================

    async function increaseTime(seconds) {
        await networkHelpers.time.increase(seconds);
    }

    // =========================================================
    // ATTESTATION EVENT
    // =========================================================

    const actionAttestedEvent = parseAbiItem(
        "event ActionAttested(address indexed agent, string action, uint8 permission, uint256 timestamp)"
    );

    // =========================================================
    // BASIC OWNERSHIP / AGENT TESTS
    // =========================================================

    it("sets the correct owner", async function () {

        const contractOwner =
            await contract.read.owner();

        assert.equal(
            contractOwner.toLowerCase(),
            owner.account.address.toLowerCase()
        );
    });

    it("sets the correct agent", async function () {

        const contractAgent =
            await contract.read.agent();

        assert.equal(
            contractAgent.toLowerCase(),
            agent.account.address.toLowerCase()
        );
    });

    // =========================================================
    // INITIAL PERMISSION
    // =========================================================

    it("starts with FULL permission", async function () {

        const permission =
            await contract.read.getCurrentPermission();

        assert.equal(
            permission,
            3
        );
    });

    // =========================================================
    // HEARTBEAT
    // =========================================================

    it("allows the owner to perform a heartbeat", async function () {

        const before =
            await contract.read.lastHeartbeat();

        const hash =
            await contract.write.heartbeat({
                account: owner.account,
            });

        await publicClient.waitForTransactionReceipt({
            hash,
        });

        const after =
            await contract.read.lastHeartbeat();

        assert.ok(after >= before);
    });

    // =========================================================
    // FULL -> RESTRICTED
    // =========================================================

    it("decays from FULL to RESTRICTED", async function () {

        await contract.write.heartbeat({
            account: owner.account,
        });

        await increaseTime(121);

        const permission =
            await contract.read.getCurrentPermission();

        assert.equal(
            permission,
            2
        );
    });

    // =========================================================
    // RESTRICTED -> READ_ONLY
    // =========================================================

    it("decays from FULL to READ_ONLY", async function () {

        await contract.write.heartbeat({
            account: owner.account,
        });

        await increaseTime(241);

        const permission =
            await contract.read.getCurrentPermission();

        assert.equal(
            permission,
            1
        );
    });

    // =========================================================
    // READ_ONLY -> LOCKED
    // =========================================================

    it("decays from FULL to LOCKED", async function () {

        await contract.write.heartbeat({
            account: owner.account,
        });

        await increaseTime(361);

        const permission =
            await contract.read.getCurrentPermission();

        assert.equal(
            permission,
            0
        );
    });

    // =========================================================
    // HEARTBEAT RESTORES FULL
    // =========================================================

    it("heartbeat restores FULL permission", async function () {

        await contract.write.heartbeat({
            account: owner.account,
        });

        await increaseTime(241);

        let permission =
            await contract.read.getCurrentPermission();

        assert.equal(
            permission,
            1
        );

        await contract.write.heartbeat({
            account: owner.account,
        });

        permission =
            await contract.read.getCurrentPermission();

        assert.equal(
            permission,
            3
        );
    });

    // =========================================================
    // FULL ACTIONS
    // =========================================================

    it("FULL permission allows SEND_MESSAGE", async function () {

        const allowed =
            await contract.read.canPerformAction([
                "SEND_MESSAGE",
            ]);

        assert.equal(
            allowed,
            true
        );
    });

    it("FULL permission allows APPROVE_INVOICE", async function () {

        const allowed =
            await contract.read.canPerformAction([
                "APPROVE_INVOICE",
            ]);

        assert.equal(
            allowed,
            true
        );
    });

    // =========================================================
    // RESTRICTED ACTIONS
    // =========================================================

    it("RESTRICTED permission allows SEND_MESSAGE", async function () {

        await contract.write.heartbeat({
            account: owner.account,
        });

        await increaseTime(121);

        const permission =
            await contract.read.getCurrentPermission();

        assert.equal(
            permission,
            2
        );

        const allowed =
            await contract.read.canPerformAction([
                "SEND_MESSAGE",
            ]);

        assert.equal(
            allowed,
            true
        );
    });

    it("RESTRICTED permission allows SCHEDULE_MEETING", async function () {

        await contract.write.heartbeat({
            account: owner.account,
        });

        await increaseTime(121);

        const allowed =
            await contract.read.canPerformAction([
                "SCHEDULE_MEETING",
            ]);

        assert.equal(
            allowed,
            true
        );
    });

    it("RESTRICTED permission blocks APPROVE_INVOICE", async function () {

        await contract.write.heartbeat({
            account: owner.account,
        });

        await increaseTime(121);

        const allowed =
            await contract.read.canPerformAction([
                "APPROVE_INVOICE",
            ]);

        assert.equal(
            allowed,
            false
        );
    });

    // =========================================================
    // VERIFIED ATTESTATION
    // =========================================================

    it("agent can attest an allowed action", async function () {

        await contract.write.heartbeat({
            account: owner.account,
        });

        const hash =
            await contract.write.attestAction(
                ["SEND_MESSAGE"],
                {
                    account: agent.account,
                }
            );

        const receipt =
            await publicClient.waitForTransactionReceipt({
                hash,
            });

        assert.equal(
            receipt.status,
            "success"
        );
    });

    // =========================================================
    // FULL ATTESTATION
    // =========================================================

    it("attestation records FULL permission", async function () {

        await contract.write.heartbeat({
            account: owner.account,
        });

        const hash =
            await contract.write.attestAction(
                ["SEND_MESSAGE"],
                {
                    account: agent.account,
                }
            );

        const receipt =
            await publicClient.waitForTransactionReceipt({
                hash,
            });

        const logs =
            await publicClient.getLogs({
                address: contract.address,
                event: actionAttestedEvent,
                fromBlock: receipt.blockNumber,
                toBlock: receipt.blockNumber,
            });

        assert.equal(
            logs.length,
            1
        );

        const log = logs[0];

        assert.ok(log !== undefined);

        assert.equal(
            log.args.agent.toLowerCase(),
            agent.account.address.toLowerCase()
        );

        assert.equal(
            log.args.action,
            "SEND_MESSAGE"
        );

        assert.equal(
            log.args.permission,
            3
        );

        assert.ok(
            log.args.timestamp !== undefined
        );

        assert.ok(
            log.args.timestamp > 0n
        );
    });

    // =========================================================
    // RESTRICTED ATTESTATION
    // =========================================================

    it("attestation records RESTRICTED permission", async function () {

        await contract.write.heartbeat({
            account: owner.account,
        });

        await increaseTime(121);

        const permission =
            await contract.read.getCurrentPermission();

        assert.equal(
            permission,
            2
        );

        const hash =
            await contract.write.attestAction(
                ["SEND_MESSAGE"],
                {
                    account: agent.account,
                }
            );

        const receipt =
            await publicClient.waitForTransactionReceipt({
                hash,
            });

        const logs =
            await publicClient.getLogs({
                address: contract.address,
                event: actionAttestedEvent,
                fromBlock: receipt.blockNumber,
                toBlock: receipt.blockNumber,
            });

        assert.equal(
            logs.length,
            1
        );

        const log = logs[0];

        assert.ok(log !== undefined);

        assert.equal(
            log.args.agent.toLowerCase(),
            agent.account.address.toLowerCase()
        );

        assert.equal(
            log.args.action,
            "SEND_MESSAGE"
        );

        assert.equal(
            log.args.permission,
            2
        );

        assert.ok(
            log.args.timestamp !== undefined
        );

        assert.ok(
            log.args.timestamp > 0n
        );
    });

    // =========================================================
    // BLOCKED ACTION
    // =========================================================

    it("blocks agent from attesting APPROVE_INVOICE when RESTRICTED", async function () {

        await contract.write.heartbeat({
            account: owner.account,
        });

        await increaseTime(121);

        await assert.rejects(
            async () => {
                await contract.write.attestAction(
                    ["APPROVE_INVOICE"],
                    {
                        account: agent.account,
                    }
                );
            }
        );
    });

    // =========================================================
    // READ_ONLY BLOCK
    // =========================================================

    it("blocks agent from attesting when READ_ONLY", async function () {

        await contract.write.heartbeat({
            account: owner.account,
        });

        await increaseTime(241);

        const permission =
            await contract.read.getCurrentPermission();

        assert.equal(
            permission,
            1
        );

        await assert.rejects(
            async () => {
                await contract.write.attestAction(
                    ["SEND_MESSAGE"],
                    {
                        account: agent.account,
                    }
                );
            }
        );
    });

    // =========================================================
    // LOCKED BLOCK
    // =========================================================

    it("blocks agent from attesting when LOCKED", async function () {

        await contract.write.heartbeat({
            account: owner.account,
        });

        await increaseTime(361);

        const permission =
            await contract.read.getCurrentPermission();

        assert.equal(
            permission,
            0
        );

        await assert.rejects(
            async () => {
                await contract.write.attestAction(
                    ["SEND_MESSAGE"],
                    {
                        account: agent.account,
                    }
                );
            }
        );
    });

    // =========================================================
    // ONLY AGENT CAN ATTEST
    // =========================================================

    it("prevents owner from creating an agent attestation", async function () {

        await contract.write.heartbeat({
            account: owner.account,
        });

        await assert.rejects(
            async () => {
                await contract.write.attestAction(
                    ["SEND_MESSAGE"],
                    {
                        account: owner.account,
                    }
                );
            }
        );
    });

    it("prevents another wallet from creating an attestation", async function () {

        await contract.write.heartbeat({
            account: owner.account,
        });

        await assert.rejects(
            async () => {
                await contract.write.attestAction(
                    ["SEND_MESSAGE"],
                    {
                        account: other.account,
                    }
                );
            }
        );
    });
});