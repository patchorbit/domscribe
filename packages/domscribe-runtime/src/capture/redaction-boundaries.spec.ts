import { describe, expect, it } from 'vitest';
import type { FrameworkAdapter } from '../adapters/adapter.interface.js';
import { PropsCapturer } from './props-capturer.js';
import { StateCapturer } from './state-capturer.js';

// Real serializer + redaction: truncation must not erase a secret marker after
// a payload has already been retained. Both framework capture paths use these.
describe.each(['props', 'state'] as const)(
  '%s marked-record privacy',
  (kind) => {
    function capture(data: Record<string, unknown>, options = {}) {
      const adapter: FrameworkAdapter = {
        name: 'fixture',
        getComponentInstance: () => data,
        captureProps: () => data,
        captureState: () => data,
      };
      return kind === 'props'
        ? new PropsCapturer(adapter, options).capture({})
        : new StateCapturer(adapter, options).capture({});
    }
    it.each([{ maxProperties: 1 }, { maxTotalBytes: 1 }, {}])(
      'redacts a payload preceding its marker under %j',
      (options) => {
        const record = {
          arbitraryPayload: 'private-marked-fixture',
          ...Object.fromEntries(
            Array.from({ length: 55 }, (_, i) => [`filler${i}`, i]),
          ),
          secret: true,
        };
        const result = capture({ envs: [record] }, options);
        expect(result.success).toBe(true);
        expect(JSON.stringify(result.data)).not.toContain(
          'private-marked-fixture',
        );
        expect(result.data).toMatchObject({ envs: ['[REDACTED]'] });
      },
    );
    it.each([{ maxProperties: 1 }, { maxTotalBytes: 1 }, {}])(
      'redacts credential field descriptors before truncation under %j',
      (options) => {
        const record = {
          ref: 'private-descriptor-fixture',
          ...Object.fromEntries(
            Array.from({ length: 55 }, (_, i) => [`filler${i}`, i]),
          ),
          id: 'clientSecret',
        };
        const result = capture({ fields: [record] }, options);
        expect(result.success).toBe(true);
        expect(JSON.stringify(result.data)).not.toContain(
          'private-descriptor-fixture',
        );
        expect(result.data).toMatchObject({ fields: ['[REDACTED]'] });
      },
    );
    it('does not invoke non-enumerable type-tag accessors while probing storage', () => {
      const service = { count: 7 };
      Object.defineProperty(service, Symbol.toStringTag, {
        get() {
          throw new Error('must not execute during capture');
        },
      });
      const result = capture({ service });
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ service: { count: 7 } });
    });
    it('handles a marked cyclic record before walking its properties', () => {
      const record: Record<string, unknown> = {
        payload: 'private-cyclic-fixture',
        secret: true,
      };
      record.self = record;
      expect(capture({ envs: [record] }).data).toEqual({
        envs: ['[REDACTED]'],
      });
    });
    it('preserves the explicit redaction opt-out', () => {
      const result = capture(
        { envs: [{ payload: 'local-debug-fixture', secret: true }] },
        { redactPII: false },
      );
      expect(result.data).toMatchObject({
        envs: [{ payload: 'local-debug-fixture', secret: true }],
      });
    });
  },
);
