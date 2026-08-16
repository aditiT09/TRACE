import { parseAction } from "./actionParser.js";

/**
 * Mira AI Agent - Client Operations Agent
 */
export class MiraAgent {
    constructor(traceClient, llmParser = null) {
        if (!traceClient) {
            throw new Error("TraceClient instance is required for MiraAgent");
        }
        this.traceClient = traceClient;
        this.llmParser = llmParser;
    }

    /**
     * Processes a natural-language request from the user.
     * Enforces the TRACE security flow.
     */
    async processRequest(request, clientSuppliedPermission = null) {
        let action;
        let confidence = 1.0;

        // 1. LLM classification pass
        if (this.llmParser) {
            try {
                const parseResult = await this.llmParser.parseUserRequest(request);
                action = parseResult.action;
                confidence = parseResult.confidence;
            } catch (error) {
                // If LLM API is unavailable, fail-safe. Do not execute or bypass.
                return {
                    success: false,
                    status: "LLM_UNAVAILABLE",
                    decision: "BLOCKED",
                    attestation: null,
                    reason: "Mira LLM service is temporarily unavailable."
                };
            }
        } else {
            // Fallback to deterministic parser for backward compatibility
            action = parseAction(request);
        }

        // 2. Action Validation (Harden LLM Actions)
        const allowedActions = ["SEND_MESSAGE", "SCHEDULE_MEETING", "APPROVE_INVOICE"];
        if (!allowedActions.includes(action)) {
            return {
                success: false,
                agent: "Mira",
                request: request,
                action: "UNKNOWN_ACTION",
                status: "UNKNOWN",
                message: "Mira could not map the request to a supported action.",
                decision: "BLOCKED",
                attestation: null,
                reason: "Unknown or unsupported action."
            };
        }

        // 3. Smart contract queries with TRACE_UNAVAILABLE fail-safe
        let permission;
        let allowed;
        try {
            permission = await this.traceClient.getPermission();
            allowed = await this.traceClient.canPerformAction(action);
        } catch (error) {
            console.error("TRACE Query Error:", error);
            if (error.code === "WRONG_NETWORK" || error.message === "WRONG_NETWORK") {
                throw error;
            }
            return {
                success: false,
                status: "TRACE_UNAVAILABLE",
                decision: "BLOCKED",
                attestation: null,
                reason: "TRACE contract query failed or contract is offline."
            };
        }

        // 4. Permission Enforced Authorization Check
        const permissions = ["LOCKED", "READ_ONLY", "RESTRICTED", "FULL"];
        if (!allowed) {
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
                permissionValue: permissions.indexOf(permission),
                status: "BLOCKED",
                requiredPermission: requiredPermission,
                decision: "BLOCKED",
                attestation: null,
                reason: `${action} requires ${requiredPermission} authority. Current authority: ${permission}.`
            };
        }

        // Action is allowed by TRACE, so we can now execute it
        const log = this.executeSimulation(action);

        // 5. Attestation submission with TRACE_UNAVAILABLE fail-safe
        let attestationResult;
        try {
            attestationResult = await this.traceClient.attestAction(action);
        } catch (error) {
            console.error("TRACE Attest Error:", error);
            if (error.code === "WRONG_NETWORK" || error.message === "WRONG_NETWORK") {
                throw error;
            }
            return {
                success: false,
                status: "TRACE_UNAVAILABLE",
                decision: "BLOCKED",
                attestation: null,
                reason: "Attestation transaction failed or network is offline."
            };
        }

        return {
            success: true,
            agent: "Mira",
            request: request,
            action: action,
            permission: permission,
            permissionValue: permissions.indexOf(permission),
            status: "VERIFIED",
            message: "Action executed and attested on-chain",
            executionLog: log,
            transactionHash: attestationResult.transactionHash,
            decision: "ALLOWED",
            reason: `Action permitted under ${permission} authority.`,
            attestation: {
                verified: true,
                transactionHash: attestationResult.transactionHash
            }
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
