import nx from '@nx/eslint-plugin';

export default [
  ...nx.configs['flat/base'],
  ...nx.configs['flat/typescript'],
  ...nx.configs['flat/javascript'],
  {
    ignores: [
      '**/dist',
      '**/test-output',
      '**/vite.config.*.timestamp*',
      '**/vitest.config.*.timestamp*',
      'packages/domscribe-test-fixtures/fixtures/**',
    ],
  },
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    rules: {
      '@nx/enforce-module-boundaries': [
        'error',
        {
          enforceBuildableLibDependency: true,
          allow: ['^.*/eslint(\\.base)?\\.config\\.[cm]?[jt]s$'],
          depConstraints: [
            {
              sourceTag: 'scope:core',
              onlyDependOnLibsWithTags: ['scope:core'],
            },
            {
              sourceTag: 'scope:infra',
              onlyDependOnLibsWithTags: ['scope:core', 'scope:infra'],
            },
            {
              sourceTag: 'scope:build',
              onlyDependOnLibsWithTags: ['scope:core', 'scope:infra'],
            },
            {
              sourceTag: 'scope:adapter',
              onlyDependOnLibsWithTags: [
                'scope:core',
                'scope:infra',
                'scope:build',
                'scope:adapter',
              ],
            },
            {
              // scope:test consumes the same packages adapters do — it
              // grades them. Notably, `@domscribe/test-fixtures` now imports
              // `@domscribe/verify` (scope:infra) so the harness and the
              // relay verify_after_edit tool share one comparator.
              sourceTag: 'scope:test',
              onlyDependOnLibsWithTags: [
                'scope:core',
                'scope:infra',
                'scope:build',
                'scope:adapter',
              ],
            },
          ],
        },
      ],
    },
  },
  {
    files: [
      '**/*.ts',
      '**/*.tsx',
      '**/*.js',
      '**/*.jsx',
    ],
    // Override or add rules here
    rules: {},
  },
];
