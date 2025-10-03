/**
 * Loader options passed via webpack config
 */
export interface WebpackLoaderOptions {
  /**
   * Enable debug logging
   *
   * @default false
   */
  debug?: boolean;

  /**
   * Enable transformation
   * Set to false in production builds
   *
   * @default true
   */
  enabled?: boolean;
}

/**
 * Configuration options for the webpack plugin
 */
export interface WebpackPluginOptions {
  /**
   * Enable debug logging
   *
   * @default false
   */
  debug?: boolean;

  /**
   * Enable plugin (set to false in production builds)
   *
   * @default true in development, false in production
   */
  enabled?: boolean;
}
