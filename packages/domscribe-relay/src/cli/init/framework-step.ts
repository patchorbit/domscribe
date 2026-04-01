/**
 * Framework selection, package installation, and config snippet step.
 * @module @domscribe/relay/cli/init/framework-step
 */
import { spawn } from 'node:child_process';

import * as clack from '@clack/prompts';
import { highlight } from 'cli-highlight';

import { detectPackageManager } from './detect-package-manager.js';
import { CONFIG_SNIPPETS } from './snippets.js';
import type {
  FrameworkConfig,
  InitOptions,
  PackageManagerId,
} from './types.js';
import { FRAMEWORKS, PACKAGE_MANAGERS } from './types.js';

/**
 * Syntax-highlight a config snippet for terminal display.
 */
function highlightSnippet(code: string, configFile: string): string {
  const language = configFile.endsWith('.ts') ? 'typescript' : 'javascript';
  try {
    return highlight(code, { language });
  } catch {
    return code;
  }
}

/**
 * Display the config snippet with contextual instructions.
 */
function showConfigSnippet(framework: FrameworkConfig): void {
  const snippet = CONFIG_SNIPPETS[framework.id];
  const highlighted = highlightSnippet(snippet, framework.configFile);

  clack.log.warn(
    `Add the following to your ${framework.configFile} to complete setup:\n`,
  );
  process.stdout.write(highlighted + '\n\n');
}

/**
 * Build the install command string for a given package manager and package.
 */
function buildInstallCommand(pm: PackageManagerId, pkg: string): string {
  const pmConfig = PACKAGE_MANAGERS.find((p) => p.id === pm);
  return `${pmConfig?.installCmd ?? 'npm install -D'} ${pkg}`;
}

/**
 * Run a package install command asynchronously, collecting stderr.
 * Using async spawn (not spawnSync) keeps the event loop free so the
 * clack spinner can animate during the install.
 */
function runInstall(
  bin: string,
  args: string[],
  cwd: string,
): Promise<{ exitCode: number; stderr: string }> {
  return new Promise((resolve) => {
    const child = spawn(bin, args, {
      stdio: ['ignore', 'ignore', 'pipe'],
      cwd,
    });
    const chunks: Buffer[] = [];

    child.stderr.on('data', (chunk: Buffer) => chunks.push(chunk));

    child.on('close', (code) => {
      resolve({
        exitCode: code ?? 1,
        stderr: Buffer.concat(chunks).toString().trim(),
      });
    });

    child.on('error', (err) => {
      resolve({ exitCode: 1, stderr: err.message });
    });
  });
}

/**
 * Prompt the user to confirm or override the detected package manager.
 */
async function confirmPackageManager(
  detected: PackageManagerId,
  options: InitOptions,
): Promise<PackageManagerId> {
  if (options.pm) return options.pm;

  // Build options with detected PM first, marked as "(detected)"
  const pmOptions = PACKAGE_MANAGERS.map((pm) => ({
    value: pm.id,
    label: pm.id === detected ? `${pm.label} (detected)` : pm.label,
  }));

  const selected = await clack.select({
    message: `Detected ${detected} — which package manager should we use?`,
    options: pmOptions,
    initialValue: detected,
  });

  if (clack.isCancel(selected)) {
    clack.cancel('Setup cancelled.');
    return process.exit(0) as never;
  }

  return selected;
}

/**
 * Run the framework selection, package installation, and config snippet step.
 */
export async function runFrameworkStep(
  options: InitOptions,
  cwd: string,
): Promise<void> {
  let frameworkId = options.framework;

  if (!frameworkId) {
    const selected = await clack.select({
      message: 'Select your framework:',
      options: FRAMEWORKS.map((f) => ({
        value: f.id,
        label: f.label,
      })),
    });

    if (clack.isCancel(selected)) {
      clack.cancel('Setup cancelled.');
      return process.exit(0);
    }

    frameworkId = selected;
  }

  const framework = FRAMEWORKS.find((f) => f.id === frameworkId);
  if (!framework) {
    clack.log.error(`Unknown framework: ${frameworkId}`);
    return;
  }

  // Detect package manager from the repo root (lockfiles live there, not in app subdirs)
  const detected = detectPackageManager(process.cwd());
  const pm = await confirmPackageManager(detected, options);

  const installCmd = buildInstallCommand(pm, framework.package);

  if (options.dryRun) {
    clack.log.info(`Would run: ${installCmd}`);
    showConfigSnippet(framework);
    return;
  }

  // Run the install asynchronously so the spinner can animate
  const spinner = clack.spinner();
  spinner.start(`Installing ${framework.package}...`);

  const [bin, ...args] = installCmd.split(' ');
  const { exitCode, stderr } = await runInstall(bin, args, cwd);

  if (exitCode !== 0) {
    spinner.stop(`Failed to install ${framework.package}.`);
    if (stderr) {
      clack.log.warn(stderr);
    }
    clack.log.warn(`You can install manually: ${installCmd}`);
  } else {
    spinner.stop(`Installed ${framework.package}.`);
  }

  // Always show the config snippet
  showConfigSnippet(framework);
}
