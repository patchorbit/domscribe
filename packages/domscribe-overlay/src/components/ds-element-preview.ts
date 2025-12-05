/**
 * DsElementPreview - Selected element details display
 *
 * Shows detailed information about the selected element including:
 * - Tag name and component name
 * - Source location (from manifest)
 * - Props and state (from runtime context via ds-context-panel)
 */

import { LitElement, html, css } from 'lit';
import { customElement } from 'lit/decorators.js';
import { StoreController } from '../core/store-controller.js';
import { themeStyles, utilityStyles } from '../styles/theme.js';

// Import shared context panel component
import './ds-context-panel.js';

/**
 * Element preview component
 *
 * @element ds-element-preview
 */
@customElement('ds-element-preview')
export class DsElementPreview extends LitElement {
  private storeController = new StoreController(this);

  static override styles = [
    themeStyles,
    utilityStyles,
    css`
      :host {
        display: block;
        background: rgba(6, 182, 212, 0.06);
        border-left: 3px solid var(--ds-cyan-500);
        border-radius: var(--ds-radius-md);
        overflow: hidden;
        /* Clean design: left accent only, subtle background */
      }

      /* Main content area - single unified padding */
      .element-content {
        padding: var(--ds-space-md);
      }

      /* Header row: primary info + dismiss button */
      .element-header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: var(--ds-space-sm);
        margin-bottom: var(--ds-space-xs);
      }

      /* Primary row: tag + component name inline */
      .element-primary {
        display: flex;
        align-items: baseline;
        gap: var(--ds-space-sm);
        flex: 1;
        min-width: 0;
      }

      /* Dismiss button */
      .btn-dismiss {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 24px;
        height: 24px;
        padding: 0;
        background: transparent;
        border: none;
        border-radius: var(--ds-radius-sm);
        color: var(--ds-text-tertiary);
        cursor: pointer;
        transition: all var(--ds-transition-fast);
        flex-shrink: 0;
      }

      .btn-dismiss:hover {
        background: rgba(255, 255, 255, 0.1);
        color: var(--ds-text-secondary);
      }

      .btn-dismiss svg {
        width: 14px;
        height: 14px;
      }

      .tag-name {
        font-family: var(--ds-font-mono);
        font-size: var(--ds-font-size-md);
        font-weight: var(--ds-font-weight-semibold);
        color: var(--ds-text-accent);
      }

      .component-name {
        font-size: var(--ds-font-size-sm);
        color: var(--ds-cyan-400);
        margin-left: auto;
      }

      /* Source location - compact, truncated */
      .source-location {
        font-family: var(--ds-font-mono);
        font-size: var(--ds-font-size-sm);
        color: var(--ds-text-secondary);
        cursor: default;
      }

      .source-location:hover {
        color: var(--ds-text-primary);
      }

      /* Context panel spacing */
      ds-context-panel {
        margin-top: var(--ds-space-sm);
      }

      .empty-state {
        font-size: var(--ds-font-size-sm);
        color: var(--ds-text-tertiary);
        font-style: italic;
      }
    `,
  ];

  private getComponentName(element: HTMLElement): string | null {
    // Try to get component name from React Fiber
    const fiberKey = Object.keys(element).find(
      (key) =>
        key.startsWith('__reactFiber$') ||
        key.startsWith('__reactInternalInstance$'),
    );

    if (fiberKey) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fiber = (element as any)[fiberKey];
      if (fiber) {
        let current = fiber;
        while (current) {
          if (typeof current.type === 'function') {
            return current.type.displayName || current.type.name || null;
          }
          current = current.return;
        }
      }
    }

    // Try to get component name from Vue
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const vueInstance = (element as any).__vueParentComponent;
    if (vueInstance?.type?.name) {
      return vueInstance.type.name;
    }

    return null;
  }

  /**
   * Clear the current element selection
   */
  private handleClearSelection() {
    this.storeController.store.clearSelection();
  }

  /**
   * Format source path for display - show just filename:line (with extension)
   * Returns { display: string, full: string }
   */
  private formatSourcePath(fullPath: string): {
    display: string;
    full: string;
  } {
    // Extract just filename and line number for compact display
    // e.g., "/path/to/BasicElements.vue:15" -> "BasicElements.vue:15"
    const parts = fullPath.split('/');
    const fileWithLine = parts[parts.length - 1];

    return {
      display: fileWithLine,
      full: fullPath,
    };
  }

  override render() {
    const { selectedElement, runtimeContext, manifestEntry } =
      this.storeController.state;

    if (!selectedElement) {
      return html`<div class="empty-state">No element selected</div>`;
    }

    const tagName = selectedElement.tagName.toLowerCase();
    const componentName = this.getComponentName(selectedElement);

    const props = (runtimeContext?.componentProps ?? {}) as Record<
      string,
      unknown
    >;
    const state = (runtimeContext?.componentState ?? {}) as Record<
      string,
      unknown
    >;

    // Format source location - compact display with full path on hover
    const fullSourcePath = manifestEntry
      ? `${manifestEntry.file}:${manifestEntry.start.line}`
      : null;
    const sourcePath = fullSourcePath
      ? this.formatSourcePath(fullSourcePath)
      : null;

    return html`
      <div class="element-content">
        <!-- Header: tag name + component name + dismiss button -->
        <div class="element-header">
          <div class="element-primary">
            <span class="tag-name">&lt;${tagName}&gt;</span>
            ${componentName
              ? html`<span class="component-name">${componentName}</span>`
              : null}
          </div>
          <button
            class="btn-dismiss"
            @click=${this.handleClearSelection}
            title="Clear selection"
            aria-label="Clear element selection"
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

        <!-- Source location - compact, hover for full path -->
        ${sourcePath
          ? html`<span class="source-location" title="${sourcePath.full}"
              >${sourcePath.display}</span
            >`
          : null}

        <!-- Props/State collapsible panel -->
        <ds-context-panel .props=${props} .state=${state}></ds-context-panel>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ds-element-preview': DsElementPreview;
  }
}
