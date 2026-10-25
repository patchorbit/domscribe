import assert from 'node:assert/strict';

// Native framework CLIs run from the isolated consumer, never workspace aliases.
export function replayProject(framework, version, viteVersion) {
  assert(
    ['react', 'vue', 'next', 'nuxt'].includes(framework),
    'unsupported framework',
  );
  const ssr = framework === 'next' || framework === 'nuxt';
  assert(ssr || !version, 'framework-version is only supported for next/nuxt');
  const frameworkVersion =
    version ?? (framework === 'next' ? '16.4.3' : '3.21.11');
  if (ssr) {
    assert(
      (framework === 'next' ? /^(15|16)\.\d+\.\d+$/ : /^[34]\.\d+\.\d+$/).test(
        frameworkVersion,
      ),
      'framework-version must be an exact Next 15/16 or Nuxt 3/4 release',
    );
  }
  const ui =
    framework === 'next' ? 'react' : framework === 'nuxt' ? 'vue' : framework;
  const dependencies =
    ui === 'react'
      ? {
          react: ssr ? '19.3.1' : '18.3.1',
          'react-dom': ssr ? '19.3.1' : '18.3.1',
        }
      : { vue: '3.5.44' };
  if (ssr) dependencies[framework] = frameworkVersion;
  else
    Object.assign(dependencies, {
      vite: viteVersion,
      [`@vitejs/plugin-${ui}`]: ui === 'react' ? '4.7.0' : '6.0.4',
    });
  const next15 = framework === 'next' && frameworkVersion.startsWith('15.');
  const cli =
    framework === 'next'
      ? 'next/dist/bin/next'
      : framework === 'nuxt'
        ? 'nuxt/bin/nuxt.mjs'
        : 'vite/bin/vite.js';
  return {
    ui,
    ssr,
    dependencies,
    versionPackage: ssr ? framework : 'vite',
    requestedVersion: ssr ? frameworkVersion : viteVersion,
    expectedSource: ui === 'vue' ? '/src/Card.vue' : '/src/main.jsx',
    artifacts: [
      ...new Set([
        'core',
        'manifest',
        'runtime',
        'relay',
        'overlay',
        'transform',
        ui,
        framework,
        'verify',
      ]),
    ],
    cli,
    bundler: framework === 'next' ? (next15 ? 'webpack' : 'turbopack') : 'vite',
    devArgs: (port) =>
      ssr
        ? [
            'dev',
            '--port',
            String(port),
            '--host' + (framework === 'next' ? 'name' : ''),
            '127.0.0.1',
          ]
        : ['--port', String(port)],
    buildArgs: ['build'],
    productionArgs: (port) =>
      framework === 'next'
        ? ['start', '--port', String(port), '--hostname', '127.0.0.1']
        : framework === 'nuxt'
          ? []
          : ['preview', '--host', '127.0.0.1', '--port', String(port)],
    productionEntry: framework === 'nuxt' ? '.output/server/index.mjs' : null,
  };
}
