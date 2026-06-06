import type {
  Comparator,
  ComparatorResponse,
  ScenarioPrompt,
} from '../types/index.js';
import { type BrowserBridge, WebMcpReferenceServer } from './server.js';

export interface WebMcpReferenceOptions {
  bridge: BrowserBridge;
  version?: string;
}

const SCENARIO_TO_TOOL = {
  S1: 'web.query_selector',
  S2: 'web.read_styles',
  S3: 'web.enumerate_components',
  S4: 'web.read_props_state',
  S5: 'web.resolve_annotation',
} as const;

export function createWebMcpReferenceComparator(
  opts: WebMcpReferenceOptions,
): Comparator {
  const server = new WebMcpReferenceServer(opts.bridge);
  const version = opts.version ?? '0.1.0-in-repo-reference';

  return {
    name: 'webmcp-reference',
    version,
    externalValidity: 'in-repo-fallback',
    async run(prompt: ScenarioPrompt): Promise<ComparatorResponse> {
      const tool = SCENARIO_TO_TOOL[prompt.scenarioId];
      const start = Date.now();
      try {
        const result = await server.query({
          tool,
          arguments: prompt.request,
        });
        const durationMs = Date.now() - start;
        if (result.ok) {
          // The benchmark spec (Task A) decides what counts as a correct answer for each scenario.
          // The reference returns the raw value; the runner scores it against the fixture's
          // expected-answer (source position, component owning file, etc.). The reference is
          // expected to refuse on S4 and S5 — that is the gap the benchmark documents.
          return {
            scenarioId: prompt.scenarioId,
            fixture: prompt.fixture,
            comparator: 'webmcp-reference',
            outcome: 'pass',
            rawResponse: result.value,
            durationMs,
          };
        }
        return {
          scenarioId: prompt.scenarioId,
          fixture: prompt.fixture,
          comparator: 'webmcp-reference',
          outcome: 'refused',
          rawResponse: null,
          errorMessage: result.refusal,
          durationMs,
        };
      } catch (err) {
        return {
          scenarioId: prompt.scenarioId,
          fixture: prompt.fixture,
          comparator: 'webmcp-reference',
          outcome: 'wrong',
          rawResponse: null,
          errorMessage: err instanceof Error ? err.message : String(err),
          durationMs: Date.now() - start,
        };
      }
    },
  };
}
