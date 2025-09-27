/**
 * Tests for DOM utility functions
 *
 * Tests element traversal, querying, and measurement utilities.
 * Follows Arrange-Act-Assert methodology.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getElementByDsId,
  getDsIdFromElement,
  hasDsId,
  isValidDsId,
  findClosestDsElement,
  getAllDsElements,
  getUniqueSelector,
  matchesAny,
  getBoundingRect,
  isElementVisible,
  getComputedStyles,
} from './dom-utils.js';

// Polyfill CSS.escape for jsdom
if (typeof CSS === 'undefined' || !CSS.escape) {
  global.CSS = {
    escape: (str: string) => {
      return str.replace(/([!"#$%&'()*+,./:;<=>?@[\\\]^`{|}~])/g, '\\$1');
    },
  } as typeof CSS;
}

describe('getElementByDsId', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('should find element by data-ds attribute', () => {
    // Arrange
    document.body.innerHTML = '<div data-ds="abc12345">Test</div>';

    // Act
    const result = getElementByDsId('abc12345');

    // Assert
    expect(result).not.toBeNull();
    expect(result?.textContent).toBe('Test');
  });

  it('should return null when element not found', () => {
    // Arrange
    document.body.innerHTML = '<div>No ID</div>';

    // Act
    const result = getElementByDsId('notfound');

    // Assert
    expect(result).toBeNull();
  });

  it('should find nested elements', () => {
    // Arrange
    document.body.innerHTML = `
      <div>
        <section>
          <article data-ds="nested123">Nested</article>
        </section>
      </div>
    `;

    // Act
    const result = getElementByDsId('nested123');

    // Assert
    expect(result).not.toBeNull();
    expect(result?.tagName).toBe('ARTICLE');
  });

  it('should search within custom root element', () => {
    // Arrange
    document.body.innerHTML = `
      <div id="container">
        <div data-ds="inside">Inside</div>
      </div>
      <div data-ds="outside">Outside</div>
    `;
    const container = document.getElementById('container') as HTMLElement;

    // Act
    const result = getElementByDsId('inside', container);

    // Assert
    expect(result).not.toBeNull();
    expect(result?.textContent).toBe('Inside');
  });

  it('should not find elements outside custom root', () => {
    // Arrange
    document.body.innerHTML = `
      <div id="container">
        <div data-ds="inside">Inside</div>
      </div>
      <div data-ds="outside">Outside</div>
    `;
    const container = document.getElementById('container') as HTMLElement;

    // Act
    const result = getElementByDsId('outside', container);

    // Assert
    expect(result).toBeNull();
  });

  it('should handle special characters in element ID', () => {
    // Arrange
    document.body.innerHTML = '<div data-ds="abc-123_xyz">Special</div>';

    // Act
    const result = getElementByDsId('abc-123_xyz');

    // Assert
    expect(result).not.toBeNull();
  });

  it('should find first element when multiple exist', () => {
    // Arrange
    document.body.innerHTML = `
      <div data-ds="duplicate">First</div>
      <div data-ds="duplicate">Second</div>
    `;

    // Act
    const result = getElementByDsId('duplicate');

    // Assert
    expect(result).not.toBeNull();
    expect(result?.textContent).toBe('First');
  });
});

describe('getDsIdFromElement', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('should get data-ds attribute from element', () => {
    // Arrange
    const element = document.createElement('div');
    element.setAttribute('data-ds', 'test1234');

    // Act
    const result = getDsIdFromElement(element);

    // Assert
    expect(result).toBe('test1234');
  });

  it('should return null when element has no data-ds', () => {
    // Arrange
    const element = document.createElement('div');

    // Act
    const result = getDsIdFromElement(element);

    // Assert
    expect(result).toBeNull();
  });

  it('should return empty string for empty data-ds attribute', () => {
    // Arrange
    const element = document.createElement('div');
    element.setAttribute('data-ds', '');

    // Act
    const result = getDsIdFromElement(element);

    // Assert
    expect(result).toBe('');
  });
});

describe('hasDsId', () => {
  it('should return true when element has data-ds attribute', () => {
    // Arrange
    const element = document.createElement('div');
    element.setAttribute('data-ds', 'test1234');

    // Act
    const result = hasDsId(element);

    // Assert
    expect(result).toBe(true);
  });

  it('should return false when element does not have data-ds', () => {
    // Arrange
    const element = document.createElement('div');

    // Act
    const result = hasDsId(element);

    // Assert
    expect(result).toBe(false);
  });

  it('should return true even for empty data-ds attribute', () => {
    // Arrange
    const element = document.createElement('div');
    element.setAttribute('data-ds', '');

    // Act
    const result = hasDsId(element);

    // Assert
    expect(result).toBe(true);
  });
});

describe('isValidDsId', () => {
  it('should validate correct 8-character IDs', () => {
    // Arrange
    const validIds = ['abc12345', 'A7bCd9Ef', '12345678', 'aBcDeFgH'];

    // Act & Assert
    for (const id of validIds) {
      expect(isValidDsId(id)).toBe(true);
    }
  });

  it('should reject IDs that are too short', () => {
    // Arrange
    const id = 'abc123';

    // Act
    const result = isValidDsId(id);

    // Assert
    expect(result).toBe(false);
  });

  it('should reject IDs that are too long', () => {
    // Arrange
    const id = 'abc123456';

    // Act
    const result = isValidDsId(id);

    // Assert
    expect(result).toBe(false);
  });

  it('should reject IDs with invalid characters', () => {
    // Arrange
    const invalidIds = ['abc!2345', 'abc@2345', 'abc 2345', 'abc-2345'];

    // Act & Assert
    for (const id of invalidIds) {
      expect(isValidDsId(id)).toBe(false);
    }
  });

  it('should reject IDs with ambiguous characters', () => {
    // Arrange
    const ambiguousIds = ['I2345678', 'O2345678'];

    // Act & Assert
    for (const id of ambiguousIds) {
      expect(isValidDsId(id)).toBe(false);
    }
  });

  it('should reject empty string', () => {
    // Arrange
    const id = '';

    // Act
    const result = isValidDsId(id);

    // Assert
    expect(result).toBe(false);
  });
});

describe('findClosestDsElement', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('should return element itself if it has data-ds', () => {
    // Arrange
    const element = document.createElement('div');
    element.setAttribute('data-ds', 'self1234');
    document.body.appendChild(element);

    // Act
    const result = findClosestDsElement(element);

    // Assert
    expect(result).toBe(element);
  });

  it('should find parent with data-ds', () => {
    // Arrange
    document.body.innerHTML = `
      <div data-ds="parent123">
        <div>
          <span id="target">Target</span>
        </div>
      </div>
    `;
    const target = document.getElementById('target') as HTMLElement;

    // Act
    const result = findClosestDsElement(target);

    // Assert
    expect(result).not.toBeNull();
    expect(result?.getAttribute('data-ds')).toBe('parent123');
  });

  it('should return null when no ancestor has data-ds', () => {
    // Arrange
    document.body.innerHTML = '<div><span id="target">Target</span></div>';
    const target = document.getElementById('target') as HTMLElement;

    // Act
    const result = findClosestDsElement(target);

    // Assert
    expect(result).toBeNull();
  });

  it('should traverse multiple levels', () => {
    // Arrange
    document.body.innerHTML = `
      <div data-ds="root123">
        <div>
          <div>
            <div>
              <span id="target">Deep</span>
            </div>
          </div>
        </div>
      </div>
    `;
    const target = document.getElementById('target') as HTMLElement;

    // Act
    const result = findClosestDsElement(target);

    // Assert
    expect(result).not.toBeNull();
    expect(result?.getAttribute('data-ds')).toBe('root123');
  });

  it('should find nearest ancestor when multiple exist', () => {
    // Arrange
    document.body.innerHTML = `
      <div data-ds="outer123">
        <div data-ds="inner456">
          <span id="target">Target</span>
        </div>
      </div>
    `;
    const target = document.getElementById('target') as HTMLElement;

    // Act
    const result = findClosestDsElement(target);

    // Assert
    expect(result).not.toBeNull();
    expect(result?.getAttribute('data-ds')).toBe('inner456');
  });
});

describe('getAllDsElements', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('should return empty array when no elements have data-ds', () => {
    // Arrange
    document.body.innerHTML = '<div><span>No IDs</span></div>';

    // Act
    const result = getAllDsElements(document.body);

    // Assert
    expect(result).toEqual([]);
  });

  it('should find all elements with data-ds', () => {
    // Arrange
    document.body.innerHTML = `
      <div data-ds="id1">First</div>
      <div data-ds="id2">Second</div>
      <div data-ds="id3">Third</div>
    `;

    // Act
    const result = getAllDsElements(document.body);

    // Assert
    expect(result).toHaveLength(3);
  });

  it('should find nested elements', () => {
    // Arrange
    document.body.innerHTML = `
      <div data-ds="parent">
        <div data-ds="child1">
          <div data-ds="grandchild">Deep</div>
        </div>
        <div data-ds="child2">Sibling</div>
      </div>
    `;

    // Act
    const result = getAllDsElements(document.body);

    // Assert
    expect(result).toHaveLength(4);
  });

  it('should search within custom root', () => {
    // Arrange
    document.body.innerHTML = `
      <div id="container">
        <div data-ds="inside1">Inside 1</div>
        <div data-ds="inside2">Inside 2</div>
      </div>
      <div data-ds="outside">Outside</div>
    `;
    const container = document.getElementById('container') as HTMLElement;

    // Act
    const result = getAllDsElements(container);

    // Assert
    expect(result).toHaveLength(2);
    expect(result.every((el) => container.contains(el))).toBe(true);
  });

  it('should return elements in document order', () => {
    // Arrange
    document.body.innerHTML = `
      <div data-ds="first">1</div>
      <div data-ds="second">2</div>
      <div data-ds="third">3</div>
    `;

    // Act
    const result = getAllDsElements(document.body);

    // Assert
    expect(result[0].textContent).toBe('1');
    expect(result[1].textContent).toBe('2');
    expect(result[2].textContent).toBe('3');
  });
});

describe('getUniqueSelector', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('should use element ID when available', () => {
    // Arrange
    const element = document.createElement('div');
    element.id = 'unique-id';
    document.body.appendChild(element);

    // Act
    const result = getUniqueSelector(element);

    // Assert
    expect(result).toBe('#unique-id');
  });

  it('should escape special characters in ID', () => {
    // Arrange
    const element = document.createElement('div');
    element.id = 'id:with:colons';
    document.body.appendChild(element);

    // Act
    const result = getUniqueSelector(element);

    // Assert
    expect(result).toContain('#id');
  });

  it('should use data-ds attribute when no ID', () => {
    // Arrange
    const element = document.createElement('div');
    element.setAttribute('data-ds', 'abc12345');
    document.body.appendChild(element);

    // Act
    const result = getUniqueSelector(element);

    // Assert
    expect(result).toBe('[data-ds="abc12345"]');
  });

  it('should build path from tag names', () => {
    // Arrange
    document.body.innerHTML = `
      <div>
        <section>
          <article id="target">Content</article>
        </section>
      </div>
    `;
    const target = document.getElementById('target') as HTMLElement;

    // Act
    const result = getUniqueSelector(target);

    // Assert
    expect(result).toBe('#target');
  });

  it('should include classes in selector', () => {
    // Arrange
    document.body.innerHTML = '<div class="container main" id="target"></div>';
    const target = document.getElementById('target') as HTMLElement;

    // Act
    const result = getUniqueSelector(target);

    // Assert
    expect(result).toBe('#target');
  });

  it('should add nth-of-type for siblings with same tag', () => {
    // Arrange
    document.body.innerHTML = `
      <div>
        <span>First</span>
        <span id="target">Second</span>
        <span>Third</span>
      </div>
    `;
    const target = document.getElementById('target') as HTMLElement;

    // Act
    const result = getUniqueSelector(target);

    // Assert
    expect(result).toBe('#target');
  });

  it('should handle elements without ID or data-ds', () => {
    // Arrange
    document.body.innerHTML = `
      <div class="wrapper">
        <section class="content">
          <p id="target">Text</p>
        </section>
      </div>
    `;
    const target = document.getElementById('target') as HTMLElement;

    // Act
    const result = getUniqueSelector(target);

    // Assert
    expect(result).toBe('#target');
  });

  it('should escape special characters in class names', () => {
    // Arrange
    document.body.innerHTML = '<div class="class:with:colons" id="test"></div>';
    const element = document.getElementById('test') as HTMLElement;

    // Act
    const result = getUniqueSelector(element);

    // Assert
    expect(result).toBe('#test');
  });

  it('should handle elements with no classes', () => {
    // Arrange
    document.body.innerHTML = '<article><p id="target">Text</p></article>';
    const target = document.getElementById('target') as HTMLElement;

    // Act
    const result = getUniqueSelector(target);

    // Assert
    expect(result).toBe('#target');
  });

  it('should stop at body element', () => {
    // Arrange
    document.body.innerHTML = '<div id="target">Content</div>';
    const target = document.getElementById('target') as HTMLElement;

    // Act
    const result = getUniqueSelector(target);

    // Assert
    expect(result).toBe('#target');
    expect(result).not.toContain('body');
  });
});

describe('matchesAny', () => {
  it('should return true when element matches a selector', () => {
    // Arrange
    const element = document.createElement('div');
    element.className = 'test-class';
    const selectors = ['.test-class', '.other-class'];

    // Act
    const result = matchesAny(element, selectors);

    // Assert
    expect(result).toBe(true);
  });

  it('should return false when element matches no selectors', () => {
    // Arrange
    const element = document.createElement('div');
    const selectors = ['.test-class', '.other-class'];

    // Act
    const result = matchesAny(element, selectors);

    // Assert
    expect(result).toBe(false);
  });

  it('should return true when element matches first selector', () => {
    // Arrange
    const element = document.createElement('div');
    element.id = 'test-id';
    const selectors = ['#test-id', '.test-class'];

    // Act
    const result = matchesAny(element, selectors);

    // Assert
    expect(result).toBe(true);
  });

  it('should return true when element matches last selector', () => {
    // Arrange
    const element = document.createElement('div');
    element.id = 'test-id';
    const selectors = ['.test-class', '#test-id'];

    // Act
    const result = matchesAny(element, selectors);

    // Assert
    expect(result).toBe(true);
  });

  it('should handle empty selectors array', () => {
    // Arrange
    const element = document.createElement('div');
    const selectors: string[] = [];

    // Act
    const result = matchesAny(element, selectors);

    // Assert
    expect(result).toBe(false);
  });

  it('should handle invalid selectors gracefully', () => {
    // Arrange
    const element = document.createElement('div');
    const selectors = ['[invalid[selector]', '.valid-class'];
    element.className = 'valid-class';

    // Act
    const result = matchesAny(element, selectors);

    // Assert
    expect(result).toBe(true);
  });

  it('should return false when all selectors are invalid', () => {
    // Arrange
    const element = document.createElement('div');
    const selectors = ['[invalid[selector]', '{another{bad}'];

    // Act
    const result = matchesAny(element, selectors);

    // Assert
    expect(result).toBe(false);
  });

  it('should match attribute selectors', () => {
    // Arrange
    const element = document.createElement('div');
    element.setAttribute('data-test', 'value');
    const selectors = ['[data-test="value"]', '.other-class'];

    // Act
    const result = matchesAny(element, selectors);

    // Assert
    expect(result).toBe(true);
  });

  it('should match complex selectors', () => {
    // Arrange
    document.body.innerHTML =
      '<div class="parent"><div class="child" id="target"></div></div>';
    const element = document.getElementById('target') as HTMLElement;
    const selectors = ['.parent .child', '#other'];

    // Act
    const result = matchesAny(element, selectors);

    // Assert
    expect(result).toBe(true);
  });
});

describe('getBoundingRect', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('should return bounding rectangle object', () => {
    // Arrange
    const element = document.createElement('div');
    document.body.appendChild(element);

    // Mock getBoundingClientRect
    element.getBoundingClientRect = vi.fn().mockReturnValue({
      x: 10,
      y: 20,
      width: 100,
      height: 50,
      top: 20,
      right: 110,
      bottom: 70,
      left: 10,
    });

    // Act
    const result = getBoundingRect(element);

    // Assert
    expect(result).toEqual({
      x: 10,
      y: 20,
      width: 100,
      height: 50,
      top: 20,
      right: 110,
      bottom: 70,
      left: 10,
    });
  });

  it('should handle zero-sized elements', () => {
    // Arrange
    const element = document.createElement('div');
    document.body.appendChild(element);

    element.getBoundingClientRect = vi.fn().mockReturnValue({
      x: 0,
      y: 0,
      width: 0,
      height: 0,
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
    });

    // Act
    const result = getBoundingRect(element);

    // Assert
    expect(result).toEqual({
      x: 0,
      y: 0,
      width: 0,
      height: 0,
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
    });
  });

  it('should handle negative coordinates', () => {
    // Arrange
    const element = document.createElement('div');
    document.body.appendChild(element);

    element.getBoundingClientRect = vi.fn().mockReturnValue({
      x: -50,
      y: -30,
      width: 100,
      height: 50,
      top: -30,
      right: 50,
      bottom: 20,
      left: -50,
    });

    // Act
    const result = getBoundingRect(element);

    // Assert
    expect(result.x).toBe(-50);
    expect(result.y).toBe(-30);
  });
});

describe('isElementVisible', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    // Mock window dimensions
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 1000,
    });
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1000,
    });
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('should return false for zero-width elements', () => {
    // Arrange
    const element = document.createElement('div');
    document.body.appendChild(element);

    element.getBoundingClientRect = vi.fn().mockReturnValue({
      x: 100,
      y: 100,
      width: 0,
      height: 50,
      top: 100,
      right: 100,
      bottom: 150,
      left: 100,
    });

    // Act
    const result = isElementVisible(element);

    // Assert
    expect(result).toBe(false);
  });

  it('should return false for zero-height elements', () => {
    // Arrange
    const element = document.createElement('div');
    document.body.appendChild(element);

    element.getBoundingClientRect = vi.fn().mockReturnValue({
      x: 100,
      y: 100,
      width: 50,
      height: 0,
      top: 100,
      right: 150,
      bottom: 100,
      left: 100,
    });

    // Act
    const result = isElementVisible(element);

    // Assert
    expect(result).toBe(false);
  });

  it('should return true for element in viewport', () => {
    // Arrange
    const element = document.createElement('div');
    document.body.appendChild(element);

    element.getBoundingClientRect = vi.fn().mockReturnValue({
      x: 100,
      y: 100,
      width: 200,
      height: 150,
      top: 100,
      right: 300,
      bottom: 250,
      left: 100,
    });

    // Act
    const result = isElementVisible(element);

    // Assert
    expect(result).toBe(true);
  });

  it('should return false for element above viewport', () => {
    // Arrange
    const element = document.createElement('div');
    document.body.appendChild(element);

    element.getBoundingClientRect = vi.fn().mockReturnValue({
      x: 100,
      y: -200,
      width: 200,
      height: 150,
      top: -200,
      right: 300,
      bottom: -50,
      left: 100,
    });

    // Act
    const result = isElementVisible(element);

    // Assert
    expect(result).toBe(false);
  });

  it('should return false for element below viewport', () => {
    // Arrange
    const element = document.createElement('div');
    document.body.appendChild(element);

    element.getBoundingClientRect = vi.fn().mockReturnValue({
      x: 100,
      y: 1100,
      width: 200,
      height: 150,
      top: 1100,
      right: 300,
      bottom: 1250,
      left: 100,
    });

    // Act
    const result = isElementVisible(element);

    // Assert
    expect(result).toBe(false);
  });

  it('should return false for element to the left of viewport', () => {
    // Arrange
    const element = document.createElement('div');
    document.body.appendChild(element);

    element.getBoundingClientRect = vi.fn().mockReturnValue({
      x: -300,
      y: 100,
      width: 200,
      height: 150,
      top: 100,
      right: -100,
      bottom: 250,
      left: -300,
    });

    // Act
    const result = isElementVisible(element);

    // Assert
    expect(result).toBe(false);
  });

  it('should return false for element to the right of viewport', () => {
    // Arrange
    const element = document.createElement('div');
    document.body.appendChild(element);

    element.getBoundingClientRect = vi.fn().mockReturnValue({
      x: 1100,
      y: 100,
      width: 200,
      height: 150,
      top: 100,
      right: 1300,
      bottom: 250,
      left: 1100,
    });

    // Act
    const result = isElementVisible(element);

    // Assert
    expect(result).toBe(false);
  });

  it('should return true for partially visible element at top edge', () => {
    // Arrange
    const element = document.createElement('div');
    document.body.appendChild(element);

    element.getBoundingClientRect = vi.fn().mockReturnValue({
      x: 100,
      y: -50,
      width: 200,
      height: 100,
      top: -50,
      right: 300,
      bottom: 50,
      left: 100,
    });

    // Act
    const result = isElementVisible(element);

    // Assert
    expect(result).toBe(true);
  });

  it('should return true for partially visible element at bottom edge', () => {
    // Arrange
    const element = document.createElement('div');
    document.body.appendChild(element);

    element.getBoundingClientRect = vi.fn().mockReturnValue({
      x: 100,
      y: 950,
      width: 200,
      height: 100,
      top: 950,
      right: 300,
      bottom: 1050,
      left: 100,
    });

    // Act
    const result = isElementVisible(element);

    // Assert
    expect(result).toBe(true);
  });

  it('should return true for element at exact viewport boundaries', () => {
    // Arrange
    const element = document.createElement('div');
    document.body.appendChild(element);

    element.getBoundingClientRect = vi.fn().mockReturnValue({
      x: 0,
      y: 0,
      width: 1000,
      height: 1000,
      top: 0,
      right: 1000,
      bottom: 1000,
      left: 0,
    });

    // Act
    const result = isElementVisible(element);

    // Assert
    expect(result).toBe(true);
  });
});

describe('getComputedStyles', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('should get specific style properties', () => {
    // Arrange
    const element = document.createElement('div');
    document.body.appendChild(element);

    const mockComputedStyle = {
      getPropertyValue: vi.fn((prop: string) => {
        const values: Record<string, string> = {
          color: 'rgb(0, 0, 0)',
          'font-size': '16px',
          display: 'block',
        };
        return values[prop] || '';
      }),
    };

    vi.spyOn(window, 'getComputedStyle').mockReturnValue(
      mockComputedStyle as unknown as CSSStyleDeclaration,
    );

    // Act
    const result = getComputedStyles(element, [
      'color',
      'font-size',
      'display',
    ]);

    // Assert
    expect(result).toEqual({
      color: 'rgb(0, 0, 0)',
      'font-size': '16px',
      display: 'block',
    });
  });

  it('should handle empty properties array', () => {
    // Arrange
    const element = document.createElement('div');
    document.body.appendChild(element);

    const mockComputedStyle = {
      getPropertyValue: vi.fn(),
    };

    vi.spyOn(window, 'getComputedStyle').mockReturnValue(
      mockComputedStyle as unknown as CSSStyleDeclaration,
    );

    // Act
    const result = getComputedStyles(element, []);

    // Assert
    expect(result).toEqual({});
  });

  it('should get all properties when none specified', () => {
    // Arrange
    const element = document.createElement('div');
    document.body.appendChild(element);

    const mockComputedStyle = {
      length: 3,
      0: 'color',
      1: 'font-size',
      2: 'display',
      getPropertyValue: vi.fn((prop: string) => {
        const values: Record<string, string> = {
          color: 'rgb(0, 0, 0)',
          'font-size': '16px',
          display: 'block',
        };
        return values[prop] || '';
      }),
    };

    vi.spyOn(window, 'getComputedStyle').mockReturnValue(
      mockComputedStyle as unknown as CSSStyleDeclaration,
    );

    // Act
    const result = getComputedStyles(element);

    // Assert
    expect(result).toEqual({
      color: 'rgb(0, 0, 0)',
      'font-size': '16px',
      display: 'block',
    });
  });

  it('should return empty string for non-existent properties', () => {
    // Arrange
    const element = document.createElement('div');
    document.body.appendChild(element);

    const mockComputedStyle = {
      getPropertyValue: vi.fn(() => ''),
    };

    vi.spyOn(window, 'getComputedStyle').mockReturnValue(
      mockComputedStyle as unknown as CSSStyleDeclaration,
    );

    // Act
    const result = getComputedStyles(element, ['non-existent-property']);

    // Assert
    expect(result).toEqual({
      'non-existent-property': '',
    });
  });

  it('should handle multiple properties correctly', () => {
    // Arrange
    const element = document.createElement('div');
    document.body.appendChild(element);

    const mockComputedStyle = {
      getPropertyValue: vi.fn((prop: string) => {
        const values: Record<string, string> = {
          margin: '10px',
          padding: '5px',
          border: '1px solid black',
        };
        return values[prop] || '';
      }),
    };

    vi.spyOn(window, 'getComputedStyle').mockReturnValue(
      mockComputedStyle as unknown as CSSStyleDeclaration,
    );

    // Act
    const result = getComputedStyles(element, ['margin', 'padding', 'border']);

    // Assert
    expect(result).toEqual({
      margin: '10px',
      padding: '5px',
      border: '1px solid black',
    });
    expect(mockComputedStyle.getPropertyValue).toHaveBeenCalledTimes(3);
  });
});

describe('Integration Scenarios', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('should find and verify element workflow', () => {
    // Arrange
    document.body.innerHTML = `
      <div data-ds="abc12345">
        <button id="btn">Click me</button>
      </div>
    `;

    // Act
    const element = getElementByDsId('abc12345');
    const hasId = element ? hasDsId(element) : false;
    const id = element ? getDsIdFromElement(element) : null;
    const isValid = id ? isValidDsId(id) : false;

    // Assert
    expect(element).not.toBeNull();
    expect(hasId).toBe(true);
    expect(id).toBe('abc12345');
    expect(isValid).toBe(true);
  });

  it('should handle nested component hierarchy', () => {
    // Arrange
    document.body.innerHTML = `
      <div data-ds="root1234">
        <section data-ds="section56">
          <article data-ds="article78">
            <p id="target">Content</p>
          </article>
        </section>
      </div>
    `;
    const target = document.getElementById('target') as HTMLElement;

    // Act
    const closest = findClosestDsElement(target);
    const allElements = getAllDsElements(document.body);

    // Assert
    expect(closest?.getAttribute('data-ds')).toBe('article78');
    expect(allElements).toHaveLength(3);
  });

  it('should handle selector generation and matching', () => {
    // Arrange
    document.body.innerHTML = `
      <div class="container">
        <div class="item active" id="target">Selected</div>
        <div class="item">Other</div>
      </div>
    `;
    const target = document.getElementById('target') as HTMLElement;

    // Act
    const selector = getUniqueSelector(target);
    const matches = matchesAny(target, ['.active', '.inactive']);

    // Assert
    expect(selector).toBe('#target');
    expect(matches).toBe(true);
  });
});
