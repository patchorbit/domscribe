/**
 * Shared test infrastructure for domscribe-relay integration tests.
 *
 * Creates a real Fastify server backed by real services writing to
 * temp directories — no mocking. Each test suite gets its own
 * isolated workspace via `createTestServer()`.
 */
import { expect } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync } from 'fs';
import path from 'path';
import { tmpdir } from 'os';
import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import {
  serializerCompiler,
  validatorCompiler,
} from 'fastify-type-provider-zod';
import {
  HTTP_STATUS,
  DomscribeErrorCode,
  PATHS,
  type ManifestEntry,
  type Annotation,
} from '@domscribe/core';
import { RELAY_VERSION } from '../../version.js';
import { ManifestReader } from '@domscribe/manifest';
import { AnnotationService } from '../services/annotation-service.js';
import { FileAnnotationStorage } from '../services/storage/index.js';
import {
  registerHealthHandler,
  registerStatusHandler,
  registerManifestHandlers,
  registerAnnotationHandlers,
} from '../handlers/index.js';
import type { FastifyError } from 'fastify';

/**
 * A running test server with real services and a temp workspace.
 */
export interface TestServer {
  app: FastifyInstance;
  manifestReader: ManifestReader;
  annotationService: AnnotationService;
  tempDir: string;
}

export interface CreateTestServerOptions {
  manifestEntries?: ManifestEntry[];
  port?: number;
  startTime?: number;
}

/**
 * Create a fully wired Fastify server with real services on a temp workspace.
 * Mirrors the composition in http-server.ts but uses inject() instead of binding a port.
 */
export async function createTestServer(
  options: CreateTestServerOptions = {},
): Promise<TestServer> {
  const { manifestEntries = [], port = 4318, startTime = Date.now() } = options;

  // Create isolated temp workspace
  const tempDir = mkdtempSync(path.join(tmpdir(), 'relay-test-'));

  // Seed manifest if entries provided
  if (manifestEntries.length > 0) {
    seedManifest(tempDir, manifestEntries);
  } else {
    // Ensure .domscribe dir exists even without manifest
    mkdirSync(path.join(tempDir, PATHS.DOMSCRIBE_DIR), { recursive: true });
  }

  // Create real services
  const manifestReader = new ManifestReader(tempDir);
  const annotationStorage = new FileAnnotationStorage(
    path.join(tempDir, PATHS.ANNOTATIONS_DIR),
  );
  const annotationService = new AnnotationService(annotationStorage);

  // Initialize services (creates status dirs, loads manifest)
  await annotationService.initialize();
  manifestReader.initialize();

  // Build Fastify app with same wiring as http-server.ts
  const app = Fastify({ bodyLimit: 10 * 1024 * 1024, logger: false });
  app.decorate('nonce', 'test-nonce');
  app.decorate('relayVersion', RELAY_VERSION);
  app.decorate('workspaceRoot', tempDir);
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  await app.register(cors, {
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  });

  // Register all handlers
  registerHealthHandler(app, manifestReader, annotationService);
  registerStatusHandler(app, manifestReader, annotationService, {
    port,
    startTime,
  });
  registerManifestHandlers(app, manifestReader);
  registerAnnotationHandlers(app, annotationService, manifestReader);

  // Error handler (same as http-server.ts)
  app.setErrorHandler((error: FastifyError, _request, reply) => {
    const statusCode = error.statusCode ?? HTTP_STATUS.INTERNAL_SERVER_ERROR;
    reply.status(statusCode).send({
      error: error.message,
      code: DomscribeErrorCode.DS_INTERNAL_ERROR,
      statusCode,
    });
  });

  // Ensure Fastify is ready
  await app.ready();

  return { app, manifestReader, annotationService, tempDir };
}

/**
 * Clean up a test server: close services, remove temp directory.
 */
export function cleanupTestServer(server: TestServer): void {
  server.manifestReader.close();
  server.app.close();
  rmSync(server.tempDir, { recursive: true, force: true });
}

// ---------------------------------------------------------------------------
// Seeding Utilities
// ---------------------------------------------------------------------------

/**
 * Write manifest entries as JSONL to the temp workspace.
 */
export function seedManifest(tempDir: string, entries: ManifestEntry[]): void {
  const manifestDir = path.dirname(path.join(tempDir, PATHS.MANIFEST_FILE));
  mkdirSync(manifestDir, { recursive: true });

  const jsonl = entries.map((e) => JSON.stringify(e)).join('\n') + '\n';
  writeFileSync(path.join(tempDir, PATHS.MANIFEST_FILE), jsonl);
}

/**
 * Write an annotation JSON file to the appropriate status subdirectory.
 */
export function seedAnnotation(tempDir: string, annotation: Annotation): void {
  const status = annotation.metadata.status;
  const dir = path.join(tempDir, PATHS.DOMSCRIBE_DIR, 'annotations', status);
  mkdirSync(dir, { recursive: true });

  const filePath = path.join(dir, `${annotation.metadata.id}.json`);
  writeFileSync(filePath, JSON.stringify(annotation, null, 2));
}

// ---------------------------------------------------------------------------
// Fixture Factories
// ---------------------------------------------------------------------------

let entryCounter = 0;

/**
 * Create a valid ManifestEntry with sensible defaults.
 */
export function createManifestEntry(
  overrides: Partial<ManifestEntry> = {},
): ManifestEntry {
  entryCounter++;
  const padded = String(entryCounter).padStart(8, 'a');
  // Ensure valid 8-char ID matching /^[0-9A-HJ-NP-Za-hj-np-z]{8}$/
  const defaultId = padded.slice(0, 8);

  return {
    id: defaultId,
    file: `src/components/Component${entryCounter}.tsx`,
    start: { line: entryCounter * 10, column: 0 },
    tagName: 'div',
    componentName: `Component${entryCounter}`,
    ...overrides,
  };
}

/**
 * Create a valid annotation creation request body.
 */
export function createAnnotationInput(
  overrides: Partial<{
    mode: string;
    userMessage: string;
    dataDs: string;
    tagName: string;
    selector: string;
  }> = {},
): Record<string, unknown> {
  return {
    mode: overrides.mode ?? 'element-click',
    interaction: {
      type: 'element-annotation',
      selectedElement: {
        tagName: overrides.tagName ?? 'button',
        selector: overrides.selector ?? 'body > div > button',
        dataDs: overrides.dataDs,
        attributes: { class: 'btn-primary' },
        innerText: 'Click me',
      },
    },
    context: {
      pageUrl: 'http://localhost:3000',
      pageTitle: 'Test Page',
      viewport: { width: 1920, height: 1080 },
      userAgent: 'TestAgent/1.0',
      userMessage: overrides.userMessage ?? 'Make this button red',
    },
  };
}

// ---------------------------------------------------------------------------
// Assertion Helpers
// ---------------------------------------------------------------------------

/**
 * Assert HTTP status code with self-documenting failure messages.
 *
 * On mismatch, the assertion error automatically includes the full
 * response body so you can diagnose failures without adding console.log.
 */
export function expectStatus(
  response: { statusCode: number; json: () => unknown; body: string },
  expected: number,
): void {
  if (response.statusCode !== expected) {
    let bodyText: string;
    try {
      bodyText = JSON.stringify(response.json(), null, 2);
    } catch {
      bodyText = response.body;
    }
    expect.fail(
      `Expected status ${expected}, got ${response.statusCode}\n` +
        `Response body:\n${bodyText}`,
    );
  }
}

/**
 * POST an annotation via inject(), assert 201, return the parsed body.
 *
 * Wraps the common create-and-assert pattern so every call site gets
 * a clear error if creation fails (e.g. schema validation).
 */
export async function createAnnotationViaAPI(
  server: TestServer,
  overrides: Parameters<typeof createAnnotationInput>[0] = {},
): Promise<Record<string, unknown>> {
  const input = createAnnotationInput(overrides);
  const response = await server.app.inject({
    method: 'POST',
    url: '/api/v1/annotations',
    payload: input,
  });
  expectStatus(response, 201);
  return response.json() as Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Filesystem Helpers
// ---------------------------------------------------------------------------

/**
 * Check if an annotation file exists on disk for a given status.
 */
export function annotationExistsOnDisk(
  tempDir: string,
  id: string,
  status: string,
): boolean {
  const filePath = path.join(
    tempDir,
    PATHS.DOMSCRIBE_DIR,
    'annotations',
    status,
    `${id}.json`,
  );
  return existsSync(filePath);
}
