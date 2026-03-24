/**
 * Init wizard orchestrator.
 * @module @domscribe/relay/cli/init/init-wizard
 */
import * as clack from '@clack/prompts';

import { runAgentStep } from './agent-step.js';
import { runFrameworkStep } from './framework-step.js';
import type { InitOptions } from './types.js';

/**
 * Run the full init wizard: agent selection → framework selection.
 *
 * @remarks
 * The `.domscribe/` directory is NOT created here — it is created
 * automatically by the relay when the dev server first starts
 * (via `autoStart: true` in the bundler plugin).
 */
export async function runInitWizard(options: InitOptions): Promise<void> {
  clack.intro('Domscribe Setup');

  await runAgentStep(options);
  await runFrameworkStep(options, process.cwd());

  clack.outro(
    'Add the config above to your project, then start your dev server — Domscribe will take care of the rest.',
  );
}
