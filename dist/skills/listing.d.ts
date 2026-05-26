export interface AgentInfo {
    readonly name: string;
    readonly tools: ReadonlyArray<string>;
    readonly model: string;
    readonly description: string;
}
export interface SkillInfo {
    readonly name: string;
    readonly description: string;
    readonly modelInvocable: boolean;
}
export declare function listInstalledAgents(workspaceDir: string): Promise<AgentInfo[]>;
export declare function listInstalledSkills(workspaceDir: string): Promise<SkillInfo[]>;
//# sourceMappingURL=listing.d.ts.map