/**
 * DOM utility functions for element traversal and querying
 * @module @domscribe/runtime/utils/dom-utils
 */

import { ManifestEntryId, PATTERNS } from '@domscribe/core';

/**
 * Get element by Domscribe element ID (data-ds attribute)
 *
 * @param entryId - The manifest entry ID to search for
 * @param root - Root element to search within (defaults to document.body)
 * @returns The element or null if not found
 */
export function getElementByDsId(
  entryId: ManifestEntryId,
  root: HTMLElement | Document = document,
): HTMLElement | null {
  const selector = `[data-ds="${entryId}"]`;
  return root.querySelector<HTMLElement>(selector);
}

/**
 * Get Domscribe element ID from an element
 *
 * @param element - The element to query
 * @returns The element ID or null if not found
 */
export function getDsIdFromElement(
  element: HTMLElement,
): ManifestEntryId | null {
  return element.getAttribute('data-ds');
}

/**
 * Check if an element has a Domscribe element ID
 *
 * @param element - The element to check
 * @returns True if the element has a data-ds attribute
 */
export function hasDsId(element: HTMLElement): boolean {
  return element.hasAttribute('data-ds');
}

/**
 * Validate a Domscribe element ID
 *
 * @param id - The ID to validate
 * @returns True if the ID is valid
 */
export function isValidDsId(id: string): boolean {
  return PATTERNS.MANIFEST_ENTRY_ID.test(id);
}

/**
 * Find the closest ancestor element with a Domscribe element ID
 *
 * @param element - The starting element
 * @returns The closest ancestor with a data-ds attribute or null
 */
export function findClosestDsElement(element: HTMLElement): HTMLElement | null {
  let current: HTMLElement | null = element;

  while (current) {
    if (hasDsId(current)) {
      return current;
    }
    current = current.parentElement;
  }

  return null;
}

/**
 * Get all descendant elements with Domscribe element IDs
 *
 * @param root - Root element to search within
 * @returns Array of elements with data-ds attributes
 */
export function getAllDsElements(root: HTMLElement | Document): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>('[data-ds]'));
}

/**
 * Generate a unique CSS selector for an element
 *
 * @param element - The element to generate a selector for
 * @returns A CSS selector string
 */
export function getUniqueSelector(element: HTMLElement): string {
  // If element has an ID, use that
  if (element.id) {
    return `#${CSS.escape(element.id)}`;
  }

  // If element has a data-ds attribute, use that
  const dsId = getDsIdFromElement(element);
  if (dsId) {
    return `[data-ds="${dsId}"]`;
  }

  // Build path from element to root
  const path: string[] = [];
  let current: HTMLElement | null = element;

  while (current && current !== document.body) {
    let selector = current.tagName.toLowerCase();

    // Add classes if present
    if (current.className && typeof current.className === 'string') {
      const classes = current.className
        .split(/\s+/)
        .filter(Boolean)
        .map((c) => `.${CSS.escape(c)}`)
        .join('');
      selector += classes;
    }

    // Add nth-child if needed for uniqueness
    const parent = current.parentElement;

    if (parent && parent.children) {
      const siblings = Array.from(parent.children).filter(
        (el) => el.tagName === current?.tagName,
      );
      if (siblings.length > 1) {
        const index = siblings.indexOf(current) + 1;
        selector += `:nth-of-type(${index})`;
      }
    }

    path.unshift(selector);
    current = current.parentElement;
  }

  return path.join(' > ');
}

/**
 * Check if an element matches any of the given selectors
 *
 * @param element - The element to check
 * @param selectors - Array of CSS selectors
 * @returns True if the element matches any selector
 */
export function matchesAny(element: HTMLElement, selectors: string[]): boolean {
  return selectors.some((selector) => {
    try {
      return element.matches(selector);
    } catch {
      return false;
    }
  });
}

/**
 * Get bounding rectangle for an element
 *
 * @param element - The element to measure
 * @returns Bounding rectangle object
 */
export function getBoundingRect(element: HTMLElement): {
  x: number;
  y: number;
  width: number;
  height: number;
  top: number;
  right: number;
  bottom: number;
  left: number;
} {
  const rect = element.getBoundingClientRect();
  return {
    x: rect.x,
    y: rect.y,
    width: rect.width,
    height: rect.height,
    top: rect.top,
    right: rect.right,
    bottom: rect.bottom,
    left: rect.left,
  };
}

/**
 * Check if an element is visible in the viewport
 *
 * @param element - The element to check
 * @returns True if the element is visible
 */
export function isElementVisible(element: HTMLElement): boolean {
  // Check if element has dimensions
  const rect = element.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) {
    return false;
  }

  // Check if element is in viewport
  const windowHeight =
    window.innerHeight || document.documentElement.clientHeight;
  const windowWidth = window.innerWidth || document.documentElement.clientWidth;

  const vertInView = rect.top <= windowHeight && rect.top + rect.height >= 0;
  const horInView = rect.left <= windowWidth && rect.left + rect.width >= 0;

  return vertInView && horInView;
}

/**
 * Get computed styles for an element
 *
 * @param element - The element to query
 * @param properties - Optional array of specific properties to retrieve
 * @returns Object of computed styles
 */
export function getComputedStyles(
  element: HTMLElement,
  properties?: string[],
): Record<string, string> {
  const computed = window.getComputedStyle(element);
  const styles: Record<string, string> = {};

  if (properties) {
    for (const prop of properties) {
      styles[prop] = computed.getPropertyValue(prop);
    }
  } else {
    // Get all properties (expensive, use sparingly)
    for (let i = 0; i < computed.length; i++) {
      const prop = computed[i];
      styles[prop] = computed.getPropertyValue(prop);
    }
  }

  return styles;
}
