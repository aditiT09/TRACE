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
            }
        ];

        this.permissions = ["LOCKED", "READ_ONLY", "RESTRICTED", "FULL"];
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
        await this.publicClient.waitForTransactionReceipt({ hash });
        return hash;
    }

    /**
     * Owner heartbeat function to restore full permission. MUST be called by the owner wallet.
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
        await this.publicClient.waitForTransactionReceipt({ hash });
        return hash;
    }

    /**
     * Returns inactive time in seconds since the last heartbeat.
     */
    async getInactiveTime() {
        return await this.publicClient.readContract({
            address: this.contractAddress,
            abi: this.abi,
            functionName: "getInactiveTime"
        });
    }
}
