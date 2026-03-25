/**
 * Shared plugin configuration types
 * @module @domscribe/transform/plugins/types
 */

/**
 * Relay server configuration options shared across bundler plugins
 */
export interface RelayPluginOptions {
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
   * @default 10485760 (10MB)
   */
  bodyLimit?: number;
}

/**
 * Overlay UI configuration options shared across bundler plugins
 */
export interface OverlayPluginOptions {
  /**
   * Initial display mode for the overlay
   *
   * @default 'collapsed'
   */
  initialMode?: 'collapsed' | 'expanded';

  /**
   * Enable debug logging in the overlay
   *
   * @default false
   */
  debug?: boolean;
}
