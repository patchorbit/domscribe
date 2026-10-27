import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import type { Browser, Locator, Page } from 'playwright';
import {
  JourneySchema,
  ProposalSchema,
  type Journey,
  type Observation,
  type Proposal,
  type Target,
} from './schema.js';

class Refusal extends Error {
  constructor(public code: NonNullable<Observation['errorCode']>) {
    super(code);
  }
}
function locate(page: Page, target: Target): Locator {
  const root = target.scope
    ? page.getByRole(target.scope.role, {
        name: target.scope.name,
        exact: true,
      })
    : page;
  const locator = root.getByRole(target.role, {
    name: target.name,
    exact: true,
  });
  return target.text ? locator.filter({ hasText: target.text }) : locator;
}
async function unique(
  page: Page,
  target: Target,
  timeout: number,
): Promise<Locator> {
  if (
    target.scope &&
    (await page
      .getByRole(target.scope.role, { name: target.scope.name, exact: true })
      .count()) !== 1
  )
    throw new Refusal('target_ambiguous');
  const locator = locate(page, target);
  // Password inputs deliberately have no textbox role. Do not accidentally fill
  // one through a future locator fallback or read it as evidence.
  const root = target.scope
    ? page.getByRole(target.scope.role, {
        name: target.scope.name,
        exact: true,
      })
    : page;
  const labeled = root.getByLabel(target.name, { exact: true });
  if (
    (await labeled.count()) === 1 &&
    (await labeled.evaluate(
      (e) =>
        e instanceof HTMLInputElement &&
        ['password', 'file', 'hidden'].includes(e.type),
    ))
  )
    throw new Refusal('unsafe_target');
  if ((await locator.count()) > 1) throw new Refusal('target_ambiguous');
  try {
    await locator.waitFor({ state: 'visible', timeout });
  } catch {
    if ((await locator.count()) > 1) throw new Refusal('target_ambiguous');
    throw new Refusal('target_unavailable');
  }
  if ((await locator.count()) !== 1) throw new Refusal('target_ambiguous');
  if (
    await locator.evaluate(
      (e) =>
        e instanceof HTMLInputElement &&
        ['password', 'file', 'hidden'].includes(e.type),
    )
  )
    throw new Refusal('unsafe_target');
  return locator;
}
export async function executeJourney(
  browser: Browser,
  url: string,
  rawPlan: Proposal['plans'][number],
  rawJourney: Journey,
  outputDir: string,
  phase: Observation['phase'],
  options: { timeout: number; signal?: AbortSignal },
): Promise<Observation> {
  const journey = JourneySchema.parse(rawJourney),
    plan = ProposalSchema.parse({ version: 1, plans: [rawPlan], uncovered: [] })
      .plans[0];
  if (plan.journeyId !== journey.id) throw Error('Journey mismatch');
  const origin = new URL(url).origin;
  if (
    new URL(url).hostname !== '127.0.0.1' ||
    new URL(url).protocol !== 'http:'
  )
    throw Error('Localhost URL required');
  const context = await browser.newContext({ serviceWorkers: 'block' });
  const observation: Observation = {
    journeyId: journey.id,
    phase,
    status: 'action_failed',
    actuals: [],
    artifacts: [],
    errorCount: 0,
    networkErrorCount: 0,
  };
  const abort = () => {
    void context.close().catch(() => {
      /* The verification context may already be closed. */
    });
  };
  options.signal?.addEventListener('abort', abort, { once: true });
  try {
    options.signal?.throwIfAborted();
    await context.route('**/*', (route) =>
      new URL(route.request().url()).origin === origin
        ? route.continue()
        : route.abort('blockedbyclient'),
    );
    const page = await context.newPage();
    page.setDefaultTimeout(options.timeout);
    page.setDefaultNavigationTimeout(options.timeout);
    page.on('requestfailed', () => {
      observation.networkErrorCount = (observation.networkErrorCount ?? 0) + 1;
    });
    page.on('response', (response) => {
      if (response.status() >= 400)
        observation.networkErrorCount =
          (observation.networkErrorCount ?? 0) + 1;
    });
    page.on('pageerror', () => observation.errorCount++);
    page.on('console', (message) => {
      if (message.type() === 'error') observation.errorCount++;
    });
    await page.goto(url, { waitUntil: 'load' });
    for (const step of plan.steps) {
      options.signal?.throwIfAborted();
      if (step.action === 'navigate') {
        const destination = new URL(step.pathname, origin);
        if (
          destination.origin !== origin ||
          decodeURIComponent(destination.pathname)
            .split('/')
            .some((v) => v === '..' || v === '.') ||
          /%(?:2f|5c|00)/i.test(destination.pathname)
        )
          throw new Refusal('navigation_blocked');
        await page.goto(destination.href, { waitUntil: 'load' });
        continue;
      }
      if (new URL(page.url()).origin !== origin)
        throw new Refusal('navigation_blocked');
      const target = await unique(page, step.target, options.timeout);
      if (step.action === 'click') await target.click();
      else if (step.action === 'press') await target.press(step.key);
      else if (step.action === 'fill') await target.fill(step.value);
      else if (step.action === 'check') await target.setChecked(step.checked);
      else await target.selectOption(step.value);
    }
    const deadline = Date.now() + options.timeout;
    do {
      const actuals: Observation['actuals'] = [];
      for (const expectation of journey.expectations) {
        const target =
          expectation.kind === 'count'
            ? locate(page, expectation.target)
            : await unique(page, expectation.target, options.timeout);
        const value =
          expectation.kind === 'count'
            ? await target.count()
            : expectation.kind === 'value'
              ? await target.inputValue()
              : expectation.kind === 'checked'
                ? await target.isChecked()
                : (await target.innerText()).trim();
        if (typeof value === 'string' && value.length > 2000)
          throw new Refusal('observation_overflow');
        actuals.push({
          expectationId: expectation.id,
          value,
        });
      }
      observation.actuals = actuals;
      if (
        actuals.every((a) =>
          Object.is(
            a.value,
            journey.expectations.find((e) => e.id === a.expectationId)
              ?.expected,
          ),
        ) ||
        Date.now() >= deadline
      )
        break;
      await new Promise((resolve) =>
        setTimeout(resolve, Math.min(100, Math.max(1, deadline - Date.now()))),
      );
    } while (Date.now() <= deadline);
    if (new URL(page.url()).origin !== origin)
      throw new Refusal('navigation_blocked');
    observation.status = 'completed';
    await mkdir(join(outputDir, 'artifacts'), { recursive: true, mode: 0o700 });
    const artifact = `artifacts/${journey.id}-${phase}.png`;
    await page.screenshot({
      path: join(outputDir, artifact),
      timeout: 2000,
      mask: [page.locator('input[type=password],input[type=file]')],
    });
    observation.artifacts.push(artifact);
  } catch (error) {
    observation.status = 'action_failed';
    observation.errorCode =
      error instanceof Refusal ? error.code : 'browser_error';
    observation.actuals = [];
  } finally {
    options.signal?.removeEventListener('abort', abort);
    await context.close();
  }
  return observation;
}
