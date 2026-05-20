// #23 VP-06-F02 — Coaching Mode. SYNCHRONOUS: builds a teaching segment that
// the #16 post-edit advisory appends (AD-03 L1-form per #69 — no daemon).
// Rationale via the #24 module (live read ⇒ AC4). Seen-count + disable are
// local YAML (NFR-PRIV-01). Advisory only — never blocks (NFR-REL-01).
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import * as yaml from "js-yaml";
import { resolveBrandSlugSync } from "../../branding/runtime.js";
import { loadRationaleByKey } from "../../skills/rationale/resolve.js";
const TERSE_AFTER = 2; // AC2: terser once a developer has seen a rule ≥ this
// AC3: per-developer disable. `enabled:false` (global) or `disabledUsers:[..]`.
export async function loadCoachingConfig(ws, user) {
    try {
        const raw = yaml.load(await readFile(join(ws, `.${resolveBrandSlugSync()}`, "coaching.yaml"), "utf8"));
        const o = (raw && typeof raw === "object" ? raw : {});
        if (o.enabled === false)
            return { enabled: false };
        if (Array.isArray(o.disabledUsers) &&
            o.disabledUsers.some((u) => u === user)) {
            return { enabled: false };
        }
        return { enabled: true };
    }
    catch {
        return { enabled: true }; // absent ⇒ coaching on by default
    }
}
function seenFile(ws, user) {
    return join(ws, `.${resolveBrandSlugSync()}`, "coaching", `${user}.yaml`);
}
async function loadSeen(ws, user) {
    try {
        const raw = yaml.load(await readFile(seenFile(ws, user), "utf8"));
        const o = (raw && typeof raw === "object" ? raw : {});
        const out = {};
        for (const [k, v] of Object.entries(o)) {
            if (typeof v === "number")
                out[k] = v;
        }
        return out;
    }
    catch {
        return {};
    }
}
export async function seenCount(ws, user, ruleId) {
    return (await loadSeen(ws, user))[ruleId] ?? 0;
}
export async function recordSeen(ws, user, ruleId) {
    const seen = await loadSeen(ws, user);
    seen[ruleId] = (seen[ruleId] ?? 0) + 1;
    const f = seenFile(ws, user);
    await mkdir(join(ws, `.${resolveBrandSlugSync()}`, "coaching"), {
        recursive: true,
    });
    await writeFile(f, yaml.dump(seen), "utf8");
}
// AC1/AC2/AC4/AC5: build the delimited teaching segment for the violations.
export async function buildCoaching(ws, user, violations) {
    if (violations.length === 0)
        return "";
    if (!(await loadCoachingConfig(ws, user)).enabled)
        return "";
    const seenIds = new Set();
    const blocks = [];
    for (const v of violations) {
        if (seenIds.has(v.ruleId))
            continue;
        seenIds.add(v.ruleId);
        const count = await seenCount(ws, user, v.ruleId);
        const r = await loadRationaleByKey(ws, v.ruleId); // live read ⇒ AC4
        const terse = count >= TERSE_AFTER;
        if (!r) {
            blocks.push(`• ${v.ruleId}: (no rationale recorded yet)`);
        }
        else if (terse) {
            // AC2: less detail once the rule has been coached repeatedly
            blocks.push(`• ${v.ruleId}: ${r.reasoning || "(see standards)"}`);
        }
        else {
            const parts = [`• ${v.ruleId}`];
            if (r.reasoning)
                parts.push(`  Why: ${r.reasoning}`);
            if (r.examples.length > 0)
                parts.push(`  Do: ${r.examples[0]}`);
            if (r.docLink)
                parts.push(`  Docs: ${r.docLink}`);
            blocks.push(parts.join("\n"));
        }
        await recordSeen(ws, user, v.ruleId);
    }
    const slug = resolveBrandSlugSync();
    // AC5: clearly delimited from the violation message itself.
    return (`\n——— ${slug} coaching ———\n` +
        blocks.join("\n") +
        `\n———————————————\n`);
}
//# sourceMappingURL=coaching.js.map