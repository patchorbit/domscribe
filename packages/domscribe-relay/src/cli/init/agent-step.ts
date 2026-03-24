/**
 * Agent selection and installation step for the init wizard.
 * @module @domscribe/relay/cli/init/agent-step
 */
import { execFileSync, spawnSync } from 'node:child_process';

import * as clack from '@clack/prompts';

import type { AgentConfig, InitOptions } from './types.js';
import { AGENTS } from './types.js';

/**
 * Check if a CLI binary exists on the system PATH.
 */
function isBinaryAvailable(binary: string): boolean {
  try {
    execFileSync('which', [binary], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Execute a shell command with inherited stdio.
 * Returns true if the command succeeded.
 */
function runCommand(command: string): boolean {
  const [bin, ...args] = command.split(' ');
  const result = spawnSync(bin, args, { stdio: 'inherit' });
  return result.status === 0;
}

/**
 * Get the primary binary name from the first command of an agent config.
 */
function getAgentBinary(agent: AgentConfig): string | undefined {
  if (!agent.commands?.length) return undefined;
  return agent.commands[0].split(' ')[0];
}

/**
 * Run the agent selection and installation step.
 */
export async function runAgentStep(options: InitOptions): Promise<void> {
  let agentId = options.agent;

  if (!agentId) {
    const selected = await clack.select({
      message: 'Select your coding agent:',
      options: AGENTS.map((a) => ({
        value: a.id,
        label: a.label,
        hint: a.hint,
      })),
    });

    if (clack.isCancel(selected)) {
      clack.cancel('Setup cancelled.');
      return process.exit(0);
    }

    agentId = selected;
  }

  const agent = AGENTS.find((a) => a.id === agentId);
  if (!agent) {
    clack.log.error(`Unknown agent: ${agentId}`);
    return;
  }

  if (agent.installType === 'manual') {
    if (agent.manualInstructions) {
      clack.log.info(agent.label);
      process.stdout.write(agent.manualInstructions + '\n\n');
    }
    return;
  }

  if (!agent.commands?.length) return;

  // Command-based install
  const binary = getAgentBinary(agent);

  if (options.dryRun) {
    clack.log.info(`Would run:`);
    for (const cmd of agent.commands) {
      clack.log.message(`  ${cmd}`);
    }
    return;
  }

  if (binary && !isBinaryAvailable(binary)) {
    clack.log.warn(
      `${binary} is not installed or not on PATH. Showing manual setup instead.`,
    );
    clack.log.info(`Install the ${agent.label} CLI, then run:\n`);
    process.stdout.write(
      agent.commands.map((c) => `  ${c}`).join('\n') + '\n\n',
    );
    return;
  }

  for (const cmd of agent.commands) {
    clack.log.info(`Running: ${cmd}`);
    const success = runCommand(cmd);
    if (!success) {
      clack.log.warn(
        `Command failed: ${cmd}\nYou can run it manually after setup.`,
      );
      return;
    }
  }

  clack.log.success(`${agent.label} plugin installed.`);
}
