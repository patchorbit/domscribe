import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createApp, defineComponent, h, Teleport, type App } from 'vue';
import { RuntimeManager } from '@domscribe/runtime';
import type { VueComponentInstance } from '../internals/types.js';
import { VueAdapter } from './vue-adapter.js';

let app: App;
let host: HTMLElement;
let runtime: RuntimeManager;

beforeEach(async () => {
  host = document.createElement('div');
  document.body.append(host);
  const Anchor = Object.assign(
    defineComponent({
      name: 'SharedAnchor',
      props: { appearance: String },
      setup: () => () => h('button', 'Generate Token'),
    }),
    { __file: '/vendor/Anchor.vue' },
  );
  const Button = Object.assign(
    defineComponent({
      name: 'SharedButton',
      setup: () => () => h(Anchor, { appearance: 'quiet' }),
    }),
    { __file: '/vendor/Button.vue' },
  );
  const Owner = Object.assign(
    defineComponent({
      name: 'CollectionOAuth',
      props: { recordId: String, clientSecret: String, envs: Array },
      setup: () => () => h(Teleport, { to: document.body }, h(Button)),
    }),
    { __file: '/app/components/OAuth2.vue' },
  );
  app = createApp(Owner, {
    recordId: 'alpha',
    clientSecret: 'private-fixture-value',
    envs: [
      {
        key: 'TOKEN',
        secret: true,
        currentValue: 'private-environment-value',
        initialValue: 'private-environment-initial',
      },
      { key: 'PUBLIC', secret: false, currentValue: 'public-setting' },
    ],
  });
  app.mount(host);
  window.__DOMSCRIBE_RELAY_PORT__ = 4500;
  runtime = RuntimeManager.getInstance();
  await runtime.initialize({ adapter: new VueAdapter() });
});

afterEach(() => {
  app?.unmount();
  host?.remove();
  RuntimeManager.resetInstance();
  delete window.__DOMSCRIBE_RELAY_PORT__;
});

describe('source-owning context through shared Vue controls', () => {
  it('captures the manifest owner across wrappers and Teleport with redaction', async () => {
    const options = {
      includeProps: true,
      sourceFile: '/app/components/OAuth2.vue',
    };
    const context = await runtime.captureContextForElement(
      document.querySelector('button')!,
      options,
    );

    expect(context?.componentProps).toMatchObject({
      recordId: 'alpha',
      clientSecret: '[REDACTED]',
    });
    expect(context).toMatchObject({
      componentIdentity: {
        name: 'CollectionOAuth',
        sourceFile: '/app/components/OAuth2.vue',
        sourceMatch: 'matched',
      },
    });
    expect(JSON.stringify(context)).not.toContain('private-fixture-value');
    expect(JSON.stringify(context)).not.toContain('private-environment-');
    expect(context?.componentProps).toMatchObject({
      envs: ['[REDACTED]', { key: 'PUBLIC', currentValue: 'public-setting' }],
    });
  });

  it('labels unavailable ownership rather than guessing by a duplicate basename', async () => {
    const options = {
      includeProps: true,
      sourceFile: '/different/components/OAuth2.vue',
    };
    const context = await runtime.captureContextForElement(
      document.querySelector('button')!,
      options,
    );

    expect(context?.componentProps).toMatchObject({ appearance: 'quiet' });
    expect(context).toMatchObject({
      componentIdentity: {
        name: 'SharedAnchor',
        requestedSourceFile: '/different/components/OAuth2.vue',
        sourceMatch: 'unavailable',
      },
    });
  });

  it('honors props/state opt-outs after selecting the source owner', async () => {
    const options = {
      includeProps: false,
      includeState: false,
      sourceFile: '/app/components/OAuth2.vue',
    };
    const context = await runtime.captureContextForElement(
      document.querySelector('button')!,
      options,
    );

    expect(context?.componentProps).toBeUndefined();
    expect(context?.componentState).toBeUndefined();
    expect(context).toMatchObject({
      componentIdentity: { name: 'CollectionOAuth', sourceMatch: 'matched' },
    });
  });
  it('bounds cyclic ancestry and preserves exact functional-owner metadata', () => {
    const element = document.querySelector('button')!;
    const adapter = new VueAdapter();
    const component = adapter.getComponentInstance(
      element,
    ) as VueComponentInstance;
    const parent = component.parent;
    component.parent = component;
    expect(
      adapter.resolveSourceComponent(element, '/missing/OAuth2.vue'),
    ).toBeNull();
    component.parent = parent;
    expect(
      new VueAdapter({ maxTreeDepth: 1 }).resolveSourceComponent(
        element,
        '/app/components/OAuth2.vue',
      ),
    ).toBeNull();
    const originalType = component.type;
    component.type = Object.assign(
      function FunctionalOwner() {
        return null;
      },
      { __file: '/app/Functional.tsx' },
    );
    expect(
      adapter.resolveSourceComponent(element, '/app/Functional.tsx')?.component,
    ).toBe(component);
    component.type = originalType;
  });
});
