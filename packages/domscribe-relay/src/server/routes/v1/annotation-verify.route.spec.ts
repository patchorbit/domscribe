/**
 * Integration tests for POST /api/v1/annotations/:id/verify
 *
 * Exercises the full annotation -> respond -> verify chain through the
 * real AnnotationService + the lifted @domscribe/verify comparator.
 *
 * One scenario uses the RFC 0001 styling-fixture annotation "A001" as the
 * shape of a real pre/post-edit capture (padding 16px -> 32px). Cross-
 * package fixture bytes don't load at unit-test time, so we model the
 * fixture annotation here as the agent would observe it through the
 * runtime StyleCapturer.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  createTestServer,
  cleanupTestServer,
  expectStatus,
  type TestServer,
} from '../../__test-utils__/setup.js';

const fixtureA001Pre = {
  componentStyles: {
    computed: {
      padding: '16px',
      display: 'flex',
      'background-color': 'rgb(255, 255, 255)',
    },
  },
  boundingRect: {
    x: 100,
    y: 100,
    width: 320,
    height: 80,
    top: 100,
    right: 420,
    bottom: 180,
    left: 100,
  },
};

const fixtureA001PostMatch = {
  componentStyles: {
    computed: {
      padding: '32px',
      display: 'flex',
      'background-color': 'rgb(255, 255, 255)',
    },
  },
  boundingRect: {
    x: 100,
    y: 100,
    width: 352,
    height: 112,
    top: 100,
    right: 452,
    bottom: 212,
    left: 100,
  },
};

const fixtureA001PostNoChange = {
  componentStyles: fixtureA001Pre.componentStyles,
  boundingRect: fixtureA001Pre.boundingRect,
};

const annotationInputWithPreCapture = {
  mode: 'element-click',
  interaction: {
    type: 'element-annotation',
    selectedElement: {
      tagName: 'div',
      selector: 'body > div > [data-testid="A001"]',
      attributes: { 'data-testid': 'A001' },
      innerText: 'A001 card',
    },
    boundingRect: fixtureA001Pre.boundingRect,
  },
  context: {
    pageUrl: 'http://localhost:4801/#A001/before',
    pageTitle: 'tailwind-app',
    viewport: { width: 800, height: 600 },
    userAgent: 'TestAgent/1.0',
    userMessage:
      'Card padding is too cramped. Bump it to 32px (Tailwind p-8) to match the spacious card style used elsewhere on the page.',
    runtimeContext: {
      componentStyles: fixtureA001Pre.componentStyles,
    },
  },
};

describe('POST /api/v1/annotations/:id/verify', () => {
  let server: TestServer;

  beforeAll(async () => {
    server = await createTestServer();
  });

  afterAll(() => {
    cleanupTestServer(server);
  });

  it('completes the annotation -> respond -> verify chain on an RFC 0001 styling fixture', async () => {
    const createResp = await server.app.inject({
      method: 'POST',
      url: '/api/v1/annotations',
      payload: annotationInputWithPreCapture,
    });
    expectStatus(createResp, 201);
    const id = createResp.json().metadata.id;

    await server.app.inject({
      method: 'PUT',
      url: `/api/v1/annotations/${id}/status`,
      payload: { status: 'processing' },
    });
    const respondResp = await server.app.inject({
      method: 'PUT',
      url: `/api/v1/annotations/${id}/response`,
      payload: { message: 'Replaced p-4 with p-8 on the card container.' },
    });
    expectStatus(respondResp, 200);

    const verifyResp = await server.app.inject({
      method: 'POST',
      url: `/api/v1/annotations/${id}/verify`,
      payload: {
        postEdit: {
          componentStyles: fixtureA001PostMatch.componentStyles,
          boundingRect: fixtureA001PostMatch.boundingRect,
          screenshotRef: `blob://post-edit/${id}/a001`,
        },
      },
    });

    expectStatus(verifyResp, 200);
    const body = verifyResp.json();

    expect(body.success).toBe(true);
    expect(body.annotationId).toBe(id);
    // No screenshot bytes are supplied (only a ref) so the pixel-diff axis
    // is inactive — verdict is "partial" until the overlay wires the
    // ScreenshotCapturer through the blob endpoint (deferred follow-up).
    expect(body.result.verdict).toBe('partial');
    expect(body.result.componentStylesDelta).toEqual({
      padding: ['16px', '32px'],
    });
    expect(body.result.boundingRectDelta).toEqual({
      width: [320, 352],
      height: [80, 112],
      right: [420, 452],
      bottom: [180, 212],
    });
    expect(body.result.screenshotRef).toBe(`blob://post-edit/${id}/a001`);
  });

  it('reports no_change when the post-edit capture is indistinguishable from the baseline', async () => {
    const createResp = await server.app.inject({
      method: 'POST',
      url: '/api/v1/annotations',
      payload: annotationInputWithPreCapture,
    });
    const id = createResp.json().metadata.id;

    await server.app.inject({
      method: 'PUT',
      url: `/api/v1/annotations/${id}/status`,
      payload: { status: 'processing' },
    });

    const verifyResp = await server.app.inject({
      method: 'POST',
      url: `/api/v1/annotations/${id}/verify`,
      payload: { postEdit: fixtureA001PostNoChange },
    });

    expectStatus(verifyResp, 200);
    expect(verifyResp.json().result.verdict).toBe('no_change');
  });

  it('appends to verifyHistory so multiple verify calls accumulate', async () => {
    const createResp = await server.app.inject({
      method: 'POST',
      url: '/api/v1/annotations',
      payload: annotationInputWithPreCapture,
    });
    const id = createResp.json().metadata.id;

    await server.app.inject({
      method: 'POST',
      url: `/api/v1/annotations/${id}/verify`,
      payload: { postEdit: fixtureA001PostNoChange },
    });
    await server.app.inject({
      method: 'POST',
      url: `/api/v1/annotations/${id}/verify`,
      payload: { postEdit: fixtureA001PostMatch },
    });

    const getResp = await server.app.inject({
      method: 'GET',
      url: `/api/v1/annotations/${id}`,
    });
    const annotation = getResp.json();
    expect(annotation.verifyHistory).toHaveLength(2);
    expect(annotation.verifyHistory[0].verdict).toBe('no_change');
    expect(annotation.verifyHistory[1].verdict).toBe('partial');
  });

  it('does NOT gate the lifecycle — updateStatus accepts PROCESSED with or without a verify call', async () => {
    const createResp = await server.app.inject({
      method: 'POST',
      url: '/api/v1/annotations',
      payload: annotationInputWithPreCapture,
    });
    const id = createResp.json().metadata.id;

    await server.app.inject({
      method: 'PUT',
      url: `/api/v1/annotations/${id}/status`,
      payload: { status: 'processing' },
    });
    await server.app.inject({
      method: 'PUT',
      url: `/api/v1/annotations/${id}/response`,
      payload: { message: 'Skipped verify on purpose.' },
    });

    const updateResp = await server.app.inject({
      method: 'PUT',
      url: `/api/v1/annotations/${id}/status`,
      payload: { status: 'processed' },
    });

    expectStatus(updateResp, 200);
  });

  it('NEVER inlines screenshot bytes — the stored VerifyResult is small even with a long screenshotRef', async () => {
    const createResp = await server.app.inject({
      method: 'POST',
      url: '/api/v1/annotations',
      payload: annotationInputWithPreCapture,
    });
    const id = createResp.json().metadata.id;

    const longRef = 'blob://post-edit/' + 'x'.repeat(96);
    await server.app.inject({
      method: 'POST',
      url: `/api/v1/annotations/${id}/verify`,
      payload: {
        postEdit: { ...fixtureA001PostNoChange, screenshotRef: longRef },
      },
    });

    const getResp = await server.app.inject({
      method: 'GET',
      url: `/api/v1/annotations/${id}`,
    });
    const annotation = getResp.json();
    const serialized = JSON.stringify(annotation);
    expect(serialized).toContain(longRef);
    expect(serialized).not.toMatch(/base64/i);
    expect(serialized).not.toMatch(/data:image/i);
    expect(serialized.length).toBeLessThan(8 * 1024);
  });

  it('returns 404 for a nonexistent annotation id', async () => {
    const response = await server.app.inject({
      method: 'POST',
      url: '/api/v1/annotations/ann_zzzzzzzz_0/verify',
      payload: { postEdit: fixtureA001PostNoChange },
    });

    expectStatus(response, 404);
    expect(response.json().code).toBe('DS_ANNOTATION_NOTFOUND');
  });
});
