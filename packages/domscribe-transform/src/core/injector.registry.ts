/**
 * InjectorRegistry - Manages per-file-type injector instances
 *
 * Maps file extensions (jsx, tsx, vue) to their corresponding parser/injector
 * pairs. Singleton per workspace to share ID caches across transforms.
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
 */
export class InjectorRegistry {
  private static instances: Map<string, InjectorRegistry> = new Map();
  private registry: InjectorRegistryMap;
  private isClosed = false;

  constructor(workspaceRoot: string, options?: InjectorOptions) {
    this.registry = {
      jsx: createInjector(new AcornParser(), workspaceRoot, options),
      tsx: createInjector(new BabelParser(), workspaceRoot, options),
      vue: createInjector(new VueSFCParser(), workspaceRoot, options),
    };
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

  /** Initialize all injectors in the registry. Safe to call multiple times. */
  async initialize(): Promise<void> {
    for (const injector of Object.values(this.registry)) {
      await injector.initialize();
    }
  }

  /**
   * Persist all injector ID caches to disk without closing the registry.
   * Safe to call after every transform — only writes when dirty.
   */
  saveCache(): void {
    for (const injector of Object.values(this.registry)) {
      injector.saveCache();
    }
  }

  close(): void {
    // Mark as closed FIRST so getInstance() creates a fresh instance
    // even if an injector's close() throws.
    this.isClosed = true;
    for (const injector of Object.values(this.registry)) {
      injector.close();
    }
  }

  /** Get the injector for a specific file extension. */
  getInjector(
    type: InjectorFileExtension,
  ): JSXInjector | TSXInjector | VueInjector {
    return this.registry[type];
  }
}

/** Type guard for supported file extensions (jsx, tsx, vue). */
export const isInjectorFileExtension = (
  extension: string,
): extension is InjectorFileExtension => {
  return ['jsx', 'tsx', 'vue'].includes(extension);
};
