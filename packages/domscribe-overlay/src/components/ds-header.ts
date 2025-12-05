/**
 * DsHeader - Sidebar header component
 *
 * Minimal header with branding and close button only.
 * Capture and connection status moved to bottom action zone.
 */

import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { StoreController } from '../core/store-controller.js';
import { themeStyles, utilityStyles } from '../styles/theme.js';
import { logoSvg } from './logo/index.js';

/**
 * Sidebar header component
 *
 * @element ds-header
 */
@customElement('ds-header')
export class DsHeader extends LitElement {
  private storeController = new StoreController(this);

  @property({ type: Boolean, reflect: true })
  scrolled = false;

  static override styles = [
    themeStyles,
    utilityStyles,
    css`
      :host {
        display: block;
        padding: var(--ds-space-md);
        background: var(--ds-bg-secondary);
        transition: box-shadow var(--ds-transition-fast);
        position: relative;
        z-index: 1;
      }

      :host([scrolled]) {
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      }

      .header-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
      }

      .brand {
        display: flex;
        align-items: center;
        gap: var(--ds-space-sm);
      }

      .brand-logo {
        width: 24px;
        height: 24px;
        flex-shrink: 0;
      }

      .brand-name {
        font-size: var(--ds-font-size-lg);
        font-weight: var(--ds-font-weight-medium);
        letter-spacing: -0.02em;
        text-transform: lowercase;
        color: var(--ds-text-primary);
      }

      .btn-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
        padding: 0;
        background: transparent;
        border: none;
        border-radius: var(--ds-radius-md);
        color: var(--ds-text-secondary);
        cursor: pointer;
        transition: all var(--ds-transition-fast);
      }

      .btn-icon:hover {
        background: var(--ds-bg-hover);
        color: var(--ds-text-primary);
      }

      .btn-icon svg {
        width: 18px;
        height: 18px;
      }
    `,
  ];

  private handleClose() {
    this.storeController.store.setMode('collapsed');
  }

  override render() {
    return html`
      <div class="header-row">
        <div class="brand">
          ${logoSvg({ size: 24, className: 'brand-logo', variant: 'auto' })}
          <span class="brand-name">domscribe</span>
        </div>

        <button
          class="btn-icon"
          @click=${this.handleClose}
          title="Close (ESC)"
          aria-label="Close sidebar"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ds-header': DsHeader;
  }
}
