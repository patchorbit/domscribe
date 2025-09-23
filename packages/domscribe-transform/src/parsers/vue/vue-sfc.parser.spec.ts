/**
 * Tests for VueSFCParser
 *
 * Tests follow Arrange-Act-Assert methodology and test the parser's behavior
 * for Vue Single File Components. We verify how the parser handles
 * SFC parsing, element discovery, position calculation, and edge cases.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { VueSFCParser, createVueSFCParser } from './vue-sfc.parser.js';

describe('VueSFCParser', () => {
  let parser: VueSFCParser;

  beforeEach(async () => {
    parser = new VueSFCParser();
    await parser.initialize();
  });

  describe('initialize()', () => {
    it('should load Vue compilers successfully', async () => {
      // Arrange
      const newParser = new VueSFCParser();

      // Act
      await newParser.initialize();

      // Assert - should not throw
      const source = `<template><div>Hello</div></template>`;
      expect(() => newParser.parse(source)).not.toThrow();
    });

    it('should be safe to call multiple times', async () => {
      // Arrange
      const newParser = new VueSFCParser();

      // Act
      await newParser.initialize();
      await newParser.initialize();

      // Assert - should not throw
      expect(() =>
        newParser.parse(`<template><div>Hello</div></template>`),
      ).not.toThrow();
    });
  });

  describe('parse()', () => {
    describe('Valid SFC parsing', () => {
      it('should parse simple SFC and return parse result', () => {
        // Arrange
        const source = `<template>
  <div>Hello</div>
</template>`;

        // Act
        const result = parser.parse(source);

        // Assert
        expect(result).toBeDefined();
        expect(result.templateAst).toBeDefined();
        expect(result.sfcSource).toBe(source);
      });

      it('should parse SFC with script setup', () => {
        // Arrange
        const source = `<script setup lang="ts">
const message = 'Hello';
</script>

<template>
  <div>{{ message }}</div>
</template>`;

        // Act
        const result = parser.parse(source);

        // Assert
        expect(result).toBeDefined();
        expect(result.templateAst).toBeDefined();
      });

      it('should parse SFC with Options API script', () => {
        // Arrange
        const source = `<script>
export default {
  data() {
    return { message: 'Hello' };
  }
};
</script>

<template>
  <div>{{ message }}</div>
</template>`;

        // Act
        const result = parser.parse(source);

        // Assert
        expect(result).toBeDefined();
        expect(result.templateAst).toBeDefined();
      });

      it('should parse SFC with style block', () => {
        // Arrange
        const source = `<template>
  <div class="container">Hello</div>
</template>

<style scoped>
.container { color: red; }
</style>`;

        // Act
        const result = parser.parse(source);

        // Assert
        expect(result).toBeDefined();
        expect(result.templateAst).toBeDefined();
      });

      it('should calculate correct template content offset', () => {
        // Arrange
        const source = `<template>
  <div>Hello</div>
</template>`;

        // Act
        const result = parser.parse(source);

        // Assert
        // Vue 3.3+ AST positions are already absolute, so templateContentOffset is 0
        expect(result.templateContentOffset).toBe(0);
      });

      it('should handle template with attributes', () => {
        // Arrange
        const source = `<template lang="pug">
  <div>Hello</div>
</template>`;

        // Act
        const result = parser.parse(source);

        // Assert
        expect(result).toBeDefined();
        // Vue 3.3+ AST positions are already absolute, so templateContentOffset is 0
        expect(result.templateContentOffset).toBe(0);
      });
    });

    describe('Error handling', () => {
      it('should throw SyntaxError for SFC without template block', () => {
        // Arrange
        const source = `<script>
export default {};
</script>`;

        // Act & Assert
        expect(() => parser.parse(source)).toThrow(SyntaxError);
        expect(() => parser.parse(source)).toThrow(/no <template> block/);
      });

      it('should throw error before initialization', () => {
        // Arrange
        const uninitializedParser = new VueSFCParser();
        const source = `<template><div>Hello</div></template>`;

        // Act & Assert
        expect(() => uninitializedParser.parse(source)).toThrow(
          /Vue compiler not loaded/,
        );
      });
    });
  });

  describe('findJSXOpeningElements()', () => {
    describe('Finding elements', () => {
      it('should find single element', () => {
        // Arrange
        const source = `<template>
  <div>Hello</div>
</template>`;
        const result = parser.parse(source);

        // Act
        const elements = parser.findJSXOpeningElements(result);

        // Assert
        expect(elements).toHaveLength(1);
        expect(parser.getTagName(elements[0])).toBe('div');
      });

      it('should find multiple elements in correct order', () => {
        // Arrange
        const source = `<template>
  <div>
    <h1>Title</h1>
    <p>Content</p>
  </div>
</template>`;
        const result = parser.parse(source);

        // Act
        const elements = parser.findJSXOpeningElements(result);

        // Assert
        expect(elements).toHaveLength(3);
        expect(elements.map((e) => parser.getTagName(e))).toEqual([
          'div',
          'h1',
          'p',
        ]);
      });

      it('should find deeply nested elements', () => {
        // Arrange
        const source = `<template>
  <div>
    <section>
      <article>
        <header>
          <h1>Title</h1>
        </header>
      </article>
    </section>
  </div>
</template>`;
        const result = parser.parse(source);

        // Act
        const elements = parser.findJSXOpeningElements(result);

        // Assert
        expect(elements).toHaveLength(5);
        expect(elements.map((e) => parser.getTagName(e))).toEqual([
          'div',
          'section',
          'article',
          'header',
          'h1',
        ]);
      });

      it('should find self-closing elements', () => {
        // Arrange
        const source = `<template>
  <form>
    <input type="text" />
    <input type="email" />
    <button type="submit">Submit</button>
  </form>
</template>`;
        const result = parser.parse(source);

        // Act
        const elements = parser.findJSXOpeningElements(result);

        // Assert
        expect(elements).toHaveLength(4);
      });

      it('should find Vue components', () => {
        // Arrange
        const source = `<template>
  <div>
    <UserCard />
    <Counter :value="5" />
  </div>
</template>`;
        const result = parser.parse(source);

        // Act
        const elements = parser.findJSXOpeningElements(result);

        // Assert
        expect(elements).toHaveLength(3);
        expect(elements.map((e) => parser.getTagName(e))).toEqual([
          'div',
          'UserCard',
          'Counter',
        ]);
      });

      it('should find elements with v-for directive', () => {
        // Arrange
        const source = `<template>
  <ul>
    <li v-for="item in items" :key="item.id">{{ item.name }}</li>
  </ul>
</template>`;
        const result = parser.parse(source);

        // Act
        const elements = parser.findJSXOpeningElements(result);

        // Assert
        expect(elements).toHaveLength(2);
        expect(elements.map((e) => parser.getTagName(e))).toEqual(['ul', 'li']);
      });

      it('should find elements with v-if directive', () => {
        // Arrange
        const source = `<template>
  <div>
    <p v-if="show">Visible</p>
    <span v-else>Hidden</span>
  </div>
</template>`;
        const result = parser.parse(source);

        // Act
        const elements = parser.findJSXOpeningElements(result);

        // Assert
        expect(elements).toHaveLength(3);
        expect(elements.map((e) => parser.getTagName(e))).toEqual([
          'div',
          'p',
          'span',
        ]);
      });

      it('should find multi-root template elements', () => {
        // Arrange - Vue 3 supports multi-root templates
        const source = `<template>
  <header>Header</header>
  <main>Content</main>
  <footer>Footer</footer>
</template>`;
        const result = parser.parse(source);

        // Act
        const elements = parser.findJSXOpeningElements(result);

        // Assert
        expect(elements).toHaveLength(3);
        expect(elements.map((e) => parser.getTagName(e))).toEqual([
          'header',
          'main',
          'footer',
        ]);
      });
    });

    describe('Skipping template wrappers', () => {
      it('should skip template wrapper with v-if', () => {
        // Arrange - <template v-if> is a virtual wrapper, not a DOM element
        const source = `<template>
  <div>
    <template v-if="show">
      <p>First</p>
      <p>Second</p>
    </template>
  </div>
</template>`;
        const result = parser.parse(source);

        // Act
        const elements = parser.findJSXOpeningElements(result);

        // Assert
        // Should find div, p, p but NOT the template wrapper
        expect(elements).toHaveLength(3);
        expect(elements.map((e) => parser.getTagName(e))).toEqual([
          'div',
          'p',
          'p',
        ]);
      });

      it('should skip template wrapper with v-for', () => {
        // Arrange
        const source = `<template>
  <ul>
    <template v-for="item in items" :key="item.id">
      <li>{{ item.name }}</li>
      <li>{{ item.value }}</li>
    </template>
  </ul>
</template>`;
        const result = parser.parse(source);

        // Act
        const elements = parser.findJSXOpeningElements(result);

        // Assert
        // Should find ul, li, li but NOT the template wrapper
        expect(elements).toHaveLength(3);
        expect(elements.every((e) => parser.getTagName(e) !== 'template')).toBe(
          true,
        );
      });
    });

    describe('Empty results', () => {
      it('should return empty array for template with only text', () => {
        // Arrange
        const source = `<template>
  Hello World
</template>`;
        const result = parser.parse(source);

        // Act
        const elements = parser.findJSXOpeningElements(result);

        // Assert
        expect(elements).toHaveLength(0);
      });

      it('should return empty array for template with only comments', () => {
        // Arrange
        const source = `<template>
  <!-- This is a comment -->
</template>`;
        const result = parser.parse(source);

        // Act
        const elements = parser.findJSXOpeningElements(result);

        // Assert
        expect(elements).toHaveLength(0);
      });
    });
  });

  describe('hasDataDsAttribute()', () => {
    describe('Detecting data-ds attribute', () => {
      it('should return false for element without data-ds', () => {
        // Arrange
        const source = `<template>
  <div class="foo">Hello</div>
</template>`;
        const result = parser.parse(source);
        const elements = parser.findJSXOpeningElements(result);

        // Act
        const hasAttribute = parser.hasDataDsAttribute(elements[0]);

        // Assert
        expect(hasAttribute).toBe(false);
      });

      it('should return true for element with data-ds', () => {
        // Arrange
        const source = `<template>
  <div data-ds="abc12345">Hello</div>
</template>`;
        const result = parser.parse(source);
        const elements = parser.findJSXOpeningElements(result);

        // Act
        const hasAttribute = parser.hasDataDsAttribute(elements[0]);

        // Assert
        expect(hasAttribute).toBe(true);
      });

      it('should return false for element with other data attributes', () => {
        // Arrange
        const source = `<template>
  <div data-testid="foo" data-component="bar">Hello</div>
</template>`;
        const result = parser.parse(source);
        const elements = parser.findJSXOpeningElements(result);

        // Act
        const hasAttribute = parser.hasDataDsAttribute(elements[0]);

        // Assert
        expect(hasAttribute).toBe(false);
      });

      it('should return true when data-ds is among multiple attributes', () => {
        // Arrange
        const source = `<template>
  <button type="button" class="btn" data-ds="xyz98765" disabled>Click</button>
</template>`;
        const result = parser.parse(source);
        const elements = parser.findJSXOpeningElements(result);

        // Act
        const hasAttribute = parser.hasDataDsAttribute(elements[0]);

        // Assert
        expect(hasAttribute).toBe(true);
      });

      it('should detect dynamic :data-ds binding', () => {
        // Arrange
        const source = `<template>
  <div :data-ds="dynamicId">Hello</div>
</template>`;
        const result = parser.parse(source);
        const elements = parser.findJSXOpeningElements(result);

        // Act
        const hasAttribute = parser.hasDataDsAttribute(elements[0]);

        // Assert
        expect(hasAttribute).toBe(true);
      });

      it('should detect v-bind:data-ds binding', () => {
        // Arrange
        const source = `<template>
  <div v-bind:data-ds="dynamicId">Hello</div>
</template>`;
        const result = parser.parse(source);
        const elements = parser.findJSXOpeningElements(result);

        // Act
        const hasAttribute = parser.hasDataDsAttribute(elements[0]);

        // Assert
        expect(hasAttribute).toBe(true);
      });
    });
  });

  describe('getLocation()', () => {
    describe('Location extraction', () => {
      it('should return location for single-line element', () => {
        // Arrange
        const source = `<template><div>Hello</div></template>`;
        const result = parser.parse(source);
        const elements = parser.findJSXOpeningElements(result);

        // Act
        const location = parser.getLocation(elements[0]);

        // Assert
        expect(location).toBeDefined();
        expect(location?.start.line).toBe(1);
        expect(location?.start.offset).toBeGreaterThan(0);
        expect(location?.end).toBeDefined();
      });

      it('should return absolute offset for element position', () => {
        // Arrange
        const source = `<template>
  <div>Hello</div>
</template>`;
        const result = parser.parse(source);
        const elements = parser.findJSXOpeningElements(result);

        // Act
        const location = parser.getLocation(elements[0]);

        // Assert
        // The offset should be absolute in the SFC, not relative to template content
        expect(
          source.slice(
            location?.start?.offset ?? 0,
            (location?.start?.offset ?? 0) + 4,
          ),
        ).toBe('<div');
      });

      it('should return correct locations for nested elements', () => {
        // Arrange
        const source = `<template>
  <div>
    <span>Nested</span>
  </div>
</template>`;
        const result = parser.parse(source);
        const elements = parser.findJSXOpeningElements(result);

        // Act
        const divLocation = parser.getLocation(elements[0]);
        const spanLocation = parser.getLocation(elements[1]);

        // Assert
        expect(divLocation).toBeDefined();
        expect(spanLocation).toBeDefined();
        expect(spanLocation?.start?.offset).toBeGreaterThan(
          divLocation?.start?.offset ?? 0,
        );
      });
    });
  });

  describe('getTagName()', () => {
    describe('Tag name extraction', () => {
      it('should return tag name for native element', () => {
        // Arrange
        const source = `<template><div>Hello</div></template>`;
        const result = parser.parse(source);
        const elements = parser.findJSXOpeningElements(result);

        // Act
        const tagName = parser.getTagName(elements[0]);

        // Assert
        expect(tagName).toBe('div');
      });

      it('should return tag name for Vue component', () => {
        // Arrange
        const source = `<template><UserCard /></template>`;
        const result = parser.parse(source);
        const elements = parser.findJSXOpeningElements(result);

        // Act
        const tagName = parser.getTagName(elements[0]);

        // Assert
        expect(tagName).toBe('UserCard');
      });

      it('should return tag name for kebab-case component', () => {
        // Arrange
        const source = `<template><user-card /></template>`;
        const result = parser.parse(source);
        const elements = parser.findJSXOpeningElements(result);

        // Act
        const tagName = parser.getTagName(elements[0]);

        // Assert
        expect(tagName).toBe('user-card');
      });

      it('should return tag name for built-in components', () => {
        // Arrange
        const source = `<template>
  <Teleport to="body">
    <div>Teleported</div>
  </Teleport>
</template>`;
        const result = parser.parse(source);
        const elements = parser.findJSXOpeningElements(result);

        // Act
        const tagNames = elements.map((e) => parser.getTagName(e));

        // Assert
        expect(tagNames).toContain('Teleport');
        expect(tagNames).toContain('div');
      });
    });
  });

  describe('getInsertPosition()', () => {
    describe('Regular elements', () => {
      it('should return position before > for simple element', () => {
        // Arrange
        const source = `<template><div>Hello</div></template>`;
        const result = parser.parse(source);
        const elements = parser.findJSXOpeningElements(result);

        // Act
        const position = parser.getInsertPosition(elements[0]);

        // Assert
        expect(source.charAt(position)).toBe('>');
      });

      it('should return correct position for element with attributes', () => {
        // Arrange
        const source = `<template><button type="button" class="btn">Click</button></template>`;
        const result = parser.parse(source);
        const elements = parser.findJSXOpeningElements(result);

        // Act
        const position = parser.getInsertPosition(elements[0]);

        // Assert
        expect(source.charAt(position)).toBe('>');
      });

      it('should return correct position for element with Vue directives', () => {
        // Arrange
        const source = `<template><div v-if="show" :class="classes">Hello</div></template>`;
        const result = parser.parse(source);
        const elements = parser.findJSXOpeningElements(result);

        // Act
        const position = parser.getInsertPosition(elements[0]);

        // Assert
        expect(source.charAt(position)).toBe('>');
      });

      it('should return correct position for multi-line element', () => {
        // Arrange
        const source = `<template>
  <div
    class="foo"
    :data-testid="id"
  >
    Hello
  </div>
</template>`;
        const result = parser.parse(source);
        const elements = parser.findJSXOpeningElements(result);

        // Act
        const position = parser.getInsertPosition(elements[0]);

        // Assert
        expect(source.charAt(position)).toBe('>');
      });
    });

    describe('Self-closing elements', () => {
      it('should return position before /> for self-closing element', () => {
        // Arrange
        const source = `<template><input type="text" /></template>`;
        const result = parser.parse(source);
        const elements = parser.findJSXOpeningElements(result);

        // Act
        const position = parser.getInsertPosition(elements[0]);

        // Assert
        expect(source.charAt(position)).toBe('/');
        expect(source.charAt(position + 1)).toBe('>');
      });

      it('should return correct position for self-closing component', () => {
        // Arrange
        const source = `<template><Component :prop="value" /></template>`;
        const result = parser.parse(source);
        const elements = parser.findJSXOpeningElements(result);

        // Act
        const position = parser.getInsertPosition(elements[0]);

        // Assert
        expect(source.charAt(position)).toBe('/');
        expect(source.charAt(position + 1)).toBe('>');
      });
    });

    describe('Attribute insertion', () => {
      it('should allow inserting attributes at correct position', () => {
        // Arrange
        const source = `<template><div class="foo">Hello</div></template>`;
        const result = parser.parse(source);
        const elements = parser.findJSXOpeningElements(result);
        const position = parser.getInsertPosition(elements[0]);

        // Act
        const newCode =
          source.slice(0, position) +
          ' data-ds="test123"' +
          source.slice(position);

        // Assert
        expect(newCode).toContain('<div class="foo" data-ds="test123">');
      });
    });
  });

  describe('createVueSFCParser()', () => {
    it('should return VueSFCParser instance', () => {
      // Act
      const newParser = createVueSFCParser();

      // Assert
      expect(newParser).toBeInstanceOf(VueSFCParser);
    });
  });

  describe('Edge cases', () => {
    it('should handle empty elements', () => {
      // Arrange
      const source = `<template><div></div></template>`;
      const result = parser.parse(source);

      // Act
      const elements = parser.findJSXOpeningElements(result);

      // Assert
      expect(elements).toHaveLength(1);
    });

    it('should handle elements with only whitespace', () => {
      // Arrange
      const source = `<template><div>   </div></template>`;
      const result = parser.parse(source);

      // Act
      const elements = parser.findJSXOpeningElements(result);

      // Assert
      expect(elements).toHaveLength(1);
    });

    it('should handle elements with interpolation', () => {
      // Arrange
      const source = `<template><div>Hello {{ name }}</div></template>`;
      const result = parser.parse(source);

      // Act
      const elements = parser.findJSXOpeningElements(result);

      // Assert
      expect(elements).toHaveLength(1);
    });

    it('should handle slot elements', () => {
      // Arrange
      const source = `<template>
  <div>
    <slot name="header"></slot>
    <slot></slot>
  </div>
</template>`;
      const result = parser.parse(source);

      // Act
      const elements = parser.findJSXOpeningElements(result);

      // Assert
      expect(elements).toHaveLength(3);
      expect(elements.map((e) => parser.getTagName(e))).toContain('slot');
    });

    it('should handle Suspense component', () => {
      // Arrange
      const source = `<template>
  <Suspense>
    <template #default>
      <AsyncComponent />
    </template>
    <template #fallback>
      <div>Loading...</div>
    </template>
  </Suspense>
</template>`;
      const result = parser.parse(source);

      // Act
      const elements = parser.findJSXOpeningElements(result);

      // Assert
      expect(elements.map((e) => parser.getTagName(e))).toContain('Suspense');
      expect(elements.map((e) => parser.getTagName(e))).toContain(
        'AsyncComponent',
      );
      expect(elements.map((e) => parser.getTagName(e))).toContain('div');
    });

    it('should handle dynamic component', () => {
      // Arrange
      const source = `<template>
  <component :is="currentComponent" />
</template>`;
      const result = parser.parse(source);

      // Act
      const elements = parser.findJSXOpeningElements(result);

      // Assert
      expect(elements).toHaveLength(1);
      expect(parser.getTagName(elements[0])).toBe('component');
    });

    it('should handle element with > character in attribute value', () => {
      // Arrange
      const source = `<template><div title="a > b">Hello</div></template>`;
      const result = parser.parse(source);
      const elements = parser.findJSXOpeningElements(result);

      // Act
      const position = parser.getInsertPosition(elements[0]);

      // Assert
      // Should find the closing > of the tag, not the > in the attribute value
      expect(source.charAt(position)).toBe('>');
      expect(source.slice(position + 1, position + 6)).toBe('Hello');
    });
  });
});
