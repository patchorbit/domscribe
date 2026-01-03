import type {
  CreateNodesV2,
  CreateNodesResultV2,
  TargetConfiguration,
} from '@nx/devkit';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

interface FixtureJson {
  id: string;
  bundler?: string;
}

const PROJECT_ROOT = 'packages/domscribe-test-fixtures';

/**
 * Bundlers that the integration test builder supports.
 */
const INTEGRATION_BUNDLERS = ['vite', 'webpack', 'next', 'nuxt'];

/**
 * Recursively finds all fixture.json files under the fixtures directory.
 * We scan the filesystem directly because the fixtures directory is in .nxignore
 * (it contains standalone apps with their own node_modules).
 */
function findFixtureJsonFiles(dir: string): string[] {
  const results: string[] = [];
  try {
    for (const entry of readdirSync(dir)) {
      if (entry === 'node_modules' || entry === '.next' || entry === '.nuxt') {
        continue;
      }
      const fullPath = join(dir, entry);
      if (statSync(fullPath).isDirectory()) {
        results.push(...findFixtureJsonFiles(fullPath));
      } else if (entry === 'fixture.json') {
        results.push(fullPath);
      }
    }
  } catch {
    // Directory doesn't exist or isn't readable
  }
  return results;
}

// Trigger on the project.json of domscribe-test-fixtures, since fixture.json
// files are nxignored and won't match a glob pattern.
export const createNodes: CreateNodesV2 = [
  `${PROJECT_ROOT}/project.json`,
  async (_configFiles, _options, context) => {
    const fixturesDir = join(context.workspaceRoot, PROJECT_ROOT, 'fixtures');
    const fixtureFiles = findFixtureJsonFiles(fixturesDir);
    const targets: Record<string, TargetConfiguration> = {};

    for (const fullPath of fixtureFiles) {
      const fixture: FixtureJson = JSON.parse(readFileSync(fullPath, 'utf-8'));
      const fixtureDir = relative(
        join(context.workspaceRoot, PROJECT_ROOT),
        join(fullPath, '..'),
      );

      // Per-fixture install target — installs @domscribe packages from Verdaccio
      targets[`install-fixture--${fixture.id}`] = {
        executor: 'nx:run-commands',
        options: {
          command: `FIXTURE_ID=${fixture.id} node --import @swc-node/register/esm ${PROJECT_ROOT}/scripts/install-fixture.ts`,
        },
        cache: false,
        metadata: {
          description: `Install @domscribe packages for fixture ${fixture.id}`,
        },
      };

      // Integration tests only work for fixtures with a programmatic build API
      // (Vite/Webpack). Meta-frameworks (Next, Nuxt) use e2e tests only.
      if (INTEGRATION_BUNDLERS.includes(fixture.bundler ?? '')) {
        targets[`integration--${fixture.id}`] = {
          executor: 'nx:run-commands',
          options: {
            command: `FIXTURE_ID=${fixture.id} npx vitest run --config ${PROJECT_ROOT}/vite.config.ts integration`,
          },
          dependsOn: [`install-fixture--${fixture.id}`],
          inputs: [
            `{projectRoot}/integration/**/*`,
            `{projectRoot}/shared/**/*`,
            `{projectRoot}/${fixtureDir}/**/*`,
          ],
          metadata: {
            description: `Integration tests for fixture ${fixture.id}`,
          },
        };
      }

      targets[`e2e--${fixture.id}`] = {
        executor: 'nx:run-commands',
        options: {
          command: `FIXTURE_ID=${fixture.id} pnpm exec playwright test --grep ${fixture.id}`,
          cwd: `{projectRoot}`,
        },
        dependsOn: [`install-fixture--${fixture.id}`],
        cache: false,
        inputs: [
          `{projectRoot}/e2e/**/*`,
          `{projectRoot}/shared/**/*`,
          `{projectRoot}/${fixtureDir}/**/*`,
        ],
        metadata: {
          description: `E2E tests for fixture ${fixture.id}`,
        },
      };
    }

    // Aggregate targets that fan out to all per-fixture targets.
    // Nx parallelises the dependsOn targets via its task runner.
    targets['integration-all'] = {
      executor: 'nx:noop',
      dependsOn: ['integration--*'],
      metadata: {
        description: 'Run integration tests for all fixtures',
      },
    };

    targets['e2e-all'] = {
      executor: 'nx:noop',
      dependsOn: ['e2e--*'],
      metadata: {
        description: 'Run e2e tests for all fixtures',
      },
    };

    const result: CreateNodesResultV2 = [
      [
        `${PROJECT_ROOT}/project.json`,
        {
          projects: {
            [PROJECT_ROOT]: { targets },
          },
        },
      ],
    ];

    return result;
  },
];

export const createNodesV2 = createNodes;
