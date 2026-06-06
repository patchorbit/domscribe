export type WebMcpToolName =
  | 'web.query_selector'
  | 'web.read_styles'
  | 'web.enumerate_components'
  | 'web.read_props_state'
  | 'web.resolve_annotation';

export interface WebMcpToolDescriptor {
  name: WebMcpToolName;
  description: string;
  inputSchema: Record<string, unknown>;
}

export const WEBMCP_TOOLS: ReadonlyArray<WebMcpToolDescriptor> = [
  {
    name: 'web.query_selector',
    description:
      'Return the live DOM subtree matching a CSS selector. No source-position correlation.',
    inputSchema: {
      type: 'object',
      properties: { selector: { type: 'string' } },
      required: ['selector'],
    },
  },
  {
    name: 'web.read_styles',
    description:
      'Return the computed style for a selector. CSS rule provenance is not exposed.',
    inputSchema: {
      type: 'object',
      properties: { selector: { type: 'string' } },
      required: ['selector'],
    },
  },
  {
    name: 'web.enumerate_components',
    description:
      'Return mounted-component names by walking framework devtools globals. Owning file is not exposed.',
    inputSchema: {
      type: 'object',
      properties: { componentName: { type: 'string' } },
      required: ['componentName'],
    },
  },
  {
    name: 'web.read_props_state',
    description:
      'Return current props/state for a component instance reachable via devtools globals.',
    inputSchema: {
      type: 'object',
      properties: { instancePath: { type: 'string' } },
      required: ['instancePath'],
    },
  },
  {
    name: 'web.resolve_annotation',
    description:
      'Return the DOM node for an annotation captured by a host UI. Source roundtrip is not exposed.',
    inputSchema: {
      type: 'object',
      properties: { annotationId: { type: 'string' } },
      required: ['annotationId'],
    },
  },
];
