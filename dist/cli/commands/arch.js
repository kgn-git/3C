import { resolveBrandSlugSync } from "../../branding/runtime.js";
import { consumeBypassToken } from "../../hooks/bypass.js";
import { runArchDiscover } from "../../skills/arch-boundary/discover.js";
import { runArchBoundary } from "../../skills/arch-boundary/index.js";
import { writeStarterArchConfig } from "../../skills/arch-boundary/scaffold.js";
import { archConfigPath, clampLabel, isGateInert, loadArchConfig } from "../../validate/arch-config.js";
import { addException } from "../../validate/arch-exceptions-write.js";
import { flagValue } from "../argv.js";
import { GIT_INIT_REMEDIATION } from "../shared.js";
/**
 * A zero names its cause and a route. "Nothing was checked" alone leaves an
 * adopter whose layer globs match nothing (`src/domian/**`) unable to tell
 * that apart from files that could not be read.
 */
function zeroEvaluatedMessage(unmatched, unreadable, unmapped) {
    const slug = resolveBrandSlugSync();
    const causes = [
        ...(unmatched > 0 ? [`${unmatched} file(s) matched no layer glob`] : []),
        ...(unmapped > 0 ? [`${unmapped} file(s) fall outside every \`packages:\` block`] : []),
        ...(unreadable > 0 ? [`${unreadable} file(s) in a layer could not be read`] : []),
    ];
    // The route names the FILE: `doctor` reports a valid config as just
    // "configured", which says nothing about globs that match nothing.
    return (`architecture boundary: no file was evaluated — nothing here was checked against your layer map` +
        (causes.length > 0 ? ` (${causes.join("; ")})` : "") +
        `. Check the layer globs in .${slug}/architecture.yaml, or name files with \`--files=a.ts,b.ts\`.`);
}
// Architecture boundary gate (mirrors `security scan`).
export async function archCommand(argv, env = { cwd: process.cwd() }) {
    const log = env.log ?? ((m) => console.log(m));
    const sub = argv[0];
    if (sub === "check") {
        const filesArg = flagValue(argv, "--files");
        const changedFiles = filesArg
            ? filesArg.split(",").filter((f) => f !== "")
            : undefined;
        const bypassToken = await consumeBypassToken(env.cwd);
        const r = await runArchBoundary(env.cwd, {
            ...(changedFiles ? { changedFiles } : {}),
            bypassToken,
        });
        // A config that cannot be used is its own outcome. Exit 1 (a config
        // error), never 2 (which means cross-boundary violations) and never 0 —
        // the gate must not report a pass it cannot vouch for.
        // So is a tree the gate could not list — the same "could not evaluate"
        // class. Falling through would exit 2, which says the imports
        // are wrong when the gate never read them.
        if (r.configError || r.treeUnreadable) {
            log(r.message);
            return r.blocked ? 1 : 0;
        }
        if (r.notConfigured) {
            const slug = resolveBrandSlugSync();
            // The two inert states get different sentences: telling an adopter who
            // wrote an architecture.yaml that they have none sends them to `init`,
            // which answers "already exists — left unchanged".
            log(r.configState === "inert"
                ? `architecture boundary gate is present but enforces nothing — ` +
                    `.${slug}/architecture.yaml declares no \`deny\` pair the gate can act on. ` +
                    `Define the pairs you want blocked there (the file carries a worked ` +
                    `example), or run \`${slug} arch-check discover\` to draft them from the ` +
                    `import graph (advisory; not blocking).`
                : `architecture boundary gate not configured — no .${slug}/architecture.yaml. ` +
                    `Run \`${slug} arch-check init\` to scaffold a starter, or ` +
                    `\`${slug} arch-check discover\` to draft one from the import graph ` +
                    `(advisory; not blocking).`);
            return 0;
        }
        if (r.message !== "")
            log(r.message);
        else if (!r.blocked) {
            // As on the security gate, a silent clean pass is
            // indistinguishable from a gate that read nothing. Zero files evaluated
            // is deliberately a different sentence from a real pass — and a MISSING
            // count is a third sentence again, because `?? 0` would render a gate
            // that forgot to report as a gate that read nothing.
            log(r.filesChecked === undefined
                ? "architecture boundary: no cross-boundary violation (the gate reported no file count)."
                : r.filesChecked === 0
                    ? zeroEvaluatedMessage(r.filesUnmatched ?? 0, r.filesUnreadable ?? 0, r.filesUnmapped ?? 0)
                    : `architecture boundary: no cross-boundary violation (${r.filesChecked} file(s) checked).`);
        }
        return r.blocked ? 2 : 0;
    }
    if (sub === "discover") {
        const slug = resolveBrandSlugSync();
        try {
            const r = await runArchDiscover(env.cwd);
            // A redirect caused by a BROKEN active config is not the
            // populated-and-healthy redirect: reusing that copy would tell an
            // adopter to "keep your active config" about a file currently failing
            // the gate closed. This line comes first because the state of their gate matters
            // more than the tier count of a draft they have not read yet.
            if (r.reason === "malformed") {
                log(`Your active .${slug}/architecture.yaml could NOT be parsed or validated, so ` +
                    `the boundary gate is failing closed right now. Nothing was overwritten — ` +
                    `the draft went to ${r.path} instead. Fix the active file by hand, or ` +
                    `replace it with that draft once you have read it. ` +
                    `Run \`${slug} doctor\` to see the parse error.`);
                return 0;
            }
            // ENFORCEABILITY is judged before the destination —
            // an empty or single-tier draft must never read as a success or as an
            // adoptable proposal (the gate enforces no direction until at least two
            // tiers exist), whichever path it was written to.
            log(r.tiers === 0
                ? r.proposed
                    ? `Proposal drafted at ${r.path}, but it declares nothing — no tracked ` +
                        `non-test JS/TS source in sub-directories was found to cluster. Do ` +
                        `not adopt it; your active architecture.yaml is untouched. Delete ` +
                        `the proposal, or run discover again once source is committed.`
                    : `Drafted ${r.path}, but found no tracked non-test JS/TS source in ` +
                        `sub-directories to cluster — the gate is still inert. Define ` +
                        `layers/deny in that file (it includes a worked example), or run ` +
                        `discover again once JS/TS source under sub-directories is committed.`
                : r.tiers === 1
                    ? r.proposed
                        ? `Proposal drafted at ${r.path}, but it declares a single tier and ` +
                            `no deny pairs — adopting it would replace your active rules with ` +
                            `a gate that blocks nothing. Keep your active config; run discover ` +
                            `again once imports span more directories.`
                        : // A single layer cannot deny anything — the gate compares two
                            // DIFFERENT layers — so "add deny pairs" alone would be advice
                            // that cannot work. Name the split.
                            `Drafted ${r.path} — one tier discovered, so there is no import ` +
                                `direction to enforce yet and the gate still blocks nothing. ` +
                                `Split that layer into the layers your team actually has and add ` +
                                `the deny pairs between them (the file carries a worked ` +
                                `example), or run discover again once imports span more ` +
                                `directories.`
                    : r.proposed
                        ? `Active architecture.yaml left untouched — proposal drafted at ${r.path}. ` +
                            `Review it, then replace the active config if you adopt it.`
                        : `Drafted ${r.path} from the import graph (${r.tiers} tier(s)). ` +
                            `Review and rename the tiers, then run \`${slug} arch-check check\`.`);
            return 0;
        }
        catch (e) {
            // NFR-USE-03: remediation first, raw detail demoted below it — mirrors
            // `rules apply` on the same precondition. The git sentence is HEDGED
            // ("if this is not a git repository yet") because the wrapper prefix
            // covers every git failure mode, including a missing git binary and
            // container dubious-ownership refusals. CWE-117: strip
            // control characters so a crafted path cannot forge advisory lines.
            const msg = e.message
                .replace(/[\u0000-\u001f\u007f]+/g, " ")
                // Bounded per the clampLabel convention — an unbounded Detail
                // line would echo git stderr up to the 32MB exec buffer (CWE-400).
                .slice(0, 2000);
            log(`✗ arch-check discover failed — the workspace could not be read.`);
            if (/git ls-files failed/.test(msg)) {
                log(`  If this is not a git repository yet: ${GIT_INIT_REMEDIATION}`);
            }
            log(`  Detail: ${msg}`);
            return 1;
        }
    }
    if (sub === "init") {
        const slug = resolveBrandSlugSync();
        const r = await writeStarterArchConfig(env.cwd, slug);
        // The reason lives ONCE, on the Next line — restating "define
        // layers/deny to activate" on the scaffold line would say the same thing
        // in different words one line apart.
        log(r.created
            ? `Scaffolded ${r.path} — an inert starter.`
            : `${r.path} already exists — left unchanged.`);
        // Name the next step while (and only while) the config is inert.
        // This file has TWO consumers — the commit-time gate and the every-edit
        // post-edit hook — and the copy names both. Naming only the gate would
        // leave an adopter who has just started seeing the hook fire to infer,
        // unaided, that it reads the same file.
        // Printed unconditionally (no TTY gate): the non-interactive
        // CI/container journey needs it too.
        // The route differs by state. Over a MALFORMED config `discover` does
        // not rewrite the file, so advertising it as the next step would promise
        // a repair it does not perform.
        const loaded = await loadArchConfig(env.cwd);
        if (loaded.kind === "inert" && loaded.declared) {
            // Not `isGateInert`: that asks the GATE's question ("enforces
            // nothing") where the answer needed is about what the adopter has
            // already written. Over a config whose layers are named but whose deny
            // list is empty — the state `discover` itself produces on a single-tier
            // repo — "until layers exist" would be wrong, because layers DO exist.
            // For this state discover writes a proposal instead of replacing the
            // file, so the copy announces the different destination. This agrees
            // with how doctor answers the same state.
            log(`Next: add the \`deny\` pairs you want blocked to ` +
                `${archConfigPath(env.cwd)} — the layers are declared but nothing is ` +
                `denied, so the commit gate and the post-edit hook both evaluate them ` +
                `and flag nothing. Note that ` +
                `\`${slug} arch-check discover\` will now draft to ` +
                `architecture.proposed.yaml rather than replace this file.`);
        }
        else if (isGateInert(loaded)) {
            log(`Next: run \`${slug} arch-check discover\` to draft layers/deny from ` +
                `the repo's tracked import graph — until layers exist neither the ` +
                `commit gate nor the post-edit hook has anything to check.`);
        }
        else if (loaded.kind === "malformed") {
            log(`Warning: the existing .${slug}/architecture.yaml does not parse or ` +
                `validate (${loaded.detail}), so the boundary gate fails closed. ` +
                `Open that file and fix it — \`${slug} arch-check discover\` will not ` +
                `rewrite it.`);
        }
        return 0;
    }
    if (sub === "except") {
        const key = argv[1];
        const reason = flagValue(argv, "--reason");
        const expires = flagValue(argv, "--expires");
        if (!key || !reason || !expires) {
            log('Usage: arch-check except "<from>-><to>" --reason="<why>" --expires=<date>');
            return 1;
        }
        try {
            await addException(env.cwd, key, reason, expires);
            // CWE-117: the key is adopter-supplied, so unclamped a newline in it
            // would print a standalone forged advisory line that reads as gate
            // output.
            log(`Exception recorded for ${clampLabel(key)} — expires ${clampLabel(expires)}`);
            return 0;
        }
        catch (e) {
            log(`Could not record exception: ${e.message}`);
            return 1;
        }
    }
    log("Usage: arch-check <check|except|init|discover>");
    return 1;
}
//# sourceMappingURL=arch.js.map