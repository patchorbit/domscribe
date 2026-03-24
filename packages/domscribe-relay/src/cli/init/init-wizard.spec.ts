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

vi.mock('./framework-step.js', () => ({
  runFrameworkStep: vi.fn().mockResolvedValue(undefined),
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

  it('should call agent step then framework step in order', async () => {
    // Arrange
    const callOrder: string[] = [];
    const { runAgentStep } = await import('./agent-step.js');
    const { runFrameworkStep } = await import('./framework-step.js');
    vi.mocked(runAgentStep).mockImplementation(async () => {
      callOrder.push('agent');
    });
    vi.mocked(runFrameworkStep).mockImplementation(async () => {
      callOrder.push('framework');
    });

    // Act
    await runInitWizard(baseOptions);

    // Assert
    expect(callOrder).toEqual(['agent', 'framework']);
  });

  it('should pass options through to both steps', async () => {
    // Arrange
    const options: InitOptions = {
      force: true,
      dryRun: true,
      agent: 'claude-code',
      framework: 'next',
      pm: 'pnpm',
    };
    const { runAgentStep } = await import('./agent-step.js');
    const { runFrameworkStep } = await import('./framework-step.js');

    // Act
    await runInitWizard(options);

    // Assert
    expect(runAgentStep).toHaveBeenCalledWith(options);
    expect(runFrameworkStep).toHaveBeenCalledWith(options, process.cwd());
  });
});
