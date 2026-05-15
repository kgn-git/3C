export interface Source {
    readonly name: string;
    readonly url?: string;
    readonly year?: number;
}
export interface OptionDefinition {
    readonly id: string;
    readonly label: string;
    readonly description: string;
    readonly source?: Source;
}
export interface CategoryDefinition {
    readonly id: string;
    readonly label: string;
    readonly multiSelect: boolean;
    readonly options: ReadonlyArray<OptionDefinition>;
}
export declare const PROJECT_TYPE: CategoryDefinition;
export declare const LANGUAGE: CategoryDefinition;
export declare const ARCHITECTURE: CategoryDefinition;
export declare const TEST_METHODOLOGY: CategoryDefinition;
export declare const TEST_FRAMEWORK: CategoryDefinition;
export declare const SECURITY_FRAMEWORK: CategoryDefinition;
export declare const SECURITY_TOOLING: CategoryDefinition;
export declare const ALL_CATEGORIES: ReadonlyArray<CategoryDefinition>;
export declare function findOption(category: CategoryDefinition, id: string): OptionDefinition | undefined;
//# sourceMappingURL=options.d.ts.map