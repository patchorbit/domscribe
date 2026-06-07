/**
 * Real-world className extractor corpus.
 *
 * This suite exercises `extractClassNameFromJSX` against the long-tail
 * patterns the RFC 0001 review flagged. The extractor is parser-agnostic
 * via duck typing — these tests drive it with Babel ASTs because Babel
 * handles both JS and TS uniformly, which is what production codebases
 * actually ship.
 *
 * Each test names the pattern it covers; adding new patterns means adding
 * a new case here (and, when the production extractor needs a code change,
 * a corresponding update to `style-extractor.ts`).
 *
 * @module @domscribe/transform/test/className-corpus
 */
import { describe, expect, it } from 'vitest';
import { parse } from '@babel/parser';
import type {
  Node,
  JSXOpeningElement,
  ExpressionStatement,
} from '@babel/types';
import { isJSXElement } from '@babel/types';
import {
  collectCssInJsDeclarations,
  extractClassNameFromJSX,
  parseClassNameString,
  resolveTagToBindingName,
} from '../../src/core/style-extractor.js';

/**
 * Parse a JSX expression and return the first JSX opening element found.
 * Tests focus on one element per snippet to keep assertions tight.
 */
function parseOpening(snippet: string): JSXOpeningElement {
  const ast = parse(`(${snippet});`, {
    sourceType: 'module',
    plugins: ['typescript', 'jsx'],
    ranges: true,
  });
  const stmt = ast.program.body[0] as ExpressionStatement;
  const expr = stmt.expression as unknown as Node;
  if (isJSXElement(expr)) {
    return expr.openingElement;
  }
  // ParenthesizedExpression wrapper (`(<div/>);`) on certain babel configs.
  type ParenLike = { type: string; expression?: Node };
  const parenLike = expr as ParenLike;
  if (parenLike.type === 'ParenthesizedExpression' && parenLike.expression) {
    const inner = parenLike.expression;
    if (isJSXElement(inner)) {
      return inner.openingElement;
    }
  }
  throw new Error('Expected a JSXElement at the top of the snippet');
}

describe('parseClassNameString', () => {
  it('splits on whitespace', () => {
    expect(parseClassNameString('p-4 bg-blue-500 text-white')).toEqual([
      'p-4',
      'bg-blue-500',
      'text-white',
    ]);
  });

  it('collapses runs of whitespace and ignores empty tokens', () => {
    expect(parseClassNameString('  p-4\n\nbg-blue-500\ttext-white  ')).toEqual([
      'p-4',
      'bg-blue-500',
      'text-white',
    ]);
  });

  it('returns an empty array for blank input', () => {
    expect(parseClassNameString('')).toEqual([]);
    expect(parseClassNameString('   ')).toEqual([]);
  });

  it('preserves order (last-wins overrides matter in Tailwind)', () => {
    const tokens = parseClassNameString('px-4 px-2');
    expect(tokens).toEqual(['px-4', 'px-2']);
  });
});

describe('extractClassNameFromJSX — static string-literal', () => {
  it('extracts a quoted className attribute', () => {
    const opening = parseOpening('<div className="p-4 bg-blue-500" />');

    const result = extractClassNameFromJSX(opening);

    expect(result).toBeDefined();
    expect(result?.className).toBe('p-4 bg-blue-500');
    expect(result?.classes).toEqual(['p-4', 'bg-blue-500']);
  });

  it('extracts a className wrapped in a JSX expression container', () => {
    const opening = parseOpening('<div className={"p-4 bg-blue-500"} />');

    const result = extractClassNameFromJSX(opening);

    expect(result?.className).toBe('p-4 bg-blue-500');
    expect(result?.classes).toEqual(['p-4', 'bg-blue-500']);
  });

  it('returns undefined when no className attribute is present', () => {
    const opening = parseOpening('<div id="main" />');
    expect(extractClassNameFromJSX(opening)).toBeUndefined();
  });

  it('treats valueless className as empty', () => {
    const opening = parseOpening('<div className />');
    const result = extractClassNameFromJSX(opening);
    expect(result).toBeDefined();
    expect(result?.classes).toEqual([]);
  });
});

describe('extractClassNameFromJSX — template literals', () => {
  it('returns a static literal for an interpolation-free template', () => {
    const opening = parseOpening('<div className={`p-4 bg-blue-500`} />');

    const result = extractClassNameFromJSX(opening);

    expect(result?.className).toBe('p-4 bg-blue-500');
    expect(result?.classes).toEqual(['p-4', 'bg-blue-500']);
  });

  it('keeps static segments and drops the interpolation', () => {
    const opening = parseOpening(
      '<div className={`p-4 ${variant} bg-blue-500`} />',
    );

    const result = extractClassNameFromJSX(opening);

    // Interpolated portion is runtime-only — `className` cannot be a literal.
    expect(result?.className).toBeUndefined();
    // But the static segments remain useful for the agent.
    expect(result?.classes).toEqual(['p-4', 'bg-blue-500']);
  });
});

describe('extractClassNameFromJSX — clsx/cn helpers', () => {
  it('extracts tokens through a clsx call with string args', () => {
    const opening = parseOpening(
      '<div className={clsx("p-4", "bg-blue-500", "text-white")} />',
    );

    const result = extractClassNameFromJSX(opening);

    expect(result?.classes).toEqual(['p-4', 'bg-blue-500', 'text-white']);
    // clsx is union-shaped — we cannot collapse args into a single literal.
    expect(result?.className).toBeUndefined();
  });

  it('extracts tokens through cn (a clsx alias)', () => {
    const opening = parseOpening(
      '<div className={cn("p-4", "bg-blue-500")} />',
    );

    expect(extractClassNameFromJSX(opening)?.classes).toEqual([
      'p-4',
      'bg-blue-500',
    ]);
  });

  it('extracts tokens through classNames helper', () => {
    const opening = parseOpening(
      '<div className={classNames("p-4", "bg-blue-500")} />',
    );

    expect(extractClassNameFromJSX(opening)?.classes).toEqual([
      'p-4',
      'bg-blue-500',
    ]);
  });

  it('extracts tokens through tw / twMerge / cva', () => {
    const tw = parseOpening('<div className={tw("p-4", "bg-blue-500")} />');
    const twMerge = parseOpening(
      '<div className={twMerge("p-4", "bg-blue-500")} />',
    );
    const cva = parseOpening('<div className={cva("p-4", "bg-blue-500")} />');

    expect(extractClassNameFromJSX(tw)?.classes).toEqual([
      'p-4',
      'bg-blue-500',
    ]);
    expect(extractClassNameFromJSX(twMerge)?.classes).toEqual([
      'p-4',
      'bg-blue-500',
    ]);
    expect(extractClassNameFromJSX(cva)?.classes).toEqual([
      'p-4',
      'bg-blue-500',
    ]);
  });

  it('walks logical and conditional args inside clsx', () => {
    const opening = parseOpening(
      '<div className={clsx("p-4", active && "bg-blue-500", state === "loading" ? "opacity-50" : "opacity-100")} />',
    );

    const result = extractClassNameFromJSX(opening);

    // Every static branch contributes; runtime conditions don't.
    expect(result?.classes).toEqual([
      'p-4',
      'bg-blue-500',
      'opacity-50',
      'opacity-100',
    ]);
    expect(result?.className).toBeUndefined();
  });

  it('walks object-expression args (clsx-style key:condition)', () => {
    const opening = parseOpening(
      '<div className={clsx("p-4", { "bg-blue-500": isActive, "text-white": true })} />',
    );

    const result = extractClassNameFromJSX(opening);

    expect(result?.classes).toEqual(['p-4', 'bg-blue-500', 'text-white']);
  });

  it('walks array-expression args (clsx-style arrays)', () => {
    const opening = parseOpening(
      '<div className={clsx(["p-4", "bg-blue-500"], "text-white")} />',
    );

    expect(extractClassNameFromJSX(opening)?.classes).toEqual([
      'p-4',
      'bg-blue-500',
      'text-white',
    ]);
  });

  it('emits empty classes for unknown helpers (be conservative)', () => {
    const opening = parseOpening(
      '<div className={mysteryHelper("p-4", "bg-blue-500")} />',
    );

    const result = extractClassNameFromJSX(opening);

    // We don't know mysteryHelper's semantics — better to emit nothing
    // than to mislead the agent with false-positive tokens.
    expect(result?.classes).toEqual([]);
    expect(result?.className).toBeUndefined();
  });

  it('walks member-expression helpers like utils.cn(...)', () => {
    const opening = parseOpening(
      '<div className={utils.cn("p-4", "bg-blue-500")} />',
    );

    expect(extractClassNameFromJSX(opening)?.classes).toEqual([
      'p-4',
      'bg-blue-500',
    ]);
  });
});

describe('extractClassNameFromJSX — conditional & logical', () => {
  it('walks ternary expressions', () => {
    const opening = parseOpening(
      '<div className={isActive ? "bg-blue-500" : "bg-gray-200"} />',
    );

    const result = extractClassNameFromJSX(opening);

    expect(result?.classes).toEqual(['bg-blue-500', 'bg-gray-200']);
    expect(result?.className).toBeUndefined();
  });

  it('walks logical && expressions', () => {
    const opening = parseOpening(
      '<div className={isActive && "bg-blue-500"} />',
    );

    expect(extractClassNameFromJSX(opening)?.classes).toEqual(['bg-blue-500']);
  });

  it('walks logical || / ?? expressions', () => {
    const orOpening = parseOpening(
      '<div className={fallback || "bg-blue-500"} />',
    );
    const coalesceOpening = parseOpening(
      '<div className={fallback ?? "bg-blue-500"} />',
    );

    expect(extractClassNameFromJSX(orOpening)?.classes).toEqual([
      'bg-blue-500',
    ]);
    expect(extractClassNameFromJSX(coalesceOpening)?.classes).toEqual([
      'bg-blue-500',
    ]);
  });
});

describe('extractClassNameFromJSX — fully computed / spread', () => {
  it('returns empty classes for a bare identifier (variable ref)', () => {
    const opening = parseOpening('<div className={dynamic} />');

    const result = extractClassNameFromJSX(opening);

    expect(result?.classes).toEqual([]);
    expect(result?.className).toBeUndefined();
  });

  it('returns undefined when only spread attributes are present', () => {
    const opening = parseOpening('<div {...props} />');

    // Spread carries no className info we can extract statically.
    expect(extractClassNameFromJSX(opening)).toBeUndefined();
  });

  it('still extracts className when both spread and className are present', () => {
    const opening = parseOpening(
      '<div {...props} className="p-4 bg-blue-500" />',
    );

    expect(extractClassNameFromJSX(opening)?.classes).toEqual([
      'p-4',
      'bg-blue-500',
    ]);
  });
});

describe('collectCssInJsDeclarations', () => {
  function parseModule(source: string) {
    return parse(source, {
      sourceType: 'module',
      plugins: ['typescript', 'jsx'],
      ranges: true,
    });
  }

  it('records `const X = styled.div`...`` declarations with library hint', () => {
    const source = [
      "import styled from 'styled-components';",
      'const Card = styled.div`',
      '  padding: 1rem;',
      '  background: white;',
      '`;',
    ].join('\n');

    const ast = parseModule(source);
    const map = collectCssInJsDeclarations(ast, source, '/src/Card.tsx');

    expect(map.size).toBe(1);
    const entry = map.get('Card');
    expect(entry).toBeDefined();
    expect(entry?.kind).toBe('styled-tag');
    expect(entry?.library).toBe('styled-components');
    expect(entry?.file).toBe('/src/Card.tsx');
    expect(entry?.line).toBe(2);
    expect(entry?.blockText).toContain('padding: 1rem');
  });

  it('records `const X = styled(Component)`...`` (styled-call)', () => {
    const source = [
      "import styled from '@emotion/styled';",
      'const FancyBox = styled(BaseBox)`',
      '  color: rebeccapurple;',
      '`;',
    ].join('\n');

    const ast = parseModule(source);
    const map = collectCssInJsDeclarations(ast, source, '/src/FancyBox.tsx');

    expect(map.get('FancyBox')?.kind).toBe('styled-call');
    expect(map.get('FancyBox')?.library).toBe('emotion');
  });

  it('records `const X = css`...`` (emotion css-template)', () => {
    const source = [
      "import { css } from '@emotion/react';",
      'const heading = css`font-size: 32px;`;',
    ].join('\n');

    const ast = parseModule(source);
    const map = collectCssInJsDeclarations(ast, source, '/src/heading.ts');

    expect(map.get('heading')?.kind).toBe('css-template');
    expect(map.get('heading')?.library).toBe('emotion');
  });

  it('walks export declarations as well as bare const', () => {
    const source = [
      "import styled from 'styled-components';",
      'export const Section = styled.section`padding: 2rem;`;',
    ].join('\n');

    const ast = parseModule(source);
    const map = collectCssInJsDeclarations(ast, source, '/src/Section.tsx');

    expect(map.has('Section')).toBe(true);
  });

  it('ignores non-styled tagged template expressions', () => {
    const source = [
      'const sql = (strings, ...values) => null;',
      'const q = sql`SELECT 1`;',
    ].join('\n');

    const ast = parseModule(source);
    const map = collectCssInJsDeclarations(ast, source, '/src/db.ts');

    expect(map.size).toBe(0);
  });

  it('truncates large blockText to the per-element budget', () => {
    const filler = 'a'.repeat(5 * 1024); // exceeds the 4 KB cap
    const source = [
      "import styled from 'styled-components';",
      `const Huge = styled.div\`${filler}\`;`,
    ].join('\n');

    const ast = parseModule(source);
    const map = collectCssInJsDeclarations(ast, source, '/src/Huge.tsx');

    const text = map.get('Huge')?.blockText ?? '';
    expect(text.length).toBeLessThanOrEqual(4 * 1024);
  });
});

describe('resolveTagToBindingName', () => {
  it('returns the tag itself for simple identifiers', () => {
    expect(resolveTagToBindingName('Button')).toBe('Button');
  });

  it('returns the root identifier for member-expression tags', () => {
    expect(resolveTagToBindingName('UI.Button.Primary')).toBe('UI');
  });
});
