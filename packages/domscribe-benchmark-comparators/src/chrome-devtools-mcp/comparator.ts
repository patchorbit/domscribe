import type {
  Comparator,
  ComparatorResponse,
  ScenarioPrompt,
} from '../types/index.js';
import type { ChromeDevtoolsMcpClient } from './client.js';

export interface ChromeDevtoolsMcpOptions {
  client: ChromeDevtoolsMcpClient;
}

const SCENARIO_TO_CDP_TOOL = {
  S1: 'navigate.evaluate',
  S2: 'css.read_computed',
  S3: 'navigate.evaluate',
  S4: 'navigate.evaluate',
  S5: 'navigate.evaluate',
} as const;

export function createChromeDevtoolsMcpComparator(
  opts: ChromeDevtoolsMcpOptions,
): Comparator {
  return {
    name: 'chrome-devtools-mcp',
    version: opts.client.version,
    externalValidity: 'external',
    async run(prompt: ScenarioPrompt): Promise<ComparatorResponse> {
      const tool = SCENARIO_TO_CDP_TOOL[prompt.scenarioId];
      const start = Date.now();
      try {
        const result = await opts.client.call({
          name: tool,
          arguments: prompt.request,
        });
        const durationMs = Date.now() - start;
        if (result.ok) {
          return {
            scenarioId: prompt.scenarioId,
            fixture: prompt.fixture,
            comparator: 'chrome-devtools-mcp',
            outcome: 'pass',
            rawResponse: result.content,
            durationMs,
          };
        }
        return {
          scenarioId: prompt.scenarioId,
          fixture: prompt.fixture,
          comparator: 'chrome-devtools-mcp',
          outcome: 'refused',
          rawResponse: null,
          errorMessage: result.refusal,
          durationMs,
        };
      } catch (err) {
        return {
          scenarioId: prompt.scenarioId,
          fixture: prompt.fixture,
          comparator: 'chrome-devtools-mcp',
          outcome: 'wrong',
          rawResponse: null,
          errorMessage: err instanceof Error ? err.message : String(err),
          durationMs: Date.now() - start,
        };
      }
    },
  };
}
