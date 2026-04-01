import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { NextConfig } from 'next';
import type { WebpackConfigContext } from 'next/dist/server/config-shared.js';
import { withDomscribe, type WebpackConfig } from './with-domscribe.js';

// Mock createRequire so we can control resolve behavior
vi.mock('node:module', () => ({
  createRequire: () => {
    const req = Object.assign(() => ({}), {
      resolve: (specifier: string) => `/resolved/${specifier}`,
    });
    return req;
  },
}));

function createMockWebpackConfig(
  overrides?: Partial<WebpackConfig>,
): WebpackConfig {
  return {
    module: { rules: [] },
    plugins: [],
    resolve: { alias: {} },
    ...overrides,
  };
}

function createMockWebpackContext(): WebpackConfigContext {
  return {
    dir: '/app',
    dev: true,
    isServer: false,
    buildId: 'test-build',
    config: {} as WebpackConfigContext['config'],
    totalPages: 1,
    defaultLoaders: { babel: {} },
    nextRuntime: undefined,
  } as WebpackConfigContext;
}

describe('withDomscribe', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('should return a function that accepts NextConfig', () => {
    const wrapper = withDomscribe();

    expect(typeof wrapper).toBe('function');
  });

  it('should return a NextConfig object', () => {
    vi.stubEnv('NODE_ENV', 'development');
    const wrapper = withDomscribe();

    const result = wrapper({ reactStrictMode: true });

    expect(result).toBeDefined();
    expect(typeof result).toBe('object');
  });

  it('should preserve existing next config properties', () => {
    vi.stubEnv('NODE_ENV', 'development');
    const wrapper = withDomscribe();

    const result = wrapper({ reactStrictMode: true, poweredByHeader: false });

    expect(result.reactStrictMode).toBe(true);
    expect(result.poweredByHeader).toBe(false);
  });

  it('should accept empty options', () => {
    vi.stubEnv('NODE_ENV', 'development');

    const result = withDomscribe()({});

    expect(result).toBeDefined();
  });

  describe('environment detection', () => {
    it('should apply dev transforms when NODE_ENV is development', () => {
      vi.stubEnv('NODE_ENV', 'development');

      const result = withDomscribe()({});

      // Dev path sets up turbopack rules with loader entries
      const turbopack = result.turbopack as Record<string, unknown>;
      const rules = turbopack['rules'] as Record<string, unknown>;
      expect(rules['*.jsx']).toBeDefined();
      expect(rules['*.tsx']).toBeDefined();
    });

    it('should apply production aliases when NODE_ENV is production', () => {
      vi.stubEnv('NODE_ENV', 'production');

      const result = withDomscribe()({});

      // Production path sets up resolve aliases instead of loader rules
      const turbopack = result.turbopack as Record<string, unknown>;
      const resolveAlias = turbopack['resolveAlias'] as Record<string, string>;
      expect(resolveAlias['@domscribe/overlay']).toContain('noop/overlay');
    });

    it('should apply dev transforms when DOMSCRIBE_FORCE_TRANSFORM is set in production', () => {
      vi.stubEnv('NODE_ENV', 'production');
      vi.stubEnv('DOMSCRIBE_FORCE_TRANSFORM', '1');

      const result = withDomscribe()({});

      // Force transform overrides production — turbopack rules should have loader rules
      const turbopack = result.turbopack as Record<string, unknown>;
      const rules = turbopack['rules'] as Record<string, unknown>;
      expect(rules['*.jsx']).toBeDefined();
      expect(rules['*.tsx']).toBeDefined();
    });
  });

  describe('production path', () => {
    beforeEach(() => {
      vi.stubEnv('NODE_ENV', 'production');
    });

    it('should alias @domscribe/overlay in turbopack config', () => {
      const result = withDomscribe()({});

      const turbopack = result.turbopack as Record<string, unknown>;
      const resolveAlias = turbopack['resolveAlias'] as Record<string, string>;
      expect(resolveAlias['@domscribe/overlay']).toContain('noop/overlay');
    });

    it('should alias @domscribe/overlay in webpack config', () => {
      const result = withDomscribe()({});
      const webpackFn = result.webpack as (
        config: WebpackConfig,
        context: WebpackConfigContext,
      ) => WebpackConfig;
      const config = createMockWebpackConfig();

      const modified = webpackFn(config, createMockWebpackContext());

      expect(modified.resolve?.alias?.['@domscribe/overlay']).toContain(
        'noop/overlay',
      );
    });

    it('should set resolve alias even when config has no resolve field', () => {
      const result = withDomscribe()({});
      const webpackFn = result.webpack as (
        config: WebpackConfig,
        context: WebpackConfigContext,
      ) => WebpackConfig;
      const config: WebpackConfig = { module: { rules: [] } };

      const modified = webpackFn(config, createMockWebpackContext());

      expect(modified.resolve?.alias?.['@domscribe/overlay']).toContain(
        'noop/overlay',
      );
    });

    it('should preserve existing turbopack config', () => {
      const result = withDomscribe()({
        turbopack: {
          resolveAlias: { existing: 'value' },
        } as NextConfig['turbopack'],
      });

      const turbopack = result.turbopack as Record<string, unknown>;
      const resolveAlias = turbopack['resolveAlias'] as Record<string, string>;
      expect(resolveAlias['existing']).toBe('value');
      expect(resolveAlias['@domscribe/overlay']).toBeDefined();
    });

    it('should chain existing webpack function', () => {
      const existingWebpack = vi.fn((config: WebpackConfig) => config);
      const result = withDomscribe()({
        webpack: existingWebpack as unknown as NextConfig['webpack'],
      });
      const webpackFn = result.webpack as (
        config: WebpackConfig,
        context: WebpackConfigContext,
      ) => WebpackConfig;

      webpackFn(createMockWebpackConfig(), createMockWebpackContext());

      expect(existingWebpack).toHaveBeenCalled();
    });

    it('should return config directly when no existing webpack function', () => {
      const result = withDomscribe()({});
      const webpackFn = result.webpack as (
        config: WebpackConfig,
        context: WebpackConfigContext,
      ) => WebpackConfig;
      const config = createMockWebpackConfig();

      const modified = webpackFn(config, createMockWebpackContext());

      expect(modified).toBe(config);
    });
  });

  describe('development path', () => {
    beforeEach(() => {
      vi.stubEnv('NODE_ENV', 'development');
    });

    describe('turbopack config', () => {
      it('should add rules for *.jsx and *.tsx', () => {
        const result = withDomscribe()({});

        const turbopack = result.turbopack as Record<string, unknown>;
        const rules = turbopack['rules'] as Record<string, unknown>;
        expect(rules['*.jsx']).toBeDefined();
        expect(rules['*.tsx']).toBeDefined();
      });

      it('should exclude foreign modules (node_modules)', () => {
        const result = withDomscribe()({});

        const turbopack = result.turbopack as Record<string, unknown>;
        const rules = turbopack['rules'] as Record<string, unknown>;
        const jsxRule = rules['*.jsx'] as Record<string, unknown>;
        expect(jsxRule['condition']).toEqual({ not: 'foreign' });
      });

      it('should configure loader with correct options', () => {
        const result = withDomscribe({
          debug: true,
          relay: { port: 4400 },
          overlay: true,
        })({});

        const turbopack = result.turbopack as Record<string, unknown>;
        const rules = turbopack['rules'] as Record<string, unknown>;
        const jsxRule = rules['*.jsx'] as Record<string, unknown>;
        const loaders = jsxRule['loaders'] as Array<Record<string, unknown>>;
        const loaderConfig = loaders[0];
        const options = loaderConfig['options'] as Record<string, unknown>;

        expect(options['debug']).toBe(true);
        expect(options['enabled']).toBe(true);
        expect(options['relay']).toEqual({ port: 4400 });
        expect(options['overlay']).toBe(true);
        expect(options['autoInitPath']).toBe(
          '/resolved/@domscribe/next/auto-init',
        );
      });

      it('should resolve turbopack loader path', () => {
        const result = withDomscribe()({});

        const turbopack = result.turbopack as Record<string, unknown>;
        const rules = turbopack['rules'] as Record<string, unknown>;
        const jsxRule = rules['*.jsx'] as Record<string, unknown>;
        const loaders = jsxRule['loaders'] as Array<Record<string, unknown>>;
        expect(loaders[0]['loader']).toContain('turbopack-loader');
      });

      it('should preserve existing turbopack rules', () => {
        const existingRule = { loaders: [{ loader: 'some-loader' }] };
        const result = withDomscribe()({
          turbopack: {
            rules: { '*.css': existingRule },
          } as NextConfig['turbopack'],
        });

        const turbopack = result.turbopack as Record<string, unknown>;
        const rules = turbopack['rules'] as Record<string, unknown>;
        expect(rules['*.css']).toBe(existingRule);
        expect(rules['*.jsx']).toBeDefined();
      });
    });

    describe('webpack config', () => {
      it('should return a webpack function', () => {
        const result = withDomscribe()({});

        expect(typeof result.webpack).toBe('function');
      });

      it('should push a loader rule for included files', () => {
        const result = withDomscribe()({});
        const webpackFn = result.webpack as (
          config: WebpackConfig,
          context: WebpackConfigContext,
        ) => WebpackConfig;
        const config = createMockWebpackConfig();

        webpackFn(config, createMockWebpackContext());

        const rules = config.module?.rules ?? [];
        expect(rules.length).toBe(1);
        const rule = rules[0];
        expect(rule.test).toEqual(/\.(jsx|tsx)$/i);
        expect(rule.exclude).toEqual(/node_modules|\.test\.|\.spec\./i);
        expect(rule.enforce).toBe('pre');
      });

      it('should use custom include/exclude patterns', () => {
        const include = /\.tsx$/;
        const exclude = /node_modules/;
        const result = withDomscribe({ include, exclude })({});
        const webpackFn = result.webpack as (
          config: WebpackConfig,
          context: WebpackConfigContext,
        ) => WebpackConfig;
        const config = createMockWebpackConfig();

        webpackFn(config, createMockWebpackContext());

        const rules = config.module?.rules ?? [];
        expect(rules[0].test).toBe(include);
        expect(rules[0].exclude).toBe(exclude);
      });

      it('should pass loader options including debug, relay, overlay', () => {
        const result = withDomscribe({
          debug: true,
          relay: { port: 5000, host: '0.0.0.0', bodyLimit: 5242880 },
          overlay: { initialMode: 'expanded', debug: true },
        })({});
        const webpackFn = result.webpack as (
          config: WebpackConfig,
          context: WebpackConfigContext,
        ) => WebpackConfig;
        const config = createMockWebpackConfig();

        webpackFn(config, createMockWebpackContext());

        const rules = config.module?.rules ?? [];
        const use = rules[0].use ?? [];
        const loaderEntry = use[0];
        expect(loaderEntry.options).toEqual({
          debug: true,
          enabled: true,
          relay: { port: 5000, host: '0.0.0.0', bodyLimit: 5242880 },
          overlay: { initialMode: 'expanded', debug: true },
          autoInitPath: '/resolved/@domscribe/next/auto-init',
        });
      });

      it('should chain existing webpack function', () => {
        const existingWebpack = vi.fn((config: WebpackConfig) => config);
        const result = withDomscribe()({
          webpack: existingWebpack as unknown as NextConfig['webpack'],
        });
        const webpackFn = result.webpack as (
          config: WebpackConfig,
          context: WebpackConfigContext,
        ) => WebpackConfig;
        const config = createMockWebpackConfig();
        const context = createMockWebpackContext();

        webpackFn(config, context);

        expect(existingWebpack).toHaveBeenCalledWith(config, context);
      });

      it('should return config when no existing webpack function', () => {
        const result = withDomscribe()({});
        const webpackFn = result.webpack as (
          config: WebpackConfig,
          context: WebpackConfigContext,
        ) => WebpackConfig;
        const config = createMockWebpackConfig();

        const modified = webpackFn(config, createMockWebpackContext());

        expect(modified).toBe(config);
      });
    });

    describe('default options', () => {
      it('should default debug to false', () => {
        const result = withDomscribe()({});

        const turbopack = result.turbopack as Record<string, unknown>;
        const rules = turbopack['rules'] as Record<string, unknown>;
        const jsxRule = rules['*.jsx'] as Record<string, unknown>;
        const loaders = jsxRule['loaders'] as Array<Record<string, unknown>>;
        const options = loaders[0]['options'] as Record<string, unknown>;
        expect(options['debug']).toBe(false);
      });

      it('should default overlay to true', () => {
        const result = withDomscribe()({});

        const turbopack = result.turbopack as Record<string, unknown>;
        const rules = turbopack['rules'] as Record<string, unknown>;
        const jsxRule = rules['*.jsx'] as Record<string, unknown>;
        const loaders = jsxRule['loaders'] as Array<Record<string, unknown>>;
        const options = loaders[0]['options'] as Record<string, unknown>;
        expect(options['overlay']).toBe(true);
      });

      it('should default relay to empty object', () => {
        const result = withDomscribe()({});

        const turbopack = result.turbopack as Record<string, unknown>;
        const rules = turbopack['rules'] as Record<string, unknown>;
        const jsxRule = rules['*.jsx'] as Record<string, unknown>;
        const loaders = jsxRule['loaders'] as Array<Record<string, unknown>>;
        const options = loaders[0]['options'] as Record<string, unknown>;
        expect(options['relay']).toEqual({});
      });
    });
  });
});
