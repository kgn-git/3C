const SIGNER_PATTERN = /Good signature from "([^"]+)"/;
export async function verifyUpstream(opts) {
    const tagResult = await opts.runGit(["verify-tag", opts.ref], { cwd: opts.repoDir });
    if (tagResult.code === 0) {
        return verified(tagResult.stderr);
    }
    if (/non-tag|not a tag/i.test(tagResult.stderr)) {
        const commitResult = await opts.runGit(["verify-commit", opts.ref], { cwd: opts.repoDir });
        if (commitResult.code === 0)
            return verified(commitResult.stderr);
        return { verified: false, error: commitResult.stderr.trim() || "git verify-commit failed" };
    }
    return { verified: false, error: tagResult.stderr.trim() || "git verify-tag failed" };
}
function verified(stderr) {
    const match = SIGNER_PATTERN.exec(stderr);
    return match ? { verified: true, signer: match[1] } : { verified: true };
}
//# sourceMappingURL=verify-commit.js.map