// #10 AC1/AC3: scan tracked source files against the shipped checkable
// validators (#16). Rules are NL directives; these are the machine-checkable
// subset already in the codebase — no new rule-execution engine (CS-04).
import { readFile } from "node:fs/promises";
import { join, posix } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import * as yaml from "js-yaml";
import { resolveBrandSlugSync } from "../../branding/runtime.js";
import { discoverWorkspaceFiles } from "../../rules/discover.js";
import { checkImportOrder } from "../../validate/post-edit/imports.js";
import { checkNaming } from "../../validate/post-edit/naming.js";
import { checkLayerImport } from "../../validate/post-edit/layers.js";
const exec = promisify(execFile);
const SRC_RE = /\.(ts|tsx|js|jsx|mts|cts)$/;
async function loadLayerMap(ws) {
    try {
        const raw = yaml.load(await readFile(join(ws, `.${resolveBrandSlugSync()}`, "architecture.yaml"), "utf8"));
        if (!raw || typeof raw.layers !== "object" || raw.layers === null) {
            return null;
        }
        const deny = Array.isArray(raw.deny)
            ? raw.deny.filter((d) => Array.isArray(d) &&
                d.length === 2 &&
                d.every((x) => typeof x === "string"))
            : [];
        return { layers: raw.layers, deny };
    }
    catch {
        return null;
    }
}
async function changedSince(ws, sinceCommit) {
    try {
        const { stdout } = await exec("git", ["diff", "--name-only", `${sinceCommit}..HEAD`], { cwd: ws, maxBuffer: 32 * 1024 * 1024 });
        return new Set(stdout.split(/\r?\n/).filter((l) => l !== ""));
    }
    catch {
        return null; // unknown commit → fall back to full scan
    }
}
export async function listSourceFiles(workspaceDir, opts) {
    const disc = await discoverWorkspaceFiles(workspaceDir);
    if (!disc.ok)
        return [];
    let files = disc.files.filter((f) => SRC_RE.test(f));
    if (opts.sinceCommit) {
        const changed = await changedSince(workspaceDir, opts.sinceCommit);
        if (changed)
            files = files.filter((f) => changed.has(f));
    }
    return files;
}
export async function scanDrift(workspaceDir, opts) {
    const files = await listSourceFiles(workspaceDir, opts);
    const map = await loadLayerMap(workspaceDir);
    const out = [];
    for (const rel of files) {
        let content;
        try {
            content = await readFile(join(workspaceDir, rel), "utf8");
        }
        catch {
            continue; // never throw on a single unreadable file
        }
        const relPosix = rel.split("\\").join("/");
        const vs = [...checkImportOrder(content), ...checkNaming(content)];
        if (map)
            vs.push(...checkLayerImport(relPosix, content, map));
        for (const v of vs) {
            out.push({
                ruleId: v.ruleId,
                file: relPosix,
                line: v.line,
                message: v.message,
            });
        }
    }
    return out;
}
export function dirOf(relPosixPath) {
    const d = posix.dirname(relPosixPath);
    return d === "" ? "." : d;
}
//# sourceMappingURL=scan.js.map