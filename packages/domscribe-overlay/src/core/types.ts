/**
 * Core types for the overlay package
 */

import type {
  RuntimeContext,
  ElementTarget,
  ManifestEntry,
  Annotation,
} from '@domscribe/core';

/**
 * Overlay display mode
 */
export type OverlayMode = 'collapsed' | 'expanded' | 'capturing';

/**
 * Overlay state managed by OverlayStore
 */
export interface OverlayState {
  // UI State
  mode: OverlayMode;
  sidebarWidth: number;
  /** Vertical position of the collapsed tab as a percentage (0–100). Default: 50 (center). */
  tabOffsetY: number;

  // Connection State
  relayConnected: boolean;
  relayPort: number | null;
  relayHost: string | null;

  // Capture State
  selectedElement: HTMLElement | null;
  selectedTarget: ElementTarget | null;
  selectedEntryId: string | null;
  hoveredElement: HTMLElement | null;
  runtimeContext: RuntimeContext | null;
  manifestEntry: ManifestEntry | null;

  // Annotation State
  annotations: Annotation[];
  annotationInput: string;
  activeAnnotationId: string | null;
  isSubmitting: boolean;

  // Debug
  debug: boolean;
}

/**
 * Options for initializing the overlay
 */
export interface OverlayOptions {
  /**
   * Initial display mode
   * @default 'collapsed'
   */
  initialMode?: OverlayMode;

  /**
   * Enable debug logging
   * @default false
   */
  debug?: boolean;

  /**
   * Initial sidebar width in pixels
   * @default 360
   */
  sidebarWidth?: number;
}

/**
 * Global window properties injected by the build plugins
 */
declare global {
  interface Window {
    __DOMSCRIBE_RELAY_PORT__?: number;
    __DOMSCRIBE_RELAY_HOST__?: string;
    __DOMSCRIBE_OVERLAY_OPTIONS__?: OverlayOptions;
  }
}
