import { useState } from 'react';
import { Navigation } from './Navigation';
import {
  AdvancedHooks,
  BasicElements,
  ChildrenManipulation,
  CompoundComponents,
  ConditionalRendering,
  Context,
  DeeplyNested,
  DynamicContent,
  EdgeCases,
  ErrorBoundaries,
  EventHandlers,
  Fragments,
  HOCs,
  LazyLoading,
  Lists,
  MemberExpressions,
  Memo,
  Portals,
  React18Features,
  RefPatterns,
  RenderProps,
  SSRHydration,
  SVGElements,
  SelfClosing,
  SmokeTest,
  Styling,
  TypeScriptFeatures,
} from './components';

interface ComponentConfig {
  id: string;
  title: string;
  description: string;
  component: React.ComponentType;
}

const components: ComponentConfig[] = [
  {
    id: 'advanced-hooks',
    title: 'Advanced Hooks',
    description: 'Advanced Hooks test component.',
    component: AdvancedHooks,
  },
  {
    id: 'basic-elements',
    title: 'Basic Elements',
    description: 'Basic Elements test component.',
    component: BasicElements,
  },
  {
    id: 'children-manipulation',
    title: 'Children Manipulation',
    description: 'Children Manipulation test component.',
    component: ChildrenManipulation,
  },
  {
    id: 'compound-components',
    title: 'Compound Components',
    description: 'Compound Components test component.',
    component: CompoundComponents,
  },
  {
    id: 'conditional-rendering',
    title: 'Conditional Rendering',
    description: 'Conditional Rendering test component.',
    component: ConditionalRendering,
  },
  {
    id: 'context',
    title: 'Context',
    description: 'Context test component.',
    component: Context,
  },
  {
    id: 'deeply-nested',
    title: 'Deeply Nested',
    description: 'Deeply Nested test component.',
    component: DeeplyNested,
  },
  {
    id: 'dynamic-content',
    title: 'Dynamic Content',
    description: 'Dynamic Content test component.',
    component: DynamicContent,
  },
  {
    id: 'edge-cases',
    title: 'Edge Cases',
    description: 'Edge Cases test component.',
    component: EdgeCases,
  },
  {
    id: 'error-boundaries',
    title: 'Error Boundaries',
    description: 'Error Boundaries test component.',
    component: ErrorBoundaries,
  },
  {
    id: 'event-handlers',
    title: 'Event Handlers',
    description: 'Event Handlers test component.',
    component: EventHandlers,
  },
  {
    id: 'fragments',
    title: 'Fragments',
    description: 'Fragments test component.',
    component: Fragments,
  },
  {
    id: 'h-o-cs',
    title: 'H O Cs',
    description: 'H O Cs test component.',
    component: HOCs,
  },
  {
    id: 'lazy-loading',
    title: 'Lazy Loading',
    description: 'Lazy Loading test component.',
    component: LazyLoading,
  },
  {
    id: 'lists',
    title: 'Lists',
    description: 'Lists test component.',
    component: Lists,
  },
  {
    id: 'member-expressions',
    title: 'Member Expressions',
    description: 'Member Expressions test component.',
    component: MemberExpressions,
  },
  {
    id: 'memo',
    title: 'Memo',
    description: 'Memo test component.',
    component: Memo,
  },
  {
    id: 'portals',
    title: 'Portals',
    description: 'Portals test component.',
    component: Portals,
  },
  {
    id: 'react18-features',
    title: 'React18 Features',
    description: 'React18 Features test component.',
    component: React18Features,
  },
  {
    id: 'ref-patterns',
    title: 'Ref Patterns',
    description: 'Ref Patterns test component.',
    component: RefPatterns,
  },
  {
    id: 'render-props',
    title: 'Render Props',
    description: 'Render Props test component.',
    component: RenderProps,
  },
  {
    id: 's-s-r-hydration',
    title: 'S S R Hydration',
    description: 'S S R Hydration test component.',
    component: SSRHydration,
  },
  {
    id: 's-v-g-elements',
    title: 'S V G Elements',
    description: 'S V G Elements test component.',
    component: SVGElements,
  },
  {
    id: 'self-closing',
    title: 'Self Closing',
    description: 'Self Closing test component.',
    component: SelfClosing,
  },
  {
    id: 'smoke-test',
    title: 'Smoke Test',
    description: 'Smoke Test test component.',
    component: SmokeTest,
  },
  {
    id: 'styling',
    title: 'Styling',
    description: 'Styling test component.',
    component: Styling,
  },
  {
    id: 'type-script-features',
    title: 'Type Script Features',
    description: 'Type Script Features test component.',
    component: TypeScriptFeatures,
  },
];

export function App() {
  const [activeComponent, setActiveComponent] = useState('advanced-hooks');

  const currentComponent =
    components.find((c) => c.id === activeComponent) || components[0];
  const Component = currentComponent.component;

  return (
    <div className="app">
      <Navigation
        activeItem={activeComponent}
        onNavigate={setActiveComponent}
      />

      <main className="main-content">
        <div className="content-wrapper">
          <header className="page-header">
            <h1 className="page-title">{currentComponent.title}</h1>
            <p className="page-description">{currentComponent.description}</p>
          </header>

          <div className="component-section">
            <Component />
          </div>
        </div>
      </main>
    </div>
  );
}
