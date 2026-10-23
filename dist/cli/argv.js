export function flagValue(argv, name) {
    for (const a of argv) {
        if (a.startsWith(`${name}=`))
            return a.slice(name.length + 1);
    }
    const i = argv.indexOf(name);
    return i >= 0 ? argv[i + 1] : undefined;
}
/** Was the flag supplied, in either spelling `flagValue` accepts (`--x v` or `--x=v`)? */
export function flagPresent(argv, name) {
    return argv.some((a) => a === name || a.startsWith(`${name}=`));
}
//# sourceMappingURL=argv.js.map