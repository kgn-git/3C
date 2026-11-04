/** Text made safe to place between tags or inside a double-quoted attribute. */
export const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
//# sourceMappingURL=html-escape.js.map