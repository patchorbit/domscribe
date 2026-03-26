import * as clack from '@clack/prompts';

import { runInitWizard } from './init-wizard.js';
import type { InitOptions } from './types.js';

vi.mock('@clack/prompts', () => ({
  intro: vi.fn(),
  outro: vi.fn(),
}));

vi.mock('./agent-step.js', () => ({
  runAgentStep: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('./monorepo-step.js', () => ({
  runMonorepoStep: vi.fn().mockResolvedValue({ appRoot: '/resolved/app/root' }),
}));

vi.mock('./framework-step.js', () => ({
  runFrameworkStep: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('./gitignore-step.js', () => ({
  runGitignoreStep: vi.fn(),
}));

const baseOptions: InitOptions = {
  force: false,
  dryRun: false,
};

describe('runInitWizard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should show intro and outro', async () => {
    // Act
    await runInitWizard(baseOptions);

    // Assert
    expect(clack.intro).toHaveBeenCalledWith('Domscribe Setup');
    expect(clack.outro).toHaveBeenCalledWith(
      expect.stringContaining('Domscribe will take care of the rest'),
    );
  });

  it('should call steps in order: agent → monorepo → framework → gitignore', async () => {
    // Arrange
    const callOrder: string[] = [];
    const { runAgentStep } = await import('./agent-step.js');
    const { runMonorepoStep } = await import('./monorepo-step.js');
    const { runFrameworkStep } = await import('./framework-step.js');
    const { runGitignoreStep } = await import('./gitignore-step.js');
    vi.mocked(runAgentStep).mockImplementation(async () => {
      callOrder.push('agent');
    });
    vi.mocked(runMonorepoStep).mockImplementation(async () => {
      callOrder.push('monorepo');
      return { appRoot: process.cwd() };
    });
    vi.mocked(runFrameworkStep).mockImplementation(async () => {
      callOrder.push('framework');
    });
    vi.mocked(runGitignoreStep).mockImplementation(() => {
      callOrder.push('gitignore');
    });

    // Act
    await runInitWizard(baseOptions);

    // Assert
    expect(callOrder).toEqual(['agent', 'monorepo', 'framework', 'gitignore']);
  });

  it('should pass appRoot from monorepo step to framework step', async () => {
    // Arrange
    const { runMonorepoStep } = await import('./monorepo-step.js');
    const { runFrameworkStep } = await import('./framework-step.js');
    vi.mocked(runMonorepoStep).mockResolvedValue({
      appRoot: '/monorepo/apps/web',
    });

    // Act
    await runInitWizard(baseOptions);

    // Assert
    expect(runFrameworkStep).toHaveBeenCalledWith(
      baseOptions,
      '/monorepo/apps/web',
    );
  });

  it('should pass cwd (not appRoot) to gitignore step', async () => {
    // Arrange
    const { runMonorepoStep } = await import('./monorepo-step.js');
    const { runGitignoreStep } = await import('./gitignore-step.js');
    vi.mocked(runMonorepoStep).mockResolvedValue({
      appRoot: '/monorepo/apps/web',
    });

    // Act
    await runInitWizard(baseOptions);

    // Assert
    expect(runGitignoreStep).toHaveBeenCalledWith(baseOptions, process.cwd());
  });

  it('should pass options through to all steps', async () => {
    // Arrange
    const options: InitOptions = {
      force: true,
      dryRun: true,
      agent: 'claude-code',
      framework: 'next',
      pm: 'pnpm',
      appRoot: 'apps/web',
    };
    const { runAgentStep } = await import('./agent-step.js');
    const { runMonorepoStep } = await import('./monorepo-step.js');
    const { runGitignoreStep } = await import('./gitignore-step.js');

    // Act
    await runInitWizard(options);

    // Assert
    expect(runAgentStep).toHaveBeenCalledWith(options);
    expect(runMonorepoStep).toHaveBeenCalledWith(options, process.cwd());
    expect(runGitignoreStep).toHaveBeenCalledWith(options, process.cwd());
  });
});
