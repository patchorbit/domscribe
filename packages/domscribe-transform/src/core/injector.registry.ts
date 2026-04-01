/**
 * InjectorRegistry - Manages per-file-type injector instances
 *
 * Maps file extensions (jsx, tsx, vue) to their corresponding parser/injector
 * pairs. Singleton per workspace to share ID caches across transforms.
 *
 * Parsers are created lazily on first access via `getInjector()` to avoid
 * importing unnecessary parser dependencies (e.g. `vue/compiler-sfc` in
 * React-only projects).
 *
 * @module @domscribe/transform/core/injector-registry
 */
import { createInjector, DomscribeInjector } from './injector.js';
import { AcornParser } from '../parsers/acorn/acorn.parser.js';
import { BabelParser } from '../parsers/babel/babel.parser.js';
import { VueSFCParser } from '../parsers/vue/vue-sfc.parser.js';
import { InjectorOptions } from './types.js';
import { Node as AcornNode } from 'acorn';
import { AcornJSXOpeningElement } from '../parsers/acorn/types.js';
import {
  Node as BabelNode,
  JSXOpeningElement as BabelJSXOpeningElement,
} from '@babel/types';
import { VueSFCParseResult, VueElementNode } from '../parsers/vue/types.js';
import path from 'path';

export type JSXInjector = DomscribeInjector<AcornNode, AcornJSXOpeningElement>;
export type TSXInjector = DomscribeInjector<BabelNode, BabelJSXOpeningElement>;
export type VueInjector = DomscribeInjector<VueSFCParseResult, VueElementNode>;

export interface InjectorRegistryMap {
  jsx: JSXInjector;
  tsx: TSXInjector;
  vue: VueInjector;
}

export type InjectorFileExtension = keyof InjectorRegistryMap;

/**
 * Registry of file-type-specific injectors.
 * Manages lifecycle (initialize, saveCache, close) for all injectors as a unit.
 *
 * Parsers are instantiated lazily — only when `getInjector()` is first called
 * for a given file type. This avoids importing `vue/compiler-sfc` (or other
 * framework-specific parsers) in projects that don't use them.
 */
export class InjectorRegistry {
  private static instances: Map<string, InjectorRegistry> = new Map();
  private readonly registry: Map<
    InjectorFileExtension,
    JSXInjector | TSXInjector | VueInjector
  > = new Map();
  private isClosed = false;
  private readonly workspaceRoot: string;
  private readonly options: InjectorOptions | undefined;

  constructor(workspaceRoot: string, options?: InjectorOptions) {
    this.workspaceRoot = workspaceRoot;
    this.options = options;
  }

  /**
   * Get or create a singleton InjectorRegistry for the given workspace.
   * A closed instance is replaced with a fresh one automatically.
   */
  static getInstance(
    workspaceRoot: string,
    options?: InjectorOptions,
  ): InjectorRegistry {
    const key = path.resolve(workspaceRoot);
    const existing = InjectorRegistry.instances.get(key);
    if (!existing || existing.isClosed) {
      InjectorRegistry.instances.set(
        key,
        new InjectorRegistry(workspaceRoot, options),
      );
    }
    const instance = InjectorRegistry.instances.get(key);
    if (!instance) {
      throw new Error('InjectorRegistry instance not found');
    }
    return instance;
  }

  /**
   * No-op — kept for API compatibility.
   *
   * @remarks
   * Parsers are now initialized lazily in `getInjector()`. Existing call
   * sites that await `initialize()` continue to work without changes.
   */
  async initialize(): Promise<void> {
    // Lazy initialization happens in getInjector()
  }

  /**
   * Persist all injector ID caches to disk without closing the registry.
   * Safe to call after every transform — only writes when dirty.
   * Only operates on parsers that were actually created.
   */
  saveCache(): void {
    for (const injector of this.registry.values()) {
      injector.saveCache();
    }
  }

  close(): void {
    // Mark as closed FIRST so getInstance() creates a fresh instance
    // even if an injector's close() throws.
    this.isClosed = true;
    for (const injector of this.registry.values()) {
      injector.close();
    }
  }

  /**
   * Get the injector for a specific file extension.
   * Creates and initializes the parser on first access for each type.
   */
  async getInjector(
    type: InjectorFileExtension,
  ): Promise<JSXInjector | TSXInjector | VueInjector> {
    const existing = this.registry.get(type);
    if (existing) {
      return existing;
    }

    const injector = this.createInjector(type);
    await injector.initialize();
    this.registry.set(type, injector);
    return injector;
  }

  /** Create an injector for the given file type using stored workspace config. */
  private createInjector(
    type: InjectorFileExtension,
  ): JSXInjector | TSXInjector | VueInjector {
    // Use the factory pattern but with the actual workspace root and options
    const factories = {
      jsx: () =>
        createInjector(
          new AcornParser(),
          this.workspaceRoot,
          this.options,
        ) as JSXInjector,
      tsx: () =>
        createInjector(
          new BabelParser(),
          this.workspaceRoot,
          this.options,
        ) as TSXInjector,
      vue: () =>
        createInjector(
          new VueSFCParser(),
          this.workspaceRoot,
          this.options,
        ) as VueInjector,
    };
    return factories[type]();
  }
}

/** Type guard for supported file extensions (jsx, tsx, vue). */
export const isInjectorFileExtension = (
  extension: string,
): extension is InjectorFileExtension => {
  return ['jsx', 'tsx', 'vue'].includes(extension);
};
