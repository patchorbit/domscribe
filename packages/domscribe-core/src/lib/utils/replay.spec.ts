import { describe, expect, it } from 'vitest';
import {
  replaySteps,
  ReplayTraceSchema,
  ReplayStepSchema,
  type ReplayDriver,
} from '../../index.js';

const locator = {
  version: 1 as const,
  pathname: '/',
  element: { tagName: 'button', attributes: { 'aria-label': 'Save' } },
  ancestors: [],
};
const target = {
  instanceId: 'fresh-instance',
  selector: '[data-ds-instance="fresh-instance"]',
  locator,
  disabled: false,
};
const trace = {
  version: 1 as const,
  steps: [
    { action: 'click' as const, target: locator },
    {
      action: 'fill' as const,
      target: {
        ...locator,
        element: { tagName: 'input', attributes: { name: 'city' } },
      },
      value: 'Austin',
    },
  ],
};
function driver(): {
  driver: ReplayDriver;
  actions: string[];
  resolves: string[];
} {
  const actions: string[] = [],
    resolves: string[] = [];
  return {
    actions,
    resolves,
    driver: {
      async resolve(locator) {
        resolves.push(locator.element.tagName);
        return { status: 'resolved', targets: [target], total: 1 };
      },
      async act(step, selected) {
        actions.push(`${step.action}:${selected.instanceId}`);
      },
    },
  };
}
describe('portable replay through a browser driver', () => {
  it('resolves each serialized target anew before executing each real driver action', async () => {
    const run = driver();
    const result = await replaySteps(
      JSON.parse(JSON.stringify(trace)),
      run.driver,
    );
    expect(result.status).toBe('completed');
    expect(result.completed).toBe(2);
    expect(run.resolves).toEqual(['button', 'input']);
    expect(run.actions).toEqual([
      'click:fresh-instance',
      'fill:fresh-instance',
    ]);
  });
  it('stops before acting on an ambiguous target and never attempts later steps', async () => {
    const run = driver();
    run.driver.resolve = async () => ({
      status: 'ambiguous',
      targets: [target, target],
      total: 2,
    });
    const result = await replaySteps(trace, run.driver);
    expect(result).toMatchObject({
      status: 'stopped',
      completed: 0,
      failedStep: 0,
      reason: 'ambiguous',
    });
    expect(run.actions).toEqual([]);
  });
  it('stops after a failed browser action without pretending the flow completed', async () => {
    const run = driver();
    run.driver.act = async () => {
      throw new Error('Button is covered');
    };
    expect(await replaySteps(trace, run.driver)).toMatchObject({
      status: 'stopped',
      completed: 0,
      failedStep: 0,
      reason: 'action_failed',
    });
    expect(run.resolves).toEqual(['button']);
  });
  it('does not trust inconsistent successful driver resolution or redacted inputs', async () => {
    const run = driver();
    run.driver.resolve = async () => ({
      status: 'resolved',
      targets: [target, target],
      total: 2,
    });
    expect(await replaySteps(trace, run.driver)).toMatchObject({
      status: 'stopped',
      completed: 0,
      reason: 'ambiguous',
    });
    expect(
      ReplayTraceSchema.safeParse({
        version: 1,
        steps: [{ action: 'fill', target: locator, value: '[REDACTED]' }],
      }).success,
    ).toBe(false);
    expect(ReplayTraceSchema.safeParse({ version: 2, steps: [] }).success).toBe(
      false,
    );
    expect(ReplayStepSchema.safeParse(trace.steps[0]).success).toBe(true);
  });
  it('refuses a freshly resolved sensitive input even when the original trace omitted type', async () => {
    const run = driver();
    run.driver.resolve = async () => ({
      status: 'resolved',
      targets: [
        {
          ...target,
          inputType: 'password',
          locator: {
            ...locator,
            element: { tagName: 'input', attributes: { type: 'PASSWORD' } },
          },
        },
      ],
      total: 1,
    });
    const result = await replaySteps(trace, run.driver);
    expect(result).toMatchObject({
      status: 'stopped',
      completed: 0,
      reason: 'sensitive_target',
    });
    expect(run.actions).toEqual([]);
  });
});
