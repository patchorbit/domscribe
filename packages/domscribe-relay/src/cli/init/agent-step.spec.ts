import { execFileSync, spawnSync } from 'node:child_process';

import * as clack from '@clack/prompts';

import { runAgentStep } from './agent-step.js';
import type { InitOptions } from './types.js';

vi.mock('node:child_process', () => ({
  execFileSync: vi.fn(),
  spawnSync: vi.fn().mockReturnValue({ status: 0 }),
}));

vi.mock('@clack/prompts', () => ({
  select: vi.fn(),
  isCancel: vi.fn().mockReturnValue(false),
  cancel: vi.fn(),
  log: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    success: vi.fn(),
    message: vi.fn(),
  },
  note: vi.fn(),
}));

const baseOptions: InitOptions = {
  force: false,
  dryRun: false,
};

describe('runAgentStep', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(clack.isCancel).mockReturnValue(false);
    vi.mocked(spawnSync).mockReturnValue({ status: 0 } as ReturnType<
      typeof spawnSync
    >);
  });

  describe('interactive mode', () => {
    it('should prompt for agent selection when no --agent flag', async () => {
      // Arrange
      vi.mocked(clack.select).mockResolvedValue('kiro');

      // Act
      await runAgentStep(baseOptions);

      // Assert
      expect(clack.select).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Select your coding agent:' }),
      );
    });

    it('should exit gracefully on cancel', async () => {
      // Arrange
      vi.mocked(clack.select).mockResolvedValue(Symbol('cancel'));
      vi.mocked(clack.isCancel).mockReturnValue(true);
      const exitSpy = vi
        .spyOn(process, 'exit')
        .mockImplementation(() => undefined as never);

      // Act
      await runAgentStep(baseOptions);

      // Assert
      expect(clack.cancel).toHaveBeenCalledWith('Setup cancelled.');
      expect(exitSpy).toHaveBeenCalledWith(0);
    });
  });

  describe('non-interactive mode', () => {
    it('should skip prompt when --agent flag is provided', async () => {
      // Arrange — kiro is manual, so no spawn
      const options: InitOptions = { ...baseOptions, agent: 'kiro' };

      // Act
      await runAgentStep(options);

      // Assert
      expect(clack.select).not.toHaveBeenCalled();
      expect(clack.log.info).toHaveBeenCalledWith('Amazon Kiro');
    });
  });

  describe('manual agents', () => {
    it('should show manual instructions for Kiro', async () => {
      // Arrange
      vi.mocked(clack.select).mockResolvedValue('kiro');
      const writeSpy = vi.spyOn(process.stdout, 'write').mockReturnValue(true);

      // Act
      await runAgentStep(baseOptions);

      // Assert
      expect(writeSpy).toHaveBeenCalledWith(
        expect.stringContaining('Powers panel'),
      );
    });

    it('should show MCP config for Cursor', async () => {
      // Arrange
      vi.mocked(clack.select).mockResolvedValue('cursor');
      const writeSpy = vi.spyOn(process.stdout, 'write').mockReturnValue(true);

      // Act
      await runAgentStep(baseOptions);

      // Assert
      expect(writeSpy).toHaveBeenCalledWith(
        expect.stringContaining('coming soon'),
      );
    });

    it('should show MCP config for Other', async () => {
      // Arrange
      vi.mocked(clack.select).mockResolvedValue('other');
      const writeSpy = vi.spyOn(process.stdout, 'write').mockReturnValue(true);

      // Act
      await runAgentStep(baseOptions);

      // Assert
      expect(writeSpy).toHaveBeenCalledWith(
        expect.stringContaining('mcpServers'),
      );
    });
  });

  describe('command-based agents', () => {
    it('should run install commands for Claude Code', async () => {
      // Arrange
      vi.mocked(clack.select).mockResolvedValue('claude-code');
      vi.mocked(execFileSync).mockReturnValue(Buffer.from(''));
      vi.mocked(spawnSync).mockReturnValue({ status: 0 } as ReturnType<
        typeof spawnSync
      >);

      // Act
      await runAgentStep(baseOptions);

      // Assert
      expect(spawnSync).toHaveBeenCalledTimes(2);
      expect(spawnSync).toHaveBeenCalledWith(
        'claude',
        ['plugin', 'marketplace', 'add', 'patchorbit/domscribe'],
        { stdio: 'inherit' },
      );
      expect(spawnSync).toHaveBeenCalledWith(
        'claude',
        ['plugin', 'install', 'domscribe@domscribe'],
        { stdio: 'inherit' },
      );
      expect(clack.log.success).toHaveBeenCalled();
    });

    it('should fall back to manual when CLI is not on PATH', async () => {
      // Arrange
      vi.mocked(clack.select).mockResolvedValue('copilot');
      vi.mocked(execFileSync).mockImplementation(() => {
        throw new Error('not found');
      });

      // Act
      await runAgentStep(baseOptions);

      // Assert
      expect(spawnSync).not.toHaveBeenCalled();
      expect(clack.log.warn).toHaveBeenCalledWith(
        expect.stringContaining('not installed'),
      );
      expect(clack.log.info).toHaveBeenCalledWith(
        expect.stringContaining('Install the GitHub Copilot CLI'),
      );
    });

    it('should warn on command failure and stop', async () => {
      // Arrange
      vi.mocked(clack.select).mockResolvedValue('claude-code');
      vi.mocked(execFileSync).mockReturnValue(Buffer.from(''));
      vi.mocked(spawnSync).mockReturnValue({ status: 1 } as ReturnType<
        typeof spawnSync
      >);

      // Act
      await runAgentStep(baseOptions);

      // Assert
      expect(spawnSync).toHaveBeenCalledTimes(1);
      expect(clack.log.warn).toHaveBeenCalledWith(
        expect.stringContaining('failed'),
      );
    });
  });

  describe('dry-run', () => {
    it('should print commands without executing them', async () => {
      // Arrange
      vi.mocked(clack.select).mockResolvedValue('claude-code');
      const options: InitOptions = { ...baseOptions, dryRun: true };

      // Act
      await runAgentStep(options);

      // Assert
      expect(spawnSync).not.toHaveBeenCalled();
      expect(clack.log.info).toHaveBeenCalledWith('Would run:');
      expect(clack.log.message).toHaveBeenCalledWith(
        expect.stringContaining('claude plugin marketplace add'),
      );
    });
  });
});
