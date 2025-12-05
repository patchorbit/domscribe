/**
 * DsAnnotationItem - Single annotation card
 *
 * Supports collapsed (single-line) and expanded views.
 * Expanded view shows full content, agent response, context panel, and action buttons.
 */

import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { Annotation } from '@domscribe/core';
import { themeStyles, utilityStyles } from '../styles/theme.js';
import { OverlayStore } from '../core/overlay-store.js';
import { RelayService } from '../services/relay-service.js';

// Import shared context panel component
import './ds-context-panel.js';

/**
 * Annotation item component
 *
 * @element ds-annotation-item
 */
@customElement('ds-annotation-item')
export class DsAnnotationItem extends LitElement {
  @property({ type: Object })
  annotation: Annotation | null = null;

  @state()
  private expanded = false;

  @state()
  private editing = false;

  @state()
  private editValue = '';

  @state()
  private confirmingDelete = false;

  @state()
  private copied = false;

  static override styles = [
    themeStyles,
    utilityStyles,
    css`
      :host {
        display: block;
      }

      /* ======== Collapsed row ======== */
      .collapsed-row {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: var(--ds-space-sm);
        padding: var(--ds-space-md);
        background: var(--ds-bg-secondary);
        border-radius: var(--ds-radius-md);
        cursor: pointer;
        transition: background var(--ds-transition-fast);
      }

      .collapsed-row:hover {
        background: var(--ds-bg-tertiary);
      }

      .collapsed-inner {
        display: flex;
        flex-direction: column;
        flex: 1;
        min-width: 0;
        gap: 2px;
      }

      .collapsed-text {
        font-size: var(--ds-font-size-sm);
        color: var(--ds-text-primary);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      /* ======== Expanded card ======== */
      .card {
        background: var(--ds-bg-secondary);
        border-radius: var(--ds-radius-md);
        overflow: hidden;
        transition: background var(--ds-transition-fast);
      }

      .card-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: var(--ds-space-sm) var(--ds-space-md);
        cursor: pointer;
      }

      .card-header:hover {
        background: rgba(255, 255, 255, 0.03);
      }

      .element-info {
        display: flex;
        align-items: center;
        gap: var(--ds-space-xs);
        font-size: var(--ds-font-size-xs);
        min-width: 0;
      }

      .file-name {
        color: var(--ds-text-accent);
        font-weight: var(--ds-font-weight-medium);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .separator {
        color: var(--ds-text-tertiary);
        flex-shrink: 0;
      }

      .tag-name {
        font-family: var(--ds-font-mono);
        color: var(--ds-text-accent);
        flex-shrink: 0;
      }

      /* ======== Header actions (copy + status group) ======== */
      .header-actions {
        display: flex;
        align-items: center;
        gap: var(--ds-space-xs);
        flex-shrink: 0;
      }

      .copy-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 22px;
        height: 22px;
        padding: 0;
        background: transparent;
        border: none;
        border-radius: var(--ds-radius-sm);
        color: var(--ds-text-tertiary);
        cursor: pointer;
        flex-shrink: 0;
        transition: all var(--ds-transition-fast);
      }

      .copy-btn:hover {
        color: var(--ds-text-primary);
        background: var(--ds-bg-hover);
      }

      .copy-btn.copied {
        color: var(--ds-success);
      }

      .copy-btn svg {
        width: 13px;
        height: 13px;
      }

      /* ======== Status ======== */
      .status {
        display: flex;
        align-items: center;
        gap: var(--ds-space-xs);
        font-size: var(--ds-font-size-xs);
        color: var(--ds-text-tertiary);
        flex-shrink: 0;
      }

      .status-dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
      }

      .status-dot.queued {
        background: var(--ds-text-tertiary);
      }
      .status-dot.processing {
        background: var(--ds-warning);
      }
      .status-dot.processed {
        background: var(--ds-success);
      }
      .status-dot.failed {
        background: var(--ds-error);
      }
      .status-dot.archived {
        background: var(--ds-text-tertiary);
      }

      /* ======== Card body ======== */
      .card-body {
        padding: var(--ds-space-md);
        padding-top: 0;
      }

      .content {
        font-size: var(--ds-font-size-sm);
        color: var(--ds-text-primary);
        line-height: 1.5;
        word-wrap: break-word;
        cursor: default;
      }

      /* ======== Inline edit ======== */
      .edit-textarea {
        width: 100%;
        min-height: 40px;
        max-height: 120px;
        padding: var(--ds-space-xs);
        background: var(--ds-bg-tertiary);
        border: 1px solid var(--ds-border-focus);
        border-radius: var(--ds-radius-sm);
        font-family: inherit;
        font-size: var(--ds-font-size-sm);
        color: var(--ds-text-primary);
        resize: vertical;
        outline: none;
        line-height: 1.5;
      }

      .edit-hint {
        font-size: var(--ds-font-size-xs);
        color: var(--ds-text-tertiary);
        margin-top: var(--ds-space-xs);
      }

      /* ======== Agent response ======== */
      .agent-response {
        margin-top: var(--ds-space-sm);
        padding: var(--ds-space-sm) var(--ds-space-md);
        background: rgba(6, 182, 212, 0.05);
        border-left: 2px solid var(--ds-brand-secondary);
        border-radius: 0 var(--ds-radius-sm) var(--ds-radius-sm) 0;
      }

      .agent-label {
        display: flex;
        align-items: center;
        gap: var(--ds-space-xs);
        font-size: var(--ds-font-size-xs);
        font-weight: var(--ds-font-weight-medium);
        color: var(--ds-brand-primary);
        margin-bottom: var(--ds-space-xs);
      }

      .agent-label svg {
        width: 12px;
        height: 12px;
      }

      .agent-message {
        font-size: var(--ds-font-size-sm);
        color: var(--ds-text-primary);
        line-height: 1.5;
        word-wrap: break-word;
      }

      .patch-summary {
        margin-top: var(--ds-space-xs);
        font-size: var(--ds-font-size-xs);
        color: var(--ds-text-secondary);
        font-family: var(--ds-font-mono);
      }

      /* Context panel spacing */
      ds-context-panel {
        margin-top: var(--ds-space-sm);
      }

      /* ======== Action bar ======== */
      .action-bar {
        display: flex;
        align-items: center;
        justify-content: flex-start;
        gap: var(--ds-space-xs);
        padding: var(--ds-space-sm) var(--ds-space-md);
        border-top: 1px solid var(--ds-border-secondary);
      }

      .action-btn {
        display: inline-flex;
        align-items: center;
        gap: var(--ds-space-xs);
        padding: 3px 8px;
        background: transparent;
        border: 1px solid var(--ds-border-primary);
        border-radius: var(--ds-radius-sm);
        font-family: inherit;
        font-size: var(--ds-font-size-xs);
        color: var(--ds-text-secondary);
        cursor: pointer;
        transition: all var(--ds-transition-fast);
        white-space: nowrap;
      }

      .action-btn:hover {
        background: var(--ds-bg-hover);
        color: var(--ds-text-primary);
        border-color: var(--ds-text-tertiary);
      }

      .action-btn svg {
        width: 12px;
        height: 12px;
        flex-shrink: 0;
      }

      .action-btn.locate:hover {
        color: var(--ds-brand-primary);
        border-color: var(--ds-brand-primary);
      }

      .action-btn.refresh:hover {
        color: var(--ds-success);
        border-color: var(--ds-success);
      }

      .action-btn.archive:hover {
        color: var(--ds-warning);
        border-color: var(--ds-warning);
      }

      .action-btn.danger:hover {
        color: var(--ds-error);
        border-color: var(--ds-error);
      }

      .action-spacer {
        flex: 1;
      }

      /* ======== Footer ======== */
      .card-footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: var(--ds-space-sm) var(--ds-space-md);
      }

      .timestamp {
        font-size: var(--ds-font-size-xs);
        color: var(--ds-text-tertiary);
      }

      .source {
        font-family: var(--ds-font-mono);
        font-size: var(--ds-font-size-xs);
        color: var(--ds-text-secondary);
        max-width: 150px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    `,
  ];

  private formatTimestamp(timestamp: string): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return date.toLocaleDateString();
  }

  private getStatusLabel(status: string): string {
    switch (status) {
      case 'queued':
        return 'Queued';
      case 'processing':
        return 'Processing';
      case 'processed':
        return 'Processed';
      case 'failed':
        return 'Failed';
      case 'archived':
        return 'Archived';
      default:
        return status;
    }
  }

  private getFileName(filePath: string): string {
    const parts = filePath.split('/');
    return parts[parts.length - 1] || filePath;
  }

  private stripExtension(fileName: string): string {
    const lastDot = fileName.lastIndexOf('.');
    if (lastDot > 0) {
      return fileName.substring(0, lastDot);
    }
    return fileName;
  }

  private toggleExpanded() {
    this.expanded = !this.expanded;
    if (!this.expanded) {
      this.editing = false;
      this.confirmingDelete = false;
    }
  }

  private handleContentDblClick(e: Event) {
    e.stopPropagation();
    if (!this.annotation) return;
    this.editing = true;
    this.editValue = this.annotation.context.userMessage ?? '';
  }

  private handleEditKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      this.saveEdit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      this.cancelEdit();
    }
  }

  private async saveEdit() {
    if (!this.annotation || !this.editValue.trim()) return;
    const relay = RelayService.getInstance();
    await relay.patchAnnotation(this.annotation.metadata.id, {
      context: { userMessage: this.editValue.trim() },
    });
    this.editing = false;
  }

  private cancelEdit() {
    this.editing = false;
    this.editValue = '';
  }

  private async handleCopy(e: Event) {
    e.stopPropagation();
    if (!this.annotation) return;
    const json = JSON.stringify(this.annotation, null, 2);
    await navigator.clipboard.writeText(json);
    this.copied = true;
    setTimeout(() => {
      this.copied = false;
    }, 1500);
  }

  private handleLocate(e: Event) {
    e.stopPropagation();
    if (!this.annotation) return;
    const store = OverlayStore.getInstance();
    store.locateElement(this.annotation);
  }

  private async handleRefresh(e: Event) {
    e.stopPropagation();
    if (!this.annotation) return;
    const store = OverlayStore.getInstance();
    const element = await store.refreshAnnotationMetadata(this.annotation);
    if (element) {
      store.locateElement(this.annotation);
    }
  }

  private async handleArchive(e: Event) {
    e.stopPropagation();
    if (!this.annotation) return;
    const relay = RelayService.getInstance();
    await relay.archiveAnnotation(this.annotation.metadata.id);
  }

  private handleDeleteClick(e: Event) {
    e.stopPropagation();
    if (this.confirmingDelete) {
      this.confirmDelete();
    } else {
      this.confirmingDelete = true;
      // Auto-cancel after 3s
      setTimeout(() => {
        this.confirmingDelete = false;
      }, 3000);
    }
  }

  private async confirmDelete() {
    if (!this.annotation) return;
    const relay = RelayService.getInstance();
    await relay.deleteAnnotation(this.annotation.metadata.id);
    this.confirmingDelete = false;
  }

  private renderCopyButton() {
    return html`
      <button
        class="copy-btn ${this.copied ? 'copied' : ''}"
        @click=${this.handleCopy}
        title=${this.copied ? 'Copied!' : 'Copy annotation JSON'}
      >
        ${this.copied
          ? html`<svg viewBox="0 0 24 24" fill="none">
              <path
                d="M20 6L9 17l-5-5"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>`
          : html`<svg viewBox="0 0 24 24" fill="none">
              <rect
                x="9"
                y="9"
                width="13"
                height="13"
                rx="2"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
              <path
                d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>`}
      </button>
    `;
  }

  private renderStatus(status: string) {
    return html`
      <div class="status">
        <span class="status-dot ${status}"></span>
        <span>${this.getStatusLabel(status)}</span>
      </div>
    `;
  }

  private renderAgentResponse() {
    if (!this.annotation?.agentResponse) return nothing;

    const { message } = this.annotation.agentResponse;
    if (!message) return nothing;

    return html`
      <div class="agent-response">
        <div class="agent-label">
          <!-- Bot icon -->
          <svg viewBox="0 0 24 24" fill="none">
            <path
              d="M12 2a2 2 0 012 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 017 7v1a2 2 0 01-2 2h-1v1a2 2 0 01-2 2H8a2 2 0 01-2-2v-1H5a2 2 0 01-2-2v-1a7 7 0 017-7h1V5.73A2 2 0 0112 2z"
              stroke="currentColor"
              stroke-width="1.5"
              fill="none"
            />
            <circle cx="9" cy="13" r="1" fill="currentColor" />
            <circle cx="15" cy="13" r="1" fill="currentColor" />
          </svg>
          Agent
        </div>
        ${message ? html`<div class="agent-message">${message}</div>` : nothing}
      </div>
    `;
  }

  private renderActionBar() {
    const isArchived = this.annotation?.metadata.status === 'archived';

    return html`
      <div class="action-bar">
        <!-- Locate -->
        <button
          class="action-btn locate"
          @click=${this.handleLocate}
          title="Scroll to element"
        >
          <svg viewBox="0 0 24 24" fill="none">
            <circle
              cx="12"
              cy="12"
              r="3"
              stroke="currentColor"
              stroke-width="1.5"
            />
            <path
              d="M12 2v4m0 12v4M2 12h4m12 0h4"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
            />
          </svg>
          Locate
        </button>

        <!-- Refresh -->
        <button
          class="action-btn refresh"
          @click=${this.handleRefresh}
          title="Re-capture element metadata"
        >
          <svg viewBox="0 0 24 24" fill="none">
            <path
              d="M4 4v5h5M20 20v-5h-5"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <path
              d="M20.49 9A9 9 0 005.64 5.64L4 4m16 16l-1.64-1.64A9 9 0 013.51 15"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
          Refresh
        </button>

        <span class="action-spacer"></span>

        <!-- Archive (hide if already archived) -->
        ${!isArchived
          ? html`
              <button
                class="action-btn archive"
                @click=${this.handleArchive}
                title="Archive annotation"
              >
                <svg viewBox="0 0 24 24" fill="none">
                  <path
                    d="M21 8v13H3V8M1 3h22v5H1zM10 12h4"
                    stroke="currentColor"
                    stroke-width="1.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
                Archive
              </button>
            `
          : nothing}

        <!-- Delete -->
        <button
          class="action-btn danger"
          @click=${this.handleDeleteClick}
          title=${this.confirmingDelete
            ? 'Click again to confirm'
            : 'Delete annotation'}
        >
          <svg viewBox="0 0 24 24" fill="none">
            <path
              d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
          ${this.confirmingDelete ? 'Confirm?' : 'Delete'}
        </button>
      </div>
    `;
  }

  override render() {
    if (!this.annotation) {
      return null;
    }

    const { metadata, interaction, context } = this.annotation;
    const { timestamp, status } = metadata;
    const content = context.userMessage ?? '';
    const tagName = interaction.selectedElement?.tagName?.toLowerCase() ?? null;

    const manifestEntry = context.manifestSnapshot?.[0];
    const runtimeContext = context.runtimeContext;
    const props = (runtimeContext?.componentProps ?? {}) as Record<
      string,
      unknown
    >;
    const state = (runtimeContext?.componentState ?? {}) as Record<
      string,
      unknown
    >;

    const rawFileName = manifestEntry
      ? this.getFileName(manifestEntry.file)
      : null;
    const displayName = rawFileName ? this.stripExtension(rawFileName) : null;
    const displayTag = `<${tagName ?? 'element'}>`;

    const sourceDisplay = manifestEntry
      ? `${this.getFileName(manifestEntry.file)}:${manifestEntry.start.line}`
      : null;
    const sourceTooltip = manifestEntry
      ? `${manifestEntry.file}:${manifestEntry.start.line}`
      : null;

    // Collapsed: component info + truncated text preview
    if (!this.expanded) {
      return html`
        <div class="collapsed-row" @click=${this.toggleExpanded}>
          <div class="collapsed-inner">
            <div class="element-info">
              ${displayName
                ? html`<span class="file-name">${displayName}</span>
                    <span class="separator">&middot;</span>
                    <span class="tag-name">${displayTag}</span>`
                : html`<span class="tag-name">${displayTag}</span>`}
            </div>
            ${content
              ? html`<span class="collapsed-text">${content}</span>`
              : nothing}
          </div>
          <div class="header-actions">
            ${this.renderCopyButton()} ${this.renderStatus(status)}
          </div>
        </div>
      `;
    }

    // Expanded: full card
    return html`
      <div class="card">
        <div class="card-header" @click=${this.toggleExpanded}>
          <div class="element-info">
            ${displayName
              ? html`<span class="file-name">${displayName}</span>
                  <span class="separator">&middot;</span>
                  <span class="tag-name">${displayTag}</span>`
              : html`<span class="tag-name">${displayTag}</span>`}
          </div>
          <div class="header-actions">
            ${this.renderCopyButton()} ${this.renderStatus(status)}
          </div>
        </div>

        <div class="card-body">
          ${this.editing
            ? html`
                <textarea
                  class="edit-textarea"
                  .value=${this.editValue}
                  @input=${(e: Event) => {
                    this.editValue = (e.target as HTMLTextAreaElement).value;
                  }}
                  @keydown=${this.handleEditKeyDown}
                  @blur=${this.saveEdit}
                ></textarea>
                <div class="edit-hint">Enter to save, Esc to cancel</div>
              `
            : html`
                <p
                  class="content"
                  @dblclick=${this.handleContentDblClick}
                  title="Double-click to edit"
                >
                  ${content}
                </p>
              `}
          ${this.renderAgentResponse()}

          <ds-context-panel .props=${props} .state=${state}></ds-context-panel>
        </div>

        ${this.renderActionBar()}

        <div class="card-footer">
          <span class="timestamp">${this.formatTimestamp(timestamp)}</span>
          ${sourceDisplay
            ? html`<span class="source" title=${sourceTooltip}
                >${sourceDisplay}</span
              >`
            : null}
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ds-annotation-item': DsAnnotationItem;
  }
}
