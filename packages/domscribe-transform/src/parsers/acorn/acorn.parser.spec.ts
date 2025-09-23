/**
 * Tests for AcornParser
 *
 * Tests follow Arrange-Act-Assert methodology and test only the parser's behavior,
 * not the behavior of the acorn library itself. We verify how the parser handles
 * inputs, outputs, and edge cases.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { AcornParser, createAcornParser } from './acorn.parser.js';
import type { ParseParams } from '../types.js';

describe('AcornParser', () => {
  let parser: AcornParser;

  beforeEach(() => {
    parser = new AcornParser();
  });

  describe('parse()', () => {
    describe('Valid JSX parsing', () => {
      it('should parse simple JSX code and return Program node', () => {
        // Arrange
        const source = `const App = () => <div>Hello</div>;`;

        // Act
        const ast = parser.parse(source);

        // Assert
        expect(ast).toBeDefined();
        expect(ast.type).toBe('Program');
      });

      it('should parse JSX with default module sourceType', () => {
        // Arrange
        const source = `export const Button = () => <button>Click</button>;`;

        // Act
        const ast = parser.parse(source);

        // Assert
        expect(ast).toBeDefined();
        expect(ast.type).toBe('Program');
      });

      it('should parse JSX with script sourceType when specified', () => {
        // Arrange
        const source = `function App() { return <div>Hello</div>; }`;
        const params: ParseParams = { sourceType: 'script' };

        // Act
        const ast = parser.parse(source, params);

        // Assert
        expect(ast).toBeDefined();
        expect(ast.type).toBe('Program');
      });

      it('should include location information when requested', () => {
        // Arrange
        const source = `const App = () => <div>Hello</div>;`;
        const params: ParseParams = { sourceFile: 'App.jsx' };

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
        expect(ast.start).toBe(0);
        expect(ast.end).toBe(source.length);
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
        expect(ast.type).toBe('Program');
      });

      it('should handle JSX fragments', () => {
        // Arrange
        const source = `
          const List = () => (
            <>
              <h1>Title</h1>
              <p>Content</p>
            </>
          );
        `;

        // Act
        const ast = parser.parse(source);

        // Assert
        expect(ast).toBeDefined();
        expect(ast.type).toBe('Program');
      });
    });

    describe('Error handling', () => {
      it('should throw SyntaxError for invalid JavaScript with sourceFile', () => {
        // Arrange
        const source = `const x = {`;
        const params: ParseParams = { sourceFile: 'invalid.jsx' };

        // Act & Assert
        expect(() => parser.parse(source, params)).toThrow(SyntaxError);
        expect(() => parser.parse(source, params)).toThrow(
          /Acorn parse error in invalid\.jsx/,
        );
      });

      it('should throw SyntaxError for invalid JavaScript without sourceFile', () => {
        // Arrange
        const source = `const x = {`;

        // Act & Assert
        expect(() => parser.parse(source)).toThrow(SyntaxError);
        expect(() => parser.parse(source)).toThrow(
          /Acorn parse error in unknown/,
        );
      });

      it('should throw SyntaxError for TypeScript syntax', () => {
        // Arrange - Acorn cannot parse TypeScript syntax
        const source = `
          interface Props {
            title: string;
          }
          const Button = (props: Props) => <button>{props.title}</button>;
        `;

        // Act & Assert
        expect(() => parser.parse(source)).toThrow(SyntaxError);
      });

      it('should rethrow non-Error exceptions as-is', () => {
        // Arrange - Create a parser instance where we can mock the internal parser
        const mockParser = {
          parse: vi.fn().mockImplementation(() => {
            throw 'string error';
          }),
        } as unknown as (typeof parser)['jsxParser'];

        // Replace the parser's internal jsxParser
        Object.defineProperty(parser, 'jsxParser', {
          value: mockParser,
          writable: true,
        });

        // Act & Assert
        expect(() => parser.parse('const x = 1;')).toThrow('string error');
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

      it('should find elements across multiple components', () => {
        // Arrange
        const source = `
          const Header = () => <header>Header</header>;
          const Footer = () => <footer>Footer</footer>;
          const App = () => (
            <div>
              <Header />
              <Footer />
            </div>
          );
        `;
        const ast = parser.parse(source);

        // Act
        const elements = parser.findJSXOpeningElements(ast);

        // Assert
        expect(elements).toHaveLength(5);
        expect(elements.map((e) => parser.getTagName(e))).toEqual([
          'header',
          'footer',
          'div',
          'Header',
          'Footer',
        ]);
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

      it('should return false for fragments', () => {
        // Arrange
        const source = `const App = () => <><div>Hello</div></>;`;
        const ast = parser.parse(source);
        const elements = parser.findJSXOpeningElements(ast);

        // Act - First element is the div, not the fragment opening
        const hasAttribute = parser.hasDataDsAttribute(elements[0]);

        // Assert
        expect(hasAttribute).toBe(false);
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

      it('should return location for fragments', () => {
        // Arrange
        const source = `const App = () => <><div>Hello</div></>;`;
        const ast = parser.parse(source);
        const elements = parser.findJSXOpeningElements(ast);

        // Act
        const location = parser.getLocation(elements[0]);

        // Assert
        expect(location).toBeDefined();
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
  });

  describe('createAcornParser()', () => {
    it('should return AcornParser instance', () => {
      // Act
      const newParser = createAcornParser();

      // Assert
      expect(newParser).toBeInstanceOf(AcornParser);
    });

    it('should create functional parser instance', () => {
      // Arrange
      const newParser = createAcornParser();
      const source = `const App = () => <div>Hello</div>;`;

      // Act
      const ast = newParser.parse(source);

      // Assert
      expect(ast).toBeDefined();
      expect(ast.type).toBe('Program');
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
