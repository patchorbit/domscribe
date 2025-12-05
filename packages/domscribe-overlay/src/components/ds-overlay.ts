/**
 * DsOverlay - Root overlay component
 *
 * Main container that manages overlay visibility and modes.
 * Contains the tab, sidebar, and picker overlay components.
 */

import { LitElement, html, css } from 'lit';
import { customElement } from 'lit/decorators.js';
import { StoreController } from '../core/store-controller.js';
import { themeStyles, utilityStyles } from '../styles/theme.js';

// Import child components
import './ds-tab.js';
import './ds-sidebar.js';
import './ds-picker-overlay.js';

/**
 * Root overlay component
 *
 * @element ds-overlay
 */
@customElement('ds-overlay')
export class DsOverlay extends LitElement {
  private storeController = new StoreController(this);

  static override styles = [
    themeStyles,
    utilityStyles,
    css`
      :host {
        display: block;
        position: fixed;
        top: 0;
        right: 0;
        bottom: 0;
        z-index: var(--ds-z-overlay);
        font-family: var(--ds-font-family);
        font-size: var(--ds-font-size-md);
        line-height: var(--ds-line-height);
        color: var(--ds-text-primary);
        pointer-events: none;
      }

      :host([mode='collapsed']) {
        width: var(--ds-tab-width);
      }

      :host([mode='expanded']) {
        width: var(--ds-sidebar-width);
      }

      :host([mode='capturing']) {
        /* Full-screen capture - no sidebar footprint */
        width: 0;
      }

      .overlay-container {
        position: relative;
        width: 100%;
        height: 100%;
      }

      ds-tab {
        pointer-events: auto;
      }

      ds-sidebar {
        pointer-events: auto;
      }

      ds-picker-overlay {
        pointer-events: auto;
      }
    `,
  ];

  override render() {
    const { mode } = this.storeController.state;

    // Explicit conditional rendering - each mode has one primary component
    const showTab = mode === 'collapsed';
    const showSidebar = mode === 'expanded';
    const showPicker = mode === 'capturing';

    return html`
      <div class="overlay-container">
        ${showTab ? html`<ds-tab></ds-tab>` : null}
        ${showSidebar ? html`<ds-sidebar></ds-sidebar>` : null}
        ${showPicker ? html`<ds-picker-overlay></ds-picker-overlay>` : null}
      </div>
    `;
  }

  override updated() {
    // Update host attribute for CSS styling
    const { mode } = this.storeController.state;
    this.setAttribute('mode', mode);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ds-overlay': DsOverlay;
  }
}
