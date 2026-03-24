/**
 * Framework selection, package installation, and config snippet step.
 * @module @domscribe/relay/cli/init/framework-step
 */
import { spawnSync } from 'node:child_process';

import * as clack from '@clack/prompts';

import { detectPackageManager } from './detect-package-manager.js';
import { CONFIG_SNIPPETS } from './snippets.js';
import type { InitOptions, PackageManagerId } from './types.js';
import { FRAMEWORKS, PACKAGE_MANAGERS } from './types.js';

/**
 * Build the install command string for a given package manager and package.
 */
function buildInstallCommand(pm: PackageManagerId, pkg: string): string {
  const pmConfig = PACKAGE_MANAGERS.find((p) => p.id === pm);
  return `${pmConfig?.installCmd ?? 'npm install -D'} ${pkg}`;
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

  // Detect and confirm package manager
  const detected = detectPackageManager(cwd);
  const pm = await confirmPackageManager(detected, options);

  const installCmd = buildInstallCommand(pm, framework.package);

  if (options.dryRun) {
    clack.log.info(`Would run: ${installCmd}`);
    clack.note(CONFIG_SNIPPETS[framework.id], framework.configFile);
    return;
  }

  // Run the install
  const spinner = clack.spinner();
  spinner.start(`Installing ${framework.package}...`);

  const [bin, ...args] = installCmd.split(' ');
  const result = spawnSync(bin, args, { stdio: 'pipe', cwd });

  if (result.status !== 0) {
    spinner.stop(`Failed to install ${framework.package}.`);
    const stderr = result.stderr?.toString().trim();
    if (stderr) {
      clack.log.warn(stderr);
    }
    clack.log.warn(`You can install manually: ${installCmd}`);
  } else {
    spinner.stop(`Installed ${framework.package}.`);
  }

  // Always show the config snippet
  clack.note(CONFIG_SNIPPETS[framework.id], framework.configFile);
}
