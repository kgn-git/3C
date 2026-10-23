// node:http with no framework: the surface is small and read-only, and a
// dependency here would land in every adopter's install. Security posture:
//
//   * binds loopback only (NFR-SEC-01);
//   * serves one canonicalised asset directory (CWE-22);
//   * answers GET/HEAD only, so no request changes state (CWE-352);
//   * a bind error names the port, not the errno (A10).
import { createServer } from "node:http";
import { createReadStream, existsSync } from "node:fs";
import { realpath, stat } from "node:fs/promises";
import { pipeline } from "node:stream";
import { resolve, sep, extname, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { buildDashboardState } from "./state.js";
import { defaultSourceDeps, DeliveryRefresher } from "./delivery-source.js";
/** The only host this server ever binds. */
export const LOOPBACK = "127.0.0.1";
/**
 * Deliberately not 3000/5173/8000/8080 — a developer running the dashboard
 * should never collide with, or be mistaken for, an app dev server (A02).
 */
export const DEFAULT_PORT = 3080;
const CSP = [
    "default-src 'none'",
    "script-src 'self'",
    "style-src 'self'",
    "img-src 'self' data:",
    "font-src 'self'",
    "connect-src 'self'",
    "base-uri 'none'",
    "form-action 'none'",
    "frame-ancestors 'none'",
].join("; ");
const TYPES = {
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".svg": "image/svg+xml",
    ".woff2": "font/woff2",
    ".ico": "image/x-icon",
};
/**
 * Two candidates: this module runs from `dist/dashboard/` and, under tsx or
 * tests, `src/dashboard/`. Only the first would refuse every source-run start.
 */
export function defaultAssetDir() {
    const here = dirname(fileURLToPath(import.meta.url));
    const candidates = [
        resolve(here, "..", "ui"), // dist/dashboard -> dist/ui
        resolve(here, "..", "..", "dist", "ui"), // src/dashboard -> dist/ui
    ];
    return candidates.find((c) => existsSync(c)) ?? candidates[0];
}
function head(res, status, type, extra = {}) {
    // A header added after writeHead throws ERR_HTTP_HEADERS_SENT (a 200 with an
    // empty body); a setHeader before it is merged, which carries `connection: close`.
    res.writeHead(status, {
        "content-type": type,
        "content-security-policy": CSP,
        "x-content-type-options": "nosniff",
        "referrer-policy": "no-referrer",
        "cache-control": "no-store",
        ...extra,
    });
}
// Generic bodies only: the requested path is never echoed back, so no response
// can reflect attacker-supplied markup (CWE-79).
function fail(res, status) {
    head(res, status, "text/plain; charset=utf-8");
    res.end(status === 404 ? "Not found" : status === 405 ? "Method not allowed" : "Forbidden");
}
/**
 * Containment is checked after decode and resolve (CWE-22); a filter before
 * resolution is what `..%5c` and `....//` walk through.
 */
function containedPath(root, urlPath) {
    let decoded;
    try {
        decoded = decodeURIComponent(urlPath);
    }
    catch {
        return null; // malformed percent-encoding — fail closed
    }
    if (decoded.includes("\0"))
        return null;
    const candidate = resolve(root, `.${decoded.split("\\").join("/")}`);
    if (candidate !== root && !candidate.startsWith(root + sep))
        return null;
    return candidate;
}
async function serveFile(res, root, file, method) {
    let size;
    try {
        // containedPath() is lexical and stat/createReadStream follow symlinks, so
        // the target is re-canonicalised to block a symlink escape (CWE-22).
        const real = await realpath(file);
        if (real !== root && !real.startsWith(root + sep)) {
            fail(res, 403);
            return;
        }
        const s = await stat(real);
        if (!s.isFile()) {
            fail(res, 404);
            return;
        }
        size = s.size;
        file = real;
    }
    catch {
        fail(res, 404);
        return;
    }
    head(res, 200, TYPES[extname(file).toLowerCase()] ?? "application/octet-stream", { "content-length": size });
    if (method === "HEAD") {
        res.end();
        return;
    }
    // pipeline(), not pipe(): pipe() neither forwards an async source error
    // (which escapes the boundary catch and kills the CLI, A10) nor destroys the
    // source when the client aborts, even before a listener exists (fd leak,
    // CWE-772). The callback is empty because headers are sent; content-length
    // makes a truncation detectable.
    pipeline(createReadStream(file), res, () => { });
}
/**
 * The loopback bind does not stop DNS rebinding: a remote hostname pointed at
 * 127.0.0.1 makes `/api/state` same-origin to an open page, on a guessable port.
 */
function hostAllowed(host, port) {
    if (host === undefined)
        return false;
    // No `[::1]`: listen() binds LOOPBACK, an IPv4 literal.
    const allowed = [`127.0.0.1:${port}`, `localhost:${port}`];
    return allowed.includes(host.toLowerCase());
}
/**
 * The CWE-400 control for /api/state, whose every build rescans the project.
 * It bounds the work itself, since the `Sec-Fetch-Site` check trusts the sender.
 * One second stale is invisible; a rescan per request is not.
 */
const STATE_TTL_MS = 1000;
function boundedState(build, now = Date.now) {
    let inFlight = null;
    let cached = null;
    return () => {
        if (cached !== null && now() - cached.at < STATE_TTL_MS) {
            return Promise.resolve(cached.value);
        }
        if (inFlight !== null)
            return inFlight;
        // A rejected build is not cached, so a transient failure is retried (A10).
        inFlight = build()
            .then((value) => {
            cached = { at: now(), value };
            return value;
        })
            .finally(() => {
            inFlight = null;
        });
        return inFlight;
    };
}
/** The errno class only: message and stack stay server-side (A10). */
export function socketErrorMessage(code) {
    return `The dashboard server hit a socket error (${code ?? "unknown"}) and may have stopped accepting connections. Press Ctrl-C and restart.`;
}
function handler(root, opts, boundPort, refresh) {
    const deps = opts.delivery ?? defaultSourceDeps;
    const state = boundedState(opts.buildState ??
        (() => buildDashboardState({
            cwd: opts.cwd,
            now: deps.now(),
            ...(opts.since !== undefined ? { since: opts.since } : {}),
        })));
    return (req, res) => {
        void (async () => {
            const method = req.method ?? "GET";
            if (method !== "GET" && method !== "HEAD") {
                fail(res, 405);
                return;
            }
            if (!hostAllowed(req.headers.host, boundPort())) {
                // A rejected origin must not hold a bounded connection slot.
                res.setHeader("connection", "close");
                fail(res, 403);
                return;
            }
            // The Host check stops a rebound origin reading, not sending. Defence in
            // depth only; boundedState() is the CWE-400 control.
            if (req.headers["sec-fetch-site"] === "cross-site") {
                res.setHeader("connection", "close");
                fail(res, 403);
                return;
            }
            const path = (req.url ?? "/").split("?")[0] ?? "/";
            if (path === "/api/state") {
                // A build only to discard the body is work for no output (CWE-400).
                if (method === "HEAD") {
                    head(res, 200, TYPES[".json"]);
                    res.end();
                    return;
                }
                // Never awaited: a request serves the cache it finds, and a stale
                // cache only starts a refresh for a later request to see.
                refresh();
                // Built before writeHead so a rejection can still become a 500 (A10).
                const body = JSON.stringify(await state());
                head(res, 200, TYPES[".json"]);
                res.end(body);
                return;
            }
            const target = containedPath(root, path === "/" ? "/index.html" : path);
            if (target === null) {
                fail(res, 403);
                return;
            }
            await serveFile(res, root, target, method);
        })().catch(() => {
            // A10: the error detail stays server-side; the caller gets a bare 500.
            if (!res.headersSent)
                fail(res, 500);
            else
                res.end();
        });
    };
}
/** No fallback port on a bind failure: silently moving would make the printed URL a guess. */
export async function startDashboardServer(opts) {
    const requested = opts.port ?? DEFAULT_PORT;
    const dir = opts.assetDir ?? defaultAssetDir();
    // A live server that 404s every asset is worse than a refusal naming the fix (A10).
    let root;
    try {
        root = await realpath(dir);
    }
    catch {
        throw new Error("The dashboard bundle is missing. Run `npm run build` to generate it.");
    }
    let port = requested;
    const refresher = new DeliveryRefresher(opts.cwd, opts.delivery ?? defaultSourceDeps);
    const refresh = () => {
        refresher.ensureFresh().catch(() => opts.log?.("The handover issues could not be refreshed; showing the cached rows."));
    };
    const server = createServer(handler(root, opts, () => port, refresh));
    // CWE-400: an unbounded connection pool on a long-lived local process.
    server.maxConnections = 64;
    server.on("clientError", (_err, socket) => socket.destroy());
    await new Promise((res, rej) => {
        const onError = (err) => {
            server.close();
            rej(new Error(err.code === "EADDRINUSE"
                ? `Port ${requested} is already in use. Pass --port <n> to choose another.`
                : err.code === "EACCES"
                    ? `Port ${requested} is not available to this user. Pass --port <n> to choose another.`
                    : `The dashboard server could not start on port ${requested}.`));
        };
        server.once("error", onError);
        server.listen(requested, LOOPBACK, () => {
            server.removeListener("error", onError);
            // With no listener a post-listen accept failure kills the CLI (A10); an
            // empty one hides that the server stopped accepting. The log names the
            // errno class only: no path, no stack (A09).
            server.on("error", (err) => {
                opts.log?.(socketErrorMessage(err.code));
            });
            res();
        });
    });
    // The first fetch starts with the server, so the page a developer opens
    // first is the one most likely to have rows.
    refresh();
    // Read back from the socket so a listen() that lost its host is observable.
    const addr = server.address();
    if (typeof addr !== "object" || addr === null) {
        await new Promise((res) => server.close(() => res()));
        throw new Error("The dashboard server could not determine its bind address.");
    }
    port = addr.port;
    const host = addr.address;
    let closed = false;
    const close = async () => {
        if (closed)
            return;
        closed = true;
        // Idle keep-alive sockets would otherwise hold Ctrl-C for their timeout.
        server.closeAllConnections();
        await new Promise((res) => server.close(() => res()));
    };
    return { url: `http://${host}:${port}`, port, host, close };
}
//# sourceMappingURL=server.js.map