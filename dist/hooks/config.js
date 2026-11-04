// Loads and validates `.${FRAMEWORK_SLUG}/hooks.yaml` with js-yaml.
// AD-16: ${FRAMEWORK_SLUG} is resolved at runtime via resolveBrandSlugSync().
// Schema (L1):
//   schema_version: 1                      (required, integer 1)
//   hooks:                                 (required, array; may be empty)
//     - id: <string>                       (required)
//       event: PreToolUse | PostToolUse    (required)
//       matcher: <string>                  (required, regex on tool name)
//       command: <string>                  (required, shell command)
//       timeout: <int ms>                  (optional, default 10000)
//       blocking: <bool>                   (optional, default true)
//       network: <bool>                    (optional, default false; AC9)
//
// A command that holds a literal credential, or a retired `${OS_KEYCHAIN:NAME}`
// reference, is refused per hook by the orchestrator (src/hooks/refusal.ts) —
// NOT here: a config error bypasses the whole hook chain (fail-open), so one
// bad line would disable every blocking hook. Only a structural fault is an error.
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import * as yaml from "js-yaml";
import { resolveBrandSlugSync } from "../branding/runtime.js";
const VALID_EVENTS = new Set(["PreToolUse", "PostToolUse"]);
const DEFAULT_TIMEOUT_MS = 10000;
export async function loadHooksConfig(workspaceDir) {
    const slug = resolveBrandSlugSync();
    const filePath = join(workspaceDir, `.${slug}`, "hooks.yaml");
    let source;
    try {
        source = await readFile(filePath, "utf8");
    }
    catch (err) {
        if (err.code === "ENOENT") {
            return { ok: true, config: { schemaVersion: 1, hooks: [] } };
        }
        return {
            ok: false,
            errors: [{ path: filePath, message: err.message }],
        };
    }
    let parsed;
    try {
        parsed = yaml.load(source);
    }
    catch (err) {
        return {
            ok: false,
            errors: [
                {
                    path: filePath,
                    message: `YAML parse error: ${yamlFault(err)}`,
                },
            ],
        };
    }
    return validate(parsed, filePath);
}
function validate(parsed, filePath) {
    const errors = [];
    if (!isPlainObject(parsed)) {
        return {
            ok: false,
            errors: [
                { path: filePath, message: "hooks.yaml must be a YAML mapping" },
            ],
        };
    }
    if (parsed.schema_version !== 1) {
        errors.push({
            path: filePath,
            message: parsed.schema_version === undefined
                ? 'missing required field "schema_version"'
                : "unsupported schema_version (expected integer 1)",
        });
    }
    const rawHooks = parsed.hooks;
    if (rawHooks === undefined) {
        errors.push({ path: filePath, message: 'missing required field "hooks"' });
        return { ok: false, errors };
    }
    if (!Array.isArray(rawHooks)) {
        errors.push({
            path: filePath,
            message: '"hooks" must be an array',
        });
        return { ok: false, errors };
    }
    const hooks = [];
    for (let i = 0; i < rawHooks.length; i++) {
        const raw = rawHooks[i];
        const indexLabel = `hooks[${i}]`;
        if (!isPlainObject(raw)) {
            errors.push({
                path: filePath,
                message: `${indexLabel} must be a mapping`,
            });
            continue;
        }
        const hookErrors = [];
        const requireString = (field) => {
            const v = raw[field];
            if (typeof v !== "string" || v === "") {
                hookErrors.push({
                    path: filePath,
                    message: `${indexLabel}: missing or empty required field "${field}"`,
                });
                return undefined;
            }
            return v;
        };
        const id = requireString("id");
        const eventRaw = raw.event;
        let event;
        if (typeof eventRaw === "string" && VALID_EVENTS.has(eventRaw)) {
            event = eventRaw;
        }
        else {
            hookErrors.push({
                path: filePath,
                message: `${indexLabel}: "event" must be one of "PreToolUse", "PostToolUse"`,
            });
        }
        const matcher = requireString("matcher");
        const command = requireString("command");
        const timeoutRaw = raw.timeout;
        let timeout = DEFAULT_TIMEOUT_MS;
        if (timeoutRaw !== undefined) {
            if (typeof timeoutRaw !== "number" ||
                !Number.isFinite(timeoutRaw) ||
                timeoutRaw <= 0) {
                hookErrors.push({
                    path: filePath,
                    message: `${indexLabel}: "timeout" must be a positive number (ms)`,
                });
            }
            else {
                timeout = timeoutRaw;
            }
        }
        const blockingRaw = raw.blocking;
        let blocking = true;
        if (blockingRaw !== undefined) {
            if (typeof blockingRaw !== "boolean") {
                hookErrors.push({
                    path: filePath,
                    message: `${indexLabel}: "blocking" must be a boolean`,
                });
            }
            else {
                blocking = blockingRaw;
            }
        }
        const networkRaw = raw.network;
        let network = false;
        if (networkRaw !== undefined) {
            if (typeof networkRaw !== "boolean") {
                hookErrors.push({
                    path: filePath,
                    message: `${indexLabel}: "network" must be a boolean`,
                });
            }
            else {
                network = networkRaw;
            }
        }
        if (hookErrors.length > 0) {
            errors.push(...hookErrors);
            continue;
        }
        hooks.push({
            id: id,
            event: event,
            matcher: matcher,
            command: command,
            timeout,
            blocking,
            network,
        });
    }
    if (errors.length > 0)
        return { ok: false, errors };
    return { ok: true, config: { schemaVersion: 1, hooks } };
}
// js-yaml puts the source line around a fault into its message, and that line can hold a credential, so only the
// reason and the position are printed.
function yamlFault(err) {
    const { reason, mark } = err;
    const why = typeof reason === "string" ? reason : "the file is not valid YAML";
    return typeof mark?.line === "number" && typeof mark.column === "number" ? `${why} (line ${mark.line + 1}, column ${mark.column + 1})` : why;
}
function isPlainObject(v) {
    return typeof v === "object" && v !== null && !Array.isArray(v);
}
//# sourceMappingURL=config.js.map