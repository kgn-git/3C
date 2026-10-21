// #448 (A10): the application boundary for errors nothing else handled.
//
// An exception escaping a command used to reach Node's default printer: a raw
// stack trace with the adopter's absolute install paths and our module layout,
// pasted into whatever bug report or chat followed. Here it becomes ONE line
// with a reference id, and the full detail goes to a local file under that id
// — never a network sink (NFR-SEC-01).
//
// Everything on this path is SYNCHRONOUS. It runs from `uncaughtException`
// and right before `process.exit`, where an awaited write can be cut off; and
// the one line goes to fd 2 with writeSync because `hook run` owns stdout for
// Claude Code's JSON envelope (#384).
//
// And it is TOTAL: `reportFatal` cannot throw. A throw from inside the
// `uncaughtException` listener goes straight to Node's printer and exits 7 —
// the leak this module closes, plus an exit a PreToolUse hook reads as allow.
import { randomBytes } from "node:crypto";
import { lstatSync, mkdirSync, writeFileSync, writeSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { resolveBrandSlugSync } from "../branding/runtime.js";
import { scanSecrets } from "../validate/secrets.js";
/**
 * The event `hook run` handles: the LAST `--event=` wins, PreToolUse by
 * default. One parser for the command and for the crash classifier — two
 * parsers for one flag disagree silently (#399).
 */
export function hookRunEvent(rest) {
    let event = "PreToolUse";
    for (const arg of rest)
        if (arg.startsWith("--event="))
            event = arg.slice("--event=".length);
    return event;
}
/**
 * The exit code for a crash in `argv`'s command. A PreToolUse hook exits 2:
 * Claude Code reads any other non-zero exit as "proceed" (#416), so a crash in
 * the path-guard or the commit gate would wave the call through. Anything not
 * the advisory PostToolUse hook counts as PreToolUse.
 */
export function fatalExitCode(argv) {
    if (argv[0] !== "hook")
        return 1;
    if (argv[1] === "path-guard")
        return 2;
    if (argv[1] === "run")
        return hookRunEvent(argv.slice(2)) === "PostToolUse" ? 1 : 2;
    return 1;
}
function slugOrDefault() {
    try {
        return resolveBrandSlugSync();
    }
    catch {
        return "3c";
    }
}
/** A CSPRNG ref, or null — the ref is the unguessable part of a temp-dir file name, so no weak fallback. */
function newRef() {
    try {
        return randomBytes(8).toString("hex");
    }
    catch {
        return null;
    }
}
/**
 * The nearest ancestor (or self) holding a real `.<slug>` DIRECTORY — not a
 * file, not a symlink, and on POSIX owned by this user — so a crash in a
 * subdirectory still logs to its workspace, and a planted or redirected
 * `.3c` higher up does not receive the stack. Accepted cost: a workspace
 * owned by another uid (some container bind mounts) logs to the temp
 * directory instead; the printed line says where.
 */
function workspaceRoot(slug) {
    let dir = process.cwd();
    const uid = typeof process.getuid === "function" ? process.getuid() : undefined;
    for (;;) {
        try {
            const st = lstatSync(join(dir, `.${slug}`));
            if (st.isDirectory() && !st.isSymbolicLink() && (uid === undefined || st.uid === uid))
                return dir;
        }
        catch {
            /* absent here — keep walking */
        }
        const up = dirname(dir);
        if (up === dir)
            return null;
        dir = up;
    }
}
/**
 * Two bounds: what is SCANNED (a crash must not be slowed by the size of what
 * crashed) and what is KEPT. Redaction runs between them, so a credential
 * straddling the kept cut is redacted whole, never logged as a prefix.
 */
const MAX_SCANNED_CHARS = 1024 * 1024;
const MAX_DETAIL_CHARS = 64 * 1024;
function describe(err) {
    try {
        const text = err instanceof Error ? (err.stack ?? `${err.name}: ${err.message}`) : String(err);
        return text.slice(0, MAX_SCANNED_CHARS);
    }
    catch {
        return "(the thrown value could not be described)";
    }
}
const keep = (text) => text.length > MAX_DETAIL_CHARS ? `${text.slice(0, MAX_DETAIL_CHARS)}\n… (truncated)\n` : text;
/**
 * Best-effort redaction (A09): `scanSecrets` knows the credential SHAPES it
 * knows — AWS, GitHub, JWT, Stripe, PEM headers, connection strings — and no
 * others. The log is local and private, but it is not a vault.
 */
function redact(text) {
    let out = text;
    for (const h of scanSecrets(text).hits)
        out = out.split(h.match).join(h.redacted);
    return out;
}
/**
 * The command words: the LEADING run of subcommand-shaped words, stopping at
 * the first flag — so `bug --summary hunter2` logs `bug`, never the value a
 * flag consumed, and a free-text positional never reaches the log.
 */
const VERB = /^[a-z][a-z0-9-]{0,31}$/;
function commandWords(argv) {
    const words = [];
    for (const a of argv) {
        if (words.length === 2 || !VERB.test(a))
            break;
        words.push(a);
    }
    return words;
}
function body(ref, err, argv, slug) {
    try {
        const words = commandWords(argv);
        return keep(redact([
            `ref: ${ref}`,
            `time: ${new Date().toISOString()}`,
            `command: ${[slug, ...words].join(" ")}`,
            `node: ${process.version} (${process.platform})`,
            "",
            describe(err),
            "",
        ].join("\n")));
    }
    catch {
        return `ref: ${ref}\n(detail unavailable)\n`;
    }
}
/** One exclusive create; on a name clash, one retry under a fresh ref. */
function writeExclusive(dir, name, ref, text) {
    for (const r of [ref, newRef()]) {
        if (r === null)
            return null;
        try {
            writeFileSync(join(dir, name(r)), text(r), { encoding: "utf8", flag: "wx", mode: 0o600 });
            return r;
        }
        catch (e) {
            if (e?.code !== "EEXIST")
                return null;
        }
    }
    return null;
}
/**
 * Write the detail log; return the ref it was written under and the
 * user-facing pointer to it — relative to the workspace root, or a name in the
 * temp directory, never absolute. Never throws.
 */
function writeDetail(err, argv, slug) {
    const ref = newRef();
    if (ref === null)
        return { ref: null, where: null };
    const text = (r) => body(r, err, argv, slug);
    try {
        const root = workspaceRoot(slug);
        if (root !== null) {
            // Inside a workspace only: a crash in a random directory must not leave
            // a `.3c` behind in it.
            const dir = join(root, `.${slug}`, "state", "errors");
            try {
                mkdirSync(dir, { recursive: true, mode: 0o700 });
                // The directory ignores itself: `.3c/state/` is not gitignored by
                // default, and a `git add -A` after a crash would commit a stack —
                // absolute paths and all.
                try {
                    writeFileSync(join(dir, ".gitignore"), "*\n", { encoding: "utf8", flag: "wx" });
                }
                catch {
                    /* already there */
                }
                const r = writeExclusive(dir, (x) => `${x}.log`, ref, text);
                if (r !== null)
                    return { ref: r, where: `Details: .${slug}/state/errors/${r}.log under your workspace root` };
            }
            catch {
                /* fall through to the temp directory rather than lose the detail */
            }
        }
        // POSIX: `wx` refuses an existing name or a planted symlink, and the name
        // is unguessable. Windows: %TEMP% is per-user by ACL; the mode is ignored.
        const r = writeExclusive(tmpdir(), (x) => `${slug}-error-${x}.log`, ref, text);
        if (r !== null) {
            return { ref: r, where: `Details: ${slug}-error-${r}.log in your temp directory ($TMPDIR, or %TEMP% on Windows)` };
        }
    }
    catch {
        /* fall through */
    }
    return { ref, where: null };
}
/**
 * Report an error nothing else handled and return the exit code. Prints one
 * line — the ref, where the detail is, the route — and nothing from the error
 * itself: its message can carry an absolute path, and its stack always does.
 */
export function reportFatal(err, argv) {
    // Decided first, from strings alone, so nothing below can change it.
    const code = fatalExitCode(argv);
    try {
        const slug = slugOrDefault();
        const { ref, where } = writeDetail(err, argv, slug);
        const detail = where ?? "The detail log could not be written";
        const tag = ref === null ? "" : ` (ref ${ref})`;
        // `bug` does not prompt: it lists what is missing. The route says so.
        const line = code === 2
            ? `${slug} hook ${argv[1]}: unexpected error${tag}; denied. ${detail}. ` +
                `If it repeats, tell the user — they can report it with \`${slug} bug\` from a terminal, with the ref in --summary.\n`
            : `${slug}: an unexpected error occurred${tag}. ${detail}. ` +
                `If it repeats, report it with \`${slug} bug\`: put the ref in --summary and supply any field it lists as missing.\n`;
        writeSync(2, line);
    }
    catch {
        try {
            writeSync(2, "3c: an unexpected error occurred.\n");
        }
        catch {
            /* nowhere left to say it; the exit code still does */
        }
    }
    return code;
}
let installed = false;
/** Route a stray throw or an unhandled rejection through `reportFatal`, then exit. */
export function installFatalHandlers(argv) {
    if (installed)
        return;
    installed = true;
    const fatal = (err) => process.exit(reportFatal(err, argv));
    // Overlapping on purpose, measured by mutation: under Node's default
    // `--unhandled-rejections=throw` either listener alone catches both kinds,
    // and the `try` around `main` is covered by them too. Each layer is kept so
    // a changed runtime flag or a refactor of the entry point cannot reopen the
    // path; the tests remove them together to prove the boundary as a whole.
    process.on("uncaughtException", fatal);
    process.on("unhandledRejection", fatal);
}
//# sourceMappingURL=fatal.js.map