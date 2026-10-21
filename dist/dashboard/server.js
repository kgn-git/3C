// #346: the local dashboard app's server.
//
// Deliberately built on node:http with no framework — the surface is four
// routes, all read-only, and a dependency here would land in every adopter's
// install. Security posture, in one place:
//
//   * binds loopback only (AC2 / NFR-SEC-01) — never a routable interface;
//   * serves exactly one canonicalised asset directory (AC8 / CWE-22);
//   * answers GET/HEAD only, so no request can change state (CWE-352);
//   * sends a CSP that permits same-origin script/style and nothing else (AC4);
//   * fails closed on a bind error with a message that names the port, not the
//     errno (A10 — no implementation detail to the caller).
import { createServer } from "node:http";
import { createReadStream, existsSync } from "node:fs";
import { realpath, stat } from "node:fs/promises";
import { pipeline } from "node:stream";
import { resolve, sep, extname, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { buildDashboardState } from "./state.js";
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
 * Where `npm run build` puts the bundle, resolved relative to this module.
 *
 * Two candidates because this module runs from two layouts: `dist/dashboard/`
 * in an install (bundle at `dist/ui`), and `src/dashboard/` under the test
 * runner or tsx (bundle still at `dist/ui`, one level further up). Returning
 * only the first would make every source-run start fail closed on a bundle
 * that is in fact present.
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
    // Every header goes in this single writeHead call. Adding one AFTERWARDS
    // throws ERR_HTTP_HEADERS_SENT, which surfaces as a 200 with an empty body.
    // The one permitted exception is a setHeader before this call: Node merges
    // those into writeHead's map (writeHead winning on conflicts), which is what
    // carries `connection: close` on the refusal paths.
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
 * Resolves a URL path inside `root`, or null if it escapes.
 *
 * The containment check runs on the *canonicalised* path (CWE-22): decode
 * first, resolve, then compare prefixes. A substring or blacklist filter
 * applied before resolution is exactly the check that `..%5c` and `....//`
 * walk straight through.
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
        // Re-canonicalise the TARGET, not just the root. containedPath() is
        // lexical, and stat/createReadStream both follow symlinks — so a link
        // inside the asset directory pointing outside it would otherwise resolve
        // lexically inside root and be served (CWE-22 symlink escape).
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
    // pipeline(), not pipe(), for both halves of the problem:
    //
    //   * pipe() does not forward SOURCE errors, and the failure fires
    //     asynchronously — outside the request-boundary catch — so an EACCES or a
    //     file replaced after stat took the whole CLI down (A10);
    //   * pipe() never destroys the source when the DESTINATION goes away, so a
    //     client aborting mid-download leaked the fd until GC; a loop of aborted
    //     GETs walks a long-lived process toward EMFILE (CWE-772).
    //
    // A hand-rolled `res.on("close", …)` closes only the second one, and only
    // when the abort lands after the listener is attached — this function awaits
    // realpath and stat first, so an abort during those two syscalls fires
    // "close" before any listener exists and the fd leaks anyway. pipeline()
    // covers the already-destroyed-destination case too.
    //
    // Nothing is written on failure: writeHead has already fired, so a 500 is
    // impossible, and the content-length above makes the truncation detectable.
    pipeline(createReadStream(file), res, () => { });
}
/**
 * Rejects any request whose Host is not this loopback server.
 *
 * Binding to 127.0.0.1 stops routed traffic; it does not stop a page the
 * developer already has open. A remote origin can point its own hostname at
 * 127.0.0.1 (DNS rebinding), at which point `http://attacker.example:3080/api/state`
 * is same-origin and readable. The port is a fixed, guessable default, so the
 * bind alone is not the control it appears to be.
 */
function hostAllowed(host, port) {
    if (host === undefined)
        return false;
    // No `[::1]` entry: listen() is given LOOPBACK, an IPv4 literal, so nothing
    // ever arrives over ::1 and the entry could only ever be dead allow-list.
    // This server is IPv4-loopback only, and the list says so.
    const allowed = [`127.0.0.1:${port}`, `localhost:${port}`];
    return allowed.includes(host.toLowerCase());
}
/**
 * Bounds the cost of /api/state (CWE-400).
 *
 * Every hit rescans handovers, telemetry, boundary findings and onboarding. The cross-site
 * refusal below turns away the browser vector, but it is a deny-list on one
 * header value — anything that omits `Sec-Fetch-Site` still gets through, so it
 * cannot be the resource control. Bounding the WORK is the control that does
 * not depend on the sender being honest: concurrent hits share one in-flight
 * build, and a completed build is reused briefly. A dashboard reading one
 * second stale is invisible; a rescan per request is not.
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
        // A rejected build clears both, so a transient failure is retried rather
        // than cached as the answer (A10 — fail closed, do not memoise the failure).
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
/**
 * What the developer is told when the listening socket fails after start-up.
 *
 * The errno CLASS and nothing else: the thrown Error's message and stack stay
 * server-side (A10), and the line names the recovery rather than the cause.
 */
export function socketErrorMessage(code) {
    return `The dashboard server hit a socket error (${code ?? "unknown"}) and may have stopped accepting connections. Press Ctrl-C and restart.`;
}
function handler(root, opts, boundPort) {
    const state = boundedState(opts.buildState ??
        (() => buildDashboardState({
            cwd: opts.cwd,
            ...(opts.docsDir !== undefined ? { docsDir: opts.docsDir } : {}),
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
                // Close the socket rather than keeping it alive: a rejected origin
                // must not hold one of the bounded connection slots.
                res.setHeader("connection", "close");
                fail(res, 403);
                return;
            }
            // The Host allow-list stops a rebound origin READING the response; it
            // does not stop it SENDING the request. Refuse the ones the browser
            // itself labels cross-site, before any routing or state build.
            //
            // This is defence in depth, NOT the CWE-400 control — it is a deny-list
            // on one header value and any sender that omits the header walks past it.
            // boundedState() above is what actually bounds the work.
            if (req.headers["sec-fetch-site"] === "cross-site") {
                res.setHeader("connection", "close");
                fail(res, 403);
                return;
            }
            const path = (req.url ?? "/").split("?")[0] ?? "/";
            if (path === "/api/state") {
                // HEAD short-circuits before the build. Every /api/state hit rescans
                // handovers, telemetry, boundary findings and onboarding; doing all of that only
                // to discard the body is unbounded work for no output (CWE-400).
                if (method === "HEAD") {
                    head(res, 200, TYPES[".json"]);
                    res.end();
                    return;
                }
                // Build BEFORE writeHead: a rejected build must be able to become a
                // 500 at the boundary catch, not a 200 with a truncated body (A10).
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
/**
 * Starts the loopback dashboard server.
 *
 * Rejects — rather than falling back to another port — when the requested port
 * cannot be bound. Silently moving would make the printed URL a guess.
 */
export async function startDashboardServer(opts) {
    const requested = opts.port ?? DEFAULT_PORT;
    const dir = opts.assetDir ?? defaultAssetDir();
    // Fail closed when the bundle is absent. Binding anyway would print a
    // working URL that 404s every asset — a live server that cannot serve is a
    // worse answer than a refusal that names the fix (A10).
    let root;
    try {
        root = await realpath(dir);
    }
    catch {
        throw new Error("The dashboard bundle is missing. Run `npm run build` to generate it.");
    }
    let port = requested;
    const server = createServer(handler(root, opts, () => port));
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
            // Removing the only listener would leave the Server with none, so a
            // post-listen accept failure (EMFILE/ENFILE) would surface as an
            // uncaught exception and kill the CLI (A10). An EMPTY handler is not the
            // fix either — it trades the crash for silent degradation, where the
            // server stops accepting while the banner still advertises a URL. Name
            // the errno class and nothing else: no path, no stack (A09).
            server.on("error", (err) => {
                opts.log?.(socketErrorMessage(err.code));
            });
            res();
        });
    });
    // Read the bind back off the socket rather than echoing the constant: a
    // listen() call that lost its host argument would still satisfy any
    // assertion made against LOOPBACK itself.
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