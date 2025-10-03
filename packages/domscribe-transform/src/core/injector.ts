/**
 * DomscribeInjector - Parser-agnostic JSX attribute injector
 *
 * This is the core injection logic that works with any parser implementation
 * (Acorn, Babel, SWC, etc.) through the ParserInterface abstraction.
 *
 * Responsibilities:
 * - Inject `data-ds` attributes on JSX host elements
 * - Extract component metadata
 * - Generate manifest entries with source positions
 * - Support source map resolution for accurate TypeScript line numbers
 * - Preserve React keys (hydration-safe)
 * - Avoid duplicate injection
 *
 */
import MagicString from 'magic-string';
import type { ParserInterface } from '../parsers/parser.interface.js';
import { SourceLocation } from '../parsers/types.js';
import { generateElementId, type ManifestEntry } from '@domscribe/core';
import { InjectParams, InjectorOptions, InjectorResult } from './types.js';
import { SourceMapConsumer } from 'source-map';
import { IDStabilizer } from '@domscribe/manifest';

export class DomscribeInjector<
  TNode = unknown,
  TElement extends TNode = TNode,
> {
  private readonly parser: ParserInterface<TNode, TElement>;
  private readonly idStabilizer: IDStabilizer;
  private readonly options: Required<InjectorOptions>;

  constructor(
    parser: ParserInterface<TNode, TElement>,
    idStabilizer: IDStabilizer,
    options?: InjectorOptions,
  ) {
    this.parser = parser;
    this.idStabilizer = idStabilizer;
    this.options = {
      debug: options?.debug ?? false,
    };
  }

  inject(source: string, params: InjectParams = {}): InjectorResult {
    if (!source) {
      return {
        code: source,
        map: null,
        manifestEntries: [],
      };
    }

    const { sourceFile = 'unknown', sourceMapConsumer, fileHash } = params;

    // Parse the source code
    let ast: TNode;
    try {
      ast = this.parser.parse(source, { sourceFile });
    } catch (error) {
      throw new Error(
        `Failed to parse ${sourceFile}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    // Find all JSX opening elements
    const elements = this.parser.findJSXOpeningElements(ast);

    // Initialize magic-string for source manipulation
    const magicString = new MagicString(source);

    // Generate manifest entries
    const manifestEntries: ManifestEntry[] = [];

    // Process each element
    for (const element of elements) {
      // Skip if element already has data-ds attribute
      if (this.parser.hasDataDsAttribute(element)) {
        continue;
      }

      // Get element location
      const location = this.parser.getLocation(element);
      if (!location) {
        if (this.options.debug) {
          console.warn(
            `[domscribe-transform][injector] Could not get location for element in ${sourceFile}`,
          );
        }
        continue;
      }

      const id = this.generateId(sourceFile, fileHash, location.start);
      const attribute = ` data-ds="${id}"`;
      const tagName = this.parser.getTagName(element);

      // Get insertion position
      const insertPosition = this.parser.getInsertPosition(element);

      // Inject attribute
      magicString.appendLeft(insertPosition, attribute);

      // Resolve positions through source map if available
      let { start, end } = location;

      if (sourceMapConsumer) {
        ({ start, end } = this.getPreTranspiledPosition(
          tagName,
          location,
          sourceMapConsumer,
        ) ?? { start, end });
      }

      if (start) {
        // Create manifest entry
        const entry: ManifestEntry = {
          id,
          file: sourceFile,
          start,
          end,
          tagName,
        };

        manifestEntries.push(entry);
      }
    }

    // Generate source map
    const map = magicString.generateMap({
      hires: true,
      source: sourceFile,
      includeContent: true,
    });

    return {
      code: magicString.toString(),
      map,
      manifestEntries,
    };
  }

  getParser(): ParserInterface<TNode, TElement> {
    return this.parser;
  }

  private generateId(
    sourceFile: string,
    fileHash: string | undefined,
    start: { line: number | null; column: number | null },
  ): string {
    // Use ID stabilizer if we have all required data
    if (fileHash && start.line !== null && start.column !== null) {
      return this.idStabilizer.getStableId(sourceFile, fileHash, start);
    }

    // Fallback to random ID generation
    return generateElementId();
  }

  private getPreTranspiledPosition(
    tagName: string,
    location: SourceLocation,
    sourceMapConsumer: SourceMapConsumer,
  ): SourceLocation | undefined {
    const { start, end } = location;

    if (start.line === null || start.column === null) {
      return undefined;
    }

    // Find the pre-transpiled start position in the original source
    const originalStart = sourceMapConsumer.originalPositionFor({
      line: start.line,
      column: start.column,
    });

    if (originalStart?.line === null || originalStart?.column === null) {
      if (this.options.debug) {
        console.warn(
          `[domscribe-transform][injector] Could not resolve original position for ${tagName}, using transpiled positions`,
        );
      }
      return undefined;
    }

    // Find the pre-transpiled end position in the original source if available
    const originalEnd =
      end && end.line !== null && end.column !== null
        ? sourceMapConsumer.originalPositionFor({
            line: end.line,
            column: end.column,
          })
        : null;

    return {
      start: {
        line: originalStart.line,
        column: originalStart.column,
      },
      end: originalEnd
        ? {
            line: originalEnd.line,
            column: originalEnd.column,
          }
        : undefined,
    };
  }
}

export function createInjector<TNode = unknown, TElement extends TNode = TNode>(
  parser: ParserInterface<TNode, TElement>,
  idStabilizer: IDStabilizer,
  options?: InjectorOptions,
): DomscribeInjector<TNode, TElement> {
  return new DomscribeInjector(parser, idStabilizer, options);
}
