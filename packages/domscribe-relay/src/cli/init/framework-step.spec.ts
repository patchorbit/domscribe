import { spawn } from 'node:child_process';
import { EventEmitter } from 'node:events';

import * as clack from '@clack/prompts';

import { runFrameworkStep } from './framework-step.js';
import type { InitOptions } from './types.js';

/**
 * Create a fake ChildProcess that emits 'close' on the next tick.
 */
function createFakeChild(exitCode = 0, stderrData = ''): EventEmitter {
  const child = new EventEmitter();
  const stderr = new EventEmitter();
  (child as unknown as Record<string, unknown>).stderr = stderr;

  process.nextTick(() => {
    if (stderrData) {
      stderr.emit('data', Buffer.from(stderrData));
    }
    child.emit('close', exitCode);
  });

  return child;
}

vi.mock('node:child_process', () => ({
  spawn: vi.fn(() => createFakeChild(0)),
}));

vi.mock('@clack/prompts', () => ({
  select: vi.fn(),
  isCancel: vi.fn().mockReturnValue(false),
  cancel: vi.fn(),
  spinner: vi.fn().mockReturnValue({
    start: vi.fn(),
    stop: vi.fn(),
  }),
  log: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    success: vi.fn(),
    message: vi.fn(),
  },
  note: vi.fn(),
}));

vi.mock('./detect-package-manager.js', () => ({
  detectPackageManager: vi.fn().mockReturnValue('npm'),
}));

const baseOptions: InitOptions = {
  force: false,
  dryRun: false,
};

describe('runFrameworkStep', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(clack.isCancel).mockReturnValue(false);
    vi.mocked(spawn).mockImplementation(
      () => createFakeChild(0) as ReturnType<typeof spawn>,
    );
  });

  describe('interactive mode', () => {
    it('should prompt for framework selection', async () => {
      // Arrange
      vi.mocked(clack.select)
        .mockResolvedValueOnce('next')
        .mockResolvedValueOnce('npm');

      // Act
      await runFrameworkStep(baseOptions, '/project');

      // Assert
      expect(clack.select).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Select your framework:' }),
      );
    });

    it('should prompt to confirm detected package manager', async () => {
      // Arrange
      vi.mocked(clack.select)
        .mockResolvedValueOnce('next')
        .mockResolvedValueOnce('pnpm');

      // Act
      await runFrameworkStep(baseOptions, '/project');

      // Assert
      expect(clack.select).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Detected npm'),
        }),
      );
    });

    it('should exit gracefully on framework cancel', async () => {
      // Arrange
      vi.mocked(clack.select).mockResolvedValueOnce(Symbol('cancel'));
      vi.mocked(clack.isCancel).mockReturnValueOnce(true);
      const exitSpy = vi
        .spyOn(process, 'exit')
        .mockImplementation(() => undefined as never);

      // Act
      await runFrameworkStep(baseOptions, '/project');

      // Assert
      expect(clack.cancel).toHaveBeenCalledWith('Setup cancelled.');
      expect(exitSpy).toHaveBeenCalledWith(0);
    });
  });

  describe('non-interactive mode', () => {
    it('should skip prompts when --framework and --pm flags are provided', async () => {
      // Arrange
      const options: InitOptions = {
        ...baseOptions,
        framework: 'nuxt',
        pm: 'pnpm',
      };

      // Act
      await runFrameworkStep(options, '/project');

      // Assert
      expect(clack.select).not.toHaveBeenCalled();
      expect(spawn).toHaveBeenCalledWith(
        'pnpm',
        ['add', '-D', '@domscribe/nuxt'],
        expect.objectContaining({ cwd: '/project' }),
      );
    });
  });

  describe('package installation', () => {
    it('should install the correct package for Next.js with npm', async () => {
      // Arrange
      vi.mocked(clack.select)
        .mockResolvedValueOnce('next')
        .mockResolvedValueOnce('npm');

      // Act
      await runFrameworkStep(baseOptions, '/project');

      // Assert
      expect(spawn).toHaveBeenCalledWith(
        'npm',
        ['install', '-D', '@domscribe/next'],
        expect.objectContaining({ cwd: '/project' }),
      );
    });

    it('should install the correct package for React + Vite with pnpm', async () => {
      // Arrange
      vi.mocked(clack.select)
        .mockResolvedValueOnce('react-vite')
        .mockResolvedValueOnce('pnpm');

      // Act
      await runFrameworkStep(baseOptions, '/project');

      // Assert
      expect(spawn).toHaveBeenCalledWith(
        'pnpm',
        ['add', '-D', '@domscribe/react'],
        expect.objectContaining({ cwd: '/project' }),
      );
    });

    it('should warn on install failure and show manual command', async () => {
      // Arrange
      vi.mocked(clack.select)
        .mockResolvedValueOnce('nuxt')
        .mockResolvedValueOnce('npm');
      vi.mocked(spawn).mockImplementation(
        () => createFakeChild(1, 'ERR') as ReturnType<typeof spawn>,
      );

      // Act
      await runFrameworkStep(baseOptions, '/project');

      // Assert
      expect(clack.log.warn).toHaveBeenCalledWith(
        expect.stringContaining('npm install -D'),
      );
    });
  });

  describe('config snippet', () => {
    it('should show config snippet after installation', async () => {
      // Arrange
      vi.mocked(clack.select)
        .mockResolvedValueOnce('next')
        .mockResolvedValueOnce('npm');
      const writeSpy = vi.spyOn(process.stdout, 'write').mockReturnValue(true);

      // Act
      await runFrameworkStep(baseOptions, '/project');

      // Assert
      expect(clack.log.warn).toHaveBeenCalledWith(
        expect.stringContaining('next.config.ts'),
      );
      expect(writeSpy).toHaveBeenCalledWith(
        expect.stringContaining('withDomscribe'),
      );
    });

    it('should show webpack loader + plugin for React + Webpack', async () => {
      // Arrange
      vi.mocked(clack.select)
        .mockResolvedValueOnce('react-webpack')
        .mockResolvedValueOnce('npm');
      const writeSpy = vi.spyOn(process.stdout, 'write').mockReturnValue(true);

      // Act
      await runFrameworkStep(baseOptions, '/project');

      // Assert
      expect(writeSpy).toHaveBeenCalledWith(
        expect.stringContaining('webpack-loader'),
      );
      expect(writeSpy).toHaveBeenCalledWith(
        expect.stringContaining('DomscribeWebpackPlugin'),
      );
    });
  });

  describe('dry-run', () => {
    it('should print install command and snippet without executing', async () => {
      // Arrange
      vi.mocked(clack.select)
        .mockResolvedValueOnce('nuxt')
        .mockResolvedValueOnce('npm');
      const options: InitOptions = { ...baseOptions, dryRun: true };

      // Act
      await runFrameworkStep(options, '/project');

      // Assert
      expect(spawn).not.toHaveBeenCalled();
      expect(clack.log.info).toHaveBeenCalledWith(
        expect.stringContaining('npm install -D @domscribe/nuxt'),
      );
      expect(clack.log.warn).toHaveBeenCalledWith(
        expect.stringContaining('to complete setup'),
      );
    });
  });
});
