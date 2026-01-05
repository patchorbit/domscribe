/**
 * Component Registry
 *
 * Master registry mapping (framework, version) → component entries.
 * Used by the scaffold generator to determine which components to include
 * in a generated fixture, and by tests to validate fixture completeness.
 */

export interface ComponentEntry {
  /** Filename relative to framework/version dir */
  file: string;
  /** Display name for navigation/UI */
  name: string;
  /** Classification tags */
  tags: (
    | 'core'
    | 'advanced'
    | 'smoke-test'
    | 'capture'
    | 'framework-specific'
  )[];
  /** Minimum framework version this component requires */
  minVersion: string;
}

const reactComponents: ComponentEntry[] = [
  // Core patterns
  {
    file: 'BasicElements.tsx',
    name: 'Basic Elements',
    tags: ['core'],
    minVersion: '16',
  },
  {
    file: 'SelfClosing.tsx',
    name: 'Self-Closing Elements',
    tags: ['core'],
    minVersion: '16',
  },
  {
    file: 'Fragments.tsx',
    name: 'Fragments',
    tags: ['core'],
    minVersion: '16',
  },
  {
    file: 'Lists.tsx',
    name: 'Lists',
    tags: ['core'],
    minVersion: '16',
  },
  {
    file: 'ConditionalRendering.tsx',
    name: 'Conditional Rendering',
    tags: ['core'],
    minVersion: '16',
  },
  {
    file: 'DeeplyNested.tsx',
    name: 'Deeply Nested',
    tags: ['core'],
    minVersion: '16',
  },
  {
    file: 'MemberExpressions.tsx',
    name: 'Member Expressions',
    tags: ['core'],
    minVersion: '16',
  },
  {
    file: 'EventHandlers.tsx',
    name: 'Event Handlers',
    tags: ['core'],
    minVersion: '16',
  },
  {
    file: 'HOCs.tsx',
    name: 'Higher-Order Components',
    tags: ['core'],
    minVersion: '16',
  },
  {
    file: 'RenderProps.tsx',
    name: 'Render Props',
    tags: ['core'],
    minVersion: '16',
  },
  {
    file: 'Memo.tsx',
    name: 'React.memo & Refs',
    tags: ['core'],
    minVersion: '16',
  },
  {
    file: 'DynamicContent.tsx',
    name: 'Dynamic Content',
    tags: ['core', 'capture'],
    minVersion: '16',
  },
  {
    file: 'TypeScriptFeatures.tsx',
    name: 'TypeScript Features',
    tags: ['core'],
    minVersion: '16',
  },
  {
    file: 'EdgeCases.tsx',
    name: 'Edge Cases',
    tags: ['core'],
    minVersion: '16',
  },

  // Advanced patterns
  {
    file: 'Portals.tsx',
    name: 'Portals',
    tags: ['advanced'],
    minVersion: '16',
  },
  {
    file: 'Context.tsx',
    name: 'Context API',
    tags: ['advanced'],
    minVersion: '16',
  },
  {
    file: 'LazyLoading.tsx',
    name: 'Lazy Loading & Suspense',
    tags: ['advanced'],
    minVersion: '16',
  },
  {
    file: 'SSRHydration.tsx',
    name: 'SSR/Hydration',
    tags: ['advanced'],
    minVersion: '16',
  },
  {
    file: 'SVGElements.tsx',
    name: 'SVG Elements',
    tags: ['advanced'],
    minVersion: '16',
  },
  {
    file: 'ErrorBoundaries.tsx',
    name: 'Error Boundaries',
    tags: ['advanced'],
    minVersion: '16',
  },
  {
    file: 'AdvancedHooks.tsx',
    name: 'Advanced Hooks',
    tags: ['advanced'],
    minVersion: '16',
  },
  {
    file: 'React18Features.tsx',
    name: 'React 18 Features',
    tags: ['advanced', 'framework-specific'],
    minVersion: '18',
  },
  {
    file: 'Styling.tsx',
    name: 'Styling Patterns',
    tags: ['advanced'],
    minVersion: '16',
  },
  {
    file: 'ChildrenManipulation.tsx',
    name: 'Children Manipulation',
    tags: ['advanced'],
    minVersion: '16',
  },
  {
    file: 'RefPatterns.tsx',
    name: 'Ref Patterns',
    tags: ['advanced'],
    minVersion: '16',
  },
  {
    file: 'CompoundComponents.tsx',
    name: 'Compound Components',
    tags: ['advanced'],
    minVersion: '16',
  },

  // Smoke test / capture
  {
    file: 'SmokeTest.tsx',
    name: 'Smoke Test',
    tags: ['smoke-test', 'capture'],
    minVersion: '16',
  },

  // Utilities
  {
    file: 'CaptureIcon.tsx',
    name: 'Capture Icon',
    tags: ['capture'],
    minVersion: '16',
  },
  {
    file: 'LazyComponent.tsx',
    name: 'Lazy Component',
    tags: ['advanced'],
    minVersion: '16',
  },
];

const vueComponents: ComponentEntry[] = [
  // Core Patterns
  {
    file: 'BasicElements.vue',
    name: 'Basic Elements',
    tags: ['core'],
    minVersion: '3',
  },
  {
    file: 'SelfClosing.vue',
    name: 'Self-Closing Elements',
    tags: ['core'],
    minVersion: '3',
  },
  {
    file: 'TemplateRefs.vue',
    name: 'Template Refs',
    tags: ['core', 'framework-specific'],
    minVersion: '3',
  },
  {
    file: 'VFor.vue',
    name: 'v-for Lists',
    tags: ['core', 'framework-specific'],
    minVersion: '3',
  },
  {
    file: 'ConditionalRendering.vue',
    name: 'Conditional Rendering',
    tags: ['core'],
    minVersion: '3',
  },
  {
    file: 'DeeplyNested.vue',
    name: 'Deeply Nested',
    tags: ['core'],
    minVersion: '3',
  },
  {
    file: 'EventHandlers.vue',
    name: 'Event Handlers',
    tags: ['core'],
    minVersion: '3',
  },
  {
    file: 'TwoWayBinding.vue',
    name: 'Two-Way Binding (v-model)',
    tags: ['core', 'framework-specific'],
    minVersion: '3',
  },
  {
    file: 'DynamicContent.vue',
    name: 'Dynamic Content',
    tags: ['core', 'capture'],
    minVersion: '3',
  },
  {
    file: 'TypeScriptFeatures.vue',
    name: 'TypeScript Features',
    tags: ['core'],
    minVersion: '3',
  },

  // Vue-Specific Patterns
  {
    file: 'CompositionVsOptions.vue',
    name: 'Composition vs Options API',
    tags: ['advanced', 'framework-specific'],
    minVersion: '3',
  },
  {
    file: 'ReactivitySystem.vue',
    name: 'Reactivity System',
    tags: ['advanced', 'framework-specific'],
    minVersion: '3',
  },
  {
    file: 'Watchers.vue',
    name: 'Watchers',
    tags: ['advanced', 'framework-specific'],
    minVersion: '3',
  },
  {
    file: 'PropsAndEmits.vue',
    name: 'Props and Emits',
    tags: ['advanced', 'framework-specific'],
    minVersion: '3',
  },
  {
    file: 'Slots.vue',
    name: 'Slots',
    tags: ['advanced', 'framework-specific'],
    minVersion: '3',
  },
  {
    file: 'ProvideInject.vue',
    name: 'Provide/Inject',
    tags: ['advanced', 'framework-specific'],
    minVersion: '3',
  },
  {
    file: 'Teleport.vue',
    name: 'Teleport',
    tags: ['advanced', 'framework-specific'],
    minVersion: '3',
  },
  {
    file: 'Suspense.vue',
    name: 'Suspense',
    tags: ['advanced', 'framework-specific'],
    minVersion: '3',
  },
  {
    file: 'Transitions.vue',
    name: 'Transitions',
    tags: ['advanced', 'framework-specific'],
    minVersion: '3',
  },
  {
    file: 'KeepAlive.vue',
    name: 'KeepAlive',
    tags: ['advanced', 'framework-specific'],
    minVersion: '3',
  },
  {
    file: 'Composables.vue',
    name: 'Composables',
    tags: ['advanced', 'framework-specific'],
    minVersion: '3',
  },
  {
    file: 'CustomDirectives.vue',
    name: 'Custom Directives',
    tags: ['advanced', 'framework-specific'],
    minVersion: '3',
  },

  // Advanced Patterns
  {
    file: 'AsyncComponents.vue',
    name: 'Async Components',
    tags: ['advanced'],
    minVersion: '3',
  },
  {
    file: 'ErrorHandling.vue',
    name: 'Error Handling',
    tags: ['advanced'],
    minVersion: '3',
  },
  {
    file: 'DynamicComponents.vue',
    name: 'Dynamic Components',
    tags: ['advanced'],
    minVersion: '3',
  },
  {
    file: 'RenderFunctions.vue',
    name: 'Render Functions',
    tags: ['advanced'],
    minVersion: '3',
  },
  {
    file: 'Mixins.vue',
    name: 'Mixins',
    tags: ['advanced'],
    minVersion: '3',
  },

  // Smoke test / capture
  {
    file: 'SmokeTest.vue',
    name: 'Smoke Test',
    tags: ['smoke-test', 'capture'],
    minVersion: '3',
  },

  // Utilities
  {
    file: 'CaptureIcon.vue',
    name: 'Capture Icon',
    tags: ['capture'],
    minVersion: '3',
  },
];

/**
 * Next.js-specific components (inherits all React components + Next-specific patterns).
 */
const nextComponents: ComponentEntry[] = [
  {
    file: 'ServerComponent.tsx',
    name: 'Server Component',
    tags: ['core', 'framework-specific'],
    minVersion: '13',
  },
  {
    file: 'ClientComponent.tsx',
    name: 'Client Component',
    tags: ['core', 'framework-specific'],
    minVersion: '13',
  },
  {
    file: 'LayoutPattern.tsx',
    name: 'Layout Pattern',
    tags: ['core', 'framework-specific'],
    minVersion: '13',
  },
  {
    file: 'ServerActions.tsx',
    name: 'Server Actions',
    tags: ['advanced', 'framework-specific'],
    minVersion: '14',
  },
  {
    file: 'DynamicRoutes.tsx',
    name: 'Dynamic Routes',
    tags: ['advanced', 'framework-specific'],
    minVersion: '13',
  },
  {
    file: 'Streaming.tsx',
    name: 'Streaming & Suspense',
    tags: ['advanced', 'framework-specific'],
    minVersion: '13',
  },
  {
    file: 'ImageOptimization.tsx',
    name: 'Image Optimization',
    tags: ['advanced', 'framework-specific'],
    minVersion: '13',
  },
  {
    file: 'Metadata.tsx',
    name: 'Metadata API',
    tags: ['advanced', 'framework-specific'],
    minVersion: '13',
  },
];

/**
 * Nuxt-specific components (inherits all Vue components + Nuxt-specific patterns).
 */
const nuxtComponents: ComponentEntry[] = [
  {
    file: 'AutoImports.vue',
    name: 'Auto Imports',
    tags: ['core', 'framework-specific'],
    minVersion: '3',
  },
  {
    file: 'NuxtLayout.vue',
    name: 'Nuxt Layout',
    tags: ['core', 'framework-specific'],
    minVersion: '3',
  },
  {
    file: 'ServerRoutes.vue',
    name: 'Server Routes',
    tags: ['advanced', 'framework-specific'],
    minVersion: '3',
  },
  {
    file: 'UseFetch.vue',
    name: 'useFetch Composable',
    tags: ['advanced', 'framework-specific'],
    minVersion: '3',
  },
  {
    file: 'NuxtPlugins.vue',
    name: 'Nuxt Plugins',
    tags: ['advanced', 'framework-specific'],
    minVersion: '3',
  },
  {
    file: 'Middleware.vue',
    name: 'Route Middleware',
    tags: ['advanced', 'framework-specific'],
    minVersion: '3',
  },
  {
    file: 'NuxtIsland.vue',
    name: 'Nuxt Island',
    tags: ['advanced', 'framework-specific'],
    minVersion: '3',
  },
  {
    file: 'StateManagement.vue',
    name: 'State Management (useState)',
    tags: ['advanced', 'framework-specific'],
    minVersion: '3',
  },
];

type Framework = 'react' | 'vue' | 'next' | 'nuxt';

/**
 * Maps meta-frameworks to their base framework for component inheritance.
 * Next.js inherits all React components, Nuxt inherits all Vue components.
 */
const frameworkInheritance: Partial<Record<Framework, Framework>> = {
  next: 'react',
  nuxt: 'vue',
};

const componentRegistry: Record<Framework, ComponentEntry[]> = {
  react: reactComponents,
  vue: vueComponents,
  next: nextComponents,
  nuxt: nuxtComponents,
};

/**
 * Compare semantic versions (major only for simplicity).
 * Returns true if `version` >= `minVersion`.
 */
function versionSatisfies(version: string, minVersion: string): boolean {
  const v = parseInt(version, 10);
  const min = parseInt(minVersion, 10);
  return !isNaN(v) && !isNaN(min) && v >= min;
}

/**
 * Get components for a given framework and version.
 * Components from lower versions are inherited (e.g. React 19 gets all React 18 components).
 * Meta-frameworks inherit their base framework components (Next inherits React, Nuxt inherits Vue).
 */
export function getComponentsForFixture(
  framework: string,
  frameworkVersion: string,
  tags?: string[],
): ComponentEntry[] {
  const fw = framework as Framework;

  // Start with base framework components for meta-frameworks
  const baseFramework = frameworkInheritance[fw];
  let allComponents: ComponentEntry[] = [];

  if (baseFramework) {
    // Inherit base framework components (e.g., React components for Next.js)
    const baseComponents = componentRegistry[baseFramework] ?? [];
    // Use the base framework's version mapping for inherited components
    // Next 15 → React 18+, Nuxt 3 → Vue 3
    const baseVersion = getBaseFrameworkVersion(fw, frameworkVersion);
    allComponents = baseComponents.filter((c) =>
      versionSatisfies(baseVersion, c.minVersion),
    );
  }

  // Add framework-specific components
  const ownComponents = componentRegistry[fw];
  if (ownComponents) {
    const filtered = ownComponents.filter((c) =>
      versionSatisfies(frameworkVersion, c.minVersion),
    );
    allComponents = [...allComponents, ...filtered];
  }

  if (tags && tags.length > 0) {
    allComponents = allComponents.filter((c) =>
      tags.some((t) => c.tags.includes(t as ComponentEntry['tags'][number])),
    );
  }

  return allComponents;
}

/**
 * Map meta-framework version to base framework version.
 */
function getBaseFrameworkVersion(
  framework: Framework,
  frameworkVersion: string,
): string {
  const ver = parseInt(frameworkVersion, 10);
  if (framework === 'next') {
    // Next.js 13-15 uses React 18+
    if (ver >= 13) return '18';
    return '16';
  }
  if (framework === 'nuxt') {
    // Nuxt 3 uses Vue 3
    if (ver >= 3) return '3';
    return '2';
  }
  return frameworkVersion;
}

/**
 * Check if a framework is a meta-framework (Next.js, Nuxt).
 */
export function isMetaFramework(framework: string): boolean {
  return framework in frameworkInheritance;
}

/**
 * Get the base framework for a meta-framework.
 */
export function getBaseFramework(framework: string): string | null {
  return frameworkInheritance[framework as Framework] ?? null;
}

/**
 * Get all registered frameworks.
 */
export function getRegisteredFrameworks(): Framework[] {
  return Object.keys(componentRegistry) as Framework[];
}

/**
 * Get all component entries for a framework (all versions).
 */
export function getAllComponents(framework: string): ComponentEntry[] {
  return componentRegistry[framework as Framework] ?? [];
}

/**
 * Re-export capture expectations for each framework/version.
 * These define what props/state/data-ds values we expect when
 * capturing elements via the overlay picker in E2E tests.
 */
export {
  react18Expectations,
  getPageExpectation as getReact18PageExpectation,
  getExpectationPageIds as getReact18ExpectationPageIds,
  type PageExpectation,
  type ElementExpectation,
} from './react/18/expectations.js';

export {
  vue3Expectations,
  getPageExpectation as getVue3PageExpectation,
  getExpectationPageIds as getVue3ExpectationPageIds,
} from './vue/3/expectations.js';

export {
  react19Expectations,
  getPageExpectation as getReact19PageExpectation,
  getExpectationPageIds as getReact19ExpectationPageIds,
} from './react/19/expectations.js';

export {
  next15Expectations,
  getPageExpectation as getNext15PageExpectation,
  getExpectationPageIds as getNext15ExpectationPageIds,
} from './next/15/expectations.js';

export {
  nuxt3Expectations,
  getPageExpectation as getNuxt3PageExpectation,
  getExpectationPageIds as getNuxt3ExpectationPageIds,
} from './nuxt/3/expectations.js';
