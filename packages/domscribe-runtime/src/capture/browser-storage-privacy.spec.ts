/** @vitest-environment jsdom */
import { afterEach, describe, expect, it } from 'vitest';
import { PropsCapturer } from './props-capturer.js';
import { StateCapturer } from './state-capturer.js';

afterEach(() => localStorage.clear());
describe.each(['props', 'state'] as const)(
  '%s injected browser storage',
  (kind) => {
    it('does not enumerate browser storage reachable through an application service', () => {
      localStorage.setItem(
        'unrelated-app-state',
        JSON.stringify({ clientSecret: 'private-storage-fixture' }),
      );
      class FixtureService {
        storage = localStorage;
      }
      const adapter = {
        name: 'fixture',
        getComponentInstance: () => ({}),
        captureProps: () => ({ service: new FixtureService() }),
        captureState: () => ({ service: new FixtureService() }),
      };
      const result =
        kind === 'props'
          ? new PropsCapturer(adapter).capture({})
          : new StateCapturer(adapter).capture({});
      expect(result.success).toBe(true);
      expect(result.data).toMatchObject({
        service: { storage: '[REDACTED_STORAGE]' },
      });
      expect(JSON.stringify(result.data)).not.toContain(
        'private-storage-fixture',
      );
      expect(localStorage.getItem('unrelated-app-state')).toContain(
        'private-storage-fixture',
      );
    });
  },
);
