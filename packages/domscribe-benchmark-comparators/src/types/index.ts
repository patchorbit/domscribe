export type ScenarioId = 'S1' | 'S2' | 'S3' | 'S4' | 'S5';

export type FixtureName = 'vite' | 'nuxt' | 'next';

export type ComparatorName =
  | 'rcp-v1'
  | 'chrome-devtools-mcp'
  | 'webmcp-reference';

export type CellOutcome = 'pass' | 'refused' | 'wrong';

export interface ScenarioPrompt {
  scenarioId: ScenarioId;
  fixture: FixtureName;
  request: Record<string, unknown>;
}

export interface ComparatorResponse {
  scenarioId: ScenarioId;
  fixture: FixtureName;
  comparator: ComparatorName;
  outcome: CellOutcome;
  rawResponse: unknown;
  errorMessage?: string;
  durationMs: number;
}

export interface Comparator {
  readonly name: ComparatorName;
  readonly version: string;
  readonly externalValidity: 'external' | 'in-repo-fallback';
  run(prompt: ScenarioPrompt): Promise<ComparatorResponse>;
}
