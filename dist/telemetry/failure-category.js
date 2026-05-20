// Precedence: configuration → timeout → tool → validation → none.
export function deriveFailureCategory(o) {
    if (o.configError)
        return "configuration";
    if (o.timedOut)
        return "timeout";
    if (o.spawnError)
        return "tool";
    if (o.exitCode !== 0)
        return "validation";
    return "none";
}
//# sourceMappingURL=failure-category.js.map