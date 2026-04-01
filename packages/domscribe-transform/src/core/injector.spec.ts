/**
 * Tests for DomscribeInjector
 *
 * Tests the core injection logic that injects data-ds attributes on JSX elements.
 * This test suite focuses on testing the business logic of DomscribeInjector only,
 * with all external dependencies mocked.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import os from 'os';
import path from 'path';
import { DomscribeInjector, createInjector } from './injector.js';
import {
  InjectorRegistry,
  isInjectorFileExtension,
} from './injector.registry.js';
import type { ParserInterface } from '../parsers/parser.interface.js';
import type { SourceLocation } from '../parsers/types.js';
import type { ManifestEntry } from '@domscribe/core';
import type { IDGenerator } from '@domscribe/manifest';
import { SourceMapConsumer } from 'source-map';

// Types
interface MockElement {
  type: string;
  name?: { type: string; name: string };
  attributes?: Array<{ type: string; name: { type: string; name: string } }>;
  selfClosing?: boolean;
  hasDataDsAttribute?: boolean;
  start: number;
  end: number;
  loc: SourceLocation;
}

interface MockParser extends ParserInterface<MockElement, MockElement> {
  parse: ReturnType<typeof vi.fn>;
  findJSXOpeningElements: ReturnType<typeof vi.fn>;
  getTagName: ReturnType<typeof vi.fn>;
  hasDataDsAttribute: ReturnType<typeof vi.fn>;
  getLocation: ReturnType<typeof vi.fn>;
  getInsertPosition: ReturnType<typeof vi.fn>;
}

// Mock IDGenerator interface
const mockIdGenerator: IDGenerator = {
  initialize: vi.fn().mockResolvedValue(undefined),
  getStableId: vi.fn().mockReturnValue('stable_id'),
  getFileHash: vi.fn().mockReturnValue('abc123def4567890'),
  saveCache: vi.fn(),
};

// Mock Parser
const mockParser: MockParser = {
  parse: vi.fn(),
  findJSXOpeningElements: vi.fn(),
  getTagName: vi.fn(),
  hasDataDsAttribute: vi.fn(),
  getLocation: vi.fn(),
  getInsertPosition: vi.fn(),
};

// Mock SourceMapConsumer
vi.mock('source-map');
const MockSourceMapConsumer = vi.mocked(SourceMapConsumer);

// Test Helpers
function createMockElement(
  tagName: string,
  attributeNames: string[] = [],
  options: { selfClosing?: boolean; line?: number; column?: number } = {},
): MockElement {
  const { selfClosing = false, line = 1, column = 0 } = options;

  return {
    type: 'JSXOpeningElement',
    name: { type: 'JSXIdentifier', name: tagName },
    attributes: attributeNames.map((name) => ({
      type: 'JSXAttribute',
      name: { type: 'JSXIdentifier', name },
    })),
    selfClosing,
    hasDataDsAttribute: attributeNames.includes('data-ds'),
    start: column,
    end: column + 10,
    loc: {
      start: { line, column },
      end: { line, column: column + 10 },
    },
  };
}

function createMockFragment(line = 1, column = 0): MockElement {
  return {
    type: 'JSXOpeningFragment',
    start: column,
    end: column + 2,
    loc: {
      start: { line, column },
      end: { line, column: column + 2 },
    },
  };
}

function setupParser(elements: MockElement[]): void {
  mockParser.parse.mockReturnValue({ type: 'Program' });
  mockParser.findJSXOpeningElements.mockReturnValue(elements);
  mockParser.getTagName.mockImplementation((element: MockElement) => {
    return element.name?.name ?? 'Fragment';
  });
  mockParser.hasDataDsAttribute.mockImplementation((element: MockElement) => {
    return element.hasDataDsAttribute ?? false;
  });
  mockParser.getLocation.mockImplementation((element: MockElement) => {
    return element.loc;
  });
  mockParser.getInsertPosition.mockImplementation((element: MockElement) => {
    return element.start;
  });
}

async function createMockSourceMapConsumer(
  lineOffset = 0,
): Promise<SourceMapConsumer> {
  const consumer = await new MockSourceMapConsumer('');
  return {
    ...consumer,
    originalPositionFor: vi
      .fn()
      .mockImplementation((pos: { line: number; column: number }) => ({
        line: pos.line + lineOffset,
        column: pos.column,
        source: 'App.tsx',
        name: null,
      })),
    destroy: vi.fn(),
  };
}

describe('DomscribeInjector', () => {
  let injector: DomscribeInjector<MockElement, MockElement>;

  beforeEach(() => {
    vi.clearAllMocks();

    // Reset mocks to defaults
    mockIdGenerator.getStableId = vi.fn().mockReturnValue('stable_id');
    mockIdGenerator.getFileHash = vi.fn().mockReturnValue('abc123def4567890');
    mockIdGenerator.initialize = vi.fn().mockResolvedValue(undefined);
    setupParser([]);

    injector = new DomscribeInjector(mockParser, mockIdGenerator);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Constructor & Initialization', () => {
    it('should create injector with parser and IDGenerator', () => {
      // Arrange & Act
      const testInjector = new DomscribeInjector(mockParser, mockIdGenerator);

      // Assert
      expect(testInjector).toBeDefined();
      expect(testInjector.getParser()).toBe(mockParser);
    });

    it('should create with default options', () => {
      // Arrange & Act
      const testInjector = new DomscribeInjector(mockParser, mockIdGenerator);

      // Assert
      expect(testInjector).toBeDefined();
    });

    it('should create with custom debug option', () => {
      // Arrange & Act
      const testInjector = new DomscribeInjector(mockParser, mockIdGenerator, {
        debug: true,
      });

      // Assert
      expect(testInjector).toBeDefined();
    });

    it('should expose parser via getParser()', () => {
      // Arrange & Act
      const returnedParser = injector.getParser();

      // Assert
      expect(returnedParser).toBe(mockParser);
    });

    it('should initialize IDGenerator when initialize() is called', async () => {
      // Arrange
      const testInjector = new DomscribeInjector(mockParser, mockIdGenerator);

      // Act
      await testInjector.initialize();

      // Assert
      expect(mockIdGenerator.initialize).toHaveBeenCalledTimes(1);
    });
  });

  describe('Empty and Invalid Input', () => {
    it('should return empty result for empty source', () => {
      // Arrange
      const source = '';

      // Act
      const result = injector.inject(source);

      // Assert
      expect(result.code).toBe('');
      expect(result.map).toBeNull();
      expect(result.manifestEntries).toHaveLength(0);
    });

    it('should return original source when no JSX elements found', () => {
      // Arrange
      const source = 'const x = 1; function foo() { return 42; }';
      setupParser([]);

      // Act
      const result = injector.inject(source);

      // Assert
      expect(result.code).toBe(source);
      expect(result.manifestEntries).toHaveLength(0);
    });

    it('should throw error for invalid syntax with sourceFile in message', () => {
      // Arrange
      const source = 'const App = () => <div';
      mockParser.parse.mockImplementation(() => {
        throw new SyntaxError('Unexpected end of input');
      });

      // Act & Assert
      expect(() => injector.inject(source, { sourceFile: 'App.jsx' })).toThrow(
        'Failed to parse App.jsx: Unexpected end of input',
      );
    });
  });

  describe('Basic Injection', () => {
    it('should inject data-ds on a single element', () => {
      // Arrange
      const source = 'const App = () => <div>Hello</div>;';
      const element = createMockElement('div');
      setupParser([element]);

      // Act
      const result = injector.inject(source, { sourceFile: 'App.jsx' });

      // Assert
      expect(result.code).toContain('data-ds="stable_id"');
      expect(result.manifestEntries).toHaveLength(1);
      expect(result.manifestEntries[0]).toEqual<ManifestEntry>({
        id: 'stable_id',
        file: 'App.jsx',
        tagName: 'div',
        start: { line: 1, column: 0 },
        end: { line: 1, column: 10 },
        fileHash: 'abc123def4567890',
      });
    });

    it('should inject data-ds on multiple elements', () => {
      // Arrange
      const source = '<div><span>Hello</span><button>Click</button></div>';
      const elements = [
        createMockElement('div', [], { line: 1, column: 0 }),
        createMockElement('span', [], { line: 1, column: 5 }),
        createMockElement('button', [], { line: 1, column: 24 }),
      ];
      setupParser(elements);

      // Act
      const result = injector.inject(source);

      // Assert
      expect(result.manifestEntries).toHaveLength(3);
      expect(result.manifestEntries[0].tagName).toBe('div');
      expect(result.manifestEntries[1].tagName).toBe('span');
      expect(result.manifestEntries[2].tagName).toBe('button');
    });

    it('should generate unique IDs for each element via IDGenerator', () => {
      // Arrange
      const source = '<div><span>A</span><span>B</span></div>';
      const elements = [
        createMockElement('div', [], { line: 1, column: 0 }),
        createMockElement('span', [], { line: 1, column: 5 }),
        createMockElement('span', [], { line: 1, column: 19 }),
      ];
      setupParser(elements);
      mockIdGenerator.getStableId = vi
        .fn()
        .mockReturnValueOnce('id_1')
        .mockReturnValueOnce('id_2')
        .mockReturnValueOnce('id_3');

      // Act
      const result = injector.inject(source);

      // Assert
      expect(mockIdGenerator.getStableId).toHaveBeenCalledTimes(3);
      expect(result.manifestEntries[0].id).toBe('id_1');
      expect(result.manifestEntries[1].id).toBe('id_2');
      expect(result.manifestEntries[2].id).toBe('id_3');
    });

    it('should generate source maps with correct sources', () => {
      // Arrange
      const source = 'const App = () => <div>Hello</div>;';
      const element = createMockElement('div');
      setupParser([element]);

      // Act
      const result = injector.inject(source, { sourceFile: 'App.jsx' });

      // Assert
      expect(result.map).toBeDefined();
      expect(result.map).not.toBeNull();
      expect(result.map?.sources).toContain('App.jsx');
    });

    it('should use "unknown" as default file name', () => {
      // Arrange
      const source = 'const App = () => <div>Hello</div>;';
      const element = createMockElement('div');
      setupParser([element]);

      // Act
      const result = injector.inject(source);

      // Assert
      expect(result.manifestEntries[0].file).toBe('unknown');
    });

    it('should skip elements with existing data-ds attributes', () => {
      // Arrange
      const source = '<div data-ds="existing123">Hello</div>';
      const element = createMockElement('div', ['data-ds']);
      setupParser([element]);

      // Act
      const result = injector.inject(source);

      // Assert
      expect(result.manifestEntries).toHaveLength(0);
      expect(mockParser.hasDataDsAttribute).toHaveBeenCalledWith(element);
    });
  });

  describe('Element Types', () => {
    it('should handle self-closing elements', () => {
      // Arrange
      const source = 'const App = () => <input type="text" />;';
      const element = createMockElement('input', ['type'], {
        selfClosing: true,
      });
      setupParser([element]);

      // Act
      const result = injector.inject(source);

      // Assert
      expect(result.manifestEntries).toHaveLength(1);
      expect(result.manifestEntries[0].tagName).toBe('input');
    });

    it('should skip Fragment elements', () => {
      // Arrange
      const source = '<><div>Hello</div><div>World</div></>';
      const elements = [
        createMockFragment(1, 0),
        createMockElement('div', [], { line: 1, column: 2 }),
        createMockElement('div', [], { line: 1, column: 18 }),
      ];
      setupParser(elements);

      // Act
      const result = injector.inject(source);

      // Assert
      expect(result.manifestEntries).toHaveLength(2);
      expect(result.manifestEntries[0].tagName).toBe('div');
      expect(result.manifestEntries[1].tagName).toBe('div');
    });

    it('should handle nested elements', () => {
      // Arrange
      const source =
        '<div><section><article><p>Text</p></article></section></div>';
      const elements = [
        createMockElement('div', [], { line: 1, column: 0 }),
        createMockElement('section', [], { line: 1, column: 5 }),
        createMockElement('article', [], { line: 1, column: 14 }),
        createMockElement('p', [], { line: 1, column: 23 }),
      ];
      setupParser(elements);

      // Act
      const result = injector.inject(source);

      // Assert
      expect(result.manifestEntries).toHaveLength(4);
      expect(result.manifestEntries.map((e) => e.tagName)).toEqual([
        'div',
        'section',
        'article',
        'p',
      ]);
    });

    it('should handle elements with attributes', () => {
      // Arrange
      const source =
        '<button className="btn" onClick={handleClick}>Click</button>';
      const element = createMockElement('button', ['className', 'onClick']);
      setupParser([element]);

      // Act
      const result = injector.inject(source);

      // Assert
      expect(result.manifestEntries).toHaveLength(1);
      expect(result.manifestEntries[0].tagName).toBe('button');
    });
  });

  describe('Source Location & Source Maps', () => {
    it('should include start and end positions in manifest entries', () => {
      // Arrange
      const source = '<div>Hello</div>';
      const element = createMockElement('div', [], { line: 5, column: 10 });
      setupParser([element]);

      // Act
      const result = injector.inject(source);

      // Assert
      expect(result.manifestEntries).toHaveLength(1);
      expect(result.manifestEntries[0].start).toEqual({
        line: 5,
        column: 10,
      });
      expect(result.manifestEntries[0].end).toEqual({
        line: 5,
        column: 20,
      });
    });

    it('should skip elements with null location', () => {
      // Arrange
      const source = '<div>Hello</div>';
      const element = createMockElement('div');
      setupParser([element]);
      mockParser.getLocation.mockReturnValue(null);

      // Act
      const result = injector.inject(source);

      // Assert
      expect(result.manifestEntries).toHaveLength(0);
    });

    it('should skip elements with null start position', () => {
      // Arrange
      const source = '<div>Hello</div>';
      const element = createMockElement('div');
      setupParser([element]);
      mockParser.getLocation.mockReturnValue({
        start: null,
        end: { line: 1, column: 10 },
      });

      // Act
      const result = injector.inject(source);

      // Assert
      expect(result.manifestEntries).toHaveLength(0);
    });

    it('should resolve positions through source map consumer', async () => {
      // Arrange
      const source = '<div>Hello</div>';
      const element = createMockElement('div', [], { line: 1, column: 0 });
      setupParser([element]);
      const sourceMapConsumer = await createMockSourceMapConsumer(2);

      sourceMapConsumer.originalPositionFor = vi.fn().mockReturnValue({
        line: 3,
        column: 0,
      });

      // Act
      const result = injector.inject(source, {
        sourceFile: 'App.jsx',
        sourceMapConsumer,
      });

      // Assert
      expect(result.manifestEntries).toHaveLength(1);
      expect(result.manifestEntries[0].start).toEqual({
        line: 3,
        column: 0,
      });
    });

    it('should fallback to transpiled positions when source map returns null', () => {
      // Arrange
      const source = '<div>Hello</div>';
      const element = createMockElement('div', [], { line: 5, column: 10 });
      setupParser([element]);

      const sourceMapConsumer: Partial<SourceMapConsumer> = {
        originalPositionFor: vi.fn().mockReturnValue({
          line: null,
          column: null,
        }),
        destroy: vi.fn(),
      };

      // Act
      const result = injector.inject(source, {
        sourceFile: 'App.jsx',
        sourceMapConsumer: sourceMapConsumer as SourceMapConsumer,
      });

      // Assert
      expect(result.manifestEntries).toHaveLength(1);
      expect(result.manifestEntries[0].start).toEqual({
        line: 5,
        column: 10,
      });
    });

    it('should work without source map consumer', () => {
      // Arrange
      const source = '<div>Hello</div>';
      const element = createMockElement('div', [], { line: 1, column: 0 });
      setupParser([element]);

      // Act
      const result = injector.inject(source, {
        sourceFile: 'App.jsx',
        sourceMapConsumer: undefined,
      });

      // Assert
      expect(result.manifestEntries).toHaveLength(1);
      expect(result.manifestEntries[0].start).toEqual({ line: 1, column: 0 });
    });

    it('should resolve end positions through source map', async () => {
      // Arrange
      const source = '<div>Hello</div>';
      const element = createMockElement('div', [], { line: 1, column: 0 });
      setupParser([element]);
      const sourceMapConsumer = await createMockSourceMapConsumer(2);

      // Act
      const result = injector.inject(source, {
        sourceMapConsumer,
      });

      // Assert
      expect(result.manifestEntries[0].end).toEqual({
        line: 3,
        column: 10,
      });
    });

    it('should handle missing end position in source location', async () => {
      // Arrange
      const source = '<div>Hello</div>';
      const element = createMockElement('div', [], { line: 1, column: 0 });
      element.loc.end = undefined;
      setupParser([element]);
      const sourceMapConsumer = await createMockSourceMapConsumer(2);

      // Act
      const result = injector.inject(source, {
        sourceMapConsumer,
      });

      // Assert
      expect(result.manifestEntries[0].end).toBeUndefined();
    });
  });

  describe('ID Generation', () => {
    it('should always use IDGenerator.getStableId()', () => {
      // Arrange
      const source = '<div>Hello</div>';
      const element = createMockElement('div', [], { line: 5, column: 10 });
      setupParser([element]);

      // Act
      injector.inject(source, { sourceFile: 'App.jsx' });

      // Assert
      expect(mockIdGenerator.getStableId).toHaveBeenCalledTimes(1);
    });

    it('should pass FileIdentity with filePath and fileContent', () => {
      // Arrange
      const source = '<div>Hello</div>';
      const element = createMockElement('div', [], { line: 5, column: 10 });
      setupParser([element]);

      // Act
      injector.inject(source, { sourceFile: 'App.jsx' });

      // Assert
      expect(mockIdGenerator.getStableId).toHaveBeenCalledWith(
        {
          filePath: 'App.jsx',
          fileContent: source,
        },
        { line: 5, column: 10 },
      );
    });

    it('should pass correct SourcePosition to IDGenerator', () => {
      // Arrange
      const source = '<div>Hello</div>';
      const element = createMockElement('div', [], { line: 10, column: 20 });
      setupParser([element]);

      // Act
      injector.inject(source, { sourceFile: 'Test.jsx' });

      // Assert
      expect(mockIdGenerator.getStableId).toHaveBeenCalledWith(
        expect.any(Object),
        { line: 10, column: 20 },
      );
    });

    it('should generate unique IDs for elements at different positions', () => {
      // Arrange
      const source = '<div><span>A</span><span>B</span></div>';
      const elements = [
        createMockElement('div', [], { line: 1, column: 0 }),
        createMockElement('span', [], { line: 1, column: 5 }),
        createMockElement('span', [], { line: 1, column: 19 }),
      ];
      setupParser(elements);
      mockIdGenerator.getStableId = vi
        .fn()
        .mockReturnValueOnce('pos_1_0')
        .mockReturnValueOnce('pos_1_5')
        .mockReturnValueOnce('pos_1_19');

      // Act
      const result = injector.inject(source);

      // Assert
      expect(result.manifestEntries[0].id).toBe('pos_1_0');
      expect(result.manifestEntries[1].id).toBe('pos_1_5');
      expect(result.manifestEntries[2].id).toBe('pos_1_19');
    });
  });
});

describe('Factory & Registry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createInjector()', () => {
    it('should create injector with provided parser', () => {
      // Arrange
      const parser = mockParser;
      const workspaceRoot = '/workspace';

      // Act
      const injector = createInjector(parser, workspaceRoot);

      // Assert
      expect(injector).toBeDefined();
      expect(injector.getParser()).toBe(parser);
    });

    it('should create IDStabilizer internally with workspaceRoot', () => {
      // Arrange
      const parser = mockParser;
      const workspaceRoot = '/workspace';

      // Act
      const injector = createInjector(parser, workspaceRoot);

      // Assert
      expect(injector).toBeDefined();
      // IDStabilizer is created internally, we can't directly test it
      // but we can verify the injector works
      const result = injector.inject('');
      expect(result).toBeDefined();
    });

    it('should pass options to injector', () => {
      // Arrange
      const parser = mockParser;
      const workspaceRoot = '/workspace';
      const options = { debug: true };

      // Act
      const injector = createInjector(parser, workspaceRoot, options);

      // Assert
      expect(injector).toBeDefined();
    });
  });

  describe('InjectorRegistry', () => {
    it('should create jsx and tsx injectors via getInjector()', async () => {
      // Arrange
      const workspaceRoot = path.join(os.tmpdir(), 'ds-registry-test-1');

      // Act
      const registry = InjectorRegistry.getInstance(workspaceRoot);

      // Assert
      expect(registry).toBeDefined();
      expect(await registry.getInjector('jsx')).toBeDefined();
      expect(await registry.getInjector('tsx')).toBeDefined();
    });

    it('should use AcornParser for jsx', async () => {
      // Arrange
      const workspaceRoot = path.join(os.tmpdir(), 'ds-registry-test-2');

      // Act
      const registry = InjectorRegistry.getInstance(workspaceRoot);
      const jsxInjector = await registry.getInjector('jsx');

      // Assert
      expect(jsxInjector.getParser()).toBeDefined();
      expect(jsxInjector.getParser().constructor.name).toBe('AcornParser');
    });

    it('should use BabelParser for tsx', async () => {
      // Arrange
      const workspaceRoot = path.join(os.tmpdir(), 'ds-registry-test-3');

      // Act
      const registry = InjectorRegistry.getInstance(workspaceRoot);
      const tsxInjector = await registry.getInjector('tsx');

      // Assert
      expect(tsxInjector.getParser()).toBeDefined();
      expect(tsxInjector.getParser().constructor.name).toBe('BabelParser');
    });

    it('should return same instance for same workspaceRoot', () => {
      // Arrange
      const workspaceRoot = path.join(os.tmpdir(), 'ds-registry-test-4');

      // Act
      const registry1 = InjectorRegistry.getInstance(workspaceRoot);
      const registry2 = InjectorRegistry.getInstance(workspaceRoot);

      // Assert
      expect(registry1).toBe(registry2);
    });
  });

  describe('isInjectorFileExtension()', () => {
    it('should validate jsx extension', () => {
      // Act & Assert
      expect(isInjectorFileExtension('jsx')).toBe(true);
    });

    it('should validate tsx extension', () => {
      // Act & Assert
      expect(isInjectorFileExtension('tsx')).toBe(true);
    });

    it('should reject other extensions', () => {
      // Act & Assert
      expect(isInjectorFileExtension('js')).toBe(false);
      expect(isInjectorFileExtension('ts')).toBe(false);
      expect(isInjectorFileExtension('css')).toBe(false);
      expect(isInjectorFileExtension('')).toBe(false);
    });
  });
});
