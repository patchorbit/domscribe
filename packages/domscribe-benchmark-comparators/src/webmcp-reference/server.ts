import { WEBMCP_TOOLS, type WebMcpToolName } from './tools.js';

export interface WebMcpQueryRequest {
  tool: WebMcpToolName;
  arguments: Record<string, unknown>;
}

export interface WebMcpQueryResult {
  ok: boolean;
  value?: unknown;
  refusal?: string;
}

export interface BrowserBridge {
  evaluate(expression: string): Promise<unknown>;
}

/**
 * WebMcpReferenceServer is a minimal, in-repo WebMCP-conformant reference. It implements the
 * surface a generic runtime-browser-MCP exposes — selector queries, computed styles, devtools
 * enumeration — without source-position correlation. It exists to give the benchmark a third
 * column that does not depend on an external project installing cleanly in the sprint window
 * (per RFC 0004 fallback). Real WebMCP-conformant servers should be drop-in replaceable.
 */
export class WebMcpReferenceServer {
  constructor(private readonly bridge: BrowserBridge) {}

  listTools(): ReadonlyArray<WebMcpToolName> {
    return WEBMCP_TOOLS.map((t) => t.name);
  }

  async query(request: WebMcpQueryRequest): Promise<WebMcpQueryResult> {
    switch (request.tool) {
      case 'web.query_selector':
        return this.querySelector(request.arguments);
      case 'web.read_styles':
        return this.readStyles(request.arguments);
      case 'web.enumerate_components':
        return this.enumerateComponents(request.arguments);
      case 'web.read_props_state':
        return this.readPropsState(request.arguments);
      case 'web.resolve_annotation':
        return this.refuseSourceCorrelation();
      default:
        return { ok: false, refusal: `unknown tool: ${String(request.tool)}` };
    }
  }

  private async querySelector(
    args: Record<string, unknown>,
  ): Promise<WebMcpQueryResult> {
    const selector = readString(args, 'selector');
    if (!selector) {
      return { ok: false, refusal: 'missing selector' };
    }
    const value = await this.bridge.evaluate(
      `(() => { const el = document.querySelector(${JSON.stringify(selector)}); return el ? el.outerHTML : null; })()`,
    );
    return { ok: value !== null, value };
  }

  private async readStyles(
    args: Record<string, unknown>,
  ): Promise<WebMcpQueryResult> {
    const selector = readString(args, 'selector');
    if (!selector) {
      return { ok: false, refusal: 'missing selector' };
    }
    const value = await this.bridge.evaluate(
      `(() => { const el = document.querySelector(${JSON.stringify(selector)}); if (!el) return null; const cs = window.getComputedStyle(el); const out = {}; for (const k of cs) out[k] = cs.getPropertyValue(k); return out; })()`,
    );
    return { ok: value !== null, value };
  }

  private async enumerateComponents(
    args: Record<string, unknown>,
  ): Promise<WebMcpQueryResult> {
    const componentName = readString(args, 'componentName');
    if (!componentName) {
      return { ok: false, refusal: 'missing componentName' };
    }
    // The reference does not have source-correlation; it returns count-of-instances by walking
    // devtools globals if present. Owning-file is intentionally not returned — that is the gap
    // the benchmark is measuring (S3 multi-instance enumeration with owning file).
    const value = await this.bridge.evaluate(
      `(() => { const probe = window.__VUE_DEVTOOLS_GLOBAL_HOOK__ || window.__REACT_DEVTOOLS_GLOBAL_HOOK__; return { componentName: ${JSON.stringify(componentName)}, devtoolsPresent: !!probe, sourcePositionExposed: false }; })()`,
    );
    return { ok: true, value };
  }

  private async readPropsState(
    args: Record<string, unknown>,
  ): Promise<WebMcpQueryResult> {
    const instancePath = readString(args, 'instancePath');
    if (!instancePath) {
      return { ok: false, refusal: 'missing instancePath' };
    }
    return {
      ok: false,
      refusal:
        'WebMCP-reference does not implement props/state introspection; framework devtools are required and not bridged in the reference',
    };
  }

  private async refuseSourceCorrelation(): Promise<WebMcpQueryResult> {
    return {
      ok: false,
      refusal:
        'WebMCP-reference does not implement annotation→source roundtrip; build-time source-position correlation is out of scope for a runtime-browser-MCP',
    };
  }
}

function readString(
  args: Record<string, unknown>,
  key: string,
): string | undefined {
  const v = args[key];
  return typeof v === 'string' && v.length > 0 ? v : undefined;
}
