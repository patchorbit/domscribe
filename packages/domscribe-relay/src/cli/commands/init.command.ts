import { Command } from 'commander';

import {
  runInitWizard,
  AGENT_IDS,
  FRAMEWORK_IDS,
  PACKAGE_MANAGER_IDS,
} from '../init/index.js';
import type { InitOptions } from '../init/index.js';

interface InitCommandOptions {
  force: boolean;
  dryRun: boolean;
  agent?: string;
  framework?: string;
  pm?: string;
  appRoot?: string;
}

export const InitCommand = new Command('init')
  .description('Initialize Domscribe and configure your coding agent')
  .option('-f, --force', 'Overwrite existing configuration', false)
  .option('--dry-run', 'Show what would be done without making changes', false)
  .option('--agent <name>', `Coding agent (${AGENT_IDS.join(', ')})`)
  .option(
    '--framework <name>',
    `Framework + bundler (${FRAMEWORK_IDS.join(', ')})`,
  )
  .option('--pm <name>', `Package manager (${PACKAGE_MANAGER_IDS.join(', ')})`)
  .option('--app-root <path>', 'Path to frontend app root (for monorepos)')
  .action(async (options: InitCommandOptions) => {
    try {
      if (options.agent && !AGENT_IDS.includes(options.agent as never)) {
        console.error(
          `[domscribe-cli] Invalid agent: ${options.agent}. Valid options: ${AGENT_IDS.join(', ')}`,
        );
        process.exit(1);
      }

      if (
        options.framework &&
        !FRAMEWORK_IDS.includes(options.framework as never)
      ) {
        console.error(
          `[domscribe-cli] Invalid framework: ${options.framework}. Valid options: ${FRAMEWORK_IDS.join(', ')}`,
        );
        process.exit(1);
      }

      if (options.pm && !PACKAGE_MANAGER_IDS.includes(options.pm as never)) {
        console.error(
          `[domscribe-cli] Invalid package manager: ${options.pm}. Valid options: ${PACKAGE_MANAGER_IDS.join(', ')}`,
        );
        process.exit(1);
      }

      const initOptions: InitOptions = {
        force: options.force,
        dryRun: options.dryRun,
        agent: options.agent as InitOptions['agent'],
        framework: options.framework as InitOptions['framework'],
        pm: options.pm as InitOptions['pm'],
        appRoot: options.appRoot,
      };

      await runInitWizard(initOptions);
    } catch (error) {
      console.error(`[domscribe-cli] Init failed: ${error}`);
      process.exit(1);
    }
  });
