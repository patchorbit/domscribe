/**
 * DsHighlightBox - Element highlight rectangle
 *
 * A positioned rectangle that highlights the hovered element
 * during capture mode. Uses CSS transforms for smooth performance.
 */

import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { themeStyles } from '../styles/theme.js';

/**
 * Highlight box component
 *
 * @element ds-highlight-box
 */
@customElement('ds-highlight-box')
export class DsHighlightBox extends LitElement {
  @property({ type: Object })
  rect: DOMRect | null = null;

  static override styles = [
    themeStyles,
    css`
      :host {
        display: block;
        position: fixed;
        pointer-events: none;
        z-index: var(--ds-z-picker);
      }

      .highlight {
        position: absolute;
        background: var(--ds-highlight);
        border: 2px solid var(--ds-highlight-border);
        border-radius: var(--ds-radius-sm);
        transition: all 50ms ease-out;
      }
    `,
  ];

  override render() {
    if (!this.rect) {
      return null;
    }

    const style = `
      top: ${this.rect.top}px;
      left: ${this.rect.left}px;
      width: ${this.rect.width}px;
      height: ${this.rect.height}px;
    `;

    return html`<div class="highlight" style=${style}></div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ds-highlight-box': DsHighlightBox;
  }
}
