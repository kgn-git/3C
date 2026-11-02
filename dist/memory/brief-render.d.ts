import type { Brief, Verdict } from "./brief.js";
export declare const NO_STORE_LINE = "No memory yet: run 3c memory sync to build it.";
export declare const COMMENTS_LINE = "Issue comments were not read.";
export declare const SEAM_LINE = "The brief does not guess which code to change.";
export declare const DISCLAIMER = "This check decides only what it can prove: whether a commit did the work is left to you.";
export declare const ADVICE_LINE = "This is advice and blocks nothing.";
export declare const NO_DECISION = "No decision recorded in the issue body.";
export declare const UNTRUSTED_LINE = "This issue was written by someone who is not an owner, member or collaborator, so no Decided and no Do are read from it.";
export declare const LEFT_OUT = "[left out: it matches a secret pattern or holds an unusual character]";
export declare const unreadLine: (cause: string | null) => string;
export declare const VERDICT_TEXT: Readonly<Record<Verdict, string>>;
/** One printable line: whitespace closed up, backticks made plain, cut at a length, and left out if it is unsafe. */
export declare function plain(text: string): string;
/** A date in the form the house style uses in running text, such as 2 November 2026. */
export declare function proseDate(iso: string): string;
export declare function renderBrief(brief: Brief): string;
//# sourceMappingURL=brief-render.d.ts.map