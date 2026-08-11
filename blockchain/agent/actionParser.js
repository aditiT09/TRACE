/**
 * Action Parser
 * Converts natural-language requests into deterministic TRACE actions.
 */
export function parseAction(request) {
    if (!request || typeof request !== "string") {
        return "UNKNOWN_ACTION";
    }
    
    const clean = request.toLowerCase().trim();

    // Matching logic based on key phrases/words
    if (clean.includes("message") || clean.includes("reminder")) {
        return "SEND_MESSAGE";
    }
    
    if (clean.includes("meeting") || clean.includes("book")) {
        return "SCHEDULE_MEETING";
    }
    
    if (clean.includes("invoice") && (clean.includes("approve") || clean.includes("approval"))) {
        return "APPROVE_INVOICE";
    }

    return "UNKNOWN_ACTION";
}
