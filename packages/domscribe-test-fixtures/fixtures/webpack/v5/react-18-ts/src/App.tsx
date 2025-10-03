import React from 'react';
import {
  BasicElements,
  SelfClosing,
  Fragments,
  Lists,
  ConditionalRendering,
  DeeplyNested,
  MemberExpressions,
  EventHandlers,
  HOCs,
  RenderProps,
  Memo,
  DynamicContent,
  TypeScriptFeatures,
  EdgeCases,
} from '@domscribe/test-fixtures/kitchen-sink-react';

export function App() {
  return (
    <div className="app">
      <h1>Domscribe Test Fixture - Webpack + React</h1>

      <section>
        <h2>Basic Elements</h2>
        <BasicElements />
      </section>

      <section>
        <h2>Self-Closing Elements</h2>
        <SelfClosing />
      </section>

      <section>
        <h2>Fragments</h2>
        <Fragments />
      </section>

      <section>
        <h2>Lists</h2>
        <Lists />
      </section>

      <section>
        <h2>Conditional Rendering</h2>
        <ConditionalRendering />
      </section>

      <section>
        <h2>Deeply Nested</h2>
        <DeeplyNested />
      </section>

      <section>
        <h2>Member Expressions</h2>
        <MemberExpressions />
      </section>

      <section>
        <h2>Event Handlers</h2>
        <EventHandlers />
      </section>

      <section>
        <h2>HOCs</h2>
        <HOCs />
      </section>

      <section>
        <h2>Render Props</h2>
        <RenderProps />
      </section>

      <section>
        <h2>Memo</h2>
        <Memo />
      </section>

      <section>
        <h2>Dynamic Content</h2>
        <DynamicContent />
      </section>

      <section>
        <h2>TypeScript Features</h2>
        <TypeScriptFeatures />
      </section>

      <section>
        <h2>Edge Cases</h2>
        <EdgeCases />
      </section>
    </div>
  );
}
