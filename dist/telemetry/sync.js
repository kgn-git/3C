// AC3 scaffold: no backend. A real transport is an L3 concern.
export const notConfiguredTransport = {
    async send() {
        return { ok: false, reason: "not-configured" };
    },
};
export async function maybeFlush(sync, batch, transport = notConfiguredTransport) {
    if (!sync.enabled)
        return null; // opt-in gate
    if (batch.length < sync.flushThreshold)
        return null; // threshold
    return transport.send(batch);
}
//# sourceMappingURL=sync.js.map