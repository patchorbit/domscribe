/**
 * Babel-based JSX/TSX parser implementation
 *
 * This parser uses @babel/parser for full TypeScript and JSX suppor
 * It's more powerful than Acorn but also larger and slightly slower.
 * Use this when you need TypeScript support or are working with
 * webpack/other bundlers that don't strip TypeScript firs
 *
 * Performance: ~2-4ms per typical component (50-100 lines)
 * Bundle size: ~500KB (@babel/parser + @babel/types)
 *
 */

import { parse, ParserPlugin } from '@babel/parser';
import {
  Node,
  JSXOpeningElement,
  JSXOpeningFragment,
  JSXAttribute,
  JSXIdentifier,
  JSXMemberExpression,
  JSXNamespacedName,
  Identifier,
  isJSXElement,
  isJSXFragment,
  isJSXOpeningFragment,
  isJSXAttribute,
  isJSXOpeningElement,
  VISITOR_KEYS,
  isJSXIdentifier,
  isIdentifier,
  isJSXMemberExpression,
  isJSXNamespacedName,
  isNode,
} from '@babel/types';
import { ParserInterface } from '../parser.interface.js';
import { ParseParams, SourceLocation } from '../types.js';
import { BabelParserOptions } from './types.js';

/**
 * Type alias for JSX opening elements (regular elements and fragments)
 */
type BabelJSXOpeningElement = JSXOpeningElement | JSXOpeningFragment;

/**
 * BabelParser implementation for JSX/TSX parsing
 *
 * Supports both JavaScript and TypeScript syntax, making it suitable
 * for webpack and other bundlers that don't pre-strip TypeScrip
 */
export class BabelParser
  implements ParserInterface<Node, BabelJSXOpeningElement>
{
  /**
   * Babel parser plugins to enable
   */
  private readonly plugins: ParserPlugin[];
  private readonly options: Required<BabelParserOptions>;

  /**
   * Create a new BabelParser instance
   *
   * @param options - Parser configuration
   * @param options.typescript - Enable TypeScript support (default: true)
   * @param options.jsx - Enable JSX support (default: true)
   * @param options.plugins - Additional Babel plugins to enable
   */
  constructor(options: BabelParserOptions = {}) {
    this.options = {
      typescript: options.typescript ?? true,
      jsx: options.jsx ?? true,
      plugins: options.plugins ?? [],
    };

    // Base plugins
    this.plugins = [...this.options.plugins];

    // Add TypeScript plugin if enabled
    if (this.options.typescript) {
      this.plugins.push('typescript');
    }

    // Add JSX plugin if enabled
    if (this.options.jsx) {
      this.plugins.push('jsx');
    }
  }

  parse(source: string, params?: ParseParams): Node {
    const { sourceFile, sourceType } = params ?? {};

    try {
      return parse(source, {
        sourceType: sourceType ?? 'module',
        sourceFilename: sourceFile,
        plugins: this.plugins,
        ranges: true, // Include start/end byte offsets
        tokens: false, // Don't need tokens
        errorRecovery: false, // Fail fast on syntax errors
      });
    } catch (error) {
      if (error instanceof Error) {
        throw new SyntaxError(
          `Babel parse error in ${sourceFile ?? 'unknown'}: ${error.message}`,
        );
      }
      throw error;
    }
  }

  findJSXOpeningElements(ast: Node): BabelJSXOpeningElement[] {
    const elements: BabelJSXOpeningElement[] = [];

    // Traverse the AST using a simple recursive visitor
    const visit = (node: Node | null | undefined) => {
      if (!node) {
        return;
      }

      // Check if this is a JSX element or fragment
      if (isJSXElement(node)) {
        elements.push(node.openingElement);
      } else if (isJSXFragment(node)) {
        elements.push(node.openingFragment);
      }

      const nodeKeys = VISITOR_KEYS[node.type];

      if (!nodeKeys) {
        return;
      }

      // Recursively visit all other child nodes
      for (const nodeKey of nodeKeys) {
        const possibleNode = node[nodeKey as keyof Node];

        if (Array.isArray(possibleNode)) {
          possibleNode.forEach((child) => {
            if (isNode(child)) {
              visit(child);
            }
          });
        } else if (isNode(possibleNode)) {
          visit(possibleNode);
        }
      }
    };

    visit(ast);
    return elements;
  }

  hasDataDsAttribute(element: BabelJSXOpeningElement): boolean {
    // JSXOpeningFragment has no attributes
    if (isJSXOpeningFragment(element)) {
      return false;
    }

    // Check if any attribute is named 'data-ds'
    return element.attributes.some((attr) => {
      if (isJSXAttribute(attr)) {
        return this.getAttributeName(attr) === 'data-ds';
      }
      return false;
    });
  }

  getLocation(element: BabelJSXOpeningElement): SourceLocation | undefined {
    if (!element.loc) {
      console.warn(
        `[domscribe-transform][babel-parser] Could not find source location for ${this.getTagName(element)}`,
      );
      return;
    }

    const { start, end } = element.loc;

    return {
      start: {
        line: start.line,
        column: start.column,
        offset: element.start ?? 0,
      },
      end: {
        line: end.line,
        column: end.column,
        offset: element.end ?? 0,
      },
    };
  }

  getTagName(element: BabelJSXOpeningElement): string {
    if (isJSXOpeningFragment(element)) {
      return 'Fragment';
    }

    return this.getJSXNameAsString(element.name);
  }

  getInsertPosition(element: BabelJSXOpeningElement): number {
    // Self-closing elements: <div /> → insert before />
    if (isJSXOpeningElement(element) && element.selfClosing) {
      return (element.end ?? 0) - 2;
    }

    // Regular elements: <div> → insert before >
    return (element.end ?? 0) - 1;
  }

  /**
   * Get the attribute name as a string
   *
   * @param attr - JSX attribute node
   * @returns Attribute name
   */
  private getAttributeName(attr: JSXAttribute): string {
    return this.getJSXNameAsString(attr.name);
  }

  /**
   * Get JSX name as a string (handles identifiers, member expressions, and namespaces)
   *
   * @param name - JSX name node
   * @returns Name as a string
   */
  private getJSXNameAsString(
    name: JSXIdentifier | JSXMemberExpression | JSXNamespacedName | Identifier,
  ): string {
    if (isJSXIdentifier(name)) {
      return name.name;
    }

    if (isIdentifier(name)) {
      return name.name;
    }

    if (isJSXMemberExpression(name)) {
      // Handle member expressions: UI.Button.Primary
      const object = this.getJSXNameAsString(name.object);
      const property = this.getJSXNameAsString(name.property);
      return `${object}.${property}`;
    }

    if (isJSXNamespacedName(name)) {
      // Handle namespaced names: svg:rect
      const namespace = this.getJSXNameAsString(name.namespace);
      const localName = this.getJSXNameAsString(name.name);
      return `${namespace}:${localName}`;
    }

    return 'Unknown';
  }
}

/**
 * Create a BabelParser instance with default settings
 *
 * Factory function for consistency with other parsers.
 *
 * @param options - Parser configuration
 * @returns BabelParser instance
 */
export function createBabelParser(
  options?: ConstructorParameters<typeof BabelParser>[0],
): BabelParser {
  return new BabelParser(options);
}
