// Vite Adapter
export { domscribe as vite, domscribe } from './plugins/vite/vite.plugin.js';
export type { VitePluginOptions } from './plugins/vite/types.js';
// Webpack Loader
export { default as webpackLoader } from './plugins/webpack/webpack.loader.js';
export type { WebpackLoaderOptions } from './plugins/webpack/types.js';

// Webpack Plugin
export {
  DomscribeWebpackPlugin,
  default as webpackPlugin,
} from './plugins/webpack/webpack.plugin.js';
export type { WebpackPluginOptions } from './plugins/webpack/types.js';

// Core Injector
export { DomscribeInjector, createInjector } from './core/injector.js';

// Parser Interface
export type { ParserInterface } from './parsers/parser.interface.js';
export type { ParseParams, SourceLocation } from './parsers/types.js';

// Parsers
export {
  AcornParser,
  createAcornParser,
} from './parsers/acorn/acorn.parser.js';

export {
  BabelParser,
  createBabelParser,
} from './parsers/babel/babel.parser.js';

// Statistics
export { TransformStats, createTransformStats } from './core/stats.js';
export type {
  InjectorOptions,
  InjectorResult,
  TransformStatsData,
} from './core/types.js';
