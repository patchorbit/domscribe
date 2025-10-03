import { describe, it, expect, beforeEach } from 'vitest';
import { AcornParser, createAcornParser } from './acorn.parser.js';

describe('AcornParser', () => {
  let parser: AcornParser;

  beforeEach(() => {
    parser = new AcornParser();
  });

  describe('parse()', () => {
    it('parses simple JSX code', () => {
      const source = `const App = () => <div>Hello</div>;`;
      const ast = parser.parse(source);

      expect(ast).toBeDefined();
      expect(ast.type).toBe('Program');
    });

    it('parses JSX with default options', () => {
      const source = `export const Button = () => <button>Click</button>;`;
      const ast = parser.parse(source);

      expect(ast).toBeDefined();
    });

    it('parses with custom source type', () => {
      const source = `function App() { return <div>Hello</div>; }`;
      const ast = parser.parse(source, { sourceType: 'script' });

      expect(ast).toBeDefined();
    });

    it('includes location information', () => {
      const source = `const App = () => <div>Hello</div>;`;
      const ast = parser.parse(source, { sourceFile: 'App.jsx' });

      expect(ast).toBeDefined();
      expect(ast.loc).toBeDefined();
      expect(ast.loc?.start).toBeDefined();
      expect(ast.loc?.end).toBeDefined();
    });

    it('includes range information', () => {
      const source = `const App = () => <div>Hello</div>;`;
      const ast = parser.parse(source);

      expect(ast.start).toBeDefined();
      expect(ast.end).toBeDefined();
      expect(typeof ast.start).toBe('number');
      expect(typeof ast.end).toBe('number');
    });

    it('throws SyntaxError for invalid JavaScript', () => {
      const source = `const x = {`;

      expect(() => parser.parse(source, { sourceFile: 'invalid.jsx' })).toThrow(
        SyntaxError,
      );
      expect(() => parser.parse(source, { sourceFile: 'invalid.jsx' })).toThrow(
        /Acorn parse error in invalid\.jsx/,
      );
    });

    it('throws SyntaxError for TypeScript syntax', () => {
      const source = `
        interface Props {
          title: string;
        }
        const Button = (props: Props) => <button>{props.title}</button>;
      `;

      expect(() => parser.parse(source)).toThrow(SyntaxError);
    });

    it('handles modern JavaScript features', () => {
      const source = `
        const App = ({ user }) => (
          <div>
            <p>Hello, {user?.name ?? 'Guest'}</p>
          </div>
        );
      `;

      const ast = parser.parse(source);
      expect(ast).toBeDefined();
    });

    it('handles JSX fragments', () => {
      const source = `
        const List = () => (
          <>
            <h1>Title</h1>
            <p>Content</p>
          </>
        );
      `;

      const ast = parser.parse(source);
      expect(ast).toBeDefined();
    });
  });

  describe('findJSXOpeningElements()', () => {
    it('finds single JSX element', () => {
      const source = `const App = () => <div>Hello</div>;`;
      const ast = parser.parse(source);
      const elements = parser.findJSXOpeningElements(ast);

      expect(elements).toHaveLength(1);
      expect(parser.getTagName(elements[0])).toBe('div');
    });

    it('finds multiple JSX elements', () => {
      const source = `
        const App = () => (
          <div>
            <h1>Title</h1>
            <p>Content</p>
          </div>
        );
      `;
      const ast = parser.parse(source);
      const elements = parser.findJSXOpeningElements(ast);

      expect(elements).toHaveLength(3);
      expect(elements.map((e) => parser.getTagName(e))).toEqual([
        'div',
        'h1',
        'p',
      ]);
    });

    it('finds deeply nested elements', () => {
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
      const elements = parser.findJSXOpeningElements(ast);

      expect(elements).toHaveLength(5); // div, section, article, header, h1
    });

    it('finds self-closing elements', () => {
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
      const elements = parser.findJSXOpeningElements(ast);

      expect(elements).toHaveLength(4); // form, input, input, button
    });

    it('finds fragment opening', () => {
      const source = `
        const List = () => (
          <>
            <h1>Title</h1>
            <p>Content</p>
          </>
        );
      `;
      const ast = parser.parse(source);
      const elements = parser.findJSXOpeningElements(ast);

      expect(elements).toHaveLength(3); // fragment, h1, p
      expect(parser.getTagName(elements[0])).toBe('Unknown'); // fragment
    });

    it('finds elements in expressions', () => {
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
      const elements = parser.findJSXOpeningElements(ast);

      expect(elements).toHaveLength(2); // ul, li
    });

    it('finds elements in conditionals', () => {
      const source = `
        const App = ({ show }) => (
          <div>
            {show ? <p>Visible</p> : <span>Hidden</span>}
          </div>
        );
      `;
      const ast = parser.parse(source);
      const elements = parser.findJSXOpeningElements(ast);

      expect(elements).toHaveLength(3); // div, p, span
    });

    it('returns empty array for code without JSX', () => {
      const source = `const x = 42; function foo() { return x * 2; }`;
      const ast = parser.parse(source);
      const elements = parser.findJSXOpeningElements(ast);

      expect(elements).toHaveLength(0);
    });
  });

  describe('hasDataDsAttribute()', () => {
    it('returns false for element without data-ds', () => {
      const source = `const App = () => <div className="foo">Hello</div>;`;
      const ast = parser.parse(source);
      const elements = parser.findJSXOpeningElements(ast);

      expect(parser.hasDataDsAttribute(elements[0])).toBe(false);
    });

    it('returns true for element with data-ds', () => {
      const source = `const App = () => <div data-ds="abc12345">Hello</div>;`;
      const ast = parser.parse(source);
      const elements = parser.findJSXOpeningElements(ast);

      expect(parser.hasDataDsAttribute(elements[0])).toBe(true);
    });

    it('returns false for element with other data attributes', () => {
      const source = `const App = () => <div data-testid="foo" data-component="bar">Hello</div>;`;
      const ast = parser.parse(source);
      const elements = parser.findJSXOpeningElements(ast);

      expect(parser.hasDataDsAttribute(elements[0])).toBe(false);
    });

    it('handles element with multiple attributes', () => {
      const source = `const App = () => <button type="button" className="btn" data-ds="xyz98765" disabled>Click</button>;`;
      const ast = parser.parse(source);
      const elements = parser.findJSXOpeningElements(ast);

      expect(parser.hasDataDsAttribute(elements[0])).toBe(true);
    });

    it('returns false for fragments', () => {
      const source = `const App = () => <><div>Hello</div></>;`;
      const ast = parser.parse(source);
      const elements = parser.findJSXOpeningElements(ast);

      // First element is the fragment
      expect(parser.hasDataDsAttribute(elements[0])).toBe(false);
    });

    it('handles spread attributes', () => {
      const source = `const App = ({ props }) => <div {...props}>Hello</div>;`;
      const ast = parser.parse(source);
      const elements = parser.findJSXOpeningElements(ast);

      expect(parser.hasDataDsAttribute(elements[0])).toBe(false);
    });
  });

  describe('getLocation()', () => {
    it('returns location for element', () => {
      const source = `const App = () => <div>Hello</div>;`;
      const ast = parser.parse(source);
      const elements = parser.findJSXOpeningElements(ast);
      const location = parser.getLocation(elements[0]);

      expect(location).toBeDefined();
      expect(location?.start).toBeDefined();
      expect(location?.start.line).toBe(1);
      expect(location?.start.column).toBeGreaterThan(0);
      expect(location?.start.offset).toBeGreaterThan(0);
      expect(location?.end).toBeDefined();
    });

    it('returns location for multi-line element', () => {
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
      const location = parser.getLocation(elements[0]);

      expect(location).toBeDefined();
      expect(location?.start.line).toBeLessThan(location?.end?.line || 0);
    });

    it('returns location with correct line numbers', () => {
      const source = `const x = 1;
const y = 2;
const App = () => <div>Hello</div>;`;
      const ast = parser.parse(source);
      const elements = parser.findJSXOpeningElements(ast);
      const location = parser.getLocation(elements[0]);

      expect(location?.start.line).toBe(3);
    });

    it('handles fragments', () => {
      const source = `const App = () => <><div>Hello</div></>;`;
      const ast = parser.parse(source);
      const elements = parser.findJSXOpeningElements(ast);
      const location = parser.getLocation(elements[0]); // fragment

      expect(location).toBeDefined();
    });
  });

  describe('getTagName()', () => {
    it('returns tag name for native element', () => {
      const source = `const App = () => <div>Hello</div>;`;
      const ast = parser.parse(source);
      const elements = parser.findJSXOpeningElements(ast);

      expect(parser.getTagName(elements[0])).toBe('div');
    });

    it('returns tag name for component', () => {
      const source = `const App = () => <Button>Click</Button>;`;
      const ast = parser.parse(source);
      const elements = parser.findJSXOpeningElements(ast);

      expect(parser.getTagName(elements[0])).toBe('Button');
    });

    it('returns full path for member expression', () => {
      const source = `const App = () => <UI.Button.Primary>Click</UI.Button.Primary>;`;
      const ast = parser.parse(source);
      const elements = parser.findJSXOpeningElements(ast);

      expect(parser.getTagName(elements[0])).toBe('UI.Button.Primary');
    });

    it('returns full path for nested member expressions', () => {
      const source = `const App = () => <A.B.C.D.E>Hello</A.B.C.D.E>;`;
      const ast = parser.parse(source);
      const elements = parser.findJSXOpeningElements(ast);

      expect(parser.getTagName(elements[0])).toBe('A.B.C.D.E');
    });

    it('returns namespaced name for XML-style tags', () => {
      const source = `const App = () => <svg:rect width="100" height="100" />;`;
      const ast = parser.parse(source);
      const elements = parser.findJSXOpeningElements(ast);

      expect(parser.getTagName(elements[0])).toBe('svg:rect');
    });

    it('returns "Unknown" for fragments', () => {
      const source = `const App = () => <><div>Hello</div></>;`;
      const ast = parser.parse(source);
      const elements = parser.findJSXOpeningElements(ast);

      expect(parser.getTagName(elements[0])).toBe('Unknown'); // fragment
      expect(parser.getTagName(elements[1])).toBe('div'); // child
    });

    it('handles multiple different tag types', () => {
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

      expect(elements.map((e) => parser.getTagName(e))).toEqual([
        'Unknown', // fragment
        'div',
        'Button',
        'UI.Card.Header',
        'svg:circle',
      ]);
    });
  });

  describe('getInsertPosition()', () => {
    it('returns position before > for regular element', () => {
      const source = `const App = () => <div>Hello</div>;`;
      const ast = parser.parse(source);
      const elements = parser.findJSXOpeningElements(ast);
      const position = parser.getInsertPosition(elements[0]);

      // Extract the character at position
      expect(source.charAt(position)).toBe('>');
    });

    it('returns position before /> for self-closing element', () => {
      const source = `const App = () => <input type="text" />;`;
      const ast = parser.parse(source);
      const elements = parser.findJSXOpeningElements(ast);
      const position = parser.getInsertPosition(elements[0]);

      // Should be 2 chars before end (before />)
      expect(source.charAt(position)).toBe('/');
      expect(source.charAt(position + 1)).toBe('>');
    });

    it('returns correct position for element with attributes', () => {
      const source = `const App = () => <button type="button" className="btn">Click</button>;`;
      const ast = parser.parse(source);
      const elements = parser.findJSXOpeningElements(ast);
      const position = parser.getInsertPosition(elements[0]);

      expect(source.charAt(position)).toBe('>');
    });

    it('returns correct position for multi-line element', () => {
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
      const position = parser.getInsertPosition(elements[0]);

      expect(source.charAt(position)).toBe('>');
    });

    it('handles self-closing component', () => {
      const source = `const App = () => <Component prop="value" />;`;
      const ast = parser.parse(source);
      const elements = parser.findJSXOpeningElements(ast);
      const position = parser.getInsertPosition(elements[0]);

      expect(source.charAt(position)).toBe('/');
    });

    it('works correctly for inserting attributes', () => {
      const source = `const App = () => <div className="foo">Hello</div>;`;
      const ast = parser.parse(source);
      const elements = parser.findJSXOpeningElements(ast);
      const position = parser.getInsertPosition(elements[0]);

      // Insert data-ds attribute
      const newCode =
        source.slice(0, position) +
        ' data-ds="test123"' +
        source.slice(position);

      expect(newCode).toContain('<div className="foo" data-ds="test123">');
    });
  });

  describe('factory function', () => {
    it('createAcornParser returns AcornParser instance', () => {
      const parser = createAcornParser();

      expect(parser).toBeInstanceOf(AcornParser);
    });

    it('creates functional parser instance', () => {
      const parser = createAcornParser();
      const source = `const App = () => <div>Hello</div>;`;
      const ast = parser.parse(source);

      expect(ast).toBeDefined();
    });
  });

  describe('edge cases', () => {
    it('handles empty JSX elements', () => {
      const source = `const App = () => <div></div>;`;
      const ast = parser.parse(source);
      const elements = parser.findJSXOpeningElements(ast);

      expect(elements).toHaveLength(1);
    });

    it('handles JSX with only whitespace', () => {
      const source = `const App = () => <div>   </div>;`;
      const ast = parser.parse(source);
      const elements = parser.findJSXOpeningElements(ast);

      expect(elements).toHaveLength(1);
    });

    it('handles JSX with expressions', () => {
      const source = `const App = ({ name }) => <div>Hello {name}</div>;`;
      const ast = parser.parse(source);
      const elements = parser.findJSXOpeningElements(ast);

      expect(elements).toHaveLength(1);
    });

    it('handles JSX with comments', () => {
      const source = `const App = () => <div>{/* comment */}Hello</div>;`;
      const ast = parser.parse(source);
      const elements = parser.findJSXOpeningElements(ast);

      expect(elements).toHaveLength(1);
    });

    it('handles multiple components in one file', () => {
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
      const elements = parser.findJSXOpeningElements(ast);

      expect(elements).toHaveLength(5); // header, footer, div, Header, Footer
    });

    it('handles JSX in return statements', () => {
      const source = `
        function App() {
          if (true) {
            return <div>A</div>;
          }
          return <div>B</div>;
        }
      `;
      const ast = parser.parse(source);
      const elements = parser.findJSXOpeningElements(ast);

      expect(elements).toHaveLength(2);
    });

    it('handles JSX in arrow function implicit return', () => {
      const source = `const App = () => <div>Hello</div>;`;
      const ast = parser.parse(source);
      const elements = parser.findJSXOpeningElements(ast);

      expect(elements).toHaveLength(1);
    });

    it('handles JSX in variable declarations', () => {
      const source = `const element = <div>Hello</div>;`;
      const ast = parser.parse(source);
      const elements = parser.findJSXOpeningElements(ast);

      expect(elements).toHaveLength(1);
    });
  });

  describe('integration with magic-string', () => {
    it('can be used to inject attributes at correct position', () => {
      const source = `const App = () => <div className="foo">Hello</div>;`;
      const ast = parser.parse(source);
      const elements = parser.findJSXOpeningElements(ast);
      const element = elements[0];

      const position = parser.getInsertPosition(element);
      const injected =
        source.slice(0, position) +
        ' data-ds="abc12345"' +
        source.slice(position);

      expect(injected).toBe(
        `const App = () => <div className="foo" data-ds="abc12345">Hello</div>;`,
      );
    });

    it('preserves existing attributes when injecting', () => {
      const source = `const App = () => <button type="button" disabled>Click</button>;`;
      const ast = parser.parse(source);
      const elements = parser.findJSXOpeningElements(ast);
      const position = parser.getInsertPosition(elements[0]);

      const injected =
        source.slice(0, position) +
        ' data-ds="xyz98765"' +
        source.slice(position);

      expect(injected).toContain('type="button"');
      expect(injected).toContain('disabled');
      expect(injected).toContain('data-ds="xyz98765"');
    });
  });

  describe('Performance', () => {
    it('can parse a large file', () => {
      // Generate a large DOM tree
      const source = generateLargeDOMTree(1000);

      const startTime = performance.now();
      const ast = parser.parse(source);
      const duration = performance.now() - startTime;

      expect(duration).toBeLessThan(100);
      expect(ast).toBeDefined();
    });
  });
});

const generateLargeDOMTree = (numDivs: number) => {
  let source = 'const App = () => (';
  for (let i = 0; i < numDivs; i++) {
    source += '<div>';
  }
  source += 'Content';
  for (let i = 0; i < numDivs; i++) {
    source += '</div>';
  }
  source += ');';
  return source;
};
