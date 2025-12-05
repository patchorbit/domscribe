/**
 * DsAnnotationInput - Chat-style annotation input
 *
 * A text input for creating annotations about the selected element.
 * Styled like Claude's browser chat input with action bar below.
 */

import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { StoreController } from '../core/store-controller.js';
import { EventManager } from '../core/event-manager.js';
import { themeStyles, utilityStyles } from '../styles/theme.js';

/**
 * Annotation input component
 *
 * @element ds-annotation-input
 */
@customElement('ds-annotation-input')
export class DsAnnotationInput extends LitElement {
  private storeController = new StoreController(this);

  @state()
  private inputValue = '';

  @state()
  private isSubmitting = false;

  static override styles = [
    themeStyles,
    utilityStyles,
    css`
      :host {
        display: block;
      }

      .input-wrapper {
        background: var(--ds-bg-tertiary);
        border: 1px solid var(--ds-border-primary);
        border-radius: var(--ds-radius-lg);
        overflow: hidden;
        transition: border-color var(--ds-transition-fast);
      }

      .input-wrapper:focus-within {
        border-color: var(--ds-brand-primary);
      }

      .textarea-container.disabled {
        opacity: 0.5;
        pointer-events: none;
      }

      /* Textarea area */
      .textarea-container {
        padding: var(--ds-space-md);
        padding-bottom: var(--ds-space-sm);
      }

      textarea {
        width: 100%;
        min-height: 40px;
        max-height: 120px;
        padding: 0;
        background: transparent;
        border: none;
        font-family: inherit;
        font-size: var(--ds-font-size-sm);
        color: var(--ds-text-primary);
        resize: none;
        outline: none;
        line-height: 1.5;
      }

      textarea::placeholder {
        color: var(--ds-text-tertiary);
      }

      /* Action bar */
      .action-bar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: var(--ds-space-sm) var(--ds-space-md);
        border-top: 1px solid var(--ds-border-secondary);
        background: rgba(0, 0, 0, 0.15);
      }

      .action-group {
        display: flex;
        align-items: center;
        gap: var(--ds-space-xs);
      }

      /* Icon buttons in action bar */
      .action-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 28px;
        height: 28px;
        padding: 0;
        background: transparent;
        border: none;
        border-radius: var(--ds-radius-md);
        color: var(--ds-text-secondary);
        cursor: pointer;
        transition: all var(--ds-transition-fast);
      }

      .action-btn:hover:not(:disabled) {
        background: var(--ds-bg-hover);
        color: var(--ds-text-primary);
      }

      .action-btn:disabled {
        opacity: 0.4;
        cursor: not-allowed;
      }

      .action-btn.active {
        color: var(--ds-brand-primary);
        background: rgba(6, 182, 212, 0.1);
      }

      .action-btn svg {
        width: 16px;
        height: 16px;
      }

      /* Submit button - accent colored */
      .submit-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 28px;
        height: 28px;
        padding: 0;
        background: var(--ds-brand-primary);
        border: none;
        border-radius: var(--ds-radius-md);
        color: var(--ds-neutral-950);
        cursor: pointer;
        transition: all var(--ds-transition-fast);
      }

      .submit-btn:hover:not(:disabled) {
        background: var(--ds-brand-secondary);
      }

      .submit-btn:disabled {
        opacity: 0.4;
        cursor: not-allowed;
        background: var(--ds-bg-tertiary);
        color: var(--ds-text-tertiary);
      }

      .submit-btn svg {
        width: 14px;
        height: 14px;
      }

      /* Hint text */
      .hint {
        margin-top: var(--ds-space-xs);
        font-size: var(--ds-font-size-xs);
        color: var(--ds-text-tertiary);
        text-align: center;
      }
    `,
  ];

  private handleInput(event: Event) {
    const textarea = event.target as HTMLTextAreaElement;
    this.inputValue = textarea.value;

    // Auto-resize
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
  }

  private handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      this.handleSubmit();
    }
  }

  private handleCapture() {
    const eventManager = EventManager.getInstance();
    eventManager.enableCapture();
    this.storeController.store.enterCaptureMode();
  }

  private async handleSubmit() {
    const { selectedElement, relayConnected } = this.storeController.state;

    if (!this.inputValue.trim() || !selectedElement || !relayConnected) {
      return;
    }

    this.isSubmitting = true;

    try {
      await this.storeController.store.submitAnnotation(this.inputValue.trim());
      this.inputValue = '';

      // Reset textarea height
      const textarea = this.shadowRoot?.querySelector('textarea');
      if (textarea) {
        textarea.style.height = 'auto';
      }
    } catch (error) {
      console.error('[domscribe] Failed to submit annotation:', error);
    } finally {
      this.isSubmitting = false;
    }
  }

  override render() {
    const { selectedElement, relayConnected, mode } =
      this.storeController.state;
    const hasElement = !!selectedElement;
    const isCapturing = mode === 'capturing';

    // Input is disabled if not connected OR no element selected
    const isDisabled = !relayConnected || !hasElement;
    const canSubmit =
      this.inputValue.trim() &&
      hasElement &&
      relayConnected &&
      !this.isSubmitting;

    // Contextual placeholder based on state
    const placeholder = !relayConnected
      ? 'Connecting to relay...'
      : !hasElement
        ? 'Select an element first...'
        : 'Describe the change you want...';

    return html`
      <div class="input-wrapper">
        <div class="textarea-container ${isDisabled ? 'disabled' : ''}">
          <textarea
            placeholder=${placeholder}
            .value=${this.inputValue}
            @input=${this.handleInput}
            @keydown=${this.handleKeyDown}
            ?disabled=${isDisabled}
            rows="1"
          ></textarea>
        </div>

        <div class="action-bar">
          <!-- Spacer for future left-side actions -->
          <div class="action-group"></div>

          <!-- Right-side actions: capture + submit -->
          <div class="action-group">
            <!-- Capture element button - always enabled except during capture -->
            <button
              class="action-btn ${hasElement ? 'active' : ''}"
              @click=${this.handleCapture}
              ?disabled=${isCapturing}
              title=${hasElement
                ? 'Element selected - click to change'
                : 'Capture element'}
              aria-label="Capture element"
            >
              <!-- Cursor with sparkles icon -->
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M15 15l-2 5L9 9l11 4-5 2z" fill="currentColor" />
                <path
                  d="M15 15l5 5"
                  stroke="currentColor"
                  stroke-width="1.5"
                  stroke-linecap="round"
                />
                <path
                  d="M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"
                  stroke="currentColor"
                  stroke-width="1.5"
                  stroke-linecap="round"
                />
              </svg>
            </button>

            <!-- Submit button -->
            <button
              class="submit-btn"
              @click=${this.handleSubmit}
              ?disabled=${!canSubmit}
              title="Submit annotation (Ctrl+Enter)"
              aria-label="Submit annotation"
            >
              <svg viewBox="0 0 24 24" fill="none">
                <path
                  d="M5 12h14M12 5l7 7-7 7"
                  stroke="currentColor"
                  stroke-width="2.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
      ${hasElement
        ? html`<div class="hint">Press Ctrl+Enter to submit</div>`
        : null}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ds-annotation-input': DsAnnotationInput;
  }
}
