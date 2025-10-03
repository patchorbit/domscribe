/**
 * Acorn-based JSX parser implementation
 *
 * This parser uses acorn + acorn-jsx for fast, lightweight JSX parsing.
 * It cannot parse TypeScript syntax, but this is perfect for Vite's context
 * where esbuild has already stripped TypeScript before our plugin runs.
 *
 * Performance: ~1-2ms per typical component (50-100 lines)
 * Bundle size: ~100KB (acorn + acorn-jsx)
 *
 */

import type { Node as AcornNode } from 'acorn';
import { Parser } from 'acorn';
import jsx from 'acorn-jsx';
import { full, base, RecursiveVisitors } from 'acorn-walk';
import { ParserInterface } from '../parser.interface.js';
import {
  AcornJSXOpeningElementNode,
  AcornJSXElement,
  AcornJSXFragment,
  AcornJSXOpeningElement,
  AcornJSXOpeningFragment,
  AcornJSXText,
  AcornJSXExpressionContainer,
  AcornJSXEmptyExpression,
  AcornJSXAttribute,
  AcornJSXSpreadAttribute,
  AcornJSXMemberExpression,
  AcornJSXIdentifier,
  AcornJSXName,
} from './types.js';
import { ParseParams, SourceLocation } from '../types.js';

/**
 * AcornParser implementation for JSX-only parsing
 *
 * Used in Vite context where TypeScript is already stripped by esbuild.
 */
export class AcornParser
  implements ParserInterface<AcornNode, AcornJSXOpeningElementNode>
{
  /**
   * Acorn parser instance extended with JSX plugin
   */
  private readonly jsxParser: typeof Parser;

  constructor() {
    // Extend Acorn parser with JSX support
    this.jsxParser = Parser.extend(jsx());
  }

  parse(source: string, params?: ParseParams): AcornNode {
    const { sourceFile, sourceType } = params ?? {};

    try {
      return this.jsxParser.parse(source, {
        ecmaVersion: 'latest',
        sourceType: sourceType ?? 'module',
        locations: true, // Include line/column info
        ranges: true, // Include start/end byte offsets
      });
    } catch (error) {
      if (error instanceof Error) {
        throw new SyntaxError(
          `Acorn parse error in ${sourceFile ?? 'unknown'}: ${error.message}`,
        );
      }
      throw error;
    }
  }

  findJSXOpeningElements(ast: AcornNode): AcornJSXOpeningElementNode[] {
    const elements: AcornJSXOpeningElementNode[] = [];

    const onJSXNode = (
      node:
        | AcornJSXElement
        | AcornJSXFragment
        | AcornJSXOpeningElement
        | AcornJSXOpeningFragment
        | AcornJSXText
        | AcornJSXExpressionContainer
        | AcornJSXEmptyExpression,
      _state: unknown,
      cb: (node: AcornNode) => void,
    ) => {
      if ('openingElement' in node) {
        elements.push(node.openingElement);
      }
      if ('openingFragment' in node) {
        elements.push(node.openingFragment);
      }

      if ('children' in node) {
        node.children.forEach((child) => cb(child));
      }
      if ('expression' in node) {
        cb(node.expression);
      }
    };

    // Walk the entire AST and collect JSX opening elements
    full(
      ast,
      () => {
        return;
      },
      {
        ...base,
        JSXElement: onJSXNode,
        JSXFragment: onJSXNode,
        JSXOpeningElement: onJSXNode,
        JSXOpeningFragment: onJSXNode,
        JSXText: onJSXNode,
        JSXExpressionContainer: onJSXNode,
        JSXEmptyExpression: onJSXNode,
      } as unknown as RecursiveVisitors<AcornNode>,
    );

    return elements;
  }

  hasDataDsAttribute(element: AcornJSXOpeningElementNode): boolean {
    // JSXOpeningFragment has no attributes
    const attributes = 'attributes' in element ? element.attributes : [];

    // Check if attribute exists
    return attributes.some(
      (attribute: AcornJSXAttribute | AcornJSXSpreadAttribute) => {
        return (
          attribute.type === 'JSXAttribute' &&
          this.getNodeNameAsString(attribute) === 'data-ds'
        );
      },
    );
  }

  getLocation(node: AcornJSXOpeningElementNode): SourceLocation | undefined {
    if (!node.loc) {
      console.warn(
        `[domscribe-transform][acorn-parser] Could not find source location for ${this.getTagName(node)}`,
      );
      return;
    }

    const { start, end } = node.loc;

    return {
      start: {
        line: start.line,
        column: start.column,
        offset: node.start,
      },
      end: {
        line: end.line,
        column: end.column,
        offset: node.end,
      },
    };
  }

  getTagName(node: AcornJSXOpeningElementNode): string {
    return this.getNodeNameAsString(node);
  }

  getInsertPosition(node: AcornJSXOpeningElementNode): number {
    // Self-closing elements: <div /> → insert before />
    if ('selfClosing' in node && node.selfClosing) {
      return node.end - 2;
    }

    // Regular elements: <div> → insert before >
    return node.end - 1;
  }

  private getNodeNameAsString(
    node:
      | AcornJSXOpeningElement
      | AcornJSXAttribute
      | AcornJSXSpreadAttribute
      | AcornJSXMemberExpression
      | AcornJSXIdentifier
      | AcornJSXOpeningFragment
      | AcornJSXName,
  ): string {
    if ('name' in node && typeof node.name === 'string') {
      return node.name;
    }

    if (
      'object' in node &&
      typeof node.object === 'object' &&
      'property' in node &&
      typeof node.property === 'object'
    ) {
      return `${this.getNodeNameAsString(node.object)}.${this.getNodeNameAsString(node.property)}`;
    }

    if ('name' in node && typeof node.name === 'object') {
      if ('namespace' in node && typeof node.namespace === 'object') {
        return `${this.getNodeNameAsString(node.namespace)}:${this.getNodeNameAsString(node.name)}`;
      }
      return this.getNodeNameAsString(node.name);
    }

    return 'Unknown';
  }
}

/**
 * Create an AcornParser instance
 *
 * Factory function for consistency with other parsers.
 */
export function createAcornParser(): AcornParser {
  return new AcornParser();
}
