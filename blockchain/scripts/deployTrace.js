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
    
    // Read configured agent address from environment variables, fallback to second wallet if local
    const agentAddress = process.env.TRACE_AGENT_ADDRESS || (wallets[1] ? wallets[1].account.address : deployer.account.address);

    const chainId = Number(await publicClient.getChainId());

    // 2. Load contract artifact
    const artifactPath = path.resolve("artifacts/contracts/TracePermissions.sol/TracePermissions.json");
    if (!fs.existsSync(artifactPath)) {
        throw new Error("TracePermissions artifact not found. Please compile the contracts using 'npx hardhat build' first.");
    }
    
    const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
    const { abi, bytecode } = artifact;

    // 3. Deploy using standard Viem client
    const hash = await deployer.deployContract({
        abi,
        bytecode,
        args: [agentAddress],
        account: deployer.account
    });

    // 4. Wait for transaction receipt (strict confirmation check)
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    
    if (receipt.status !== "success") {
        throw new Error("Deployment transaction failed on-chain.");
    }

    const contractAddress = receipt.contractAddress;

    // 5. Post-deployment contract state verification
    const ownerContract = await publicClient.readContract({
        address: contractAddress,
        abi,
        functionName: "owner"
    });

    const agentContract = await publicClient.readContract({
        address: contractAddress,
        abi,
        functionName: "agent"
    });

    const permissionContract = await publicClient.readContract({
        address: contractAddress,
        abi,
        functionName: "getCurrentPermission"
    });

    // Verify correct owners, agents and default FULL permission (index 3)
    if (ownerContract.toLowerCase() !== deployer.account.address.toLowerCase()) {
        throw new Error(`Owner verification failed: expected ${deployer.account.address}, got ${ownerContract}`);
    }

    if (agentContract.toLowerCase() !== agentAddress.toLowerCase()) {
        throw new Error(`Agent verification failed: expected ${agentAddress}, got ${agentContract}`);
    }

    if (Number(permissionContract) !== 3) { // 3 = Permission.FULL
        throw new Error(`Initial permission verification failed: expected 3 (FULL), got ${permissionContract}`);
    }

    // 6. Print formatted console log
    console.log("=================================");
    console.log("TRACE DEPLOYMENT");
    console.log("=================================");
    console.log("Network:");
    console.log(network.name === "localhost" || network.name === "hardhat" ? "Local Hardhat Node" : network.name);
    console.log("");
    console.log("Chain ID:");
    console.log(chainId);
    console.log("");
    console.log("Owner:");
    console.log(deployer.account.address);
    console.log("");
    console.log("Agent:");
    console.log(agentAddress);
    console.log("");
    console.log("Contract:");
    console.log(contractAddress);
    console.log("");
    console.log("Transaction:");
    console.log(hash);
    console.log("");
    console.log("Block:");
    console.log(Number(receipt.blockNumber));
    console.log("=================================");

    // 7. Write Polygon Amoy deployment artifact ONLY if running on Amoy (Chain ID 80002)
    if (chainId === 80002) {
        const deploymentFolder = path.resolve("deployments");
        if (!fs.existsSync(deploymentFolder)) {
            fs.mkdirSync(deploymentFolder, { recursive: true });
        }
        
        const deploymentArtifact = {
            network: "Polygon Amoy",
            chainId: 80002,
            contractAddress: contractAddress,
            owner: deployer.account.address,
            agent: agentAddress,
            deploymentTransaction: hash,
            blockNumber: Number(receipt.blockNumber)
        };

        fs.writeFileSync(
            path.join(deploymentFolder, "polygonAmoy.json"),
            JSON.stringify(deploymentArtifact, null, 4),
            "utf8"
        );
        console.log("Saved deployment artifact to deployments/polygonAmoy.json");
    }
}

main().catch((error) => {
    console.error("Deployment failed:", error);
    process.exitCode = 1;
});
