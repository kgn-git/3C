// AC6 / NFR-SEC-01: the telemetry summary is the tool name ONLY.
// It must never echo tool_input, command text, file contents, or prompt text.
export function safeSummary(toolName) {
    return typeof toolName === "string" && toolName.trim() !== ""
        ? toolName.trim()
        : "unknown";
}
//# sourceMappingURL=sanitise.js.map