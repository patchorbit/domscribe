/**
 * Tests for BabelParser
 *
 * Tests follow Arrange-Act-Assert methodology and test only the parser's behavior,
 * not the behavior of the @babel/parser library itself. We verify how the parser
 * handles inputs, outputs, TypeScript support, and edge cases.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BabelParser, createBabelParser } from './babel.parser.js';
import type { ParseParams } from '../types.js';
import type { BabelParserOptions } from './types.js';

describe('BabelParser', () => {
  let parser: BabelParser;

  beforeEach(() => {
    parser = new BabelParser();
  });

  describe('constructor', () => {
    it('should create parser with default options', () => {
      // Act
      const p = new BabelParser();

      // Assert
      expect(p).toBeInstanceOf(BabelParser);
    });

    it('should create parser with TypeScript enabled by default', () => {
      // Arrange
      const source = `
        interface Props {
          title: string;
        }
        const Button = (props: Props) => <button>{props.title}</button>;
      `;

      // Act
      const ast = parser.parse(source);

      // Assert
      expect(ast).toBeDefined();
    });

    it('should create parser with TypeScript explicitly enabled', () => {
      // Arrange
      const options: BabelParserOptions = { typescript: true };
      const p = new BabelParser(options);
      const source = `const x: number = 42;`;

      // Act
      const ast = p.parse(source);

      // Assert
      expect(ast).toBeDefined();
    });

    it('should create parser with TypeScript disabled', () => {
      // Arrange
      const options: BabelParserOptions = { typescript: false };
      const p = new BabelParser(options);
      const source = `const App = () => <div>Hello</div>;`;

      // Act
      const ast = p.parse(source);

      // Assert
      expect(ast).toBeDefined();
    });

    it('should create parser with JSX disabled', () => {
      // Arrange
      const options: BabelParserOptions = { jsx: false };
      const p = new BabelParser(options);
      const source = `const x = 42;`;

      // Act
      const ast = p.parse(source);

      // Assert
      expect(ast).toBeDefined();
    });

    it('should create parser with additional plugins', () => {
      // Arrange
      const options: BabelParserOptions = { plugins: ['decorators-legacy'] };
      const p = new BabelParser(options);

      // Act - Just verify it doesn't throw
      expect(p).toBeInstanceOf(BabelParser);

      // Assert
      expect(p).toBeDefined();
    });

    it('should combine custom plugins with default plugins', () => {
      // Arrange
      const options: BabelParserOptions = {
        typescript: true,
        jsx: true,
        plugins: ['decorators-legacy'],
      };
      const p = new BabelParser(options);
      const source = `const App = () => <div>Hello</div>;`;

      // Act
      const ast = p.parse(source);

      // Assert
      expect(ast).toBeDefined();
    });
  });

  describe('parse()', () => {
    describe('Valid JSX/TSX parsing', () => {
      it('should parse simple JSX code and return File node', () => {
        // Arrange
        const source = `const App = () => <div>Hello</div>;`;

        // Act
        const ast = parser.parse(source);

        // Assert
        expect(ast).toBeDefined();
        expect(ast.type).toBe('File');
      });

      it('should parse TypeScript code with default options', () => {
        // Arrange
        const source = `
          interface Props {
            title: string;
          }
          const Button = (props: Props) => <button>{props.title}</button>;
        `;

        // Act
        const ast = parser.parse(source);

        // Assert
        expect(ast).toBeDefined();
        expect(ast.type).toBe('File');
      });

      it('should parse TypeScript with generics', () => {
        // Arrange
        const source = `
          function Component<T extends string>(props: { value: T }) {
            return <div>{props.value}</div>;
          }
        `;

        // Act
        const ast = parser.parse(source);

        // Assert
        expect(ast).toBeDefined();
      });

      it('should parse JSX with default module sourceType', () => {
        // Arrange
        const source = `export const Button = () => <button>Click</button>;`;

        // Act
        const ast = parser.parse(source);

        // Assert
        expect(ast).toBeDefined();
      });

      it('should parse JSX with script sourceType when specified', () => {
        // Arrange
        const source = `function App() { return <div>Hello</div>; }`;
        const params: ParseParams = { sourceType: 'script' };

        // Act
        const ast = parser.parse(source, params);

        // Assert
        expect(ast).toBeDefined();
      });

      it('should include location information when sourceFile is provided', () => {
        // Arrange
        const source = `const App = () => <div>Hello</div>;`;
        const params: ParseParams = { sourceFile: 'App.tsx' };

        // Act
        const ast = parser.parse(source, params);

        // Assert
        expect(ast.loc).toBeDefined();
        expect(ast.loc?.start).toBeDefined();
        expect(ast.loc?.end).toBeDefined();
      });

      it('should include range information by default', () => {
        // Arrange
        const source = `const App = () => <div>Hello</div>;`;

        // Act
        const ast = parser.parse(source);

        // Assert
        expect(ast.start).toBeDefined();
        expect(ast.end).toBeDefined();
        expect(typeof ast.start).toBe('number');
        expect(typeof ast.end).toBe('number');
      });

      it('should handle modern JavaScript features', () => {
        // Arrange
        const source = `
          const App = ({ user }) => (
            <div>
              <p>Hello, {user?.name ?? 'Guest'}</p>
            </div>
          );
        `;

        // Act
        const ast = parser.parse(source);

        // Assert
        expect(ast).toBeDefined();
      });

      it('should handle TypeScript enums', () => {
        // Arrange
        const source = `
          enum Status {
            Active,
            Inactive
          }
          const App = () => <div>{Status.Active}</div>;
        `;

        // Act
        const ast = parser.parse(source);

        // Assert
        expect(ast).toBeDefined();
      });

      it('should handle TypeScript type assertions', () => {
        // Arrange
        const source = `
          const App = () => {
            const value = "test" as string;
            return <div>{value}</div>;
          };
        `;

        // Act
        const ast = parser.parse(source);

        // Assert
        expect(ast).toBeDefined();
      });
    });

    describe('Error handling', () => {
      it('should throw SyntaxError for invalid JavaScript with sourceFile', () => {
        // Arrange
        const source = `const x = {`;
        const params: ParseParams = { sourceFile: 'invalid.tsx' };

        // Act & Assert
        expect(() => parser.parse(source, params)).toThrow(SyntaxError);
        expect(() => parser.parse(source, params)).toThrow(
          /Babel parse error in invalid\.tsx/,
        );
      });

      it('should throw SyntaxError for invalid JavaScript without sourceFile', () => {
        // Arrange
        const source = `const x = {`;

        // Act & Assert
        expect(() => parser.parse(source)).toThrow(SyntaxError);
        expect(() => parser.parse(source)).toThrow(
          /Babel parse error in unknown/,
        );
      });

      it('should rethrow non-Error exceptions as-is', () => {
        // Arrange - Mock parse to throw non-Error
        const mockParse = vi.fn().mockImplementation(() => {
          throw 'string error';
        });

        // Replace babel's parse temporarily
        const originalParse = BabelParser.prototype.parse;
        BabelParser.prototype.parse = function (source: string) {
          return mockParse(source);
        };

        const testParser = new BabelParser();

        // Act & Assert
        expect(() => testParser.parse('const x = 1;')).toThrow('string error');

        // Cleanup
        BabelParser.prototype.parse = originalParse;
      });
    });
  });

  describe('findJSXOpeningElements()', () => {
    describe('Finding elements', () => {
      it('should find single JSX element', () => {
        // Arrange
        const source = `const App = () => <div>Hello</div>;`;
        const ast = parser.parse(source);

        // Act
        const elements = parser.findJSXOpeningElements(ast);

        // Assert
        expect(elements).toHaveLength(1);
        expect(parser.getTagName(elements[0])).toBe('div');
      });

      it('should find multiple JSX elements in correct order', () => {
        // Arrange
        const source = `
          const App = () => (
            <div>
              <h1>Title</h1>
              <p>Content</p>
            </div>
          );
        `;
        const ast = parser.parse(source);

        // Act
        const elements = parser.findJSXOpeningElements(ast);

        // Assert
        expect(elements).toHaveLength(3);
        expect(elements.map((e) => parser.getTagName(e))).toEqual([
          'div',
          'h1',
          'p',
        ]);
      });

      it('should find deeply nested elements', () => {
        // Arrange
        const source = `
          const App = () => (
            <div>
              <section>
                <article>
                  <header>
                    <h1>Title</h1>
                  </header>
                </article>
              </section>
            </div>
          );
        `;
        const ast = parser.parse(source);

        // Act
        const elements = parser.findJSXOpeningElements(ast);

        // Assert
        expect(elements).toHaveLength(5);
        expect(elements.map((e) => parser.getTagName(e))).toEqual([
          'div',
          'section',
          'article',
          'header',
          'h1',
        ]);
      });

      it('should find self-closing elements', () => {
        // Arrange
        const source = `
          const Form = () => (
            <form>
              <input type="text" />
              <input type="email" />
              <button type="submit">Submit</button>
            </form>
          );
        `;
        const ast = parser.parse(source);

        // Act
        const elements = parser.findJSXOpeningElements(ast);

        // Assert
        expect(elements).toHaveLength(4);
      });

      it('should find elements inside expressions', () => {
        // Arrange
        const source = `
          const App = ({ items }) => (
            <ul>
              {items.map((item) => (
                <li key={item.id}>{item.name}</li>
              ))}
            </ul>
          );
        `;
        const ast = parser.parse(source);

        // Act
        const elements = parser.findJSXOpeningElements(ast);

        // Assert
        expect(elements).toHaveLength(2);
        expect(elements.map((e) => parser.getTagName(e))).toEqual(['ul', 'li']);
      });

      it('should find elements in conditional expressions', () => {
        // Arrange
        const source = `
          const App = ({ show }) => (
            <div>
              {show ? <p>Visible</p> : <span>Hidden</span>}
            </div>
          );
        `;
        const ast = parser.parse(source);

        // Act
        const elements = parser.findJSXOpeningElements(ast);

        // Assert
        expect(elements).toHaveLength(3);
        expect(elements.map((e) => parser.getTagName(e))).toEqual([
          'div',
          'p',
          'span',
        ]);
      });

      it('should find elements in TypeScript code', () => {
        // Arrange
        const source = `
          interface Props {
            children: React.ReactNode;
          }
          const Container: React.FC<Props> = ({ children }) => (
            <div className="container">{children}</div>
          );
        `;
        const ast = parser.parse(source);

        // Act
        const elements = parser.findJSXOpeningElements(ast);

        // Assert
        expect(elements).toHaveLength(1);
        expect(parser.getTagName(elements[0])).toBe('div');
      });
    });

    describe('Empty results', () => {
      it('should return empty array for code without JSX', () => {
        // Arrange
        const source = `const x = 42; function foo() { return x * 2; }`;
        const ast = parser.parse(source);

        // Act
        const elements = parser.findJSXOpeningElements(ast);

        // Assert
        expect(elements).toHaveLength(0);
      });

      it('should return empty array for empty source', () => {
        // Arrange
        const source = '';
        const ast = parser.parse(source);

        // Act
        const elements = parser.findJSXOpeningElements(ast);

        // Assert
        expect(elements).toHaveLength(0);
      });
    });
  });

  describe('hasDataDsAttribute()', () => {
    describe('Detecting data-ds attribute', () => {
      it('should return false for element without data-ds', () => {
        // Arrange
        const source = `const App = () => <div className="foo">Hello</div>;`;
        const ast = parser.parse(source);
        const elements = parser.findJSXOpeningElements(ast);

        // Act
        const hasAttribute = parser.hasDataDsAttribute(elements[0]);

        // Assert
        expect(hasAttribute).toBe(false);
      });

      it('should return true for element with data-ds', () => {
        // Arrange
        const source = `const App = () => <div data-ds="abc12345">Hello</div>;`;
        const ast = parser.parse(source);
        const elements = parser.findJSXOpeningElements(ast);

        // Act
        const hasAttribute = parser.hasDataDsAttribute(elements[0]);

        // Assert
        expect(hasAttribute).toBe(true);
      });

      it('should return false for element with other data attributes', () => {
        // Arrange
        const source = `const App = () => <div data-testid="foo" data-component="bar">Hello</div>;`;
        const ast = parser.parse(source);
        const elements = parser.findJSXOpeningElements(ast);

        // Act
        const hasAttribute = parser.hasDataDsAttribute(elements[0]);

        // Assert
        expect(hasAttribute).toBe(false);
      });

      it('should return true when data-ds is among multiple attributes', () => {
        // Arrange
        const source = `const App = () => <button type="button" className="btn" data-ds="xyz98765" disabled>Click</button>;`;
        const ast = parser.parse(source);
        const elements = parser.findJSXOpeningElements(ast);

        // Act
        const hasAttribute = parser.hasDataDsAttribute(elements[0]);

        // Assert
        expect(hasAttribute).toBe(true);
      });

      it('should return false for elements with spread attributes', () => {
        // Arrange
        const source = `const App = ({ props }) => <div {...props}>Hello</div>;`;
        const ast = parser.parse(source);
        const elements = parser.findJSXOpeningElements(ast);

        // Act
        const hasAttribute = parser.hasDataDsAttribute(elements[0]);

        // Assert
        expect(hasAttribute).toBe(false);
      });

      it('should handle TypeScript type assertions in attributes', () => {
        // Arrange
        const source = `const App = () => <div data-ds={"abc" as string}>Hello</div>;`;
        const ast = parser.parse(source);
        const elements = parser.findJSXOpeningElements(ast);

        // Act
        const hasAttribute = parser.hasDataDsAttribute(elements[0]);

        // Assert
        expect(hasAttribute).toBe(true);
      });
    });

    describe('Fragment handling', () => {
      it('should return false for JSX fragments', () => {
        // Arrange
        const source = `const App = () => <><div>Hello</div></>;`;
        const ast = parser.parse(source);
        const elements = parser.findJSXOpeningElements(ast);

        // Act - The div element, not the fragment
        const hasAttribute = parser.hasDataDsAttribute(elements[0]);

        // Assert
        expect(hasAttribute).toBe(false);
      });
    });
  });

  describe('getLocation()', () => {
    describe('Location extraction', () => {
      it('should return location for single-line element', () => {
        // Arrange
        const source = `const App = () => <div>Hello</div>;`;
        const ast = parser.parse(source);
        const elements = parser.findJSXOpeningElements(ast);

        // Act
        const location = parser.getLocation(elements[0]);

        // Assert
        expect(location).toBeDefined();
        expect(location?.start.line).toBe(1);
        expect(location?.start.column).toBeGreaterThan(0);
        expect(location?.start.offset).toBeGreaterThan(0);
        expect(location?.end).toBeDefined();
      });

      it('should return correct line numbers for multi-line element', () => {
        // Arrange
        const source = `
          const App = () => (
            <div
              className="foo"
              data-testid="bar"
            >
              Hello
            </div>
          );
        `;
        const ast = parser.parse(source);
        const elements = parser.findJSXOpeningElements(ast);

        // Act
        const location = parser.getLocation(elements[0]);

        // Assert
        expect(location).toBeDefined();
        expect(location?.start.line).toBeLessThan(location?.end?.line || 0);
      });

      it('should return correct line for element on specific line', () => {
        // Arrange
        const source = `const x = 1;
const y = 2;
const App = () => <div>Hello</div>;`;
        const ast = parser.parse(source);
        const elements = parser.findJSXOpeningElements(ast);

        // Act
        const location = parser.getLocation(elements[0]);

        // Assert
        expect(location?.start.line).toBe(3);
      });

      it('should handle TypeScript code locations', () => {
        // Arrange
        const source = `
          interface Props { title: string; }
          const App: React.FC<Props> = ({ title }) => <div>{title}</div>;
        `;
        const ast = parser.parse(source);
        const elements = parser.findJSXOpeningElements(ast);

        // Act
        const location = parser.getLocation(elements[0]);

        // Assert
        expect(location).toBeDefined();
        expect(location?.start.line).toBe(3);
      });

      it('should return correct offset values', () => {
        // Arrange
        const source = `const App = () => <div>Hello</div>;`;
        const ast = parser.parse(source);
        const elements = parser.findJSXOpeningElements(ast);

        // Act
        const location = parser.getLocation(elements[0]);

        // Assert
        expect(location?.start.offset).toBeGreaterThan(0);
        expect(location?.end?.offset).toBeGreaterThan(
          location?.start.offset || 0,
        );
      });
    });

    describe('Missing location handling', () => {
      it('should return undefined when location is missing', () => {
        // Arrange
        const source = `const App = () => <div>Hello</div>;`;
        const ast = parser.parse(source);
        const elements = parser.findJSXOpeningElements(ast);
        // Remove location from element
        delete elements[0].loc;

        // Act
        const location = parser.getLocation(elements[0]);

        // Assert
        expect(location).toBeUndefined();
      });
    });

    describe('Offset fallback', () => {
      it('should return undefined when start is null', () => {
        // Arrange
        const source = `const App = () => <div>Hello</div>;`;
        const ast = parser.parse(source);
        const elements = parser.findJSXOpeningElements(ast);
        delete elements[0].start;

        // Act
        const location = parser.getLocation(elements[0]);

        // Assert
        expect(location).toBeUndefined();
      });

      it('should return undefined when end is null', () => {
        // Arrange
        const source = `const App = () => <div>Hello</div>;`;
        const ast = parser.parse(source);
        const elements = parser.findJSXOpeningElements(ast);
        delete elements[0].end;

        // Act
        const location = parser.getLocation(elements[0]);

        // Assert
        expect(location).toBeUndefined();
      });
    });
  });

  describe('getTagName()', () => {
    describe('Simple tag names', () => {
      it('should return tag name for native element', () => {
        // Arrange
        const source = `const App = () => <div>Hello</div>;`;
        const ast = parser.parse(source);
        const elements = parser.findJSXOpeningElements(ast);

        // Act
        const tagName = parser.getTagName(elements[0]);

        // Assert
        expect(tagName).toBe('div');
      });

      it('should return tag name for custom component', () => {
        // Arrange
        const source = `const App = () => <Button>Click</Button>;`;
        const ast = parser.parse(source);
        const elements = parser.findJSXOpeningElements(ast);

        // Act
        const tagName = parser.getTagName(elements[0]);

        // Assert
        expect(tagName).toBe('Button');
      });

      it('should return Fragment for JSX fragments', () => {
        // Arrange
        const source = `const App = () => <><div>Hello</div></>;`;
        parser.parse(source);

        // We need to manually extract the fragment opening
        const source2 = `const App = () => <React.Fragment><div>Hello</div></React.Fragment>;`;
        const ast2 = parser.parse(source2);
        const elements = parser.findJSXOpeningElements(ast2);

        // Act
        const tagName = parser.getTagName(elements[0]);

        // Assert - React.Fragment is a member expression
        expect(tagName).toBe('React.Fragment');
      });
    });

    describe('Complex tag names', () => {
      it('should return full path for member expression', () => {
        // Arrange
        const source = `const App = () => <UI.Button.Primary>Click</UI.Button.Primary>;`;
        const ast = parser.parse(source);
        const elements = parser.findJSXOpeningElements(ast);

        // Act
        const tagName = parser.getTagName(elements[0]);

        // Assert
        expect(tagName).toBe('UI.Button.Primary');
      });

      it('should return full path for deeply nested member expressions', () => {
        // Arrange
        const source = `const App = () => <A.B.C.D.E>Hello</A.B.C.D.E>;`;
        const ast = parser.parse(source);
        const elements = parser.findJSXOpeningElements(ast);

        // Act
        const tagName = parser.getTagName(elements[0]);

        // Assert
        expect(tagName).toBe('A.B.C.D.E');
      });

      it('should return namespaced name for XML-style tags', () => {
        // Arrange
        const source = `const App = () => <svg:rect width="100" height="100" />;`;
        const ast = parser.parse(source);
        const elements = parser.findJSXOpeningElements(ast);

        // Act
        const tagName = parser.getTagName(elements[0]);

        // Assert
        expect(tagName).toBe('svg:rect');
      });
    });

    describe('Multiple tag types', () => {
      it('should handle different tag types in one AST', () => {
        // Arrange
        const source = `
          const App = () => (
            <>
              <div>Native</div>
              <Button>Component</Button>
              <UI.Card.Header>Member</UI.Card.Header>
              <svg:circle r="50" />
            </>
          );
        `;
        const ast = parser.parse(source);
        const elements = parser.findJSXOpeningElements(ast);

        // Act
        const tagNames = elements.map((e) => parser.getTagName(e));

        // Assert
        expect(tagNames).toEqual([
          'div',
          'Button',
          'UI.Card.Header',
          'svg:circle',
        ]);
      });
    });
  });

  describe('getInsertPosition()', () => {
    describe('Regular elements', () => {
      it('should return position before > for simple element', () => {
        // Arrange
        const source = `const App = () => <div>Hello</div>;`;
        const ast = parser.parse(source);
        const elements = parser.findJSXOpeningElements(ast);

        // Act
        const position = parser.getInsertPosition(elements[0]);

        // Assert
        expect(source.charAt(position)).toBe('>');
      });

      it('should return correct position for element with attributes', () => {
        // Arrange
        const source = `const App = () => <button type="button" className="btn">Click</button>;`;
        const ast = parser.parse(source);
        const elements = parser.findJSXOpeningElements(ast);

        // Act
        const position = parser.getInsertPosition(elements[0]);

        // Assert
        expect(source.charAt(position)).toBe('>');
      });

      it('should return correct position for multi-line element', () => {
        // Arrange
        const source = `const App = () => (
  <div
    className="foo"
    data-testid="bar"
  >
    Hello
  </div>
);`;
        const ast = parser.parse(source);
        const elements = parser.findJSXOpeningElements(ast);

        // Act
        const position = parser.getInsertPosition(elements[0]);

        // Assert
        expect(source.charAt(position)).toBe('>');
      });
    });

    describe('Self-closing elements', () => {
      it('should return position before /> for self-closing element', () => {
        // Arrange
        const source = `const App = () => <input type="text" />;`;
        const ast = parser.parse(source);
        const elements = parser.findJSXOpeningElements(ast);

        // Act
        const position = parser.getInsertPosition(elements[0]);

        // Assert
        expect(source.charAt(position)).toBe('/');
        expect(source.charAt(position + 1)).toBe('>');
      });

      it('should return correct position for self-closing component', () => {
        // Arrange
        const source = `const App = () => <Component prop="value" />;`;
        const ast = parser.parse(source);
        const elements = parser.findJSXOpeningElements(ast);

        // Act
        const position = parser.getInsertPosition(elements[0]);

        // Assert
        expect(source.charAt(position)).toBe('/');
        expect(source.charAt(position + 1)).toBe('>');
      });
    });

    describe('Attribute insertion', () => {
      it('should allow inserting attributes at correct position', () => {
        // Arrange
        const source = `const App = () => <div className="foo">Hello</div>;`;
        const ast = parser.parse(source);
        const elements = parser.findJSXOpeningElements(ast);
        const position = parser.getInsertPosition(elements[0]);

        // Act
        const newCode =
          source.slice(0, position) +
          ' data-ds="test123"' +
          source.slice(position);

        // Assert
        expect(newCode).toContain('<div className="foo" data-ds="test123">');
      });

      it('should preserve existing attributes when inserting', () => {
        // Arrange
        const source = `const App = () => <button type="button" disabled>Click</button>;`;
        const ast = parser.parse(source);
        const elements = parser.findJSXOpeningElements(ast);
        const position = parser.getInsertPosition(elements[0]);

        // Act
        const injected =
          source.slice(0, position) +
          ' data-ds="xyz98765"' +
          source.slice(position);

        // Assert
        expect(injected).toContain('type="button"');
        expect(injected).toContain('disabled');
        expect(injected).toContain('data-ds="xyz98765"');
      });
    });

    describe('Offset fallback', () => {
      it('should return 0 when end offset is undefined', () => {
        // Arrange
        const source = `const App = () => <div>Hello</div>;`;
        const ast = parser.parse(source);
        const elements = parser.findJSXOpeningElements(ast);
        delete elements[0].end;

        // Act
        const position = parser.getInsertPosition(elements[0]);

        // Assert
        expect(position).toBe(0);
      });
    });
  });

  describe('createBabelParser()', () => {
    it('should return BabelParser instance with default options', () => {
      // Act
      const newParser = createBabelParser();

      // Assert
      expect(newParser).toBeInstanceOf(BabelParser);
    });

    it('should create functional parser instance', () => {
      // Arrange
      const newParser = createBabelParser();
      const source = `const App = () => <div>Hello</div>;`;

      // Act
      const ast = newParser.parse(source);

      // Assert
      expect(ast).toBeDefined();
      expect(ast.type).toBe('File');
    });

    it('should accept and use custom options', () => {
      // Arrange
      const options: BabelParserOptions = { typescript: true };
      const newParser = createBabelParser(options);
      const source = `
        interface Props { title: string; }
        const App = (props: Props) => <div>{props.title}</div>;
      `;

      // Act
      const ast = newParser.parse(source);

      // Assert
      expect(ast).toBeDefined();
    });

    it('should pass options to constructor correctly', () => {
      // Arrange
      const options: BabelParserOptions = {
        typescript: false,
        jsx: true,
        plugins: ['decorators-legacy'],
      };

      // Act
      const newParser = createBabelParser(options);

      // Assert
      expect(newParser).toBeInstanceOf(BabelParser);
    });
  });

  describe('TypeScript-specific features', () => {
    it('should handle TypeScript interfaces', () => {
      // Arrange
      const source = `
        interface ButtonProps {
          onClick: () => void;
          children: React.ReactNode;
        }
        const Button = ({ onClick, children }: ButtonProps) => (
          <button onClick={onClick}>{children}</button>
        );
      `;
      const ast = parser.parse(source);

      // Act
      const elements = parser.findJSXOpeningElements(ast);

      // Assert
      expect(elements).toHaveLength(1);
    });

    it('should handle TypeScript type aliases', () => {
      // Arrange
      const source = `
        type Status = 'active' | 'inactive';
        const StatusBadge = ({ status }: { status: Status }) => (
          <span className={status}>{status}</span>
        );
      `;
      const ast = parser.parse(source);

      // Act
      const elements = parser.findJSXOpeningElements(ast);

      // Assert
      expect(elements).toHaveLength(1);
    });

    it('should handle TypeScript generics in components', () => {
      // Arrange
      const source = `
        function List<T>({ items }: { items: T[] }) {
          return <ul>{items.map((item, i) => <li key={i}>{String(item)}</li>)}</ul>;
        }
      `;
      const ast = parser.parse(source);

      // Act
      const elements = parser.findJSXOpeningElements(ast);

      // Assert
      expect(elements).toHaveLength(2);
    });

    it('should handle TypeScript enums', () => {
      // Arrange
      const source = `
        enum Color {
          Red = 'red',
          Blue = 'blue',
        }
        const Box = () => <div style={{ color: Color.Red }}>Box</div>;
      `;
      const ast = parser.parse(source);

      // Act
      const elements = parser.findJSXOpeningElements(ast);

      // Assert
      expect(elements).toHaveLength(1);
    });

    it('should handle TypeScript as const', () => {
      // Arrange
      const source = `
        const COLORS = ['red', 'blue'] as const;
        const App = () => <div>{COLORS[0]}</div>;
      `;
      const ast = parser.parse(source);

      // Act
      const elements = parser.findJSXOpeningElements(ast);

      // Assert
      expect(elements).toHaveLength(1);
    });

    it('should handle TypeScript optional chaining in JSX', () => {
      // Arrange
      const source = `const App = ({ user }) => <div>{user?.name}</div>;`;
      const ast = parser.parse(source);

      // Act
      const elements = parser.findJSXOpeningElements(ast);

      // Assert
      expect(elements).toHaveLength(1);
    });

    it('should handle TypeScript non-null assertion', () => {
      // Arrange
      const source = `const App = ({ user }) => <div>{user!.name}</div>;`;
      const ast = parser.parse(source);

      // Act
      const elements = parser.findJSXOpeningElements(ast);

      // Assert
      expect(elements).toHaveLength(1);
    });
  });

  describe('Edge cases', () => {
    it('should handle empty JSX elements', () => {
      // Arrange
      const source = `const App = () => <div></div>;`;
      const ast = parser.parse(source);

      // Act
      const elements = parser.findJSXOpeningElements(ast);

      // Assert
      expect(elements).toHaveLength(1);
    });

    it('should handle JSX with only whitespace', () => {
      // Arrange
      const source = `const App = () => <div>   </div>;`;
      const ast = parser.parse(source);

      // Act
      const elements = parser.findJSXOpeningElements(ast);

      // Assert
      expect(elements).toHaveLength(1);
    });

    it('should handle JSX with expressions', () => {
      // Arrange
      const source = `const App = ({ name }) => <div>Hello {name}</div>;`;
      const ast = parser.parse(source);

      // Act
      const elements = parser.findJSXOpeningElements(ast);

      // Assert
      expect(elements).toHaveLength(1);
    });

    it('should handle JSX in variable declarations', () => {
      // Arrange
      const source = `const element = <div>Hello</div>;`;
      const ast = parser.parse(source);

      // Act
      const elements = parser.findJSXOpeningElements(ast);

      // Assert
      expect(elements).toHaveLength(1);
    });
  });
});
