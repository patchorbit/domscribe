/**
 * Overlay Interaction E2E Tests
 *
 * Tests the Domscribe overlay UI in a real browser across all fixture apps:
 * - Overlay presence and mode management
 * - Entering capture mode via the overlay UI
 * - Selecting elements and validating captured data-ds, component name,
 *   source location, props, and state — all read from the overlay UI
 *
 * Runs against every buildable fixture with runtime capture support,
 * using framework-specific expectations from the registry.
 *
 * Requires: @playwright/test, dev server running for fixture
 */

import { test, expect, getServer } from './fixtures.js';
import { FixturePage } from './helpers/page-model.js';
import {
  enterOverlayCaptureMode,
  clickElementInCaptureMode,
  exitCaptureMode,
  getOverlayMode,
  expandOverlay,
  selectAndReadContext,
} from './helpers/capture-helpers.js';
import type { PageExpectation } from '../fixtures/_registry/react/18/expectations.js';
import { react18Expectations } from '../fixtures/_registry/react/18/expectations.js';
import { react19Expectations } from '../fixtures/_registry/react/19/expectations.js';
import { vue3Expectations } from '../fixtures/_registry/vue/3/expectations.js';
import { next15Expectations } from '../fixtures/_registry/next/15/expectations.js';
import { nuxt3Expectations } from '../fixtures/_registry/nuxt/3/expectations.js';
import type { DevServerHandle } from './helpers/dev-server.js';
import {
  discoverFixtures,
  isBuildableFixture,
} from '../shared/fixture-registry.js';

// ---------------------------------------------------------------------------
// Expectations map: (framework, majorVersion) → PageExpectation[]
// ---------------------------------------------------------------------------

function getExpectationsForFixture(
  framework: string,
  frameworkVersion: string,
): PageExpectation[] {
  const major = parseInt(frameworkVersion, 10);

  switch (framework) {
    case 'react':
      if (major >= 19) return react19Expectations;
      if (major >= 18) return react18Expectations;
      return [];
    case 'next':
      if (major >= 15) return next15Expectations;
      return [];
    case 'vue':
      if (major >= 3) return vue3Expectations;
      return [];
    case 'nuxt':
      if (major >= 3) return nuxt3Expectations;
      return [];
    default:
      return [];
  }
}

// ---------------------------------------------------------------------------
// Discover all fixtures with overlay/capture support
// ---------------------------------------------------------------------------

const overlayFixtures = discoverFixtures()
  .filter(
    (f) => f.manifest.capabilities.runtimeCapture && isBuildableFixture(f),
  )
  .filter(
    (f) =>
      getExpectationsForFixture(
        f.manifest.framework,
        f.manifest.frameworkVersion,
      ).length > 0,
  );

// ---------------------------------------------------------------------------
// Tests: run for each fixture
// ---------------------------------------------------------------------------

for (const fixture of overlayFixtures) {
  const { id, framework, frameworkVersion } = fixture.manifest;
  const expectations = getExpectationsForFixture(framework, frameworkVersion);

  test.describe(`Overlay: ${id}`, () => {
    let server: DevServerHandle;

    test.beforeAll(async () => {
      server = await getServer(id);
    });

    /**
     * Overlay Interaction basics — presence, expand, capture mode, navigation.
     */
    test.describe('Interaction', () => {
      test('should load the fixture app', async ({ page }) => {
        await page.goto(server.url);
        await page.waitForSelector('.app', { timeout: 10_000 });

        expect(await page.title()).toBeTruthy();
      });

      test('should have the overlay present in collapsed mode', async ({
        page,
      }) => {
        await page.goto(server.url);
        await page.waitForSelector('.app', { timeout: 10_000 });
        await page.waitForSelector('ds-overlay', { timeout: 10_000 });

        const mode = await getOverlayMode(page);

        await page.pause();

        expect(mode).toBe('collapsed');
      });

      test('should expand overlay when tab is clicked', async ({ page }) => {
        await page.goto(server.url);
        await page.waitForSelector('ds-overlay', { timeout: 10_000 });

        const expanded = await expandOverlay(page);
        expect(expanded).toBe(true);

        const mode = await getOverlayMode(page);
        expect(mode).toBe('expanded');
      });

      test('should enter capture mode via overlay UI', async ({ page }) => {
        await page.goto(server.url);
        await page.waitForSelector('ds-overlay', { timeout: 10_000 });

        await expandOverlay(page);
        await page.waitForTimeout(300);

        const entered = await enterOverlayCaptureMode(page);
        expect(entered).toBe(true);

        const mode = await getOverlayMode(page);
        expect(mode).toBe('capturing');

        await exitCaptureMode(page);

        const modeAfter = await getOverlayMode(page);
        expect(modeAfter).not.toBe('capturing');
      });

      test('should navigate through components without errors', async ({
        page,
      }) => {
        await page.goto(server.url);
        await page.waitForSelector('.app', { timeout: 10_000 });

        const fixturePage = new FixturePage(page);
        const errors: string[] = [];
        page.on('pageerror', (err) => errors.push(err.message));

        // Navigate to first 3 expectation pages as a smoke test
        const pageIds = expectations.slice(0, 3).map((e) => e.pageId);
        for (const pageId of pageIds) {
          await fixturePage.navigateToPageId(pageId);
          await page.waitForTimeout(300);
        }

        expect(errors).toEqual([]);
      });
    });

    /**
     * Overlay Element Capture — data-driven from expectations.
     *
     * For each page with expectations, enters capture mode via the overlay UI,
     * selects each element, and validates what the overlay displays.
     */
    test.describe('Element Capture', () => {
      for (const pageExpectation of expectations) {
        test.describe(`Page: ${pageExpectation.navLabel}`, () => {
          for (const elementExp of pageExpectation.elements) {
            test(`should capture correct context for: ${elementExp.label}`, async ({
              page,
            }) => {
              // Fresh page load for each element to avoid stale overlay state
              await page.goto(server.url);
              await page.waitForSelector('.app', { timeout: 10_000 });
              await page.waitForSelector('ds-overlay', { timeout: 10_000 });

              // Navigate to the target page
              const fixturePage = new FixturePage(page);
              await fixturePage.navigateToPageId(pageExpectation.pageId);
              await page.waitForTimeout(500);

              if (elementExp.readySelector) {
                await page.waitForSelector(elementExp.readySelector);
              }

              // Verify the element exists on the page
              const elementHandle = await page.$(elementExp.selector);
              expect(
                elementHandle,
                `Element not found: ${elementExp.selector}`,
              ).toBeTruthy();

              // Validate data-ds attribute is present
              if (elementExp.expectDataDs) {
                const dataDs = await page.evaluate(
                  (sel) => document.querySelector(sel)?.getAttribute('data-ds'),
                  elementExp.selector,
                );
                expect(dataDs, 'Expected data-ds attribute').toBeTruthy();
              }

              // Select element via overlay and read what it displays
              const context = await selectAndReadContext(
                page,
                elementExp.selector,
              );
              expect(
                context,
                `Failed to read overlay context for: ${elementExp.label}`,
              ).toBeTruthy();

              if (!context) return;

              // Validate component name shown in overlay
              if (elementExp.componentName !== null) {
                expect(context.componentName).toBe(elementExp.componentName);
              }

              // Validate data-ds was captured
              if (elementExp.expectDataDs) {
                expect(context.dataDs).toBeTruthy();
              }

              // Validate props keys displayed in overlay
              if (elementExp.expectedPropsKeys?.length) {
                for (const key of elementExp.expectedPropsKeys) {
                  expect(
                    context.props,
                    `Missing prop key in overlay: ${key}`,
                  ).toHaveProperty(key);
                }
              }

              // Validate state keys displayed in overlay
              if (elementExp.expectedStateKeys?.length) {
                const stateKeys = Object.keys(context.state);
                for (const key of elementExp.expectedStateKeys) {
                  expect(
                    stateKeys,
                    `Missing state key in overlay: ${key}`,
                  ).toContain(key);
                }
              }

              // Callback refs measure mounted geometry, which varies with fonts
              // and viewport size. Compare to the actual DOM, not a fixed value.
              for (const [key, selector] of Object.entries(
                elementExp.expectedStateElementHeights ?? {},
              )) {
                const height = await page.evaluate((sel) => {
                  const element = document.querySelector(sel);
                  if (!element)
                    throw new Error(`Measurement element not found: ${sel}`);
                  return element.getBoundingClientRect().height;
                }, selector);
                expect(height).toBeGreaterThan(0);
                expect(Number(context.state[key])).toBeCloseTo(height, 3);
              }

              // Validate state values displayed in overlay
              // Note: overlay displays formatted strings (e.g. '"Alice"', '5')
              // so we compare against the formatted representation
              if (elementExp.expectedState) {
                for (const [key, value] of Object.entries(
                  elementExp.expectedState,
                )) {
                  if (context.state[key] !== undefined) {
                    const displayedValue = context.state[key];
                    const expectedDisplay = formatExpectedValue(value);
                    expect(displayedValue).toBe(expectedDisplay);
                  }
                }
              }
            });
          }
        });
      }
    });

    /**
     * Overlay Capture Mode Flow — end-to-end capture + sidebar verification.
     */
    test.describe('Capture Mode Flow', () => {
      test('should select element via capture mode and show in sidebar', async ({
        page,
      }) => {
        await page.goto(server.url);
        await page.waitForSelector('ds-overlay', { timeout: 10_000 });
        await page.waitForSelector('.app', { timeout: 10_000 });

        // Use the first expectation's first element as the target
        const firstPage = expectations[0];
        const firstElement = firstPage?.elements[0];
        if (!firstElement || !firstPage) return;

        // Navigate to the correct page first
        const fixturePage = new FixturePage(page);
        await fixturePage.navigateToPageId(firstPage.pageId);
        await page.waitForTimeout(500);

        await expandOverlay(page);
        await page.waitForTimeout(300);

        const entered = await enterOverlayCaptureMode(page);
        expect(entered).toBe(true);

        const clicked = await clickElementInCaptureMode(
          page,
          firstElement.selector,
        );
        expect(clicked).toBe(true);

        // After clicking, overlay should exit capture mode and show expanded
        const mode = await getOverlayMode(page);
        expect(mode).toBe('expanded');

        // Verify the element preview appears in the sidebar
        const hasPreview = await page.evaluate(() => {
          const overlay = document.querySelector('ds-overlay');
          if (!overlay?.shadowRoot) return false;

          const sidebar = overlay.shadowRoot.querySelector('ds-sidebar');
          if (!sidebar?.shadowRoot) return false;

          const preview =
            sidebar.shadowRoot.querySelector('ds-element-preview');
          return !!preview;
        });

        expect(hasPreview).toBe(true);
      });

      test('should show captured state in context panel for stateful component', async ({
        page,
      }) => {
        await page.goto(server.url);
        await page.waitForSelector('ds-overlay', { timeout: 10_000 });
        await page.waitForSelector('.app', { timeout: 10_000 });

        // Find a page with stateful elements
        const statefulPage = expectations.find((p) =>
          p.elements.some(
            (e) => e.expectedStateKeys && e.expectedStateKeys.length > 0,
          ),
        );
        if (!statefulPage) return;

        const statefulElement = statefulPage.elements.find(
          (e) => e.expectedStateKeys && e.expectedStateKeys.length > 0,
        );
        if (!statefulElement) return;

        const fixturePage = new FixturePage(page);
        await fixturePage.navigateToPageId(statefulPage.pageId);
        await page.waitForTimeout(500);

        const context = await selectAndReadContext(
          page,
          statefulElement.selector,
        );

        expect(context).toBeTruthy();
        if (!context) return;

        const stateKeys = Object.keys(context.state);
        expect(stateKeys.length).toBeGreaterThan(0);
      });
    });
  });
}

/**
 * Format an expected value the same way ds-context-panel.formatValue() does.
 * This mirrors the overlay's display logic so we can compare.
 */
function formatExpectedValue(value: unknown): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value === 'string') return `"${value}"`;
  if (typeof value === 'function') return '\u0192()';
  if (Array.isArray(value)) return `Array(${value.length})`;
  if (typeof value === 'object') {
    const keys = Object.keys(value as Record<string, unknown>);
    return `{${keys.slice(0, 3).join(', ')}${keys.length > 3 ? '...' : ''}}`;
  }
  return String(value);
}
