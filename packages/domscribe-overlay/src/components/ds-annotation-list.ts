/**
 * DsAnnotationList - Status-grouped accordion with pagination
 *
 * Groups annotations by status (Queued, Processing, Processed, Failed, Archived).
 * Each group is collapsible. Within each group, annotations are paginated (10 per page).
 */

import { LitElement, html, css, nothing } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import type { Annotation, AnnotationStatus } from '@domscribe/core';
import { AnnotationStatusEnum } from '@domscribe/core';
import { StoreController } from '../core/store-controller.js';
import { themeStyles, utilityStyles } from '../styles/theme.js';

// Import child components
import './ds-annotation-item.js';

const PAGE_SIZE = 10;

/** Status display order */
const STATUS_ORDER: AnnotationStatus[] = [
  AnnotationStatusEnum.QUEUED,
  AnnotationStatusEnum.PROCESSING,
  AnnotationStatusEnum.PROCESSED,
  AnnotationStatusEnum.FAILED,
  AnnotationStatusEnum.ARCHIVED,
];

const STATUS_LABELS: Record<string, string> = {
  queued: 'Queued',
  processing: 'Processing',
  processed: 'Processed',
  failed: 'Failed',
  archived: 'Archived',
};

/**
 * Annotation list component with accordion layout
 *
 * @element ds-annotation-list
 */
@customElement('ds-annotation-list')
export class DsAnnotationList extends LitElement {
  private storeController = new StoreController(this);

  @state()
  private openStatuses: Set<string> = new Set();

  @state()
  private pages: Record<string, number> = {};

  static override styles = [
    themeStyles,
    utilityStyles,
    css`
      :host {
        display: block;
      }

      .accordion {
        display: flex;
        flex-direction: column;
        gap: var(--ds-space-sm);
      }

      /* ======== Status group ======== */
      .status-group {
        border-radius: var(--ds-radius-md);
        overflow: hidden;
      }

      .status-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: var(--ds-space-md);
        background: var(--ds-bg-tertiary);
        border: none;
        border-radius: var(--ds-radius-md);
        width: 100%;
        cursor: pointer;
        transition:
          background var(--ds-transition-fast),
          border-radius var(--ds-transition-fast);
        font-family: inherit;
        color: var(--ds-text-primary);
      }

      .status-header.open {
        border-radius: var(--ds-radius-md) var(--ds-radius-md) 0 0;
      }

      .status-header:hover {
        background: var(--ds-bg-active);
      }

      .status-header.empty {
        cursor: default;
        opacity: 0.5;
      }

      .status-header.empty:hover {
        background: var(--ds-bg-tertiary);
      }

      .status-label {
        display: flex;
        align-items: center;
        gap: var(--ds-space-sm);
        font-size: var(--ds-font-size-sm);
        font-weight: var(--ds-font-weight-medium);
      }

      .status-count {
        font-size: var(--ds-font-size-xs);
        color: var(--ds-text-tertiary);
        font-weight: var(--ds-font-weight-normal);
      }

      .chevron {
        width: 14px;
        height: 14px;
        color: var(--ds-text-tertiary);
        transition: transform var(--ds-transition-fast);
        flex-shrink: 0;
      }

      .chevron.open {
        transform: rotate(90deg);
      }

      /* ======== Group content ======== */
      .group-content {
        display: flex;
        flex-direction: column;
        gap: var(--ds-space-sm);
        padding: var(--ds-space-sm);
      }

      /* ======== Pagination ======== */
      .pagination {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: var(--ds-space-sm);
        padding: var(--ds-space-xs) 0;
      }

      .page-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 24px;
        height: 24px;
        padding: 0;
        background: transparent;
        border: 1px solid var(--ds-border-primary);
        border-radius: var(--ds-radius-sm);
        color: var(--ds-text-secondary);
        cursor: pointer;
        font-family: inherit;
        transition: all var(--ds-transition-fast);
      }

      .page-btn:hover:not(:disabled) {
        background: var(--ds-bg-hover);
        color: var(--ds-text-primary);
      }

      .page-btn:disabled {
        opacity: 0.3;
        cursor: not-allowed;
      }

      .page-btn svg {
        width: 12px;
        height: 12px;
      }

      .page-info {
        font-size: var(--ds-font-size-xs);
        color: var(--ds-text-tertiary);
      }

      /* ======== Empty state ======== */
      .empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: var(--ds-space-lg);
        color: var(--ds-text-secondary);
        text-align: center;
      }

      .empty-state-icon {
        width: 32px;
        height: 32px;
        margin-bottom: var(--ds-space-sm);
        opacity: 0.5;
      }

      .empty-state-text {
        font-size: var(--ds-font-size-sm);
      }

      /* Status-specific dot colors in header */
      .header-dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        flex-shrink: 0;
      }

      .header-dot.queued {
        background: var(--ds-text-tertiary);
      }
      .header-dot.processing {
        background: var(--ds-warning);
      }
      .header-dot.processed {
        background: var(--ds-success);
      }
      .header-dot.failed {
        background: var(--ds-error);
      }
      .header-dot.archived {
        background: var(--ds-text-tertiary);
      }
    `,
  ];

  private groupByStatus(
    annotations: Annotation[],
  ): Record<string, Annotation[]> {
    const groups: Record<string, Annotation[]> = {};
    for (const status of STATUS_ORDER) {
      groups[status] = [];
    }
    for (const ann of annotations) {
      const status = ann.metadata.status;
      if (groups[status]) {
        groups[status].push(ann);
      }
    }
    return groups;
  }

  private toggleStatus(status: string) {
    const next = new Set(this.openStatuses);
    if (next.has(status)) {
      next.delete(status);
    } else {
      next.add(status);
    }
    this.openStatuses = next;
  }

  private getPage(status: string): number {
    return this.pages[status] ?? 0;
  }

  private setPage(status: string, page: number) {
    this.pages = { ...this.pages, [status]: page };
  }

  private renderPagination(status: string, total: number) {
    const totalPages = Math.ceil(total / PAGE_SIZE);
    if (totalPages <= 1) return nothing;

    const currentPage = this.getPage(status);

    return html`
      <div class="pagination">
        <button
          class="page-btn"
          ?disabled=${currentPage === 0}
          @click=${() => this.setPage(status, currentPage - 1)}
          title="Previous page"
        >
          <svg viewBox="0 0 24 24" fill="none">
            <path
              d="M15 18l-6-6 6-6"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </button>
        <span class="page-info">${currentPage + 1} / ${totalPages}</span>
        <button
          class="page-btn"
          ?disabled=${currentPage >= totalPages - 1}
          @click=${() => this.setPage(status, currentPage + 1)}
          title="Next page"
        >
          <svg viewBox="0 0 24 24" fill="none">
            <path
              d="M9 18l6-6-6-6"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </button>
      </div>
    `;
  }

  private renderStatusGroup(status: string, annotations: Annotation[]) {
    const count = annotations.length;
    const isOpen = this.openStatuses.has(status);
    const isEmpty = count === 0;

    const page = this.getPage(status);
    const start = page * PAGE_SIZE;
    const pageItems = annotations.slice(start, start + PAGE_SIZE);

    return html`
      <div class="status-group">
        <button
          class="status-header ${isEmpty ? 'empty' : ''} ${isOpen
            ? 'open'
            : ''}"
          @click=${() => !isEmpty && this.toggleStatus(status)}
        >
          <div class="status-label">
            <span class="header-dot ${status}"></span>
            ${STATUS_LABELS[status] ?? status}
            <span class="status-count">(${count})</span>
          </div>
          ${!isEmpty
            ? html`<svg
                class="chevron ${isOpen ? 'open' : ''}"
                viewBox="0 0 24 24"
                fill="none"
              >
                <path
                  d="M9 18l6-6-6-6"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>`
            : nothing}
        </button>

        ${isOpen && !isEmpty
          ? html`
              <div class="group-content">
                ${pageItems.map(
                  (annotation) => html`
                    <ds-annotation-item
                      .annotation=${annotation}
                    ></ds-annotation-item>
                  `,
                )}
                ${this.renderPagination(status, count)}
              </div>
            `
          : nothing}
      </div>
    `;
  }

  override render() {
    const { annotations } = this.storeController.state;
    const groups = this.groupByStatus(annotations);

    return html`
      <div class="accordion">
        ${STATUS_ORDER.map((status) =>
          this.renderStatusGroup(status, groups[status]),
        )}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ds-annotation-list': DsAnnotationList;
  }
}
