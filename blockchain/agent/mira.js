import { parseAction } from "./actionParser.js";

/**
 * Mira AI Agent - Client Operations Agent
 */
export class MiraAgent {
    constructor(traceClient) {
        if (!traceClient) {
            throw new Error("TraceClient instance is required for MiraAgent");
        }
        this.traceClient = traceClient;
    }

    /**
     * Processes a natural-language request from the user.
     * Enforces the TRACE security flow.
     */
    async processRequest(request) {
        const action = parseAction(request);

        if (action === "UNKNOWN_ACTION") {
            return {
                success: false,
                agent: "Mira",
                request: request,
                action: "UNKNOWN_ACTION",
                status: "UNKNOWN",
                message: "Unknown action request"
            };
        }

        // SECURITY: Query smart contract for current permission and allowance
        const permission = await this.traceClient.getPermission();
        const allowed = await this.traceClient.canPerformAction(action);

        if (!allowed) {
            // Determine minimum permission required for this action
            let requiredPermission = "FULL";
            if (action === "SEND_MESSAGE" || action === "SCHEDULE_MEETING") {
                requiredPermission = "RESTRICTED";
            }

            return {
                success: false,
                agent: "Mira",
                request: request,
                action: action,
                permission: permission,
                status: "BLOCKED",
                message: "Action blocked by TRACE",
                requiredPermission: requiredPermission
            };
        }

        // Action is allowed by TRACE, so we can now execute it
        const log = this.executeSimulation(action);

        // Submit the attestation to the blockchain
        const transactionHash = await this.traceClient.attestAction(action);

        return {
            success: true,
            agent: "Mira",
            request: request,
            action: action,
            permission: permission,
            status: "VERIFIED",
            message: "Action executed and attested on-chain",
            executionLog: log,
            transactionHash: transactionHash
        };
    }

    /**
     * Simulates the execution of the permitted action.
     */
    executeSimulation(action) {
        if (action === "SEND_MESSAGE") {
            return "Mira sent the client message.";
        } else if (action === "SCHEDULE_MEETING") {
            return "Mira scheduled the meeting.";
        } else if (action === "APPROVE_INVOICE") {
            return "Mira approved the invoice.";
        }
        return "";
    }
}
