/**
 * @domscribe/next - Next.js integration for Domscribe
 *
 * Zero-config Next.js integration that provides:
 * - Build-time AST injection of stable element IDs (Turbopack + Webpack)
 * - Auto-initialization of runtime + overlay via loader preamble
 * - Relay auto-start and overlay injection via loader-injected window globals
 *
 * @module @domscribe/next
 */

export { withDomscribe } from './with-domscribe.js';
export type { DomscribeNextOptions } from './types.js';
