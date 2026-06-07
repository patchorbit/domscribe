/**
 * End-to-end integration tests for the build-time `styleSource` capture
 * pipeline (RFC 0001).
 *
 * These tests drive the real `BabelParser` through the injector so the full
 * AST → manifest path is exercised. The `captureStyles` flag is the only
 * thing differentiating these from the existing injector unit tests; with
 * the flag off (default), no `styleSource` is attached and behavior matches
 * the v0 baseline.
 *
 * @module @domscribe/transform/core/injector.style-source.spec
 */
import { describe, expect, it, vi } from 'vitest';
import { DomscribeInjector } from './injector.js';
import { BabelParser } from '../parsers/babel/babel.parser.js';
import type { IDGenerator } from '@domscribe/manifest';

function createIdGenerator(): IDGenerator {
  let counter = 0;
  return {
    initialize: vi.fn().mockResolvedValue(undefined),
    getStableId: vi.fn().mockImplementation(() => `id_${counter++}`),
    getFileHash: vi.fn().mockReturnValue('deadbeefcafebabe'),
    saveCache: vi.fn(),
  };
}

describe('Injector with captureStyles flag', () => {
  it('does not attach styleSource when the flag is off (default)', () => {
    const parser = new BabelParser();
    const injector = new DomscribeInjector(parser, createIdGenerator());

    const source = 'const App = () => <div className="p-4 bg-blue-500" />;';
    const result = injector.inject(source, { sourceFile: '/src/App.tsx' });

    expect(result.manifestEntries).toHaveLength(1);
    expect(result.manifestEntries[0].styleSource).toBeUndefined();
  });

  it('attaches className tokens to manifest entries when the flag is on', () => {
    const parser = new BabelParser();
    const injector = new DomscribeInjector(parser, createIdGenerator(), {
      captureStyles: true,
    });

    const source = 'const App = () => <div className="p-4 bg-blue-500" />;';
    const result = injector.inject(source, { sourceFile: '/src/App.tsx' });

    expect(result.manifestEntries).toHaveLength(1);
    const styleSource = result.manifestEntries[0].styleSource;
    expect(styleSource).toBeDefined();
    expect(styleSource?.className).toBe('p-4 bg-blue-500');
    expect(styleSource?.classes).toEqual(['p-4', 'bg-blue-500']);
    expect(styleSource?.cssInJs).toBeUndefined();
  });

  it('walks clsx helpers and emits token union from all static branches', () => {
    const parser = new BabelParser();
    const injector = new DomscribeInjector(parser, createIdGenerator(), {
      captureStyles: true,
    });

    const source = `
      const App = (props) =>
        <button className={clsx("p-4", props.active && "bg-blue-500", "rounded")} />;
    `;
    const result = injector.inject(source, { sourceFile: '/src/App.tsx' });

    const styleSource = result.manifestEntries[0].styleSource;
    expect(styleSource?.classes).toEqual(['p-4', 'bg-blue-500', 'rounded']);
    // Union — not a literal string — so className stays undefined.
    expect(styleSource?.className).toBeUndefined();
  });

  it('links a JSX tag to its locally-declared styled-component source block', () => {
    const parser = new BabelParser();
    const injector = new DomscribeInjector(parser, createIdGenerator(), {
      captureStyles: true,
    });

    const source = [
      "import styled from 'styled-components';",
      'const Card = styled.div`',
      '  padding: 1rem;',
      '  background: white;',
      '`;',
      'const App = () => <Card />;',
    ].join('\n');
    const result = injector.inject(source, { sourceFile: '/src/Card.tsx' });

    const styleSourceForCard = result.manifestEntries.find(
      (e) => e.tagName === 'Card',
    )?.styleSource;
    expect(styleSourceForCard).toBeDefined();
    expect(styleSourceForCard?.cssInJs?.kind).toBe('styled-tag');
    expect(styleSourceForCard?.cssInJs?.library).toBe('styled-components');
    expect(styleSourceForCard?.cssInJs?.blockText).toContain('padding: 1rem');
    expect(styleSourceForCard?.cssInJs?.file).toBe('/src/Card.tsx');
  });

  it('omits styleSource on elements with no className and no styled binding', () => {
    const parser = new BabelParser();
    const injector = new DomscribeInjector(parser, createIdGenerator(), {
      captureStyles: true,
    });

    const source = 'const App = () => <div id="root"><span>hi</span></div>;';
    const result = injector.inject(source, { sourceFile: '/src/App.tsx' });

    // Manifest entries should exist but with no styleSource attached —
    // keeps payloads compact for the common case.
    expect(result.manifestEntries).toHaveLength(2);
    expect(result.manifestEntries[0].styleSource).toBeUndefined();
    expect(result.manifestEntries[1].styleSource).toBeUndefined();
  });

  it('extracts tokens from a no-interpolation template literal', () => {
    const parser = new BabelParser();
    const injector = new DomscribeInjector(parser, createIdGenerator(), {
      captureStyles: true,
    });

    const source = 'const App = () => <div className={`p-4 bg-blue-500`} />;';
    const result = injector.inject(source, { sourceFile: '/src/App.tsx' });

    const styleSource = result.manifestEntries[0].styleSource;
    expect(styleSource?.className).toBe('p-4 bg-blue-500');
    expect(styleSource?.classes).toEqual(['p-4', 'bg-blue-500']);
  });

  it('captures static segments when a template literal has interpolations', () => {
    const parser = new BabelParser();
    const injector = new DomscribeInjector(parser, createIdGenerator(), {
      captureStyles: true,
    });

    const source =
      'const App = (p) => <div className={`p-4 ${p.variant} bg-blue-500`} />;';
    const result = injector.inject(source, { sourceFile: '/src/App.tsx' });

    const styleSource = result.manifestEntries[0].styleSource;
    expect(styleSource?.className).toBeUndefined();
    expect(styleSource?.classes).toEqual(['p-4', 'bg-blue-500']);
  });
});
