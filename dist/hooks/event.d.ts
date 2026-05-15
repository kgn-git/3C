export interface HookEvent {
    readonly hook_event_name?: string;
    readonly tool_name: string;
    readonly tool_input: Record<string, unknown>;
    readonly session_id?: string;
}
export type ParseEventResult = {
    readonly ok: true;
    readonly event: HookEvent;
} | {
    readonly ok: false;
    readonly error: string;
};
export declare function parseHookEvent(json: string): ParseEventResult;
export declare function readHookEventFromStdin(stream: NodeJS.ReadableStream): Promise<ParseEventResult>;
//# sourceMappingURL=event.d.ts.map