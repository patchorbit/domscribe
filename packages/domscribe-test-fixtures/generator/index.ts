/**
 * Test Fixture Generator
 *
 * Scaffolds a new test fixture for the domscribe-test-fixtures package.
 * Copies canonical components from the registry, renders EJS templates,
 * and generates fixture.json manifest.
 *
 * Supports standalone frameworks (react, vue) and meta-frameworks (next, nuxt).
 * Meta-frameworks inherit components from their base framework.
 */
import {
  type Tree,
  generateFiles,
  joinPathFragments,
  formatFiles,
  workspaceRoot,
} from '@nx/devkit';
import { join } from 'path';

export interface TestFixtureGeneratorSchema {
  framework: 'react' | 'vue' | 'next' | 'nuxt';
  frameworkVersion: number;
  bundler?: 'vite' | 'webpack';
  bundlerVersion?: number;
  language?: 'ts' | 'js';
}

interface ComponentEntry {
  file: string;
  name: string;
  tags: string[];
  minVersion: string;
}

const META_FRAMEWORKS = ['next', 'nuxt'] as const;

/**
 * Maps meta-frameworks to their base framework for component inheritance.
 */
const FRAMEWORK_INHERITANCE: Record<string, string> = {
  next: 'react',
  nuxt: 'vue',
};

function isMetaFramework(framework: string): boolean {
  return META_FRAMEWORKS.includes(
    framework as (typeof META_FRAMEWORKS)[number],
  );
}

/**
 * Derive reasonable defaults for bundler and version.
 * Meta-frameworks have implicit bundlers (Next.js uses Webpack/Turbopack, Nuxt uses Vite).
 */
function deriveDefaults(options: TestFixtureGeneratorSchema): {
  bundler: string;
  bundlerVersion: string;
  language: string;
} {
  if (isMetaFramework(options.framework)) {
    // Meta-frameworks handle their own bundler
    return {
      bundler: options.framework === 'nuxt' ? 'vite' : 'webpack',
      bundlerVersion: String(options.bundlerVersion ?? '5'),
      language: options.language ?? 'ts',
    };
  }

  const bundler = options.bundler ?? 'vite';
  const bundlerVersion = String(options.bundlerVersion ?? '5');
  const language = options.language ?? 'ts';
  return { bundler, bundlerVersion, language };
}

/**
 * Build the output path for the fixture.
 * Standalone: fixtures/{bundler}/v{bundlerVersion}/{framework}-{version}-{language}/
 * Meta-frameworks: fixtures/{framework}/v{frameworkVersion}/{language}/
 */
function getOutputPath(
  bundler: string,
  bundlerVersion: string,
  framework: string,
  frameworkVersion: string,
  language: string,
): string {
  if (isMetaFramework(framework)) {
    return joinPathFragments(
      'packages/domscribe-test-fixtures/fixtures',
      framework,
      `v${frameworkVersion}`,
      language,
    );
  }

  return joinPathFragments(
    'packages/domscribe-test-fixtures/fixtures',
    bundler,
    `v${bundlerVersion}`,
    `${framework}-${frameworkVersion}-${language}`,
  );
}

/**
 * Get the workspace-relative template path (for tree.exists checks).
 */
function getTemplateRelPath(bundler: string, framework: string): string {
  const templateSubdir = isMetaFramework(framework)
    ? framework
    : `${bundler}-${framework}`;

  return joinPathFragments(
    'packages/domscribe-test-fixtures/fixtures/_templates',
    templateSubdir,
  );
}

/**
 * Get the absolute template path (for generateFiles which reads from disk).
 */
function getTemplateDirAbsolute(bundler: string, framework: string): string {
  return join(workspaceRoot, getTemplateRelPath(bundler, framework));
}

/**
 * Get the registry directory for the framework/version.
 */
function getRegistryDir(framework: string, frameworkVersion: string): string {
  return joinPathFragments(
    'packages/domscribe-test-fixtures/fixtures/_registry',
    framework,
    frameworkVersion,
  );
}

/**
 * Map meta-framework version to its base framework version for inheritance.
 */
function getBaseFrameworkVersion(
  framework: string,
  frameworkVersion: string,
): string {
  const ver = parseInt(frameworkVersion, 10);
  if (framework === 'next') {
    // Next.js 13+ uses React 18
    return ver >= 13 ? '18' : '16';
  }
  if (framework === 'nuxt') {
    // Nuxt 3 uses Vue 3
    return ver >= 3 ? '3' : '2';
  }
  return frameworkVersion;
}

/**
 * Find all registry directories for versions <= target version.
 * Returns them in ascending order so higher versions override lower.
 */
function getRegistryDirsForVersion(
  tree: Tree,
  framework: string,
  frameworkVersion: string,
): string[] {
  const ver = parseInt(frameworkVersion, 10);
  const dirs: string[] = [];

  for (let v = 1; v <= ver; v++) {
    const dir = getRegistryDir(framework, String(v));
    if (tree.exists(dir)) {
      dirs.push(dir);
    }
  }

  return dirs;
}

/**
 * Read component entries from all registry directories up to the target version.
 * Merges entries across versions — e.g. react/19 gets everything from react/18 + react/19.
 * Higher version entries with the same filename override lower ones.
 */
function getComponentEntries(
  tree: Tree,
  framework: string,
  frameworkVersion: string,
): ComponentEntry[] {
  const dirs = getRegistryDirsForVersion(tree, framework, frameworkVersion);
  if (dirs.length === 0) return [];

  // Merge entries, later versions override earlier by filename
  const entryMap = new Map<string, ComponentEntry>();
  for (const dir of dirs) {
    const entries = getComponentEntriesFromDir(tree, dir, framework);
    for (const entry of entries) {
      entryMap.set(entry.file, entry);
    }
  }

  return Array.from(entryMap.values());
}

/**
 * Get all components for a fixture, including inherited base framework components
 * for meta-frameworks.
 */
function getAllComponentEntries(
  tree: Tree,
  framework: string,
  frameworkVersion: string,
): ComponentEntry[] {
  const components: ComponentEntry[] = [];

  // For meta-frameworks, first get base framework components
  const baseFramework = FRAMEWORK_INHERITANCE[framework];
  if (baseFramework) {
    const baseVersion = getBaseFrameworkVersion(framework, frameworkVersion);
    const baseComponents = getComponentEntries(
      tree,
      baseFramework,
      baseVersion,
    );
    components.push(...baseComponents);
  }

  // Then get framework-specific components
  const ownComponents = getComponentEntries(tree, framework, frameworkVersion);
  components.push(...ownComponents);

  return components;
}

function getComponentEntriesFromDir(
  tree: Tree,
  dir: string,
  framework: string,
): ComponentEntry[] {
  const children = tree.children(dir);
  const ext = framework === 'vue' || framework === 'nuxt' ? '.vue' : '.tsx';
  const entries: ComponentEntry[] = [];

  for (const child of children) {
    if (child === 'index.ts' || !child.endsWith(ext)) continue;

    const name = child.replace(ext, '');
    const tags: string[] = [];

    // Classify by name
    if (
      [
        'BasicElements',
        'SelfClosing',
        'Fragments',
        'Lists',
        'ConditionalRendering',
        'DeeplyNested',
        'MemberExpressions',
        'EventHandlers',
        'HOCs',
        'RenderProps',
        'Memo',
        'DynamicContent',
        'TypeScriptFeatures',
        'EdgeCases',
        // Next.js core
        'ServerComponent',
        'ClientComponent',
        'LayoutPattern',
        // Nuxt core
        'AutoImports',
        'NuxtLayout',
        // Vue core
        'TemplateRefs',
        'VFor',
        'TwoWayBinding',
      ].includes(name)
    ) {
      tags.push('core');
    } else if (name === 'SmokeTest') {
      tags.push('smoke-test', 'capture');
    } else if (name === 'CaptureIcon') {
      tags.push('capture');
    } else {
      tags.push('advanced');
    }

    entries.push({
      file: child,
      name: name.replace(/([A-Z])/g, ' $1').trim(), // PascalCase → display name
      tags,
      minVersion: '1',
    });
  }

  return entries;
}

/**
 * Slugify a component name for use as a nav ID.
 */
function toSlug(name: string): string {
  return name
    .replace(/([A-Z])/g, '-$1')
    .toLowerCase()
    .replace(/^-/, '')
    .replace(/[^a-z0-9-]/g, '');
}

/**
 * Determine the UI library for imports.
 * Meta-frameworks use their base framework for component file extensions.
 */
function getUIFramework(framework: string): string {
  return FRAMEWORK_INHERITANCE[framework] ?? framework;
}

/**
 * Generate the App component imports and config array.
 */
function generateAppData(
  components: ComponentEntry[],
  framework: string,
): {
  componentImports: string;
  componentConfigs: string;
  navItems: string;
  defaultComponentId: string;
} {
  const uiFramework = getUIFramework(framework);
  const isVueLike = uiFramework === 'vue';
  const nonUtilComponents = components.filter(
    (c) => !c.tags.includes('capture') || c.tags.includes('smoke-test'),
  );

  // Build imports
  const importable = nonUtilComponents.filter(
    (c) => c.file !== 'LazyComponent.tsx' && c.file !== 'LazyComponent.vue',
  );

  const importNames = importable.map((c) => c.file.replace(/\.\w+$/, ''));

  let componentImports: string;
  if (isVueLike) {
    // Vue/Nuxt: import each component separately from .vue files
    componentImports = importable
      .map((c) => {
        const name = c.file.replace(/\.\w+$/, '');
        return `import ${name} from './components/${c.file}';`;
      })
      .join('\n');
  } else if (framework === 'next') {
    // Next.js: import from @/components
    componentImports =
      `import {\n` +
      importNames.map((n) => `  ${n},`).join('\n') +
      `\n} from '@/components';`;
  } else {
    // React: import from ./components
    componentImports =
      `import {\n` +
      importNames.map((n) => `  ${n},`).join('\n') +
      `\n} from './components';`;
  }

  // Build config array (exclude utility components)
  const configurable = importable.filter(
    (c) => c.file !== 'CaptureIcon.tsx' && c.file !== 'CaptureIcon.vue',
  );

  const componentConfigs = configurable
    .map((c) => {
      const name = c.file.replace(/\.\w+$/, '');
      const slug = toSlug(name);
      return `  {\n    id: '${slug}',\n    title: '${c.name}',\n    description: '${c.name} test component.',\n    component: ${name},\n  },`;
    })
    .join('\n');

  // Build nav items
  const navItemsList = configurable
    .map((c) => {
      const name = c.file.replace(/\.\w+$/, '');
      const slug = toSlug(name);
      const section = c.tags.includes('core')
        ? 'Core Patterns'
        : c.tags.includes('smoke-test')
          ? 'Testing'
          : 'Advanced Patterns';
      return `  { id: '${slug}', label: '${c.name}', section: '${section}' },`;
    })
    .join('\n');

  const defaultComponentId = toSlug(
    (configurable[0]?.file ?? 'basic-elements').replace(/\.\w+$/, ''),
  );

  return {
    componentImports,
    componentConfigs,
    navItems: navItemsList,
    defaultComponentId,
  };
}

/**
 * Generate a barrel index.ts that re-exports all components.
 * Used by React/Next fixtures which import from a single barrel.
 */
function generateBarrelExport(
  tree: Tree,
  componentsDir: string,
  components: ComponentEntry[],
): void {
  const lines = components
    .filter((c) => c.file.endsWith('.tsx'))
    .map((c) => {
      const name = c.file.replace('.tsx', '');
      return `export { ${name} } from './${name}';`;
    });

  tree.write(
    joinPathFragments(componentsDir, 'index.ts'),
    lines.join('\n') + '\n',
  );
}

/**
 * Non-component files in registry directories that should not be copied
 * into generated fixtures. These are registry-level metadata, not source.
 */
const REGISTRY_SKIP_FILES = ['index.ts', 'expectations.ts'];

/**
 * Copy component files from a registry directory into the output components dir.
 * Skips non-component files (index.ts, expectations.ts) since the generator
 * produces its own barrel export from the full component list.
 */
function copyRegistryDir(
  tree: Tree,
  registryDir: string,
  componentsDir: string,
): void {
  if (!tree.exists(registryDir)) return;

  const registryFiles = tree.children(registryDir);
  for (const file of registryFiles) {
    if (REGISTRY_SKIP_FILES.includes(file)) continue;

    const filePath = joinPathFragments(registryDir, file);
    const content = tree.read(filePath);
    if (content) {
      tree.write(joinPathFragments(componentsDir, file), content);
    }
  }
}

/**
 * Get the runtime capture strategies for a framework.
 */
function getCaptureStrategies(framework: string): string[] {
  const uiFramework = getUIFramework(framework);
  if (uiFramework === 'react') {
    return ['fiber', 'devtools', 'best-effort'];
  }
  if (uiFramework === 'vue') {
    return ['vnode'];
  }
  return ['best-effort'];
}

/**
 * Get the dev server config for a framework/bundler.
 */
function getDevServerConfig(
  framework: string,
  bundler: string,
): Record<string, unknown> {
  if (framework === 'next') {
    return { command: 'next dev', port: 0, readyPattern: 'Ready in' };
  }
  if (framework === 'nuxt') {
    return { command: 'nuxi dev', port: 0, readyPattern: 'Nuxt' };
  }
  if (bundler === 'vite') {
    return { command: 'vite', port: 0, readyPattern: 'Local:' };
  }
  return {
    command: 'webpack serve --mode development',
    port: 0,
    readyPattern: 'compiled successfully',
  };
}

/**
 * Get the fixture ID.
 */
function getFixtureId(
  framework: string,
  frameworkVersion: string,
  bundler: string,
  bundlerVersion: string,
  language: string,
): string {
  if (isMetaFramework(framework)) {
    return `${framework}-v${frameworkVersion}-${language}`;
  }
  return `${bundler}-v${bundlerVersion}-${framework}-${frameworkVersion}-${language}`;
}

/**
 * Get the CSS output path for a framework.
 */
function getCssOutputPath(framework: string): string {
  if (framework === 'next') return 'app/globals.css';
  if (framework === 'nuxt') return 'assets/index.css';
  return 'src/index.css';
}

/**
 * Get the components output directory for a framework.
 */
function getComponentsOutputDir(framework: string): string {
  if (framework === 'next') return 'src/components';
  if (framework === 'nuxt') return 'components';
  return 'src/components';
}

export async function testFixtureGenerator(
  tree: Tree,
  options: TestFixtureGeneratorSchema,
): Promise<void> {
  const { bundler, bundlerVersion, language } = deriveDefaults(options);
  const { framework } = options;
  const frameworkVersion = String(options.frameworkVersion);

  // 1. Compute output path
  const outputPath = getOutputPath(
    bundler,
    bundlerVersion,
    framework,
    frameworkVersion,
    language,
  );

  // 2. Abort if fixture already exists
  if (tree.exists(outputPath)) {
    throw new Error(
      `Fixture already exists at ${outputPath}. Delete it first to regenerate.`,
    );
  }

  // 3. Get template directory
  const templateRelPath = getTemplateRelPath(bundler, framework);
  const templateDir = getTemplateDirAbsolute(bundler, framework);
  if (!tree.exists(templateRelPath)) {
    throw new Error(
      `No template found for ${isMetaFramework(framework) ? framework : `${bundler}-${framework}`}. Expected at ${templateRelPath}`,
    );
  }

  // 4. Query component registry (with inheritance for meta-frameworks)
  const components = getAllComponentEntries(tree, framework, frameworkVersion);
  if (components.length === 0) {
    throw new Error(
      `No components found in registry for ${framework}@${frameworkVersion}`,
    );
  }

  // 5. Generate app data (imports, configs, nav items)
  const appData = generateAppData(components, framework);

  // 6. Generate files from EJS templates
  generateFiles(tree, templateDir, outputPath, {
    framework,
    frameworkVersion,
    bundler,
    bundlerVersion,
    language,
    ...appData,
    tmpl: '', // strips __tmpl__ from filenames
  });

  // 7. Copy canonical components from registry
  const componentsDir = joinPathFragments(
    outputPath,
    getComponentsOutputDir(framework),
  );

  // For meta-frameworks, copy base framework components first (all versions)
  const baseFramework = FRAMEWORK_INHERITANCE[framework];
  if (baseFramework) {
    const baseVersion = getBaseFrameworkVersion(framework, frameworkVersion);
    const baseDirs = getRegistryDirsForVersion(
      tree,
      baseFramework,
      baseVersion,
    );
    for (const dir of baseDirs) {
      copyRegistryDir(tree, dir, componentsDir);
    }
  }

  // Copy framework-specific components (all versions up to target)
  const frameworkDirs = getRegistryDirsForVersion(
    tree,
    framework,
    frameworkVersion,
  );
  for (const dir of frameworkDirs) {
    copyRegistryDir(tree, dir, componentsDir);
  }

  // 7b. Generate barrel index.ts for frameworks that use barrel imports
  const uiFramework = getUIFramework(framework);
  if (uiFramework === 'react') {
    generateBarrelExport(tree, componentsDir, components);
  }

  // 8. Copy shared CSS
  const sharedCssPath =
    'packages/domscribe-test-fixtures/fixtures/_shared/styles/design-system.css';
  if (tree.exists(sharedCssPath)) {
    const cssContent = tree.read(sharedCssPath);
    if (cssContent) {
      tree.write(
        joinPathFragments(outputPath, getCssOutputPath(framework)),
        cssContent,
      );
    }
  }

  // 9. Generate fixture.json manifest
  const fixtureManifest = {
    id: getFixtureId(
      framework,
      frameworkVersion,
      bundler,
      bundlerVersion,
      language,
    ),
    framework,
    frameworkVersion,
    ...(isMetaFramework(framework)
      ? { baseFramework: baseFramework }
      : { bundler, bundlerVersion }),
    language,
    tags: ['full-kitchen-sink', 'smoke-test', 'capture'],
    capabilities: {
      runtimeCapture: true,
      strategies: getCaptureStrategies(framework),
      smokeTest: true,
    },
    devServer: getDevServerConfig(framework, bundler),
  };

  tree.write(
    joinPathFragments(outputPath, 'fixture.json'),
    JSON.stringify(fixtureManifest, null, 2) + '\n',
  );

  // 10. Create public/index.html for webpack (standalone only)
  if (!isMetaFramework(framework) && bundler === 'webpack') {
    tree.write(
      joinPathFragments(outputPath, 'public/index.html'),
      `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Domscribe Test Fixture - ${framework} ${frameworkVersion}</title>
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>
`,
    );
  }

  await formatFiles(tree);
}
