import { describe, it, expect } from 'vitest';
import { existsSync } from 'fs';
import { join } from 'path';

describe('Test Fixtures Setup Validation', () => {
  describe('Package Structure', () => {
    it('should have kitchen-sink-react components', () => {
      const kitchenSinkPath = join(__dirname, '../shared/kitchen-sink-react');
      expect(existsSync(kitchenSinkPath)).toBe(true);
    });

    it('should have test-utils', () => {
      const testUtilsPath = join(__dirname, '../shared/test-utils');
      expect(existsSync(testUtilsPath)).toBe(true);
    });

    it('should have fixture templates', () => {
      const templatesPath = join(__dirname, '../fixtures/_templates');
      expect(existsSync(templatesPath)).toBe(true);
      expect(existsSync(join(templatesPath, 'vite-react.template'))).toBe(true);
      expect(existsSync(join(templatesPath, 'webpack-react.template'))).toBe(
        true,
      );
    });

    it('should have vite v5 fixtures', () => {
      const viteV5Path = join(__dirname, '../fixtures/vite/v5');
      expect(existsSync(join(viteV5Path, 'react-18-ts'))).toBe(true);
      expect(existsSync(join(viteV5Path, 'react-18-js'))).toBe(true);
    });

    it('should have webpack v5 fixtures', () => {
      const webpackV5Path = join(__dirname, '../fixtures/webpack/v5');
      expect(existsSync(join(webpackV5Path, 'react-18-ts'))).toBe(true);
    });
  });

  describe('Kitchen-Sink Components', () => {
    it('should export all 14 React components', async () => {
      const components = await import('../shared/kitchen-sink-react');

      expect(components.BasicElements).toBeDefined();
      expect(components.SelfClosing).toBeDefined();
      expect(components.Fragments).toBeDefined();
      expect(components.Lists).toBeDefined();
      expect(components.ConditionalRendering).toBeDefined();
      expect(components.DeeplyNested).toBeDefined();
      expect(components.MemberExpressions).toBeDefined();
      expect(components.EventHandlers).toBeDefined();
      expect(components.HOCs).toBeDefined();
      expect(components.RenderProps).toBeDefined();
      expect(components.Memo).toBeDefined();
      expect(components.DynamicContent).toBeDefined();
      expect(components.TypeScriptFeatures).toBeDefined();
      expect(components.EdgeCases).toBeDefined();
    });
  });

  describe('Test Utilities', () => {
    it('should export fixture runner', async () => {
      const { buildFixture, getFixtureConfig } = await import(
        '../shared/test-utils/fixture-runner'
      );

      expect(buildFixture).toBeDefined();
      expect(typeof buildFixture).toBe('function');
      expect(getFixtureConfig).toBeDefined();
      expect(typeof getFixtureConfig).toBe('function');
    });

    it('should export manifest parser', async () => {
      const {
        readManifest,
        validateManifestSchema,
        validateManifestIntegrity,
      } = await import('../shared/test-utils/manifest-parser');

      expect(readManifest).toBeDefined();
      expect(validateManifestSchema).toBeDefined();
      expect(validateManifestIntegrity).toBeDefined();
    });

    it('should export bundle analyzer', async () => {
      const { parseBundle, validateProductionStrip, getBundleStats } =
        await import('../shared/test-utils/bundle-analyzer');

      expect(parseBundle).toBeDefined();
      expect(validateProductionStrip).toBeDefined();
      expect(getBundleStats).toBeDefined();
    });

    it('should export performance utils', async () => {
      const {
        measureAverageBuildTime,
        calculateOverhead,
        performanceAssertions,
      } = await import('../shared/test-utils/performance-utils');

      expect(measureAverageBuildTime).toBeDefined();
      expect(calculateOverhead).toBeDefined();
      expect(performanceAssertions).toBeDefined();
    });
  });
});
