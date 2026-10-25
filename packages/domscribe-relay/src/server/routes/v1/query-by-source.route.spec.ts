/**
 * Integration tests for POST /api/v1/manifest/resolve-by-source
 *
 * Uses real ManifestReader backed by temp directories.
 * WSServer is mocked since the test harness doesn't wire WebSocket.
 */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'fs';
import path from 'path';
import { tmpdir } from 'os';
import Fastify, { type FastifyInstance, type FastifyError } from 'fastify';
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
} from '@domscribe/core';
import { ManifestReader } from '@domscribe/manifest';
import { QueryBySourceRoute } from './query-by-source.route.js';
import { registerRoute } from '../route.interface.js';
import type { WSServer } from '../../ws-server.js';
import type { WSContextResponse } from '../../../schema.js';

function createMockWSServer(overrides?: Partial<WSServer>): WSServer {
  return {
    broadcast: vi.fn(),
    getClientCount: vi.fn().mockReturnValue(0),
    requestContext: vi.fn().mockResolvedValue(null),
    requestTargets: vi.fn().mockResolvedValue(null),
    close: vi.fn(),
    ...overrides,
  };
}

function createEntry(
  id: string,
  overrides: Partial<ManifestEntry> = {},
): ManifestEntry {
  return {
    id,
    file: `src/components/${id}.tsx`,
    start: { line: 10, column: 0 },
    tagName: 'div',
    componentName: `Component`,
    ...overrides,
  };
}

describe('POST /api/v1/manifest/resolve-by-source', () => {
  let app: FastifyInstance;
  let manifestReader: ManifestReader;
  let mockWsServer: WSServer;
  let tempDir: string;

  const buttonEntry = createEntry('bTn1bTn1', {
    file: 'src/components/Button.tsx',
    start: { line: 10, column: 4 },
    end: { line: 10, column: 30 },
    tagName: 'button',
    componentName: 'Button',
  });

  const spanEntry = createEntry('sPn1sPn1', {
    file: 'src/components/Button.tsx',
    start: { line: 10, column: 20 },
    tagName: 'span',
    componentName: 'Button',
  });

  const inputEntry = createEntry('iNp1iNp1', {
    file: 'src/components/Input.tsx',
    start: { line: 5, column: 0 },
    tagName: 'input',
    componentName: 'Input',
  });

  beforeAll(async () => {
    // Create isolated temp workspace with manifest
    tempDir = mkdtempSync(path.join(tmpdir(), 'relay-qbs-test-'));
    const manifestDir = path.dirname(path.join(tempDir, PATHS.MANIFEST_FILE));
    mkdirSync(manifestDir, { recursive: true });
    const entries = [buttonEntry, spanEntry, inputEntry];
    writeFileSync(
      path.join(tempDir, PATHS.MANIFEST_FILE),
      entries.map((e) => JSON.stringify(e)).join('\n') + '\n',
    );

    // Create services
    manifestReader = new ManifestReader(tempDir);
    manifestReader.initialize();

    mockWsServer = createMockWSServer();

    // Build Fastify app and register route before ready()
    app = Fastify({ logger: false });
    app.setValidatorCompiler(validatorCompiler);
    app.setSerializerCompiler(serializerCompiler);
    await app.register(cors, { origin: true });

    app.setErrorHandler((error: FastifyError, _request, reply) => {
      const statusCode = error.statusCode ?? HTTP_STATUS.INTERNAL_SERVER_ERROR;
      reply.status(statusCode).send({
        error: error.message,
        code: DomscribeErrorCode.DS_INTERNAL_ERROR,
        statusCode,
      });
    });

    registerRoute(QueryBySourceRoute, {
      app,
      manifestReader,
      wsServer: mockWsServer,
    });

    await app.ready();
  });

  afterAll(() => {
    manifestReader.close();
    app.close();
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('should find an entry by exact file and line', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/manifest/resolve-by-source',
      payload: {
        file: 'src/components/Input.tsx',
        line: 5,
        includeRuntime: false,
      },
    });

    expect(response.statusCode).toBe(200);

    const body = response.json();
    expect(body.found).toBe(true);
    expect(body.entryId).toBe('iNp1iNp1');
    expect(body.sourceLocation.file).toBe('src/components/Input.tsx');
    expect(body.sourceLocation.tagName).toBe('input');
    expect(body.sourceLocation.componentName).toBe('Input');
  });

  it('should pick closest column when multiple entries share a line', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/manifest/resolve-by-source',
      payload: {
        file: 'src/components/Button.tsx',
        line: 10,
        column: 5,
        includeRuntime: false,
      },
    });

    expect(response.statusCode).toBe(200);

    const body = response.json();
    expect(body.found).toBe(true);
    expect(body.entryId).toBe('bTn1bTn1');
  });

  it('should return found:false when no entry matches', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/manifest/resolve-by-source',
      payload: {
        file: 'src/components/Button.tsx',
        line: 999,
        includeRuntime: false,
      },
    });

    expect(response.statusCode).toBe(200);

    const body = response.json();
    expect(body.found).toBe(false);
    expect(body.entryId).toBeUndefined();
    expect(body.sourceLocation).toBeUndefined();
  });

  it('should return found:false for unknown file', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/manifest/resolve-by-source',
      payload: {
        file: 'src/components/DoesNotExist.tsx',
        line: 1,
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().found).toBe(false);
  });

  it('should match within tolerance', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/manifest/resolve-by-source',
      payload: {
        file: 'src/components/Input.tsx',
        line: 7,
        tolerance: 3,
        includeRuntime: false,
      },
    });

    expect(response.statusCode).toBe(200);

    const body = response.json();
    expect(body.found).toBe(true);
    expect(body.entryId).toBe('iNp1iNp1');
  });

  it('should not match outside tolerance', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/manifest/resolve-by-source',
      payload: {
        file: 'src/components/Input.tsx',
        line: 50,
        tolerance: 2,
        includeRuntime: false,
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().found).toBe(false);
  });

  it('should report browserConnected:false when no WS clients', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/manifest/resolve-by-source',
      payload: {
        file: 'src/components/Input.tsx',
        line: 5,
      },
    });

    expect(response.statusCode).toBe(200);

    const body = response.json();
    expect(body.found).toBe(true);
    expect(body.browserConnected).toBe(false);
    expect(body.runtime).toBeUndefined();
  });

  it('should include runtime context when browser is connected', async () => {
    // Arrange
    const wsResponse: WSContextResponse = {
      requestId: 'test-req',
      success: true,
      rendered: true,
      context: {
        componentProps: { label: 'Submit' },
        componentState: { loading: false },
      },
      elementInfo: {
        tagName: 'input',
        attributes: { type: 'text' },
        innerText: '',
      },
    };
    vi.mocked(mockWsServer.getClientCount).mockReturnValue(1);
    vi.mocked(mockWsServer.requestContext).mockResolvedValue(wsResponse);

    // Act
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/manifest/resolve-by-source',
      payload: {
        file: 'src/components/Input.tsx',
        line: 5,
        includeRuntime: true,
      },
    });

    // Assert
    expect(response.statusCode).toBe(200);

    const body = response.json();
    expect(body.found).toBe(true);
    expect(body.browserConnected).toBe(true);
    expect(body.runtime.rendered).toBe(true);
    expect(body.runtime.componentProps).toEqual({ label: 'Submit' });
    expect(body.runtime.componentState).toEqual({ loading: false });
    expect(body.runtime.domSnapshot).toEqual({
      tagName: 'input',
      attributes: { type: 'text' },
      innerText: '',
    });
    expect(mockWsServer.requestContext).toHaveBeenCalledWith('iNp1iNp1');

    // Reset for other tests
    vi.mocked(mockWsServer.getClientCount).mockReturnValue(0);
    vi.mocked(mockWsServer.requestContext).mockResolvedValue(null);
  });

  it('should omit runtime when includeRuntime is false', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/manifest/resolve-by-source',
      payload: {
        file: 'src/components/Input.tsx',
        line: 5,
        includeRuntime: false,
      },
    });

    expect(response.statusCode).toBe(200);

    const body = response.json();
    expect(body.found).toBe(true);
    expect(body.browserConnected).toBeUndefined();
    expect(body.runtime).toBeUndefined();
  });

  it('should return 400 when required fields are missing', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/manifest/resolve-by-source',
      payload: { file: 'src/App.tsx' },
    });

    expect(response.statusCode).toBe(400);
  });
  it('forwards an exact instance and preserves strict selection metadata', async () => {
    vi.mocked(mockWsServer.getClientCount).mockReturnValue(1);
    vi.mocked(mockWsServer.requestContext).mockImplementation(
      async (entryId, _timeout, selection) => ({
        requestId: 'strict-test',
        success: true,
        rendered: true,
        selectionStatus: 'resolved',
        targets: [],
        total: 1,
        context: { componentProps: { customer: selection?.instanceId } },
      }),
    );
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/manifest/resolve-by-source',
      payload: {
        file: 'src/components/Input.tsx',
        line: 5,
        instanceId: 'lyra-instance',
      },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      selectionStatus: 'resolved',
      total: 1,
      runtime: { componentProps: { customer: 'lyra-instance' } },
    });
    vi.mocked(mockWsServer.getClientCount).mockReturnValue(0);
    vi.mocked(mockWsServer.requestContext).mockResolvedValue(null);
  });
});
