import { RelayControl } from './relay-control.js';
import type { RelayLock } from './lock-manager.js';

const mockLockManager = {
  getLockData: vi.fn().mockReturnValue(null),
  isLockFilePresent: vi.fn().mockReturnValue(false),
  removeLockFile: vi.fn(),
};

vi.mock('./process.js', () => ({
  isProcessRunning: vi.fn(),
  sleep: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../client/relay-http-client.js', () => ({
  RelayHttpClient: vi.fn().mockImplementation(() => ({
    getHealth: vi.fn(),
    shutdown: vi.fn(),
  })),
}));

vi.mock('./lock-manager.js', () => {
  return {
    RelayLockManager: class {
      getLockData = mockLockManager.getLockData;
      isLockFilePresent = mockLockManager.isLockFilePresent;
      removeLockFile = mockLockManager.removeLockFile;
    },
  };
});

vi.mock('node:child_process', () => ({
  spawn: vi.fn().mockReturnValue({
    pid: 12345,
    unref: vi.fn(),
    on: vi.fn(),
  }),
}));

vi.mock('semver', () => ({
  gt: vi.fn().mockReturnValue(false),
}));

vi.mock('../version.js', () => ({
  RELAY_VERSION: '1.0.0',
}));

import { isProcessRunning } from './process.js';
import { RelayHttpClient } from '../client/relay-http-client.js';
import { spawn } from 'node:child_process';

function createLockData(overrides?: Partial<RelayLock>): RelayLock {
  return {
    pid: 1234,
    host: '127.0.0.1',
    port: 9876,
    startedAt: new Date().toISOString(),
    workspaceRoot: '/test/workspace',
    version: '1.0.0',
    nonce: 'test-nonce',
    status: 'claimed',
    ...overrides,
  };
}

describe('RelayControl', () => {
  beforeEach(() => {
    // Reset individual mocks — avoid vi.clearAllMocks() which would
    // wipe the RelayLockManager constructor implementation
    mockLockManager.getLockData.mockReset().mockReturnValue(null);
    mockLockManager.isLockFilePresent.mockReset().mockReturnValue(false);
    mockLockManager.removeLockFile.mockReset();
    vi.mocked(isProcessRunning).mockReset();
    vi.mocked(spawn)
      .mockReset()
      .mockReturnValue({
        pid: 12345,
        unref: vi.fn(),
        on: vi.fn(),
      } as unknown as ReturnType<typeof spawn>);
  });

  describe('getStatus', () => {
    it('should return not running when no lock data exists', async () => {
      const control = new RelayControl('/test/workspace');

      const status = await control.getStatus();

      expect(status.running).toBe(false);
      expect(status.runData).toBeUndefined();
    });

    it('should return not running when process is dead', async () => {
      // Arrange
      const lockData = createLockData();
      mockLockManager.getLockData.mockReturnValue(lockData);
      vi.mocked(isProcessRunning).mockReturnValue(false);
      const control = new RelayControl('/test/workspace');

      // Act
      const status = await control.getStatus();

      // Assert
      expect(status.running).toBe(false);
      expect(status.lockData).toEqual(lockData);
    });

    it('should return not running when lock has no host/port', async () => {
      // Arrange
      mockLockManager.getLockData.mockReturnValue(
        createLockData({ host: undefined, port: undefined }),
      );
      vi.mocked(isProcessRunning).mockReturnValue(true);
      const control = new RelayControl('/test/workspace');

      // Act
      const status = await control.getStatus();

      // Assert
      expect(status.running).toBe(false);
    });

    it('should return running with runData when health check passes', async () => {
      // Arrange
      mockLockManager.getLockData.mockReturnValue(createLockData());
      vi.mocked(isProcessRunning).mockReturnValue(true);
      vi.mocked(RelayHttpClient).mockImplementation(function () {
        return {
          getHealth: vi.fn().mockResolvedValue({
            status: 'healthy',
            pid: 1234,
            nonce: 'test-nonce',
            workspaceRoot: '/test/workspace',
            version: '1.0.0',
          }),
          shutdown: vi.fn(),
        } as unknown as RelayHttpClient;
      } as unknown as typeof RelayHttpClient);
      const control = new RelayControl('/test/workspace');

      // Act
      const status = await control.getStatus();

      // Assert
      expect(status.running).toBe(true);
      expect(status.runData).toEqual({
        pid: 1234,
        nonce: 'test-nonce',
        workspaceRoot: '/test/workspace',
        version: '1.0.0',
      });
    });

    it('should return not running when health check fails', async () => {
      // Arrange
      mockLockManager.getLockData.mockReturnValue(createLockData());
      vi.mocked(isProcessRunning).mockReturnValue(true);
      vi.mocked(RelayHttpClient).mockImplementation(function () {
        return {
          getHealth: vi.fn().mockRejectedValue(new Error('refused')),
          shutdown: vi.fn(),
        } as unknown as RelayHttpClient;
      } as unknown as typeof RelayHttpClient);
      const control = new RelayControl('/test/workspace');

      // Act
      const status = await control.getStatus();

      // Assert
      expect(status.running).toBe(false);
    });
  });

  describe('validateAndClear', () => {
    it('should return undefined when not running', async () => {
      const control = new RelayControl('/test/workspace');

      const result = await control.validateAndClear();

      expect(result).toBeUndefined();
    });

    it('should remove stale lock file when not running', async () => {
      // Arrange
      mockLockManager.getLockData.mockReturnValue(createLockData());
      mockLockManager.isLockFilePresent.mockReturnValue(true);
      vi.mocked(isProcessRunning).mockReturnValue(false);
      const control = new RelayControl('/test/workspace');

      // Act
      await control.validateAndClear();

      // Assert
      expect(mockLockManager.removeLockFile).toHaveBeenCalled();
    });
  });

  describe('spawn', () => {
    it('should call child_process.spawn with correct arguments', () => {
      const control = new RelayControl('/test/workspace', { debug: true });

      control.spawn({ port: 8080, host: '0.0.0.0', bodyLimit: 5242880 });

      expect(spawn).toHaveBeenCalledWith(
        process.execPath,
        [expect.stringContaining('process-entry.js')],
        expect.objectContaining({
          detached: true,
          stdio: 'ignore',
          cwd: '/test/workspace',
          env: expect.objectContaining({
            DS_WORKSPACE_ROOT: '/test/workspace',
            DS_RELAY_PORT: '8080',
            DS_RELAY_HOST: '0.0.0.0',
            DS_RELAY_BODY_LIMIT: '5242880',
            DS_DEBUG: '1',
          }),
        }),
      );
    });

    it('should not set port/host env vars when not provided', () => {
      const control = new RelayControl('/test/workspace');

      control.spawn({});

      const callEnv = vi.mocked(spawn).mock.calls[0][2]
        ?.env as NodeJS.ProcessEnv;
      expect(callEnv['DS_RELAY_PORT']).toBeUndefined();
      expect(callEnv['DS_RELAY_HOST']).toBeUndefined();
    });

    it('should use inherited stdio when not detached', () => {
      const control = new RelayControl('/test/workspace');

      control.spawn({ detached: false });

      expect(spawn).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.objectContaining({
          detached: false,
          stdio: 'inherit',
        }),
      );
    });
  });

  describe('stop', () => {
    it('should return early when lock data has no host/port/nonce', async () => {
      const control = new RelayControl('/test/workspace');

      // Should not throw
      await control.stop();
    });
  });
});
