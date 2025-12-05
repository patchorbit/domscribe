/**
 * DsPickerOverlay - Full-page overlay for element capture mode
 *
 * Covers the entire viewport during capture mode, intercepts pointer
 * events, and coordinates element highlighting and selection.
 */

import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { StoreController } from '../core/store-controller.js';
import { EventManager } from '../core/event-manager.js';
import { themeStyles } from '../styles/theme.js';

// Import child components
import './ds-highlight-box.js';
import './ds-tooltip.js';

/**
 * Picker overlay component for element capture
 *
 * @element ds-picker-overlay
 */
@customElement('ds-picker-overlay')
export class DsPickerOverlay extends LitElement {
  private storeController = new StoreController(this);
  private eventManager = EventManager.getInstance();

  @state()
  private highlightRect: DOMRect | null = null;

  @state()
  private tooltipPosition: { x: number; y: number } | null = null;

  static override styles = [
    themeStyles,
    css`
      :host {
        display: block;
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: var(--ds-z-picker);
        cursor: crosshair;
      }

      .overlay {
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.05);
      }

      .instructions {
        position: fixed;
        top: var(--ds-space-lg);
        left: 50%;
        transform: translateX(-50%);
        display: flex;
        align-items: center;
        gap: var(--ds-space-sm);
        padding: var(--ds-space-sm) var(--ds-space-lg);
        background: var(--ds-bg-primary);
        border: 1px solid var(--ds-border-primary);
        border-radius: var(--ds-radius-full);
        font-size: var(--ds-font-size-sm);
        color: var(--ds-text-primary);
        box-shadow: var(--ds-shadow-lg);
      }

      .instructions kbd {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 24px;
        height: 20px;
        padding: 0 var(--ds-space-xs);
        background: var(--ds-bg-tertiary);
        border: 1px solid var(--ds-border-secondary);
        border-radius: var(--ds-radius-sm);
        font-family: var(--ds-font-mono);
        font-size: var(--ds-font-size-xs);
      }
    `,
  ];

  override connectedCallback() {
    super.connectedCallback();
    this.addEventListener('pointermove', this.handlePointerMove);
    this.addEventListener('click', this.handleClick);
    document.addEventListener('keydown', this.handleKeyDown);
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener('pointermove', this.handlePointerMove);
    this.removeEventListener('click', this.handleClick);
    document.removeEventListener('keydown', this.handleKeyDown);
    this.eventManager.disableCapture();
  }

  /**
   * Temporarily hide this overlay to get the underlying element at point
   */
  private getElementUnderPoint(x: number, y: number): HTMLElement | null {
    // Hide this picker overlay to find the element beneath it
    const originalPointerEvents = this.style.pointerEvents;
    this.style.pointerEvents = 'none';

    const element = this.eventManager.getElementAtPoint(x, y);

    this.style.pointerEvents = originalPointerEvents;

    return element;
  }

  private handlePointerMove = (event: PointerEvent) => {
    const element = this.getElementUnderPoint(event.clientX, event.clientY);

    if (element) {
      this.storeController.store.setHoveredElement(element);
      this.highlightRect = element.getBoundingClientRect();
      this.tooltipPosition = {
        x: event.clientX,
        y: event.clientY,
      };
    } else {
      this.storeController.store.setHoveredElement(null);
      this.highlightRect = null;
      this.tooltipPosition = null;
    }
  };

  private handleClick = async (event: PointerEvent) => {
    event.preventDefault();
    event.stopPropagation();

    const element = this.getElementUnderPoint(event.clientX, event.clientY);

    if (element) {
      await this.storeController.store.selectElement(element);
    }
  };

  private handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      this.storeController.store.exitCaptureMode();
    }
  };

  override render() {
    const { hoveredElement } = this.storeController.state;

    return html`
      <div class="overlay">
        <div class="instructions">
          Click to select element • Press <kbd>ESC</kbd> to cancel
        </div>

        ${this.highlightRect
          ? html`<ds-highlight-box
              .rect=${this.highlightRect}
            ></ds-highlight-box>`
          : null}
        ${hoveredElement && this.tooltipPosition
          ? html`<ds-tooltip
              .element=${hoveredElement}
              .x=${this.tooltipPosition.x}
              .y=${this.tooltipPosition.y}
            ></ds-tooltip>`
          : null}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ds-picker-overlay': DsPickerOverlay;
  }
}
