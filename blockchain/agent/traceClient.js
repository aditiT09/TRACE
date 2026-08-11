import { parseAbiItem } from "viem";

/**
 * Trace Client
 * Wrapper around the TracePermissions contract using Viem.
 */
export class TraceClient {
    constructor({ contractAddress, publicClient, agentWallet, ownerWallet }) {
        if (!contractAddress) {
            throw new Error("Contract address is required");
        }
        if (!publicClient) {
            throw new Error("Viem publicClient is required");
        }

        this.contractAddress = contractAddress;
        this.publicClient = publicClient;
        this.agentWallet = agentWallet;
        this.ownerWallet = ownerWallet;

        this.abi = [
            {
                "inputs": [
                    {
                        "internalType": "string",
                        "name": "action",
                        "type": "string"
                    }
                ],
                "name": "canPerformAction",
                "outputs": [
                    {
                        "internalType": "bool",
                        "name": "",
                        "type": "bool"
                    }
                ],
                "stateMutability": "view",
                "type": "function"
            },
            {
                "inputs": [],
                "name": "getCurrentPermission",
                "outputs": [
                    {
                        "internalType": "uint8",
                        "name": "",
                        "type": "uint8"
                    }
                ],
                "stateMutability": "view",
                "type": "function"
            },
            {
                "inputs": [
                    {
                        "internalType": "string",
                        "name": "action",
                        "type": "string"
                    }
                ],
                "name": "attestAction",
                "outputs": [],
                "stateMutability": "external",
                "type": "function"
            },
            {
                "inputs": [],
                "name": "heartbeat",
                "outputs": [],
                "stateMutability": "external",
                "type": "function"
            },
            {
                "inputs": [],
                "name": "getInactiveTime",
                "outputs": [
                    {
                        "internalType": "uint256",
                        "name": "",
                        "type": "uint256"
                    }
                ],
                "stateMutability": "view",
                "type": "function"
            },
            {
                "inputs": [],
                "name": "lastHeartbeat",
                "outputs": [
                    {
                        "internalType": "uint256",
                        "name": "",
                        "type": "uint256"
                    }
                ],
                "stateMutability": "view",
                "type": "function"
            },
            {
                "inputs": [],
                "name": "owner",
                "outputs": [
                    {
                        "internalType": "address",
                        "name": "",
                        "type": "address"
                    }
                ],
                "stateMutability": "view",
                "type": "function"
            },
            {
                "inputs": [],
                "name": "agent",
                "outputs": [
                    {
                        "internalType": "address",
                        "name": "",
                        "type": "address"
                    }
                ],
                "stateMutability": "view",
                "type": "function"
            }
        ];

        this.permissions = ["LOCKED", "READ_ONLY", "RESTRICTED", "FULL"];
    }

    /**
     * Gets the contract address.
     */
    getContractAddress() {
        return this.contractAddress;
    }

    /**
     * Gets the current human-readable permission level of the agent from the contract.
     */
    async getPermission() {
        const index = await this.publicClient.readContract({
            address: this.contractAddress,
            abi: this.abi,
            functionName: "getCurrentPermission"
        });
        return this.permissions[index];
    }

    /**
     * Checks if the given action can be executed based on the current permission state.
     */
    async canPerformAction(action) {
        return await this.publicClient.readContract({
            address: this.contractAddress,
            abi: this.abi,
            functionName: "canPerformAction",
            args: [action]
        });
    }

    /**
     * Attests a completed action on-chain. MUST be called by the agent wallet.
     * Submits transaction, waits for receipt, verifies status, returns hash and block number.
     */
    async attestAction(action) {
        if (!this.agentWallet) {
            throw new Error("Agent wallet client is required for attestAction");
        }
        const hash = await this.agentWallet.writeContract({
            address: this.contractAddress,
            abi: this.abi,
            functionName: "attestAction",
            args: [action],
            account: this.agentWallet.account
        });
        const receipt = await this.publicClient.waitForTransactionReceipt({ hash });
        if (receipt.status !== "success") {
            throw new Error("TRANSACTION_FAILED");
        }
        return {
            success: true,
            transactionHash: hash,
            blockNumber: Number(receipt.blockNumber)
        };
    }

    /**
     * Owner heartbeat function to restore full permission. MUST be called by the owner wallet.
     * Submits transaction, waits for receipt, verifies status, returns hash and block number.
     */
    async heartbeat() {
        if (!this.ownerWallet) {
            throw new Error("Owner wallet client is required for heartbeat");
        }
        const hash = await this.ownerWallet.writeContract({
            address: this.contractAddress,
            abi: this.abi,
            functionName: "heartbeat",
            account: this.ownerWallet.account
        });
        const receipt = await this.publicClient.waitForTransactionReceipt({ hash });
        if (receipt.status !== "success") {
            throw new Error("TRANSACTION_FAILED");
        }
        return {
            success: true,
            transactionHash: hash,
            blockNumber: Number(receipt.blockNumber)
        };
    }

    /**
     * Returns inactive time in seconds since the last heartbeat.
     */
    async getInactiveTime() {
        const time = await this.publicClient.readContract({
            address: this.contractAddress,
            abi: this.abi,
            functionName: "getInactiveTime"
        });
        return Number(time);
    }

    /**
     * Returns the actual last heartbeat timestamp from the contract.
     */
    async getLastHeartbeat() {
        const lastHb = await this.publicClient.readContract({
            address: this.contractAddress,
            abi: this.abi,
            functionName: "lastHeartbeat"
        });
        return Number(lastHb);
    }

    /**
     * Returns name and chain ID of the connected network.
     */
    async getNetworkInfo() {
        const chainId = await this.publicClient.getChainId();
        return {
            name: this.publicClient.chain?.name || `Chain ID ${chainId}`,
            chainId: Number(chainId)
        };
    }

    /**
     * Queries blockchain logs for verified ActionAttested events.
     */
    async getAttestations() {
        const actionAttestedEvent = parseAbiItem(
            "event ActionAttested(address indexed agent, string action, uint8 permission, uint256 timestamp)"
        );

        const logs = await this.publicClient.getLogs({
            address: this.contractAddress,
            event: actionAttestedEvent,
            fromBlock: 0n
        });

        return logs.map(log => {
            return {
                agent: log.args.agent,
                action: log.args.action,
                permission: this.permissions[log.args.permission],
                timestamp: Number(log.args.timestamp),
                transactionHash: log.transactionHash,
                blockNumber: Number(log.blockNumber)
            };
        });
    }
}
