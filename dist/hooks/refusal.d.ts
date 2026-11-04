/**
 * Why a hook command may not run, or null when it may. The credential itself is never printed, only its kind, and
 * an address or a host name is not a credential. `slug` is the product's folder name, where the file to edit lives.
 */
export declare function hookRefusal(command: string, slug: string): string | null;
/** A hook's id as it is printed: an id that holds a credential is withheld, because the id is also free text. */
export declare function hookLabel(id: string): string;
/** Why a hook's matcher cannot be used, or null when it can. Building it can throw, and a throw in the orchestrator would deny commits with no hook named. */
export declare function matcherFault(matcher: string, slug: string): string | null;
/** Whether a hook is to run for a tool call. A hook whose matcher cannot be built counts as matching, so it is refused by name instead of throwing. */
export declare function matchesTool(matcher: string, toolName: string): boolean;
//# sourceMappingURL=refusal.d.ts.map