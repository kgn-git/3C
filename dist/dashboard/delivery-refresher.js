// The served dashboard's refresh policy: at most one fetch in flight, started off the request path.
import { needsRefresh, readDelivery, refreshDelivery } from "../handovers/delivery-source.js";
// A failed fetch is retried no sooner than this, so a rate limit is not answered with a request per page view.
export const RETRY_MS = 60_000;
export class DeliveryRefresher {
    ws;
    deps;
    inflight = null;
    // Kept in memory, not only in the cache: a refresh that could not write
    // its failure down must back off too.
    lastFailedAt = null;
    constructor(ws, deps) {
        this.ws = ws;
        this.deps = deps;
    }
    ensureFresh() {
        this.inflight ??= (async () => {
            try {
                const now = this.deps.now().getTime();
                const s = await readDelivery(this.ws, this.deps.now());
                const failedAt = s.status.kind === "failed" && s.status.at !== null ? Date.parse(s.status.at) : null;
                const last = Math.max(failedAt ?? -Infinity, this.lastFailedAt ?? -Infinity);
                if (!needsRefresh(s) || (now >= last && now - last < RETRY_MS))
                    return;
                try {
                    await refreshDelivery(this.ws, this.deps);
                }
                catch (e) {
                    this.lastFailedAt = now;
                    throw e;
                }
            }
            finally {
                this.inflight = null;
            }
        })();
        return this.inflight;
    }
}
//# sourceMappingURL=delivery-refresher.js.map