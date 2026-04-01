import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { DomscribeNuxtOptions } from './types.js';

// ── Hoisted mocks (available inside vi.mock factories) ───────────────────────

interface MockNuxt {
  options: {
    dev: boolean;
    rootDir: string;
    app: {
      head: {
        script: Array<{ innerHTML: string }>;
      };
    };
  };
}

interface CapturedModuleDefinition {
  meta: Record<string, unknown>;
  defaults: DomscribeNuxtOptions;
  setup: (
    options: DomscribeNuxtOptions,
    nuxt: MockNuxt,
  ) => Promise<void> | void;
}

const {
  mockAddPlugin,
  mockAddVitePlugin,
  mockExtendWebpackConfig,
  mockResolve,
  mockDomscribeVitePlugin,
  MockDomscribeWebpackPlugin,
  mockEnsureRunning,
  MockRelayControl,
  captured,
} = vi.hoisted(() => {
  const mockEnsureRunning = vi.fn().mockResolvedValue({
    host: '127.0.0.1',
    port: 4400,
  });
  return {
    mockAddPlugin: vi.fn(),
    mockAddVitePlugin: vi.fn(),
    mockExtendWebpackConfig: vi.fn(),
    mockResolve: vi.fn((path: string) => `/resolved${path}`),
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    mockDomscribeVitePlugin: vi.fn((_opts: unknown) => ({
      name: 'vite-plugin-domscribe',
      apply: 'serve' as string | undefined,
    })),
    MockDomscribeWebpackPlugin: vi.fn(),
    mockEnsureRunning,
    MockRelayControl: vi.fn(function (this: {
      ensureRunning: typeof mockEnsureRunning;
    }) {
      this.ensureRunning = mockEnsureRunning;
    }),
    captured: {
      moduleDefinition: undefined as CapturedModuleDefinition | undefined,
    },
  };
});

// ── Mock registrations ───────────────────────────────────────────────────────

vi.mock('@nuxt/kit', () => ({
  addPlugin: (...args: unknown[]) => mockAddPlugin(...args),
  addVitePlugin: (...args: unknown[]) => mockAddVitePlugin(...args),
  extendWebpackConfig: (...args: unknown[]) => mockExtendWebpackConfig(...args),
  createResolver: () => ({ resolve: mockResolve }),
  defineNuxtModule: (definition: CapturedModuleDefinition) => {
    captured.moduleDefinition = definition;
    return definition;
  },
}));

vi.mock('@domscribe/transform/plugins/vite', () => ({
  domscribe: (opts: unknown) => mockDomscribeVitePlugin(opts),
}));

vi.mock('@domscribe/transform/plugins/webpack', () => ({
  DomscribeWebpackPlugin: MockDomscribeWebpackPlugin,
}));

vi.mock('@domscribe/relay', () => ({
  RelayControl: MockRelayControl,
}));

// ── Helpers ──────────────────────────────────────────────────────────────────

function createMockNuxt(overrides?: Partial<MockNuxt['options']>): MockNuxt {
  return {
    options: {
      dev: true,
      rootDir: '/test/project',
      app: {
        head: {
          script: [],
        },
      },
      ...overrides,
    },
  };
}

function getModuleDefinition(): CapturedModuleDefinition {
  if (!captured.moduleDefinition) {
    throw new Error('Module definition not captured');
  }
  return captured.moduleDefinition;
}

function callSetup(
  options: DomscribeNuxtOptions,
  nuxt: MockNuxt,
): Promise<void> | void {
  return getModuleDefinition().setup(options, nuxt);
}

// ── Import triggers defineNuxtModule mock ────────────────────────────────────
import './module.js';

// ── Tests ────────────────────────────────────────────────────────────────────

describe('domscribeModule', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEnsureRunning.mockResolvedValue({ host: '127.0.0.1', port: 4400 });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('meta', () => {
    it('should set module name to @domscribe/nuxt', () => {
      expect(getModuleDefinition().meta.name).toBe('@domscribe/nuxt');
    });

    it('should set config key to domscribe', () => {
      expect(getModuleDefinition().meta.configKey).toBe('domscribe');
    });
  });

  describe('defaults', () => {
    it('should default debug to false', () => {
      expect(getModuleDefinition().defaults.debug).toBe(false);
    });

    it('should default overlay to true', () => {
      expect(getModuleDefinition().defaults.overlay).toBe(true);
    });

    it('should default relay to empty object', () => {
      expect(getModuleDefinition().defaults.relay).toEqual({});
    });
  });

  describe('setup', () => {
    describe('dev-mode guard', () => {
      it('should skip setup in production without force-transform', async () => {
        const nuxt = createMockNuxt({ dev: false });

        await callSetup({ debug: false }, nuxt);

        expect(mockAddPlugin).not.toHaveBeenCalled();
        expect(mockAddVitePlugin).not.toHaveBeenCalled();
        expect(mockExtendWebpackConfig).not.toHaveBeenCalled();
      });

      it('should run setup in production when DOMSCRIBE_FORCE_TRANSFORM is set', async () => {
        vi.stubEnv('DOMSCRIBE_FORCE_TRANSFORM', '1');
        const nuxt = createMockNuxt({ dev: false });

        await callSetup({ debug: false, overlay: true, relay: {} }, nuxt);

        expect(mockAddPlugin).toHaveBeenCalled();
        expect(mockAddVitePlugin).toHaveBeenCalled();
      });

      it('should run setup in dev mode', async () => {
        const nuxt = createMockNuxt({ dev: true });

        await callSetup({ debug: false, overlay: true, relay: {} }, nuxt);

        expect(mockAddPlugin).toHaveBeenCalled();
      });
    });

    describe('relay auto-start', () => {
      it('should start relay with configured port and host', async () => {
        const nuxt = createMockNuxt();

        await callSetup(
          { debug: false, relay: { port: 3001, host: '0.0.0.0' } },
          nuxt,
        );

        expect(MockRelayControl).toHaveBeenCalledWith('/test/project');
        expect(mockEnsureRunning).toHaveBeenCalledWith({
          port: 3001,
          host: '0.0.0.0',
        });
      });

      it('should start relay with default options when relay is empty', async () => {
        const nuxt = createMockNuxt();

        await callSetup({ debug: false, relay: {} }, nuxt);

        expect(mockEnsureRunning).toHaveBeenCalledWith({
          port: undefined,
          host: undefined,
        });
      });

      it('should skip relay when autoStart is false', async () => {
        const nuxt = createMockNuxt();

        await callSetup({ debug: false, relay: { autoStart: false } }, nuxt);

        expect(MockRelayControl).not.toHaveBeenCalled();
        expect(mockEnsureRunning).not.toHaveBeenCalled();
      });

      it('should handle relay startup failure gracefully', async () => {
        mockEnsureRunning.mockRejectedValue(new Error('EADDRINUSE'));
        const nuxt = createMockNuxt();

        // Should not throw
        await callSetup({ debug: false, relay: {} }, nuxt);

        // Should still register plugins
        expect(mockAddPlugin).toHaveBeenCalled();
      });

      it('should handle non-Error relay failures', async () => {
        mockEnsureRunning.mockRejectedValue('connection refused');
        const nuxt = createMockNuxt();

        await callSetup({ debug: false, relay: {} }, nuxt);

        expect(mockAddPlugin).toHaveBeenCalled();
      });
    });

    describe('head script injection', () => {
      it('should inject relay port and host globals when relay starts', async () => {
        const nuxt = createMockNuxt();

        await callSetup({ debug: false, relay: {}, overlay: false }, nuxt);

        const scripts = nuxt.options.app.head.script;
        expect(scripts.length).toBe(1);
        expect(scripts[0].innerHTML).toContain(
          'window.__DOMSCRIBE_RELAY_PORT__=4400',
        );
        expect(scripts[0].innerHTML).toContain(
          'window.__DOMSCRIBE_RELAY_HOST__="127.0.0.1"',
        );
      });

      it('should inject overlay options when overlay is true', async () => {
        const nuxt = createMockNuxt();

        await callSetup({ debug: false, relay: {}, overlay: true }, nuxt);

        const scripts = nuxt.options.app.head.script;
        expect(scripts[0].innerHTML).toContain(
          'window.__DOMSCRIBE_OVERLAY_OPTIONS__={}',
        );
      });

      it('should inject overlay options object when overlay is an object', async () => {
        const nuxt = createMockNuxt();

        await callSetup(
          {
            debug: false,
            relay: {},
            overlay: { initialMode: 'expanded', debug: true },
          },
          nuxt,
        );

        const scripts = nuxt.options.app.head.script;
        const innerHTML = scripts[0].innerHTML;
        expect(innerHTML).toContain('__DOMSCRIBE_OVERLAY_OPTIONS__=');
        expect(innerHTML).toContain('"initialMode":"expanded"');
        expect(innerHTML).toContain('"debug":true');
      });

      it('should not inject overlay globals when overlay is false', async () => {
        const nuxt = createMockNuxt();

        await callSetup({ debug: false, relay: {}, overlay: false }, nuxt);

        const scripts = nuxt.options.app.head.script;
        expect(scripts[0].innerHTML).not.toContain(
          '__DOMSCRIBE_OVERLAY_OPTIONS__',
        );
      });

      it('should not inject any script when relay fails and overlay is false', async () => {
        mockEnsureRunning.mockRejectedValue(new Error('fail'));
        const nuxt = createMockNuxt();

        await callSetup({ debug: false, relay: {}, overlay: false }, nuxt);

        expect(nuxt.options.app.head.script.length).toBe(0);
      });

      it('should join multiple globals with semicolons', async () => {
        const nuxt = createMockNuxt();

        await callSetup({ debug: false, relay: {}, overlay: true }, nuxt);

        const innerHTML = nuxt.options.app.head.script[0].innerHTML;
        expect(innerHTML.split(';').length).toBeGreaterThanOrEqual(3);
      });
    });

    describe('vite plugin registration', () => {
      it('should register vite plugin with relay autoStart disabled', async () => {
        const nuxt = createMockNuxt();

        await callSetup(
          { debug: true, relay: { port: 3001 }, overlay: true },
          nuxt,
        );

        expect(mockAddVitePlugin).toHaveBeenCalled();
        const [factory, viteOptions] = mockAddVitePlugin.mock.calls[0] as [
          () => unknown,
          Record<string, unknown>,
        ];

        // Invoke factory to check domscribe() was called correctly
        factory();
        expect(mockDomscribeVitePlugin).toHaveBeenCalledWith(
          expect.objectContaining({
            debug: true,
            overlay: true,
            rootDir: '/test/project',
            relay: { port: 3001, autoStart: false },
          }),
        );

        // dev-only by default
        expect(viteOptions).toEqual({ dev: true });
      });

      it('should register vite plugin for all modes when force-transform is set', async () => {
        vi.stubEnv('DOMSCRIBE_FORCE_TRANSFORM', '1');
        const nuxt = createMockNuxt({ dev: false });

        await callSetup({ debug: false, relay: {}, overlay: true }, nuxt);

        const [factory, viteOptions] = mockAddVitePlugin.mock.calls[0] as [
          () => Record<string, unknown>,
          Record<string, unknown>,
        ];
        const plugin = factory();

        // apply should be cleared for force-transform
        expect(plugin['apply']).toBeUndefined();
        // No dev restriction
        expect(viteOptions).toEqual({});
      });
    });

    describe('webpack plugin registration', () => {
      it('should register webpack config extension', async () => {
        const nuxt = createMockNuxt();

        await callSetup(
          { debug: true, relay: { port: 3001 }, overlay: true },
          nuxt,
        );

        expect(mockExtendWebpackConfig).toHaveBeenCalled();
      });

      it('should add webpack loader with correct options', async () => {
        const nuxt = createMockNuxt();

        await callSetup({ debug: true, relay: {}, overlay: true }, nuxt);

        const [configFn] = mockExtendWebpackConfig.mock.calls[0] as [
          (config: {
            module: { rules: Array<Record<string, unknown>> };
            plugins: unknown[];
          }) => void,
        ];
        const config = {
          module: { rules: [] as Array<Record<string, unknown>> },
          plugins: [] as unknown[],
        };
        configFn(config);

        expect(config.module.rules.length).toBe(1);
        const rule = config.module.rules[0];
        expect(rule['test']).toEqual(/\.(jsx|tsx|vue)$/i);
        expect(rule['exclude']).toEqual(/node_modules|\.test\.|\.spec\./i);
        expect(rule['enforce']).toBe('pre');

        const use = rule['use'] as Array<Record<string, unknown>>;
        expect(use[0]['loader']).toBe(
          '@domscribe/transform/plugins/webpack/loader',
        );
        expect(use[0]['options']).toEqual({ debug: true });
      });

      it('should use custom include/exclude patterns', async () => {
        const nuxt = createMockNuxt();
        const include = /\.vue$/;
        const exclude = /node_modules/;

        await callSetup({ debug: false, include, exclude, relay: {} }, nuxt);

        const [configFn] = mockExtendWebpackConfig.mock.calls[0] as [
          (config: {
            module: { rules: Array<Record<string, unknown>> };
            plugins: unknown[];
          }) => void,
        ];
        const config = {
          module: { rules: [] as Array<Record<string, unknown>> },
          plugins: [] as unknown[],
        };
        configFn(config);

        const rule = config.module.rules[0];
        expect(rule['test']).toBe(include);
        expect(rule['exclude']).toBe(exclude);
      });

      it('should add webpack plugin with relay autoStart disabled', async () => {
        const nuxt = createMockNuxt();

        await callSetup(
          { debug: true, relay: { port: 5000 }, overlay: true },
          nuxt,
        );

        const [configFn] = mockExtendWebpackConfig.mock.calls[0] as [
          (config: {
            module: { rules: Array<Record<string, unknown>> };
            plugins: unknown[];
          }) => void,
        ];
        const config = {
          module: { rules: [] as Array<Record<string, unknown>> },
          plugins: [] as unknown[],
        };
        configFn(config);

        expect(MockDomscribeWebpackPlugin).toHaveBeenCalledWith({
          debug: true,
          relay: { port: 5000, autoStart: false },
          overlay: true,
        });
        expect(config.plugins.length).toBe(1);
      });

      it('should register webpack config for dev-only by default', async () => {
        const nuxt = createMockNuxt();

        await callSetup({ debug: false, relay: {}, overlay: true }, nuxt);

        const [, wpOptions] = mockExtendWebpackConfig.mock.calls[0] as [
          unknown,
          Record<string, unknown>,
        ];
        expect(wpOptions).toEqual({ dev: true });
      });

      it('should register webpack config for all modes when force-transform is set', async () => {
        vi.stubEnv('DOMSCRIBE_FORCE_TRANSFORM', '1');
        const nuxt = createMockNuxt({ dev: false });

        await callSetup({ debug: false, relay: {}, overlay: true }, nuxt);

        const [, wpOptions] = mockExtendWebpackConfig.mock.calls[0] as [
          unknown,
          Record<string, unknown>,
        ];
        expect(wpOptions).toEqual({});
      });
    });

    describe('runtime plugin registration', () => {
      it('should register runtime plugin as client-only', async () => {
        const nuxt = createMockNuxt();

        await callSetup({ debug: false, relay: {}, overlay: true }, nuxt);

        expect(mockAddPlugin).toHaveBeenCalledWith({
          src: expect.stringContaining('runtime/plugin'),
          mode: 'client',
        });
      });

      it('should resolve plugin path via createResolver', async () => {
        const nuxt = createMockNuxt();

        await callSetup({ debug: false, relay: {}, overlay: true }, nuxt);

        expect(mockResolve).toHaveBeenCalledWith('./runtime/plugin');
      });
    });
  });
});
