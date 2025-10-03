/**
 * Constants and configuration values for Domscribe.
 * @module @domscribe/core/constants
 */

/**
 * Schema version for data structures.
 * Follows semantic versioning (major.minor.patch).
 */
export const SCHEMA_VERSION = '1.0.0';

/**
 * Domscribe system version.
 * Should match package.json version.
 */
export const DOMSCRIBE_VERSION = '0.0.1';

/**
 * API version for HTTP endpoints.
 */
export const API_VERSION = 'v1';

/**
 * Base API paths
 */
export const API_PATHS = {
  // Base path for all API endpoints
  BASE: `/api/${API_VERSION}`,

  // Annotation endpoints
  ANNOTATIONS: `/api/${API_VERSION}/annotations`,
  ANNOTATION_BY_ID: `/api/${API_VERSION}/annotations/:id`,
  ANNOTATION_PROCESS: `/api/${API_VERSION}/annotations/:id/process`,
  ANNOTATION_COMPLETE: `/api/${API_VERSION}/annotations/:id/complete`,
  ANNOTATION_RETRY: `/api/${API_VERSION}/annotations/:id/retry`,
  ANNOTATION_FAIL: `/api/${API_VERSION}/annotations/:id/fail`,
  ANNOTATION_ARCHIVE: `/api/${API_VERSION}/annotations/:id/archive`,

  // Manifest endpoints
  MANIFEST: `/api/${API_VERSION}/manifest`,
  MANIFEST_REBUILD: `/api/${API_VERSION}/manifest/rebuild`,
  MANIFEST_DELTA: `/api/${API_VERSION}/manifest/delta`,
  MANIFEST_SNAPSHOT: `/api/${API_VERSION}/manifest/snapshot`,

  // Resolver endpoint (performance-critical)
  RESOLVE: '/__domscribe/resolve',

  // Health and maintenance
  HEALTH: `/api/${API_VERSION}/health`,
  CACHE_CLEAR: `/api/${API_VERSION}/cache/clear`,
  SCAN_BUNDLE: `/api/${API_VERSION}/scan/bundle`,
} as const;

/**
 * WebSocket event types
 */
export const WS_EVENTS = {
  // Connection events
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  RECONNECT: 'reconnect',
  ERROR: 'error',

  // Annotation events
  ANNOTATION_CREATED: 'annotation:created',
  ANNOTATION_UPDATED: 'annotation:updated',
  ANNOTATION_DELETED: 'annotation:deleted',
  ANNOTATION_STATUS_CHANGE: 'annotation:status',

  // Manifest events
  MANIFEST_UPDATED: 'manifest:updated',
  MANIFEST_DELTA: 'manifest:delta',
  MANIFEST_REBUILT: 'manifest:rebuilt',

  // Overlay events
  OVERLAY_COMMAND: 'overlay:command',
  OVERLAY_STATUS: 'overlay:status',
} as const;

/**
 * MCP (Model Context Protocol) operations
 */
export const MCP_OPERATIONS = {
  // Annotation operations
  LIST_QUEUED_ANNOTATIONS: 'listQueuedAnnotations',
  GET_ANNOTATION: 'getAnnotation',
  PROCESS_ANNOTATION: 'processAnnotation',
  COMPLETE_ANNOTATION: 'completeAnnotation',
  FAIL_ANNOTATION: 'failAnnotation',
  RETRY_ANNOTATION: 'retryAnnotation',

  // Manifest operations (read-only)
  GET_MANIFEST: 'getManifest',
  RESOLVE_ELEMENT: 'resolveElement',
  GET_MANIFEST_DELTA: 'getManifestDelta',
  REBUILD_MANIFEST_INDEX: 'rebuildManifestIndex',
} as const;

/**
 * Canonical MCP tool identifiers
 */
export const MCP_TOOLS = {
  RESOLVE_ELEMENT: 'domscribe.resolve.element',
  CONTEXT_GET: 'domscribe.context.get',
  ANNOTATION_CREATE: 'domscribe.annotation.create',
  ANNOTATION_LIST: 'domscribe.annotation.list',
  ANNOTATION_GET: 'domscribe.annotation.get',
  PATCH_PREVIEW: 'domscribe.patch.preview',
  PATCH_APPLY: 'domscribe.patch.apply',
} as const;

/**
 * Canonical MCP tool identifier type
 */
export type MCPToolId = (typeof MCP_TOOLS)[keyof typeof MCP_TOOLS];

/**
 * Regular expressions for validation and parsing
 */
export const PATTERNS = {
  // Element ID pattern (8 alphanumeric characters)
  ELEMENT_ID: /^[0-9A-HJ-NP-Za-hj-np-z]{8}$/,

  // Annotation ID pattern (ann_<nanoid>_<timestamp>)
  ANNOTATION_ID: /^ann_[0-9A-HJ-NP-Za-hj-np-z]{8}_\d+$/,

  // Namespaced element ID pattern (frameId:elementId)
  NAMESPACED_ID: /^[^:]+:[0-9A-HJ-NP-Za-hj-np-z]{8}$/,
} as const;

/**
 * Default configuration values
 */
export const DEFAULT_CONFIG = {
  // Relay configuration
  RELAY_PORT: 0, // 0 means auto-detect
  RELAY_HOST: '127.0.0.1',
  RELAY_LOG_LEVEL: 'info',

  // Overlay configuration
  OVERLAY_AUTO_INJECT: true,
  OVERLAY_DEBUG_PANEL: false,

  // Performance targets
  RESOLVER_TIMEOUT_MS: 10, // p99 ≤10ms
  HMR_OVERHEAD_MS: 10,
  BUILD_OVERHEAD_PERCENT: 2,
  RELAY_STARTUP_MS: 500,
  RELAY_MAX_MEMORY_MB: 100,

  // WebSocket configuration
  WS_RECONNECT_MIN_DELAY: 1000, // 1s
  WS_RECONNECT_MAX_DELAY: 30000, // 30s
  WS_RECONNECT_MAX_ATTEMPTS: 10,

  // Cache configuration
  CACHE_HIT_TARGET_PERCENT: 90,
  TRANSFORM_CACHE_TTL_MS: 3600000, // 1 hour

  // Annotation limits
  FREE_MAX_ACTIVE_ANNOTATIONS: 50,
} as const;

/**
 * File and directory paths
 */
export const PATHS = {
  // Root directory for Domscribe data
  DOMSCRIBE_DIR: '.domscribe',

  // Subdirectories
  ANNOTATIONS_DIR: '.domscribe/annotations',
  ANNOTATIONS_QUEUED: '.domscribe/annotations/queued',
  ANNOTATIONS_PROCESSING: '.domscribe/annotations/processing',
  ANNOTATIONS_PROCESSED: '.domscribe/annotations/processed',
  ANNOTATIONS_FAILED: '.domscribe/annotations/failed',
  ANNOTATIONS_ARCHIVED: '.domscribe/annotations/archived',

  // Manifest files
  MANIFEST_FILE: '.domscribe/manifest.jsonl',
  MANIFEST_INDEX: '.domscribe/manifest.index.json',
  MANIFEST_SNAPSHOTS: '.domscribe/manifest.snapshots',

  // Cache directories
  TRANSFORM_CACHE: '.domscribe/transform-cache',
  SESSIONS: '.domscribe/sessions',
  AGENT_INSTRUCTIONS: '.domscribe/agent-instructions',

  // Config files
  CONFIG_FILE: 'domscribe.config.ts',
  CONFIG_JS_FILE: 'domscribe.config.js',
  VALIDATION_RECIPE: 'domscribe.validation.yaml',
} as const;

/**
 * HTTP status codes used in the system
 */
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  PAYMENT_REQUIRED: 402,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  NOT_IMPLEMENTED: 501,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504,
} as const;
