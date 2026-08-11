import { network } from "hardhat";
import { TraceClient } from "../agent/traceClient.js";
import { MiraAgent } from "../agent/mira.js";

async function main() {
    // 1. Connect to the Hardhat network
    const { viem, networkHelpers } = await network.connect();
    
    // 2. Get wallets
    const wallets = await viem.getWalletClients();
    const owner = wallets[0];
    const agent = wallets[1];
    
    // 3. Deploy contract
    const contract = await viem.deployContract(
        "TracePermissions",
        [agent.account.address]
    );
    
    const publicClient = await viem.getPublicClient();

    // 4. Initialize client and agent
    const traceClient = new TraceClient({
        contractAddress: contract.address,
        publicClient,
        agentWallet: agent,
        ownerWallet: owner
    });

    const mira = new MiraAgent(traceClient);

    console.log("--------------------------------------------------");
    console.log("MIRA — CLIENT OPERATIONS AGENT");
    console.log("--------------------------------------------------\n");

    // ==========================================================
    // SCENARIO 1 — FULL PERMISSION
    // ==========================================================
    // Owner checks in
    await traceClient.heartbeat();
    const perm1 = await traceClient.getPermission();
    console.log("Owner heartbeat:");
    console.log(`${perm1}\n`);

    const res1 = await mira.processRequest("Send a reminder to the client.");
    displayResult(res1);

    // ==========================================================
    // SCENARIO 2 — PERMISSION DECAYS
    // ==========================================================
    console.log("--------------------------------------------------");
    console.log("Owner inactive...\n");
    console.log("Permission:");
    console.log("FULL\n↓\nRESTRICTED\n");
    
    // Advance time by 121 seconds
    await networkHelpers.time.increase(121);

    const res2 = await mira.processRequest("Approve the invoice.");
    displayResult(res2);

    // ==========================================================
    // SCENARIO 3 — SAFE ACTION UNDER RESTRICTED
    // ==========================================================
    console.log("--------------------------------------------------");
    const res3 = await mira.processRequest("Schedule a meeting.");
    displayResult(res3);

    // ==========================================================
    // SCENARIO 4 — HEARTBEAT RESTORES AUTHORITY
    // ==========================================================
    console.log("--------------------------------------------------");
    console.log("Owner heartbeat...\n");
    
    // Owner heartbeats
    await traceClient.heartbeat();
    const perm4 = await traceClient.getPermission();
    console.log("Permission:");
    console.log(`${perm4}\n`);

    const res4 = await mira.processRequest("Approve the invoice.");
    displayResult(res4);
    
    console.log("--------------------------------------------------");
}

function displayResult(result) {
    console.log(`User:\n"${result.request}"\n`);
    console.log(`Mira:\n${result.action}\n`);
    console.log(`TRACE:\nPermission = ${result.permission}\n`);
    if (result.success) {
        console.log(`✓ ACTION ALLOWED\n`);
        if (result.executionLog) {
            console.log(`${result.executionLog}\n`);
        }
        console.log(`✓ ACTION EXECUTED\n`);
        console.log(`✓ ATTESTATION CREATED`);
        console.log(`Tx Hash: ${result.transactionHash}\n`);
    } else {
        console.log(`✕ ACTION BLOCKED\n`);
        console.log(`No attestation created.\n`);
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
