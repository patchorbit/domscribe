import { existsSync, readFileSync } from 'node:fs';

import { findConfigFile, loadAppRoot } from './config-loader.js';

vi.mock('node:fs', () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
}));

describe('findConfigFile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return JSON config path when it exists', () => {
    // Arrange
    vi.mocked(existsSync).mockImplementation(
      (p) => String(p) === '/project/domscribe.config.json',
    );

    // Act
    const result = findConfigFile('/project');

    // Assert
    expect(result).toBe('/project/domscribe.config.json');
  });

  it('should prefer JSON over JS and TS', () => {
    // Arrange
    vi.mocked(existsSync).mockReturnValue(true);

    // Act
    const result = findConfigFile('/project');

    // Assert
    expect(result).toBe('/project/domscribe.config.json');
  });

  it('should fall back to JS when JSON does not exist', () => {
    // Arrange
    vi.mocked(existsSync).mockImplementation(
      (p) => String(p) === '/project/domscribe.config.js',
    );

    // Act
    const result = findConfigFile('/project');

    // Assert
    expect(result).toBe('/project/domscribe.config.js');
  });

  it('should return undefined when no config file exists', () => {
    // Arrange
    vi.mocked(existsSync).mockReturnValue(false);

    // Act
    const result = findConfigFile('/project');

    // Assert
    expect(result).toBeUndefined();
  });
});

describe('loadAppRoot', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should parse valid JSON and resolve appRoot', () => {
    // Arrange
    vi.mocked(readFileSync).mockReturnValue(
      JSON.stringify({ appRoot: './apps/web' }),
    );

    // Act
    const result = loadAppRoot('/monorepo/domscribe.config.json');

    // Assert
    expect(result).toBe('/monorepo/apps/web');
  });

  it('should resolve relative paths with parent traversal', () => {
    // Arrange
    vi.mocked(readFileSync).mockReturnValue(
      JSON.stringify({ appRoot: '../frontend' }),
    );

    // Act
    const result = loadAppRoot('/monorepo/config/domscribe.config.json');

    // Assert
    expect(result).toBe('/monorepo/frontend');
  });

  it('should throw on missing appRoot field', () => {
    // Arrange
    vi.mocked(readFileSync).mockReturnValue(JSON.stringify({}));

    // Act & Assert
    expect(() => loadAppRoot('/project/domscribe.config.json')).toThrow();
  });

  it('should throw on invalid JSON', () => {
    // Arrange
    vi.mocked(readFileSync).mockReturnValue('not json');

    // Act & Assert
    expect(() => loadAppRoot('/project/domscribe.config.json')).toThrow();
  });
});
