import { network } from "hardhat";
import fs from "fs";
import path from "path";

async function main() {
    // 1. Connect to the network context
    const { viem } = await network.connect();
    
    const publicClient = await viem.getPublicClient();
    const wallets = await viem.getWalletClients();
    
    if (wallets.length === 0) {
        throw new Error("No wallets available. Please configure your PRIVATE_KEY in Hardhat variables or .env");
    }

    const deployer = wallets[0];
    
    // 2. Read configured agent address from environment variables, fallback to deployer
    const agentAddress = process.env.TRACE_AGENT_ADDRESS || deployer.account.address;

    console.log("==================================================");
    console.log("TRACE - Smart Contract Deployment");
    console.log("==================================================");
    console.log("Network Name: ", network.name);
    
    const chainId = await publicClient.getChainId();
    console.log("Chain ID:     ", chainId);
    console.log("Deployer:     ", deployer.account.address);
    console.log("Agent Address:", agentAddress);
    console.log("--------------------------------------------------");

    // 3. Load contract artifact
    const artifactPath = path.resolve("artifacts/contracts/TracePermissions.sol/TracePermissions.json");
    if (!fs.existsSync(artifactPath)) {
        throw new Error("TracePermissions artifact not found. Please compile the contracts using 'npx hardhat build' first.");
    }
    
    const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
    const { abi, bytecode } = artifact;

    console.log("Submitting deployment transaction...");

    // 4. Deploy using standard Viem client
    const hash = await deployer.deployContract({
        abi,
        bytecode,
        args: [agentAddress],
        account: deployer.account
    });

    console.log("Transaction Hash:", hash);
    console.log("Waiting for confirmation...");

    // 5. Wait for transaction receipt
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    
    if (receipt.status !== "success") {
        throw new Error("Deployment transaction failed on-chain.");
    }

    console.log("--------------------------------------------------");
    console.log("✓ DEPLOYMENT SUCCEEDED");
    console.log("Contract Address:", receipt.contractAddress);
    console.log("Block Number:    ", Number(receipt.blockNumber));
    console.log("==================================================");
}

main().catch((error) => {
    console.error("Deployment failed:", error);
    process.exitCode = 1;
});
