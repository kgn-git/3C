// Compose: resolve changed files → check → exceptions → bypass → findings
// append → content-free telemetry → block.
// Standalone gate CLI pattern (mirrors the security scan); AD-03 L1-form, no daemon.
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { userInfo } from "node:os";
import { resolveBrandSlugSync } from "../../branding/runtime.js";
import { discoverWorkspaceFiles } from "../../rules/discover.js";
import { loadTelemetryConfig } from "../../telemetry/config.js";
import { writeTelemetryEvent } from "../../telemetry/writer.js";
import { safeSummary } from "../../telemetry/sanitise.js";
import { anonymiseId } from "../../telemetry/anonymise.js";
import { appendExternalViolations } from "../findings/store.js";
import { archConfigPath, isGateInert, loadArchConfig } from "../../validate/arch-config.js";
import { exceptionKey, loadExceptions } from "../../validate/arch-exceptions.js";
import { checkFiles } from "./check.js";
const exec = promisify(execFile);
const SRC_RE = /\.(ts|tsx|js|jsx|mts|cts)$/;
const FILES_ROUTE = "name the files to check with `--files=a.ts,b.ts`";
/**
 * Classify a failed git invocation. Codes first — `ENOENT` and Node's
 * maxBuffer code are locale-proof; only "not a repository" needs git's own
 * words, and a localised git simply lands in the generic class, whose repair
 * still works.
 */
export function classifyGitFailure(err) {
    const e = (err ?? {});
    const text = `${typeof e.stderr === "string" ? e.stderr : ""}\n${typeof e.message === "string" ? e.message : ""}`;
    if (e.code === "ENOENT") {
        return { cause: "git was not found on PATH", repair: `Install git, or put it on PATH, then re-run; or ${FILES_ROUTE}.` };
    }
    if (typeof e.code === "string" && /MAXBUFFER/.test(e.code)) {
        // On a clean CI checkout nothing is staged — that is WHY the gate listed
        // the whole tree — so `--files` leads, and staging is the local option.
        return {
            cause: "the tracked-file list is larger than the 32 MiB the gate reads",
            repair: "Name the files to check with `--files=a.ts,b.ts` (the CI route), or stage only your change when running locally.",
        };
    }
    if (/not a git repository/i.test(text)) {
        return {
            cause: "this directory is not inside a git repository",
            repair: `Run the gate from inside your repository, or ${FILES_ROUTE}.`,
        };
    }
    return { cause: "git failed", repair: `Run \`git status\` here to see why, then re-run; or ${FILES_ROUTE}.` };
}
/**
 * The staged sources, or every tracked source when nothing is staged. A
 * listing that FAILED is not an empty listing: returning `[]` would make a
 * gate that read nothing exit 0, so a chain gated on its status would admit
 * every cross-boundary import. An empty list from a WORKING git is still a
 * real zero.
 */
async function listSourceFiles(ws) {
    let stagedError;
    try {
        const { stdout } = await exec("git", ["diff", "--cached", "--name-only"], { cwd: ws, maxBuffer: 32 * 1024 * 1024 });
        const staged = stdout.split(/\r?\n/).filter((l) => l !== "");
        if (staged.length > 0)
            return { ok: true, files: staged.filter((f) => SRC_RE.test(f)) };
    }
    catch (err) {
        // Fall through to tracked: `ls-files` may still answer.
        stagedError = err;
    }
    const disc = await discoverWorkspaceFiles(ws);
    if (disc.ok)
        return { ok: true, files: disc.files.filter((f) => SRC_RE.test(f)) };
    // Whichever failure says more. Outside a repository `git diff --cached`
    // answers with a usage text (it reads as `--no-index`) while `ls-files`
    // says "not a git repository", so the first failure is not always the best.
    const first = stagedError === undefined ? undefined : classifyGitFailure(stagedError);
    const listed = classifyGitFailure(disc.cause);
    return { ok: false, failure: first !== undefined && first.cause !== "git failed" ? first : listed };
}
/**
 * Content-free gate telemetry — counts and an exit code, never a file
 * path or import string. One writer so the config-error branch records
 * on the same channel as a violation block rather than passing silently.
 */
async function recordGateEvent(ws, exitCode, failureCategory) {
    const tcfg = await loadTelemetryConfig(ws);
    const evt = {
        schema_version: 1,
        hook_id: "architecture-boundary",
        trigger_event: "PreToolUse",
        summary: safeSummary("arch-check"),
        exit_code: exitCode,
        // Passed in, NOT derived from the exit code. Deriving it would make a
        // BYPASSED violation record "none", which src/telemetry/aggregate.ts
        // counts as a pass — so a week of emergency-bypassed boundary blocks
        // would aggregate as a 100% pass rate. A bypassed run is not a pass.
        failure_category: failureCategory,
        duration_ms: 0,
        network_used: false,
        self_correction_count: 0,
        actor_token: tcfg.anonymise ? anonymiseId(userInfo().username, ws) : null,
        timestamp: new Date().toISOString(),
    };
    await writeTelemetryEvent(ws, evt, tcfg);
}
export async function runArchBoundary(ws, opts) {
    const loaded = await loadArchConfig(ws);
    const now = opts.now ?? new Date();
    // Absent and inert stay advisory at exit 0 (the shipped starter
    // is inert BY DESIGN — blocking here would fail every fresh install). A
    // config that exists but cannot be used is a different answer entirely:
    // the gate can no longer tell whether this commit is clean, so it must not
    // say that it is.
    if (isGateInert(loaded)) {
        return {
            blocked: false,
            message: "",
            notConfigured: true,
            configState: loaded.kind === "absent" ? "absent" : "inert",
        };
    }
    if (loaded.kind === "malformed") {
        const slug = resolveBrandSlugSync();
        // AC3: the bypass is consulted BEFORE the block. Returning at the config
        // check without reaching it would make a broken config block harder than
        // a real violation — leaving an adopter mid-incident with no override at
        // all, the dead-end this issue exists to close.
        const released = opts.bypassToken != null;
        // "configuration", not "validation": the gate separated exit 1 (broken
        // config) from exit 2 (real violations), and flattening them in the one
        // channel that aggregates over time would leave telemetry unable to
        // answer whether a team's gate was broken or their imports were.
        // `.catch`: telemetry is advisory and must never erase a computed verdict
        // — a read-only `.3c/` turned a BLOCK into an unhandled rejection on the
        // security gate before it gained the same guard (src/security/index.ts).
        await recordGateEvent(ws, released ? 0 : 1, "configuration").catch(() => { });
        const head = `${slug} architecture boundary: ${archConfigPath(ws)} could not be used — ` +
            `${loaded.detail}.\n`;
        return released
            ? {
                blocked: false,
                configError: true,
                message: `${head}Allowed via emergency bypass (recorded) — the boundary gate ` +
                    `checked nothing on this commit.\n`,
            }
            : {
                blocked: true,
                configError: true,
                message: `${head}The gate cannot tell whether this commit is clean, so it is ` +
                    `blocked rather than passed. Fix that file, or emergency-bypass this ` +
                    `commit: \`bypass --reason="..."\`.\n`,
            };
    }
    const cfg = loaded.config;
    let files;
    if (opts.changedFiles) {
        files = opts.changedFiles;
    }
    else {
        const listed = await listSourceFiles(ws);
        if (!listed.ok) {
            // Same shape as the malformed-config branch, and for the same reason:
            // the bypass is consulted before the block, or an adopter whose CI
            // lost git mid-incident has no override at all. "tool", not
            // "configuration": the config is fine; the tooling around it is not.
            const released = opts.bypassToken != null;
            await recordGateEvent(ws, released ? 0 : 1, "tool").catch(() => { });
            const head = `${resolveBrandSlugSync()} architecture boundary: could not list the files to check — ` +
                `${listed.failure.cause}.\n`;
            return released
                ? {
                    blocked: false,
                    treeUnreadable: true,
                    message: `${head}Allowed via emergency bypass (recorded) — the boundary gate checked nothing on this commit.\n`,
                }
                : {
                    blocked: true,
                    treeUnreadable: true,
                    message: `${head}The gate cannot tell whether this commit is clean, so it is blocked rather than passed. ` +
                        `${listed.failure.repair} Or emergency-bypass this commit: \`bypass --reason="..."\`.\n`,
                };
        }
        files = listed.files;
    }
    const exceptions = await loadExceptions(ws);
    const { violations, evaluated, unmatched, unreadable, unmapped } = await checkFiles(ws, files, cfg, exceptions, now);
    if (violations.length === 0)
        return {
            blocked: false,
            message: "",
            filesChecked: evaluated,
            filesUnmatched: unmatched,
            filesUnreadable: unreadable,
            filesUnmapped: unmapped,
        };
    // Record into the SAME findings history as other gates, keyed by rule_id.
    await appendExternalViolations(ws, "layer-boundary", violations.map((v) => ({
        file: v.file,
        line: v.line,
        message: v.message,
    })));
    const bypassed = opts.bypassToken != null;
    await recordGateEvent(ws, bypassed ? 0 : 2, "validation").catch(() => { });
    const slug = resolveBrandSlugSync();
    const lines = violations
        .map((v) => `  - [${v.ruleId}] ${v.file}:${v.line} — ${v.message}`)
        .join("\n");
    if (bypassed) {
        // AC6: gate failure does not hard-block when an emergency bypass is used.
        return {
            blocked: false,
            message: `${slug} architecture boundary: ${violations.length} violation(s) — allowed via emergency bypass (recorded).\n${lines}\n`,
        };
    }
    // Render the key the adopter would actually file, not a
    // `<from>-><to>` placeholder they have to compose from prose. The violation
    // line above carries the layer names inside a sentence AND a
    // `(package rules: "…")` suffix — so the obvious paste would produce a
    // well-formed waiver `isExcepted` could never match, and nothing would say why.
    // exceptionKey reads the pair from the message before the suffix, so these
    // keys round-trip through `arch-check except` by construction.
    const keys = [...new Set(violations.map((v) => exceptionKey(v.message) ?? ""))]
        .filter((k) => k !== "")
        .sort();
    const exceptHint = keys.length === 0
        ? // No key could be read from any message — offer the shape rather than
            // a key that would not work. Reachable only if the message wording
            // and exceptionKey's pattern drift apart.
            `\`arch-check except "<from>-><to>" --reason="..." --expires=<date>\``
        : keys
            .slice(0, 5)
            .map((k) => `\`arch-check except "${k}" --reason="..." --expires=<date>\``)
            .join(", ") + (keys.length > 5 ? `, … (${keys.length} pairs in total)` : "");
    // AC2: block with the offending import, the rule, and remediation.
    return {
        blocked: true,
        message: `${slug} architecture boundary: ${violations.length} cross-boundary violation(s) — commit blocked:\n${lines}\n` +
            `Fix the dependency direction, or file a time-boxed exception: ` +
            `${exceptHint}, ` +
            `or emergency-bypass this commit: \`bypass --reason="..."\`. ` +
            `An exception key waives that layer pair across the whole workspace, ` +
            `including every \`packages:\` block that declares the same layer names.\n`,
    };
}
//# sourceMappingURL=index.js.map