import { describe, expect, it, vi } from 'vitest';
import { WebMcpReferenceServer } from './server.js';

describe('WebMcpReferenceServer', () => {
  it('lists exactly the five WebMCP tool surfaces (S1–S5 mapping)', () => {
    const server = new WebMcpReferenceServer({ evaluate: vi.fn() });
    expect(server.listTools()).toEqual([
      'web.query_selector',
      'web.read_styles',
      'web.enumerate_components',
      'web.read_props_state',
      'web.resolve_annotation',
    ]);
  });

  it('refuses S5 annotation→source roundtrip (the gap RCP v1 closes)', async () => {
    const server = new WebMcpReferenceServer({ evaluate: vi.fn() });
    const result = await server.query({
      tool: 'web.resolve_annotation',
      arguments: { annotationId: 'a-1' },
    });
    expect(result.ok).toBe(false);
    expect(result.refusal).toMatch(/source roundtrip/);
  });

  it('refuses S4 props/state introspection (devtools-required gap)', async () => {
    const server = new WebMcpReferenceServer({ evaluate: vi.fn() });
    const result = await server.query({
      tool: 'web.read_props_state',
      arguments: { instancePath: 'App.Button[0]' },
    });
    expect(result.ok).toBe(false);
    expect(result.refusal).toMatch(/props\/state/);
  });

  it('S1 returns the outerHTML when the selector matches', async () => {
    const evaluate = vi.fn().mockResolvedValue('<button>ok</button>');
    const server = new WebMcpReferenceServer({ evaluate });
    const result = await server.query({
      tool: 'web.query_selector',
      arguments: { selector: 'button' },
    });
    expect(result.ok).toBe(true);
    expect(result.value).toBe('<button>ok</button>');
  });

  it('S1 reports not-found when the selector matches nothing', async () => {
    const evaluate = vi.fn().mockResolvedValue(null);
    const server = new WebMcpReferenceServer({ evaluate });
    const result = await server.query({
      tool: 'web.query_selector',
      arguments: { selector: '.missing' },
    });
    expect(result.ok).toBe(false);
  });

  it('S1 refuses when selector is missing', async () => {
    const server = new WebMcpReferenceServer({ evaluate: vi.fn() });
    const result = await server.query({
      tool: 'web.query_selector',
      arguments: {},
    });
    expect(result.ok).toBe(false);
    expect(result.refusal).toMatch(/missing selector/);
  });

  it('S3 explicitly reports sourcePositionExposed=false (the falsifiable gap)', async () => {
    const evaluate = vi.fn().mockResolvedValue({
      componentName: 'Button',
      devtoolsPresent: true,
      sourcePositionExposed: false,
    });
    const server = new WebMcpReferenceServer({ evaluate });
    const result = await server.query({
      tool: 'web.enumerate_components',
      arguments: { componentName: 'Button' },
    });
    expect(result.ok).toBe(true);
    expect(
      (result.value as { sourcePositionExposed: boolean })
        .sourcePositionExposed,
    ).toBe(false);
  });
});
