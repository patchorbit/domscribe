import {
  ReplayTraceSchema,
  type ReplayStep,
  type ReplayTrace,
} from '../types/replay.js';
import type {
  ElementTarget,
  PortableLocator,
  TargetResolution,
} from '../types/target.js';

export interface ReplayDriver {
  /** Resolve in the current browser document; never reuse an old instance handle. */
  resolve(locator: PortableLocator): Promise<TargetResolution>;
  /** Use the browser's real action APIs and the strict target selector. */
  act(step: ReplayStep, target: ElementTarget): Promise<void>;
}
export interface ReplayResult {
  status: 'completed' | 'stopped';
  completed: number;
  failedStep?: number;
  reason?: string;
}

/** Re-resolve each portable target, stop at the first uncertainty or failure. */
export async function replaySteps(
  trace: ReplayTrace,
  driver: ReplayDriver,
): Promise<ReplayResult> {
  const parsed = ReplayTraceSchema.parse(trace);
  for (const [index, step] of parsed.steps.entries()) {
    let resolution: TargetResolution;
    try {
      resolution = await driver.resolve(step.target);
    } catch {
      return {
        status: 'stopped',
        completed: index,
        failedStep: index,
        reason: 'resolution_failed',
      };
    }
    if (
      resolution.status !== 'resolved' ||
      resolution.targets.length !== 1 ||
      resolution.total !== 1
    ) {
      return {
        status: 'stopped',
        completed: index,
        failedStep: index,
        reason:
          resolution.status === 'resolved' ? 'ambiguous' : resolution.status,
      };
    }
    const current = resolution.targets[0];
    const inputType = (
      current.inputType ??
      current.locator.element.attributes.type ??
      ''
    ).toLowerCase();
    if (
      current.locator.element.tagName === 'input' &&
      (!inputType || ['password', 'file'].includes(inputType))
    ) {
      return {
        status: 'stopped',
        completed: index,
        failedStep: index,
        reason: 'sensitive_target',
      };
    }
    try {
      await driver.act(step, resolution.targets[0]);
    } catch {
      return {
        status: 'stopped',
        completed: index,
        failedStep: index,
        reason: 'action_failed',
      };
    }
  }
  return { status: 'completed', completed: parsed.steps.length };
}
