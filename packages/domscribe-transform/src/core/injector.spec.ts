/**
 * Unit tests for DomscribeInjector
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DomscribeInjector, createInjector } from './injector.js';
import { AcornParser } from '../parsers/acorn/acorn.parser.js';
import { SourceMapConsumer } from 'source-map';
import { IDStabilizer } from '@domscribe/manifest';
import { Node } from 'acorn';
import { generateElementId } from '@domscribe/core';

vi.mock('../parsers/acorn/acorn.parser.js');
vi.mock('@domscribe/manifest');
vi.mock('source-map');
vi.mock('@domscribe/core', () => {
  return {
    generateElementId: vi.fn().mockImplementation(() => '12345678'),
  };
});

// Create a mock for AcornParser
const MockAcornParser = vi.mocked(AcornParser);
const MockStabilizer = vi.mocked(IDStabilizer);
const MockSourceMapConsumer = vi.mocked(SourceMapConsumer);

describe('DomscribeInjector', () => {
  let parser: AcornParser;
  let injector: DomscribeInjector<unknown, unknown>;
  let stabilizer: IDStabilizer;

  beforeEach(() => {
    parser = new MockAcornParser();
    stabilizer = new MockStabilizer('/test/cache');
    injector = new DomscribeInjector(parser, stabilizer);

    // Some default elements
    loadParserWithElements(parser, [getMockOpeningElement('div', ['style'])]);
  });

  describe('constructor', () => {
    it('should create an injector with a parser', () => {
      expect(injector).toBeDefined();
      expect(injector.getParser()).toBe(parser);
    });

    it('should work with createInjector factory', () => {
      const factoryInjector = createInjector(parser, stabilizer);
      expect(factoryInjector).toBeDefined();
      expect(factoryInjector.getParser()).toBe(parser);
    });
  });

  describe('inject()', () => {
    describe('Basic Injection', () => {
      it('should inject data-ds on a single element', () => {
        const source = 'const App = () => <div>Hello</div>;';
        const result = injector.inject(source, { sourceFile: 'App.jsx' });

        expect(result.code).toContain('data-ds=');
        expect(result.code).toContain('<div');
        expect(result.code).toContain('>Hello</div>');
        expect(result.manifestEntries).toHaveLength(1);
        expect(result.manifestEntries[0].tagName).toBe('div');
        expect(result.manifestEntries[0].file).toBe('App.jsx');
      });

      it('should inject data-ds on multiple elements', () => {
        const source = `
          const App = () => (
            <div>
              <span>Hello</span>
              <button>Click</button>
            </div>
          );
        `;

        loadParserWithElements(parser, [
          getMockOpeningElement('div'),
          getMockOpeningElement('span'),
          getMockOpeningElement('button'),
        ]);

        const result = injector.inject(source);

        const matches = result.code.match(/data-ds="/g);
        expect(matches).toHaveLength(3); // div, span, button
        expect(result.manifestEntries).toHaveLength(3);
      });

      it('should inject unique IDs for each element', () => {
        const fileHash = 'abc123';
        const source = '<div><span>A</span><span>B</span></div>';

        loadParserWithElements(parser, [
          getMockOpeningElement('div'),
          getMockOpeningElement('span'),
          getMockOpeningElement('span'),
        ]);

        injector.inject(source, { fileHash });

        expect(stabilizer.getStableId).toHaveBeenCalledTimes(3);
      });

      it('should generate source maps', () => {
        const source = 'const App = () => <div>Hello</div>;';
        const result = injector.inject(source, { sourceFile: 'App.jsx' });

        expect(result.map).toBeDefined();
        expect(result.map).not.toBeNull();
        if (result.map) {
          expect(result.map.sources).toContain('App.jsx');
        }
      });
    });

    describe('Element Types', () => {
      it('should handle self-closing elements', () => {
        const source = 'const App = () => <input type="text" />;';

        loadParserWithElements(parser, [
          getMockOpeningElement('input', [], true),
        ]);

        const result = injector.inject(source);

        expect(result.code).toContain('data-ds=');
        expect(result.code).toContain('<input');
        expect(result.code).toContain('/>');
        expect(result.manifestEntries).toHaveLength(1);
        expect(result.manifestEntries[0].tagName).toBe('input');
      });

      it('should handle fragments', () => {
        const source = `
          const App = () => (
            <>
              <div>Hello</div>
              <div>World</div>
            </>
          );
        `;
        loadParserWithElements(parser, [
          getMockOpeningFragment(),
          getMockOpeningElement('div'),
          getMockOpeningElement('div'),
        ]);

        const result = injector.inject(source);

        const matches = result.code.match(/data-ds="/g);
        expect(matches).toHaveLength(3); // fragment + 2 divs
        expect(result.manifestEntries).toHaveLength(3);
      });

      it('should handle nested elements', () => {
        const source = `
          const App = () => (
            <div>
              <section>
                <article>
                  <p>Text</p>
                </article>
              </section>
            </div>
          );
        `;
        loadParserWithElements(parser, [
          getMockOpeningElement('div'),
          getMockOpeningElement('section'),
          getMockOpeningElement('article'),
          getMockOpeningElement('p'),
        ]);

        const result = injector.inject(source);

        expect(result.manifestEntries).toHaveLength(4); // div, section, article, p
        const components = result.manifestEntries.map((e) => e.tagName);
        expect(components).toContain('div');
        expect(components).toContain('section');
        expect(components).toContain('article');
        expect(components).toContain('p');
      });

      it('should handle elements with attributes', () => {
        // Arrange
        const source =
          'const App = () => <button className="btn" onClick={handleClick}>Click</button>;';
        loadParserWithElements(parser, [
          getMockOpeningElement('button', ['className']),
        ]);

        // Act
        const result = injector.inject(source);

        // Assert
        expect(result.code).toContain('data-ds=');
        expect(result.code).toContain('className="btn"');
        expect(result.code).toContain('onClick={handleClick}');
        expect(result.manifestEntries).toHaveLength(1);
      });
    });

    describe('Deduplication', () => {
      it('should not inject duplicate data-ds attributes', () => {
        // Arrange
        const source =
          'const App = () => <div data-ds="existing123">Hello</div>;';
        loadParserWithElements(parser, [
          getMockOpeningElement('div', ['data-ds']),
        ]);

        // Act
        const result = injector.inject(source);

        // Assert
        const matches = result.code.match(/data-ds="/g);
        expect(matches).toHaveLength(1); // Should only have the existing one
        expect(result.code).toContain('data-ds="existing123"');
        expect(result.manifestEntries).toHaveLength(0); // No new entries
      });

      it('should inject on elements without data-ds but skip those with it', () => {
        // Arrange
        const source = `
          const App = () => (
            <div>
              <span data-ds="existing123">Has ID</span>
              <span>No ID</span>
            </div>
          );
        `;
        loadParserWithElements(parser, [
          getMockOpeningElement('div'),
          getMockOpeningElement('span', ['data-ds']),
          getMockOpeningElement('span'),
        ]);

        // Act
        const result = injector.inject(source);

        // Assert
        const matches = result.code.match(/data-ds="/g);
        expect(matches).toHaveLength(3); // div, existing span, new span
        expect(result.manifestEntries).toHaveLength(2); // Only div and new span
      });
    });

    describe('Source Location Information', () => {
      it('should include start and end positions in manifest entries', () => {
        const source = 'const App = () => <div>Hello</div>;';
        loadParserWithElements(parser, [getMockOpeningElement('div')]);

        // Act
        const result = injector.inject(source);

        // Assert
        expect(result.manifestEntries).toHaveLength(1);
        const entry = result.manifestEntries[0];

        expect(entry.start).toBeDefined();
        expect(entry.start.line).toBeGreaterThan(0);
        expect(entry.start.column).toBeGreaterThanOrEqual(0);

        expect(entry.end).toBeDefined();
        expect(entry.end?.line).toBeGreaterThan(0);
        expect(entry.end?.column).toBeGreaterThanOrEqual(0);
      });
    });

    describe('Source Map Resolution', () => {
      it('should resolve positions through source map consumer', () => {
        const source = 'const App = () => <div>Hello</div>;';

        // Mock source map consumer
        const mockConsumer = {
          originalPositionFor: vi.fn(
            (pos: { line: number; column: number }) => {
              // Simulate TypeScript source being 2 lines higher
              return {
                line: pos.line + 2,
                column: pos.column,
                source: 'App.tsx',
                name: null,
              };
            },
          ),
          destroy: vi.fn(),
        } as unknown as SourceMapConsumer;

        const result = injector.inject(source, {
          sourceFile: 'App.jsx',
          sourceMapConsumer: mockConsumer,
        });

        expect(result.manifestEntries).toHaveLength(1);
        const entry = result.manifestEntries[0];

        // Positions should be resolved (original + 2)
        expect(entry.start.line).toBeGreaterThan(1); // Should be original line + 2
        expect(mockConsumer.originalPositionFor).toHaveBeenCalled();
      });

      it('should fallback to transpiled positions when resolution fails', async () => {
        // Arrange
        const source = 'const App = () => <div>Hello</div>;';

        // Mock source map consumer to return null
        const sourceMapConsumer = await new MockSourceMapConsumer('');
        sourceMapConsumer.originalPositionFor = vi.fn(() => ({
          line: null,
          column: null,
          source: null,
          name: null,
        }));
        sourceMapConsumer.destroy = vi.fn();

        // Enable debug mode
        injector = new DomscribeInjector(parser, stabilizer, { debug: true });

        // Spy on console.warn
        const consoleWarnSpy = vi.spyOn(console, 'warn');

        // Act
        const result = injector.inject(source, {
          sourceFile: 'App.jsx',
          sourceMapConsumer,
        });

        // Assert
        expect(result.manifestEntries).toHaveLength(1);
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          expect.stringContaining('Could not resolve original position'),
        );

        // Restore spy
        consoleWarnSpy.mockRestore();
      });

      it('should work without source map consumer', () => {
        const source = 'const App = () => <div>Hello</div>;';

        const result = injector.inject(source, {
          sourceFile: 'App.jsx',
          sourceMapConsumer: undefined,
        });

        expect(result.manifestEntries).toHaveLength(1);
        expect(result.manifestEntries[0].start.line).toBeGreaterThan(0);
      });
    });

    describe('Manifest Entries', () => {
      it('should include all required fields in manifest entries', () => {
        // Arrange
        const source = 'const App = () => <div>Hello</div>;';

        // Act
        const result = injector.inject(source, { sourceFile: 'App.jsx' });

        // Assert
        expect(result.manifestEntries).toHaveLength(1);
        const entry = result.manifestEntries[0];

        expect(entry.id).toBeDefined();
        expect(entry.id).toHaveLength(8); // 8-char nanoid
        expect(entry.file).toBe('App.jsx');
        expect(entry.tagName).toBe('div');
        expect(entry.start).toBeDefined();
        expect(entry.end).toBeDefined();
      });

      it('should use "unknown" as default file name', () => {
        // Arrange
        const source = 'const App = () => <div>Hello</div>;';

        // Act
        const result = injector.inject(source);

        // Assert
        expect(result.manifestEntries).toHaveLength(1);
        expect(result.manifestEntries[0].file).toBe('unknown');
      });

      it('should generate manifest entries in order', () => {
        // Arrange
        const source = `
          const App = () => (
            <div>
              <span>First</span>
              <button>Second</button>
              <input />
            </div>
          );
        `;
        loadParserWithElements(parser, [
          getMockOpeningElement('div'),
          getMockOpeningElement('span'),
          getMockOpeningElement('button'),
          getMockOpeningElement('input'),
        ]);

        // Act
        const result = injector.inject(source);

        // Assert
        expect(result.manifestEntries).toHaveLength(4);
        expect(result.manifestEntries[0].tagName).toBe('div');
        expect(result.manifestEntries[1].tagName).toBe('span');
        expect(result.manifestEntries[2].tagName).toBe('button');
        expect(result.manifestEntries[3].tagName).toBe('input');
      });
    });

    describe('Error Handling', () => {
      it('should throw error for invalid syntax', () => {
        // Arrange
        const source = 'const App = () => <div'; // Invalid JSX
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        parser.parse = vi.fn().mockImplementation((...args) => {
          throw new SyntaxError('Invalid syntax');
        });

        // Act & Assert
        expect(() => injector.inject(source)).toThrow(
          'Failed to parse unknown: Invalid syntax',
        );
      });

      it('should throw error with file name', () => {
        // Arrange
        const source = 'const App = () => <div'; // Invalid JSX
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        parser.parse = vi.fn().mockImplementation((...args) => {
          throw new SyntaxError('Invalid syntax');
        });

        // Act & Assert
        expect(() =>
          injector.inject(source, { sourceFile: 'App.jsx' }),
        ).toThrow(/App\.jsx/);
      });

      it('should handle empty source', () => {
        // Arrange
        const source = '';
        const result = injector.inject(source);

        // Assert
        expect(result.code).toBe('');
        expect(result.manifestEntries).toHaveLength(0);
      });

      it('should handle source with no JSX', () => {
        // Arrange
        const source = 'const x = 1; function foo() { return 42; }';
        loadParserWithElements(parser, []);

        // Act
        const result = injector.inject(source);

        // Assert
        expect(result.code).toBe(source);
        expect(result.manifestEntries).toHaveLength(0);
      });

      it('should warn if element location is unavailable', () => {
        // Arrange
        const source = 'const App = () => <div>Hello</div>;';
        loadParserWithElements(parser, [getMockOpeningElement('div')]);
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        parser.getLocation = vi.fn().mockImplementation((...args) => {
          return null;
        });

        // Spy on console.warn
        const consoleWarnSpy = vi.spyOn(console, 'warn');

        // Enable debug mode
        injector = new DomscribeInjector(parser, stabilizer, { debug: true });

        // Act
        const result = injector.inject(source, { sourceFile: 'App.jsx' });

        // Assert
        expect(result.manifestEntries).toHaveLength(0);
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          expect.stringContaining(
            'Could not get location for element in App.jsx',
          ),
        );

        // Restore spy
        consoleWarnSpy.mockRestore();
      });
    });

    describe('Edge Cases', () => {
      it('should handle JSX expressions in children', () => {
        // Arrange
        const source = 'const App = () => <div>{someVar}</div>;';
        loadParserWithElements(parser, [getMockOpeningElement('div')]);

        // Act
        const result = injector.inject(source);

        // Assert
        expect(result.code).toContain('data-ds=');
        expect(result.code).toContain('{someVar}');
        expect(result.manifestEntries).toHaveLength(1);
      });

      it('should handle very long attribute values', () => {
        // Arrange
        const longValue = 'a'.repeat(1000);
        const source = `const App = () => <div title="${longValue}">Hello</div>;`;
        loadParserWithElements(parser, [
          getMockOpeningElement('div', ['title']),
        ]);

        // Act
        const result = injector.inject(source);

        // Assert
        expect(result.code).toContain('data-ds=');
        expect(result.code).toContain(longValue);
        expect(result.manifestEntries).toHaveLength(1);
      });

      it('should handle elements with many attributes', () => {
        // Arrange
        const source = `
          const App = () => (
            <input
              type="text"
              className="input"
              id="user-input"
              placeholder="Enter text"
              value={value}
              onChange={handleChange}
              onFocus={handleFocus}
              onBlur={handleBlur}
              disabled={isDisabled}
              required
            />
          );
        `;
        loadParserWithElements(parser, [
          getMockOpeningElement('input', [
            'type',
            'className',
            'id',
            'placeholder',
            'value',
            'onChange',
            'onFocus',
            'onBlur',
            'disabled',
            'required',
          ]),
        ]);

        // Act
        const result = injector.inject(source);

        // Assert
        expect(result.code).toContain('data-ds=');
        expect(result.manifestEntries).toHaveLength(1);
      });

      it('should preserve existing React keys', () => {
        // Arrange
        const source = 'const App = () => <div key="item-1">Hello</div>;';
        loadParserWithElements(parser, [getMockOpeningElement('div')]);

        // Act
        const result = injector.inject(source);

        // Assert
        expect(result.code).toContain('key="item-1"');
        expect(result.code).toContain('data-ds=');
        expect(result.manifestEntries).toHaveLength(1);
      });

      it('should handle comments in JSX', () => {
        // Arrange
        const source = `
          const App = () => (
            <div>
              {/* This is a comment */}
              <span>Hello</span>
            </div>
          );
        `;
        loadParserWithElements(parser, [
          getMockOpeningElement('div'),
          getMockOpeningElement('span'),
        ]);

        // Act
        const result = injector.inject(source);

        // Assert
        expect(result.code).toContain('/* This is a comment */');
        expect(result.manifestEntries).toHaveLength(2); // div + span
      });

      it('should handle empty elements', () => {
        // Arrange
        const source = 'const App = () => <div></div>;';
        loadParserWithElements(parser, [getMockOpeningElement('div')]);

        // Act
        const result = injector.inject(source);

        // Assert
        expect(result.code).toContain('data-ds=');
        expect(result.manifestEntries).toHaveLength(1);
      });

      it('should handle elements with only whitespace', () => {
        // Arrange
        const source = 'const App = () => <div>   </div>;';
        loadParserWithElements(parser, [getMockOpeningElement('div')]);

        // Act
        const result = injector.inject(source);

        // Assert
        expect(result.code).toContain('data-ds=');
        expect(result.manifestEntries).toHaveLength(1);
      });
    });

    describe('Performance', () => {
      beforeEach(async () => {
        // Require actual classes
        const { IDStabilizer: RealIDStabilizer } = await vi.importActual<{
          IDStabilizer: typeof IDStabilizer;
        }>('@domscribe/manifest');
        const { AcornParser: RealAcornParser } = await vi.importActual<{
          AcornParser: typeof AcornParser;
        }>('../parsers/acorn/acorn.parser.js');

        parser = new RealAcornParser();
        stabilizer = new RealIDStabilizer('/test/cache');
        injector = new DomscribeInjector(parser, stabilizer);
      });

      it('should handle large files efficiently', () => {
        // Generate a file with 100 elements
        const elements = Array.from(
          { length: 100 },
          (_, i) => `<div key={${i}}>Item ${i}</div>`,
        );
        const source = `const App = () => (<div>${elements.join('\n')}</div>);`;

        // Act
        const start = performance.now();
        const result = injector.inject(source);
        const duration = performance.now() - start;

        // Assert
        expect(result.manifestEntries).toHaveLength(101); // 100 items + 1 wrapper
        expect(duration).toBeLessThan(100); // Should be fast (<100ms)
      });

      it('should handle deeply nested structures', () => {
        // Create a deeply nested structure
        let source = 'const App = () => (';
        for (let i = 0; i < 20; i++) {
          source += '<div>';
        }
        source += 'Content';
        for (let i = 0; i < 20; i++) {
          source += '</div>';
        }
        source += ');';

        const result = injector.inject(source);

        expect(result.manifestEntries).toHaveLength(20);
      });
    });

    describe('getParser()', () => {
      it('should return the parser instance', () => {
        const returnedParser = injector.getParser();
        expect(returnedParser).toBe(parser);
      });
    });

    describe('ID Stabilization', () => {
      beforeEach(() => {
        vi.clearAllMocks();
      });

      it('should generate stable IDs', () => {
        const source = '<div><span>Hello</span></div>';
        const fileHash = 'abc123def456';

        parser.findJSXOpeningElements = vi
          .fn()
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          .mockImplementation((...args) => {
            return [
              getMockOpeningElement('div'),
              getMockOpeningElement('span'),
            ];
          });

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        stabilizer.getStableId = vi.fn().mockImplementation((...args) => {
          return 'stable_123';
        });

        const result = injector.inject(source, {
          sourceFile: 'App.jsx',
          fileHash,
        });

        // Should use stabilizer for all elements
        expect(stabilizer.getStableId).toHaveBeenCalledTimes(2); // div + span
        expect(result.manifestEntries).toHaveLength(2);
        expect(result.manifestEntries[0].id).toContain('stable_');
        expect(result.manifestEntries[1].id).toContain('stable_');
      });

      it('should fallback to random IDs when fileHash is missing', () => {
        const source = '<div>Hello</div>';
        injector.inject(source, {
          sourceFile: 'App.jsx',
          // fileHash intentionally missing
        });

        // Should NOT use stabilizer without fileHash
        expect(stabilizer.getStableId).not.toHaveBeenCalled();
        expect(generateElementId).toHaveBeenCalled();
      });

      it('should pass correct parameters to IDStabilizer', () => {
        const source = '<div>Hello</div>';
        const fileHash = 'testhash123';
        const sourceFile = 'TestComponent.jsx';

        injector.inject(source, {
          sourceFile,
          fileHash,
        });

        // Verify correct parameters passed
        expect(stabilizer.getStableId).toHaveBeenCalledWith(
          sourceFile,
          fileHash,
          {
            line: expect.any(Number),
            column: expect.any(Number),
          },
        );
      });
    });
  });
});

const mockNode: Node = {
  type: '',
  start: 0,
  end: 0,
  loc: {
    start: {
      line: 1,
      column: 1,
    },
    end: {
      line: 1,
      column: 1,
    },
  },
};

const getMockAttribute = (name: string) => {
  return {
    type: 'JSXAttribute',
    name: {
      type: 'JSXIdentifier',
      name,
    },
  };
};

const getMockOpeningElement = (
  name: string,
  attributeNames: string[] = [],
  selfClosing = false,
) => {
  return {
    ...mockNode,
    type: 'JSXOpeningElement',
    name: { type: 'JSXIdentifier', name },
    attributes: attributeNames.map((attributeName) =>
      getMockAttribute(attributeName),
    ),
    selfClosing,
    hasDataDsAttribute: attributeNames.includes('data-ds'),
  };
};

const getMockOpeningFragment = () => {
  return {
    ...mockNode,
    type: 'JSXOpeningFragment',
  };
};

const loadParserWithElements = (parser: AcornParser, elements: Node[]) => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  parser.parse = vi.fn().mockImplementation((...args) => {
    return {
      ...mockNode,
      type: 'Program',
    };
  });
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  parser.findJSXOpeningElements = vi.fn().mockImplementation((...args) => {
    return elements;
  });
  parser.getTagName = vi.fn().mockImplementation((element) => {
    return element.name?.name ?? 'Unknown';
  });
  parser.hasDataDsAttribute = vi.fn().mockImplementation((element) => {
    return element.hasDataDsAttribute;
  });
  parser.getLocation = vi.fn().mockImplementation((element) => {
    return element.loc;
  });
  parser.getInsertPosition = vi.fn().mockImplementation((element) => {
    return element.start;
  });
};
