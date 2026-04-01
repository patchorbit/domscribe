/**
 * Configuration options for the @domscribe/next integration.
 *
 * These options are passed through to the underlying Turbopack/Webpack transform plugins
 * and control overlay, relay, and debug behavior.
 *
 * @module @domscribe/next/types
 */
export interface DomscribeNextOptions {
  /**
   * Enable transformation.
   * Set to false in production builds.
   *
   * @default true
   */
  enabled?: boolean;

  /**
   * File pattern to include for transformation.
   *
   * @default /\.(jsx|tsx)$/i
   */
  include?: RegExp;

  /**
   * File pattern to exclude from transformation.
   *
   * @default /node_modules|\.test\.|\.spec\./i
   */
  exclude?: RegExp;

  /**
   * Enable debug logging.
   *
   * @default false
   */
  debug?: boolean;

  /**
   * Relay server configuration.
   * Controls auto-start behavior and connection settings.
   */
  relay?: {
    /**
     * Whether to auto-start the relay daemon if not running.
     *
     * @default true
     */
    autoStart?: boolean;

    /**
     * Port for the relay server (only used if starting).
     * 0 means dynamic port assignment.
     *
     * @default 0
     */
    port?: number;

    /**
     * Host for the relay server (only used if starting).
     *
     * @default '127.0.0.1'
     */
    host?: string;

    /**
     * Max request body size in bytes (only used if starting).
     *
     * @default 10485760 (10 MB)
     */
    bodyLimit?: number;
  };

  /**
   * Overlay UI configuration.
   * Set to true for default options, or provide configuration.
   * Requires @domscribe/overlay package to be installed.
   *
   * @default false
   */
  overlay?:
    | boolean
    | {
        /**
         * Initial display mode for the overlay.
         *
         * @default 'collapsed'
         */
        initialMode?: 'collapsed' | 'expanded';

        /**
         * Enable debug logging in the overlay.
         *
         * @default false
         */
        debug?: boolean;
      };
}
