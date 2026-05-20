const FN_RE = /^export\s+(?:async\s+)?function\s+([A-Za-z0-9_$]+)/;
const TYPE_RE = /^export\s+(?:interface|type|class)\s+([A-Za-z0-9_$]+)/;
const camel = /^[a-z][A-Za-z0-9]*$/;
const pascal = /^[A-Z][A-Za-z0-9]*$/;
export function checkNaming(content) {
    const out = [];
    const lines = content.split("\n");
    for (let i = 0; i < lines.length; i++) {
        const l = lines[i].trim();
        const fn = FN_RE.exec(l);
        if (fn && !camel.test(fn[1])) {
            out.push({
                ruleId: "naming-convention",
                line: i + 1,
                message: `exported function "${fn[1]}" should be camelCase`,
            });
            continue;
        }
        const ty = TYPE_RE.exec(l);
        if (ty && !pascal.test(ty[1])) {
            out.push({
                ruleId: "naming-convention",
                line: i + 1,
                message: `exported type "${ty[1]}" should be PascalCase`,
            });
        }
    }
    return out;
}
//# sourceMappingURL=naming.js.map