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
 * @module @domscribe/transform/core/injector
 */
import MagicString from 'magic-string';
import type { ParserInterface } from '../parsers/parser.interface.js';
import { SourceLocation } from '../parsers/types.js';
import { PATHS, type ManifestEntry } from '@domscribe/core';
import {
  InjectParams,
  InjectorOptions,
  InjectorResult,
  InjectorMetrics,
} from './types.js';
import { SourceMapConsumer } from 'source-map';
import { IDStabilizer, type IDGenerator } from '@domscribe/manifest';
import path from 'path';

export class DomscribeInjector<TParseResult = unknown, TElement = unknown> {
  private readonly options: Required<InjectorOptions>;
  private isInitialized = false;

  constructor(
    private readonly parser: ParserInterface<TParseResult, TElement>,
    private readonly idGenerator: IDGenerator,
    options?: InjectorOptions,
  ) {
    this.options = {
      debug: options?.debug ?? false,
    };
  }

  get initalized(): boolean {
    return this.isInitialized;
  }

  set initialized(value: boolean) {
    this.isInitialized = value;
  }

  /**
   * Initialize the Injector. This will load the ID generator and initialize it.
   * Also initializes the parser if it has an initialize method.
   *
   * @remarks Safe to call multiple times, will only initialize once.
   * @returns A promise that resolves when the Injector is initialized.
   */
  async initialize(): Promise<void> {
    if (this.initalized) {
      if (this.options.debug) {
        console.log(
          `[domscribe-transform][injector] Injector already initialized. Skipping initialization.`,
        );
      }
      return;
    }

    // Initialize parser if it has an initialize method (e.g., Vue parser)
    if (this.parser.initialize) {
      await this.parser.initialize();
    }

    await this.idGenerator.initialize();
    this.initialized = true;
  }

  /**
   * Transform source code by injecting `data-ds` attributes on JSX elements.
   *
   * @param source - Source code string to transform
   * @param params - Optional source file path and source map consumer
   * @returns Transformed code, source map, manifest entries, and metrics
   */
  inject(source: string, params: InjectParams = {}): InjectorResult {
    const metrics: InjectorMetrics = {
      parseMs: 0,
      traversalMs: 0,
      elementsFound: 0,
      elementsInjected: 0,
    };

    if (!source) {
      return {
        code: source,
        map: null,
        manifestEntries: [],
        metrics,
      };
    }

    const { sourceFile = 'unknown', sourceMapConsumer } = params;

    // Parse the source code
    let ast: TParseResult;
    const parseStart = performance.now();
    try {
      ast = this.parser.parse(source, { sourceFile });
    } catch (error) {
      throw new Error(
        `Failed to parse ${sourceFile}: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error : undefined,
      );
    }
    metrics.parseMs = performance.now() - parseStart;

    // Find all JSX opening elements
    const traversalStart = performance.now();
    const elements = this.parser.findJSXOpeningElements(ast);
    metrics.traversalMs = performance.now() - traversalStart;
    metrics.elementsFound = elements.length;

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

      const id = this.generateId(sourceFile, source, location.start);
      const attribute = ` data-ds="${id}"`;
      const tagName = this.parser.getTagName(element);

      if (tagName.includes('Fragment')) {
        if (this.options.debug) {
          console.warn(
            `[domscribe-transform][injector] Skipping Fragment element detected in ${sourceFile}: ${tagName}`,
          );
        }
        continue;
      }

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
        metrics.elementsInjected++;
      }
    }

    // Attach fileHash to all manifest entries for this file
    const fileHash = this.idGenerator.getFileHash(sourceFile);
    if (fileHash) {
      for (const entry of manifestEntries) {
        entry.fileHash = fileHash;
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
      metrics,
    };
  }

  /** Get the parser instance used by this injector. */
  getParser(): ParserInterface<TParseResult, TElement> {
    return this.parser;
  }

  /**
   * Persist the ID cache to disk without closing the injector.
   * Safe to call repeatedly — only writes when the cache is dirty.
   */
  saveCache(): void {
    this.idGenerator.saveCache();
  }

  /**
   * Close the injector and persist the ID cache to disk.
   * Marks the instance as uninitialized so it can be re-initialized.
   */
  close(): void {
    this.idGenerator.close();
    this.isInitialized = false;

    if (this.options.debug) {
      console.log(
        '[domscribe-transform][injector] Injector closed, cache saved',
      );
    }
  }

  private generateId(
    sourceFile: string,
    source: string,
    start: { line: number | null; column: number | null },
  ): string {
    return this.idGenerator.getStableId(
      { fileContent: source, filePath: sourceFile },
      start,
    );
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

/**
 * Factory function that creates a DomscribeInjector with an IDStabilizer
 * singleton for the given workspace.
 *
 * @param parser - Parser implementation to use for AST generation
 * @param workspaceRoot - Workspace root for cache directory resolution
 * @param options - Injector options (debug, etc.)
 */
export function createInjector<TParseResult = unknown, TElement = unknown>(
  parser: ParserInterface<TParseResult, TElement>,
  workspaceRoot: string,
  options?: InjectorOptions,
): DomscribeInjector<TParseResult, TElement> {
  const cacheDir = path.join(workspaceRoot, PATHS.TRANSFORM_CACHE);

  // Use singleton to ensure all callers share the same in-memory cache
  const idStabilizer = IDStabilizer.getInstance(cacheDir, {
    debug: options?.debug ?? false,
  });

  return new DomscribeInjector(parser, idStabilizer, options);
}
