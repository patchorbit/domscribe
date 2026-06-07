/**
 * Build-time style attribution extractor.
 *
 * Runs on top of the existing AST visit performed by the injector. For each
 * JSX opening element, extracts:
 *
 *  - `className` (when statically resolvable to a single string literal or
 *    no-interpolation template literal)
 *  - `classes`   (best-effort utility-class tokens reachable through
 *    clsx/cn/tw/classNames/twMerge/cva helpers, template literals,
 *    conditional expressions, logical expressions, object expressions, and
 *    array expressions)
 *
 * Separately, a one-shot pass over the module's top-level statements
 * collects every `const X = styled.Y\`...\`;` / `const X = styled(Y)\`...\`;`
 * / `const X = css\`...\`;` declaration so a JSX element whose tag binds to
 * a locally-declared styled component can be linked back to its source
 * block.
 *
 * Operates on either Babel (`StringLiteral`) or Acorn (`Literal`) AST shapes
 * via duck typing — the type names overlap enough that one walker handles
 * both. Parser-specific node helpers are passed in by the caller.
 *
 * @module @domscribe/transform/core/style-extractor
 */

import type { CssInJsSourceLocation, StyleSource } from '@domscribe/core';

/**
 * Identifiers conventionally used as className helper functions.
 *
 * The list is intentionally short — every entry needs to be a known
 * "concatenate strings" helper. Adding `clsx-like` is fine; adding
 * `tailwind-merge`-style functions that perform substitution is risky
 * because they can drop tokens, but we still capture pre-merge tokens
 * (the agent can read the source to see the helper).
 */
const CLASSNAME_HELPER_NAMES = new Set([
  'clsx',
  'cn',
  'classNames',
  'tw',
  'twMerge',
  'cva',
]);

/**
 * Maximum bytes of `blockText` we capture per CSS-in-JS declaration. Aligns
 * with the existing ≤4 KB per-element serialization budget — a single
 * styled block much larger than this is an outlier and the agent can read
 * the source directly.
 */
const CSS_IN_JS_BLOCK_BYTE_BUDGET = 4 * 1024;

/**
 * Split a className string into utility-class tokens.
 *
 * Whitespace-separated; ignores empty tokens. No deduplication — the order
 * a user wrote tokens in often matters (e.g. Tailwind `last-of-type`
 * overrides) and downstream consumers can dedupe if they need to.
 */
export function parseClassNameString(value: string): string[] {
  return value
    .trim()
    .split(/\s+/u)
    .filter((token) => token.length > 0);
}

interface MinimalNode {
  type?: string;
  [key: string]: unknown;
}

type AstNode = MinimalNode | null | undefined;

interface StaticEvaluation {
  /** True when every reachable branch resolves to a string at compile time. */
  fullyStatic: boolean;
  /** Tokens collected from string-typed leaves (best-effort union). */
  tokens: string[];
  /**
   * If `fullyStatic` and the value is a single string, this is that string
   * (used to populate `styleSource.className`). Undefined otherwise.
   */
  literal?: string;
}

const EMPTY: StaticEvaluation = { fullyStatic: false, tokens: [] };

function asString(node: AstNode): string | undefined {
  if (!node || typeof node !== 'object') {
    return undefined;
  }
  const value = (node as MinimalNode).value;
  if (typeof value === 'string') {
    return value;
  }
  return undefined;
}

function unionStatic(branches: StaticEvaluation[]): StaticEvaluation {
  // Branch union: result is fully static only if every branch resolves to a
  // string. We never collapse into a single literal because we don't know
  // which branch the runtime will pick.
  const tokens = branches.flatMap((b) => b.tokens);
  return {
    fullyStatic: branches.every((b) => b.fullyStatic),
    tokens,
  };
}

function concatStatic(branches: StaticEvaluation[]): StaticEvaluation {
  // Sequential concatenation (template literals, clsx args): all-or-nothing
  // for `fullyStatic`. If every branch resolves to a literal string, we can
  // produce a concatenated literal for `className`.
  const tokens = branches.flatMap((b) => b.tokens);
  const allLiteral = branches.every((b) => typeof b.literal === 'string');
  return {
    fullyStatic: branches.every((b) => b.fullyStatic),
    tokens,
    literal: allLiteral
      ? branches
          .map((b) => b.literal ?? '')
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim()
      : undefined,
  };
}

function evalStringLiteral(node: AstNode): StaticEvaluation | undefined {
  // Babel uses `StringLiteral`; Acorn uses `Literal` with a string `value`.
  if (!node || typeof node !== 'object') {
    return undefined;
  }
  const type = (node as MinimalNode).type;
  if (type === 'StringLiteral') {
    const value = asString(node) ?? '';
    return {
      fullyStatic: true,
      tokens: parseClassNameString(value),
      literal: value,
    };
  }
  if (type === 'Literal') {
    const value = (node as MinimalNode).value;
    if (typeof value === 'string') {
      return {
        fullyStatic: true,
        tokens: parseClassNameString(value),
        literal: value,
      };
    }
  }
  return undefined;
}

function evalTemplateLiteral(node: AstNode): StaticEvaluation | undefined {
  if (!node || typeof node !== 'object') {
    return undefined;
  }
  if ((node as MinimalNode).type !== 'TemplateLiteral') {
    return undefined;
  }
  const quasis = ((node as MinimalNode).quasis ?? []) as MinimalNode[];
  const expressions = ((node as MinimalNode).expressions ?? []) as AstNode[];
  const branches: StaticEvaluation[] = [];

  for (let i = 0; i < quasis.length; i++) {
    const quasi = quasis[i];
    const cooked =
      (((quasi as MinimalNode).value as MinimalNode | undefined)?.cooked as
        | string
        | undefined) ?? '';
    branches.push({
      fullyStatic: true,
      tokens: parseClassNameString(cooked),
      literal: cooked,
    });
    if (i < expressions.length) {
      branches.push(evaluateExpression(expressions[i]));
    }
  }
  return concatStatic(branches);
}

function getCalleeName(callee: AstNode): string | undefined {
  if (!callee || typeof callee !== 'object') {
    return undefined;
  }
  const type = (callee as MinimalNode).type;
  if (type === 'Identifier') {
    const name = (callee as MinimalNode).name;
    return typeof name === 'string' ? name : undefined;
  }
  // MemberExpression like `utils.cn(...)` — match on the tail identifier.
  if (type === 'MemberExpression') {
    const property = (callee as MinimalNode).property as AstNode;
    if (property && typeof property === 'object') {
      const name = (property as MinimalNode).name;
      return typeof name === 'string' ? name : undefined;
    }
  }
  return undefined;
}

function evalCallExpression(node: AstNode): StaticEvaluation | undefined {
  if (!node || typeof node !== 'object') {
    return undefined;
  }
  if ((node as MinimalNode).type !== 'CallExpression') {
    return undefined;
  }
  const callee = (node as MinimalNode).callee as AstNode;
  const name = getCalleeName(callee);
  if (!name || !CLASSNAME_HELPER_NAMES.has(name)) {
    // Unknown helper — we can't reason about its arguments. Be conservative.
    return EMPTY;
  }
  const args = ((node as MinimalNode).arguments ?? []) as AstNode[];
  const branches = args.map((arg) => evaluateExpression(arg));
  // Helper-call branches are unioned: we don't know which args contribute
  // at runtime (some may evaluate to false/undefined). All-static here is
  // already weaker than concat — every arg must be statically resolvable.
  return unionStatic(branches);
}

function evalConditional(node: AstNode): StaticEvaluation | undefined {
  if (!node || typeof node !== 'object') {
    return undefined;
  }
  if ((node as MinimalNode).type !== 'ConditionalExpression') {
    return undefined;
  }
  const consequent = evaluateExpression(
    (node as MinimalNode).consequent as AstNode,
  );
  const alternate = evaluateExpression(
    (node as MinimalNode).alternate as AstNode,
  );
  return unionStatic([consequent, alternate]);
}

function evalLogical(node: AstNode): StaticEvaluation | undefined {
  if (!node || typeof node !== 'object') {
    return undefined;
  }
  if ((node as MinimalNode).type !== 'LogicalExpression') {
    return undefined;
  }
  // `cond && 'foo'` / `cond || 'fallback'` / `a ?? 'foo'`: union the
  // operands that can produce string output. We don't attempt to evaluate
  // the truthiness of `cond` itself.
  const left = evaluateExpression((node as MinimalNode).left as AstNode);
  const right = evaluateExpression((node as MinimalNode).right as AstNode);
  return unionStatic([left, right]);
}

function evalArray(node: AstNode): StaticEvaluation | undefined {
  if (!node || typeof node !== 'object') {
    return undefined;
  }
  if ((node as MinimalNode).type !== 'ArrayExpression') {
    return undefined;
  }
  const elements = ((node as MinimalNode).elements ?? []) as AstNode[];
  return unionStatic(elements.map((el) => evaluateExpression(el)));
}

function evalObject(node: AstNode): StaticEvaluation | undefined {
  if (!node || typeof node !== 'object') {
    return undefined;
  }
  if ((node as MinimalNode).type !== 'ObjectExpression') {
    return undefined;
  }
  // clsx({ 'foo': cond, 'bar baz': true }) — keys are token strings, values
  // are runtime-evaluated. Capture string keys as candidate tokens.
  const properties = ((node as MinimalNode).properties ?? []) as MinimalNode[];
  const tokens: string[] = [];
  for (const prop of properties) {
    if (prop?.type === 'ObjectProperty' || prop?.type === 'Property') {
      const key = prop['key'] as AstNode;
      if (key && typeof key === 'object') {
        const keyType = (key as MinimalNode).type;
        if (keyType === 'StringLiteral' || keyType === 'Literal') {
          const value = asString(key);
          if (typeof value === 'string') {
            tokens.push(...parseClassNameString(value));
          }
        }
        // Identifier keys (without computed:) become token names — but they
        // are JS identifiers, not utility classes, so we skip them.
      }
    }
  }
  return { fullyStatic: false, tokens };
}

function evaluateExpression(node: AstNode): StaticEvaluation {
  if (!node || typeof node !== 'object') {
    return EMPTY;
  }
  // JSXExpressionContainer is a transparent wrapper around its expression.
  if ((node as MinimalNode).type === 'JSXExpressionContainer') {
    return evaluateExpression((node as MinimalNode).expression as AstNode);
  }
  return (
    evalStringLiteral(node) ??
    evalTemplateLiteral(node) ??
    evalCallExpression(node) ??
    evalConditional(node) ??
    evalLogical(node) ??
    evalArray(node) ??
    evalObject(node) ??
    EMPTY
  );
}

interface JSXAttributeLike {
  type?: string;
  name?: { name?: string; type?: string } | string;
  value?: AstNode;
}

function getJsxAttributeName(attr: JSXAttributeLike): string | undefined {
  if (!attr || typeof attr.name === 'undefined') {
    return undefined;
  }
  if (typeof attr.name === 'string') {
    return attr.name;
  }
  if (typeof attr.name === 'object' && attr.name !== null) {
    const n = attr.name.name;
    return typeof n === 'string' ? n : undefined;
  }
  return undefined;
}

function asElementWithAttributes(
  element: unknown,
): { attributes?: JSXAttributeLike[] } | undefined {
  if (!element || typeof element !== 'object') return undefined;
  const attrs = (element as { attributes?: unknown }).attributes;
  if (attrs === undefined) {
    return { attributes: undefined };
  }
  if (Array.isArray(attrs)) {
    return { attributes: attrs as JSXAttributeLike[] };
  }
  return undefined;
}

/**
 * Extract build-time className information from a JSX opening element.
 *
 * Returns `undefined` if the element has no `className` attribute (no point
 * recording an empty `styleSource`). Otherwise returns the best-effort
 * static evaluation:
 *
 *  - String literal → fully static, `className` populated, `classes` parsed.
 *  - Template literal without interpolations → as above.
 *  - clsx/cn/tw/classNames/twMerge/cva call → tokens reachable through any
 *    argument branch, `className` only when every branch is a literal.
 *  - Conditional / logical / array / object → token union, `className`
 *    undefined.
 *  - Anything else (function call, member expression, spread) →
 *    `classes: []` and `className` undefined, signalling "computed at
 *    runtime; read source directly".
 */
export function extractClassNameFromJSX(
  element: unknown,
): { className?: string; classes?: string[] } | undefined {
  const narrowed = asElementWithAttributes(element);
  if (!narrowed || !Array.isArray(narrowed.attributes)) {
    return undefined;
  }

  const attr = narrowed.attributes.find((a): a is JSXAttributeLike => {
    if (!a || typeof a !== 'object') return false;
    if (a.type !== 'JSXAttribute') return false;
    return getJsxAttributeName(a) === 'className';
  });

  if (!attr) {
    return undefined;
  }

  // Attribute with no value: `<div className />` — degenerate; treat as
  // empty.
  if (attr.value === null || attr.value === undefined) {
    return { className: '', classes: [] };
  }

  const evaluation = evaluateExpression(attr.value as AstNode);
  const result: { className?: string; classes?: string[] } = {};
  if (typeof evaluation.literal === 'string') {
    result.className = evaluation.literal;
  }
  result.classes = evaluation.tokens;
  return result;
}

interface DeclarationLocation {
  line: number;
  column: number;
  startOffset?: number;
  endOffset?: number;
}

function getNodeLocation(node: AstNode): DeclarationLocation | undefined {
  if (!node || typeof node !== 'object') return undefined;
  const loc = (node as MinimalNode).loc as
    | { start?: { line?: number; column?: number } }
    | undefined;
  if (!loc?.start || typeof loc.start.line !== 'number') {
    return undefined;
  }
  const start = (node as MinimalNode).start;
  const end = (node as MinimalNode).end;
  return {
    line: loc.start.line,
    column: typeof loc.start.column === 'number' ? loc.start.column : 0,
    startOffset: typeof start === 'number' ? start : undefined,
    endOffset: typeof end === 'number' ? end : undefined,
  };
}

function extractTemplateBlockText(
  node: AstNode,
  source: string,
): string | undefined {
  if (!node || typeof node !== 'object') return undefined;
  if ((node as MinimalNode).type !== 'TaggedTemplateExpression') {
    return undefined;
  }
  const quasi = (node as MinimalNode).quasi as AstNode;
  if (!quasi || typeof quasi !== 'object') return undefined;
  const start = (quasi as MinimalNode).start;
  const end = (quasi as MinimalNode).end;
  if (typeof start !== 'number' || typeof end !== 'number') {
    return undefined;
  }
  return source.slice(start, end).slice(0, CSS_IN_JS_BLOCK_BYTE_BUDGET);
}

interface CssInJsMatch {
  kind: 'styled-tag' | 'styled-call' | 'css-template';
  library?: 'styled-components' | 'emotion' | 'unknown';
}

function classifyTaggedTemplate(node: AstNode): CssInJsMatch | undefined {
  // Examines a TaggedTemplateExpression's tag to decide whether this is a
  // styled-components / emotion declaration we should record.
  if (!node || typeof node !== 'object') return undefined;
  if ((node as MinimalNode).type !== 'TaggedTemplateExpression') {
    return undefined;
  }
  const tag = (node as MinimalNode).tag as AstNode;
  if (!tag || typeof tag !== 'object') return undefined;

  const tagType = (tag as MinimalNode).type;

  // `styled.div\`...\`` / `styled.button\`...\``
  if (tagType === 'MemberExpression') {
    const object = (tag as MinimalNode).object as AstNode;
    if (object && typeof object === 'object') {
      const name = (object as MinimalNode).name;
      if (name === 'styled') {
        return { kind: 'styled-tag', library: 'unknown' };
      }
    }
  }

  // `styled(Component)\`...\``
  if (tagType === 'CallExpression') {
    const callee = (tag as MinimalNode).callee as AstNode;
    if (callee && typeof callee === 'object') {
      const calleeName = (callee as MinimalNode).name;
      if (calleeName === 'styled') {
        return { kind: 'styled-call', library: 'unknown' };
      }
    }
  }

  // `css\`...\`` — emotion-style top-level
  if (tagType === 'Identifier') {
    const name = (tag as MinimalNode).name;
    if (name === 'css') {
      return { kind: 'css-template', library: 'emotion' };
    }
  }

  return undefined;
}

function getBindingIdentifiersFromVariableDeclarator(
  declarator: AstNode,
): string[] {
  if (!declarator || typeof declarator !== 'object') return [];
  const id = (declarator as MinimalNode).id as AstNode;
  if (!id || typeof id !== 'object') return [];
  if ((id as MinimalNode).type === 'Identifier') {
    const name = (id as MinimalNode).name;
    return typeof name === 'string' ? [name] : [];
  }
  return [];
}

/**
 * Walk a parsed module and collect every top-level CSS-in-JS declaration
 * keyed by its bound identifier name.
 *
 * Handles three shapes (per RFC 0001):
 *  - `const X = styled.div\`...\`;`
 *  - `const X = styled(Component)\`...\`;`
 *  - `const X = css\`...\`;`
 *
 * `library` detection from imports is intentionally minimal — we look at
 * the import source so the agent gets a hint, but classification is not
 * required for correctness. Anything ambiguous is recorded as `'unknown'`.
 *
 * Operates against either Babel or Acorn AST shapes via duck typing.
 */
export function collectCssInJsDeclarations(
  ast: unknown,
  source: string,
  sourceFile: string,
): Map<string, CssInJsSourceLocation> {
  const map = new Map<string, CssInJsSourceLocation>();
  const importedLibrary = detectStyledLibraryFromImports(ast);

  const program = unwrapProgram(ast);
  if (!program) return map;

  for (const statement of program) {
    // const X = styled.foo`...`;  /  let X = ...;  /  var X = ...;
    const declarations = getVariableDeclarations(statement);
    for (const declarator of declarations) {
      const init = (declarator as MinimalNode).init as AstNode;
      const match = classifyTaggedTemplate(init);
      if (!match) continue;

      const names = getBindingIdentifiersFromVariableDeclarator(declarator);
      if (names.length === 0) continue;

      const loc = getNodeLocation(init);
      if (!loc) continue;

      const blockText = extractTemplateBlockText(init, source) ?? '';
      const library =
        match.library === 'unknown' && importedLibrary
          ? importedLibrary
          : (match.library ?? 'unknown');

      const entry: CssInJsSourceLocation = {
        file: sourceFile,
        line: loc.line,
        column: loc.column,
        blockText,
        library,
        kind: match.kind,
      };

      for (const name of names) {
        map.set(name, entry);
      }
    }
  }

  return map;
}

function unwrapProgram(ast: unknown): MinimalNode[] | undefined {
  if (!ast || typeof ast !== 'object') return undefined;
  const node = ast as MinimalNode;
  if (
    node.type === 'File' &&
    node.program &&
    typeof node.program === 'object'
  ) {
    const body = (node.program as MinimalNode).body;
    return Array.isArray(body) ? (body as MinimalNode[]) : undefined;
  }
  if (node.type === 'Program') {
    return Array.isArray(node.body) ? (node.body as MinimalNode[]) : undefined;
  }
  // Some callers pass the Program directly.
  if (Array.isArray(node.body)) {
    return node.body as MinimalNode[];
  }
  return undefined;
}

function getVariableDeclarations(statement: MinimalNode): MinimalNode[] {
  // VariableDeclaration directly at top level.
  if (statement.type === 'VariableDeclaration') {
    return Array.isArray(statement.declarations)
      ? (statement.declarations as MinimalNode[])
      : [];
  }
  // ExportNamedDeclaration wrapping a VariableDeclaration.
  if (statement.type === 'ExportNamedDeclaration') {
    const decl = statement.declaration as MinimalNode | undefined;
    if (decl?.type === 'VariableDeclaration') {
      return Array.isArray(decl.declarations)
        ? (decl.declarations as MinimalNode[])
        : [];
    }
  }
  return [];
}

function detectStyledLibraryFromImports(
  ast: unknown,
): 'styled-components' | 'emotion' | undefined {
  const program = unwrapProgram(ast);
  if (!program) return undefined;
  for (const statement of program) {
    if (statement?.type !== 'ImportDeclaration') continue;
    const sourceNode = statement['source'] as MinimalNode | undefined;
    const sourceValue = sourceNode?.value;
    if (typeof sourceValue !== 'string') continue;
    if (sourceValue === 'styled-components') return 'styled-components';
    if (sourceValue.startsWith('@emotion/')) return 'emotion';
  }
  return undefined;
}

/**
 * Assemble a `StyleSource` for one JSX opening element, given the element's
 * className extraction and the file-level CSS-in-JS declaration map.
 *
 * Returns `undefined` when there's nothing worth recording (no className
 * attribute and no styled-component binding) — keeps manifest entries
 * compact for the common case (plain `<div>` with no styling).
 */
export function buildStyleSource(
  classNameInfo: { className?: string; classes?: string[] } | undefined,
  cssInJs: CssInJsSourceLocation | undefined,
): StyleSource | undefined {
  if (!classNameInfo && !cssInJs) return undefined;
  const out: StyleSource = {};
  if (classNameInfo) {
    if (typeof classNameInfo.className === 'string') {
      out.className = classNameInfo.className;
    }
    if (classNameInfo.classes) {
      out.classes = classNameInfo.classes;
    }
  }
  if (cssInJs) {
    out.cssInJs = cssInJs;
  }
  return out;
}

/**
 * Resolve a JSX tag name down to the locally-declared styled-component
 * binding (if any) for `collectCssInJsDeclarations()` lookup.
 *
 * `<StyledButton>` → `StyledButton`. Member-expression tags like
 * `<UI.Card.Body>` are looked up under their root identifier (`UI`) which
 * never matches a `styled.x\`\`` binding, so they naturally yield no match.
 */
export function resolveTagToBindingName(tagName: string): string {
  const dotIndex = tagName.indexOf('.');
  if (dotIndex === -1) return tagName;
  return tagName.slice(0, dotIndex);
}
