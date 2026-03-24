import { existsSync } from 'node:fs';

import { detectPackageManager } from './detect-package-manager.js';

vi.mock('node:fs', () => ({
  existsSync: vi.fn(),
}));

describe('detectPackageManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should detect pnpm from pnpm-lock.yaml', () => {
    // Arrange
    vi.mocked(existsSync).mockImplementation((p) =>
      String(p).endsWith('pnpm-lock.yaml'),
    );

    // Act
    const result = detectPackageManager('/project');

    // Assert
    expect(result).toBe('pnpm');
  });

  it('should detect yarn from yarn.lock', () => {
    // Arrange
    vi.mocked(existsSync).mockImplementation((p) =>
      String(p).endsWith('yarn.lock'),
    );

    // Act
    const result = detectPackageManager('/project');

    // Assert
    expect(result).toBe('yarn');
  });

  it('should detect bun from bun.lock', () => {
    // Arrange
    vi.mocked(existsSync).mockImplementation((p) =>
      String(p).endsWith('bun.lock'),
    );

    // Act
    const result = detectPackageManager('/project');

    // Assert
    expect(result).toBe('bun');
  });

  it('should detect bun from bun.lockb', () => {
    // Arrange
    vi.mocked(existsSync).mockImplementation((p) =>
      String(p).endsWith('bun.lockb'),
    );

    // Act
    const result = detectPackageManager('/project');

    // Assert
    expect(result).toBe('bun');
  });

  it('should detect npm from package-lock.json', () => {
    // Arrange
    vi.mocked(existsSync).mockImplementation((p) =>
      String(p).endsWith('package-lock.json'),
    );

    // Act
    const result = detectPackageManager('/project');

    // Assert
    expect(result).toBe('npm');
  });

  it('should fall back to npm when no lockfile is found', () => {
    // Arrange
    vi.mocked(existsSync).mockReturnValue(false);

    // Act
    const result = detectPackageManager('/project');

    // Assert
    expect(result).toBe('npm');
  });

  it('should prioritize pnpm over yarn when both lockfiles exist', () => {
    // Arrange
    vi.mocked(existsSync).mockImplementation((p) => {
      const s = String(p);
      return s.endsWith('pnpm-lock.yaml') || s.endsWith('yarn.lock');
    });

    // Act
    const result = detectPackageManager('/project');

    // Assert
    expect(result).toBe('pnpm');
  });
});
