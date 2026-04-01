import { existsSync, statSync } from 'node:fs';

import { getWorkspaceRoot } from './utils.js';

vi.mock('node:fs', () => ({
  existsSync: vi.fn(),
  statSync: vi.fn().mockReturnValue({ isDirectory: () => true }),
}));

vi.mock('./config-loader.js', () => ({
  findConfigFile: vi.fn(),
  loadAppRoot: vi.fn(),
}));

// Import after mocking so we get the mocked versions
const { findConfigFile, loadAppRoot } = await import('./config-loader.js');

describe('getWorkspaceRoot', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return cwd when .domscribe exists there', () => {
    // Arrange
    vi.mocked(existsSync).mockReturnValue(true);

    // Act
    const result = getWorkspaceRoot();

    // Assert
    expect(result).toBe(process.cwd());
  });

  it('should resolve appRoot from config at cwd when .domscribe is absent', () => {
    // Arrange
    vi.mocked(existsSync).mockReturnValue(false);
    vi.mocked(findConfigFile).mockReturnValueOnce(
      '/monorepo/domscribe.config.json',
    );
    vi.mocked(loadAppRoot).mockReturnValueOnce('/monorepo/apps/web');

    // Act
    const result = getWorkspaceRoot();

    // Assert
    expect(result).toBe('/monorepo/apps/web');
  });

  it('should prefer .domscribe at cwd over config file', () => {
    // Arrange — .domscribe exists at cwd
    vi.mocked(existsSync).mockImplementation((p) =>
      String(p).endsWith('.domscribe'),
    );

    // Act
    const result = getWorkspaceRoot();

    // Assert
    expect(result).toBe(process.cwd());
    // Config loader should not be consulted when .domscribe is found directly
    expect(loadAppRoot).not.toHaveBeenCalled();
  });

  it('should walk up and find .domscribe in parent directory', () => {
    // Arrange
    vi.mocked(existsSync).mockImplementation((p) => {
      const str = String(p);
      return str === '/.domscribe';
    });
    vi.mocked(findConfigFile).mockReturnValue(undefined);
    vi.mocked(statSync).mockReturnValue({
      isDirectory: () => true,
    } as ReturnType<typeof statSync>);

    // Act
    const result = getWorkspaceRoot();

    // Assert
    expect(result).toBe('/');
  });

  it('should walk up and find config in parent directory', () => {
    // Arrange
    vi.mocked(existsSync).mockReturnValue(false);
    vi.mocked(statSync).mockReturnValue({
      isDirectory: () => true,
    } as ReturnType<typeof statSync>);

    // findConfigFile: no config at cwd, then found at root
    vi.mocked(findConfigFile)
      .mockReturnValueOnce(undefined) // step 2: cwd
      .mockImplementation((dir) =>
        dir === '/' ? '/domscribe.config.json' : undefined,
      );
    vi.mocked(loadAppRoot).mockReturnValue('/apps/web');

    // Act
    const result = getWorkspaceRoot();

    // Assert
    expect(result).toBe('/apps/web');
  });

  it('should return undefined when no .domscribe or config is found', () => {
    // Arrange
    vi.mocked(existsSync).mockReturnValue(false);
    vi.mocked(findConfigFile).mockReturnValue(undefined);

    // Act
    const result = getWorkspaceRoot();

    // Assert
    expect(result).toBeUndefined();
  });
});
