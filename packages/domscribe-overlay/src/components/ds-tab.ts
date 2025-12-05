/**
 * DsTab - Collapsed activation tab
 *
 * An inverted-D (ᗡ) shaped tab stuck to the right edge of the viewport.
 * Exact horizontal mirror of the centralized logo (SIMPLIFIED variant),
 * with inverted colors: cyan D fill, dark cursor.
 *
 * The tab can be dragged vertically along the right edge. A small drag
 * threshold distinguishes click (open sidebar) from drag (reposition).
 */

import { LitElement, html, css, svg } from 'lit';
import { customElement } from 'lit/decorators.js';
import { StoreController } from '../core/store-controller.js';
import { themeStyles } from '../styles/theme.js';
import { CURSOR_PATH, SIMPLIFIED } from './logo/logo-paths.js';

/** Minimum px of movement before we treat it as a drag instead of a click. */
const DRAG_THRESHOLD = 4;

/**
 * Collapsed tab component
 *
 * @element ds-tab
 */
@customElement('ds-tab')
export class DsTab extends LitElement {
  private storeController = new StoreController(this);

  /* ── drag state (not reactive — no re-render needed while dragging) ── */
  private dragging = false;
  private dragStartY = 0;
  private dragStartOffset = 0;
  private didDrag = false;

  static override styles = [
    themeStyles,
    css`
      :host {
        display: block;
        position: absolute;
        right: 0;
        /* top is set dynamically via inline style */
        transform: translateY(-50%);
      }

      .tab {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0;
        background: none;
        border: none;
        cursor: pointer;
        touch-action: none; /* prevent scroll while dragging */
      }

      :host(.dragging) .tab {
        cursor: grabbing;
      }

      .tab:focus-visible {
        outline: 2px solid var(--ds-brand-primary);
        outline-offset: 2px;
        border-radius: var(--ds-radius-md);
      }

      .tab-shape {
        filter: drop-shadow(-2px 0 6px rgba(0, 0, 0, 0.4));
        transition: filter var(--ds-transition-fast);
      }

      .tab:hover .tab-shape {
        filter: drop-shadow(-3px 0 10px rgba(0, 0, 0, 0.5));
      }

      .tab:hover .d-fill {
        fill: var(--ds-brand-secondary);
      }
    `,
  ];

  /* ── lifecycle ── */

  override connectedCallback(): void {
    super.connectedCallback();
    this.boundOnPointerMove = this.onPointerMove.bind(this);
    this.boundOnPointerUp = this.onPointerUp.bind(this);
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.cleanupDrag();
  }

  /* ── pointer handlers ── */

  private boundOnPointerMove!: (e: PointerEvent) => void;
  private boundOnPointerUp!: (e: PointerEvent) => void;

  private onPointerDown(e: PointerEvent): void {
    // Only primary button
    if (e.button !== 0) return;

    this.dragging = true;
    this.didDrag = false;
    this.dragStartY = e.clientY;
    this.dragStartOffset = this.storeController.state.tabOffsetY;

    this.classList.add('dragging');

    // Capture pointer so we get move/up even outside the element
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    window.addEventListener('pointermove', this.boundOnPointerMove);
    window.addEventListener('pointerup', this.boundOnPointerUp);

    e.preventDefault();
  }

  private onPointerMove(e: PointerEvent): void {
    if (!this.dragging) return;

    const deltaY = e.clientY - this.dragStartY;

    if (!this.didDrag && Math.abs(deltaY) < DRAG_THRESHOLD) return;
    this.didDrag = true;

    // Convert pixel delta to percentage of viewport height
    const deltaPercent = (deltaY / window.innerHeight) * 100;
    const newOffset = this.dragStartOffset + deltaPercent;

    this.storeController.store.setTabOffsetY(newOffset);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private onPointerUp(_e: PointerEvent): void {
    this.cleanupDrag();

    if (!this.didDrag) {
      // It was a click, not a drag — open the sidebar
      this.storeController.store.setMode('expanded');
    }

    this.dragging = false;
    this.didDrag = false;
  }

  private cleanupDrag(): void {
    this.classList.remove('dragging');
    window.removeEventListener('pointermove', this.boundOnPointerMove);
    window.removeEventListener('pointerup', this.boundOnPointerUp);
  }

  /* ── render ── */

  override render() {
    const offsetY = this.storeController.state.tabOffsetY;

    // Mirror the entire centralized logo horizontally via scale(-1,1).
    // This produces the exact ᗡ shape from the D, with the cursor mirrored too.
    // Colors inverted: cyan D, dark cursor.
    return html`
      <style>
        :host {
          top: ${offsetY}%;
        }
      </style>
      <button
        class="tab"
        @pointerdown=${this.onPointerDown}
        title="Open Domscribe (Ctrl+Shift+D)"
        aria-label="Open Domscribe overlay"
      >
        <svg
          class="tab-shape"
          width="36"
          height="80"
          viewBox="0 0 64 64"
          fill="none"
          aria-hidden="true"
        >
          ${svg`
            <g transform="translate(64, 0) scale(-1, 1)">
              <!-- D shape (mirrored) — cyan fill -->
              <path
                class="d-fill"
                d="${SIMPLIFIED.dPath}"
                fill="var(--ds-brand-primary)"
              />
              <!-- Cursor (mirrored) — dark fill -->
              <g transform="${SIMPLIFIED.cursorTransform}">
                <path d="${CURSOR_PATH}" fill="var(--ds-bg-primary)" />
              </g>
            </g>
          `}
        </svg>
      </button>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ds-tab': DsTab;
  }
}
