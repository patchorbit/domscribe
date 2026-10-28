import { createHash } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { chromium } from 'playwright';
import {
  ConfigSchema,
  ProposalSchema,
  type Config,
  type Proposal,
  type Metadata,
  type Observation,
} from './schema.js';
import {
  prepareWorktrees,
  safeAppRoot,
  assertUnchanged,
  type Prepared,
} from './workspace.js';
import { runCommand, startApp } from './process.js';
import { stageFixtures, type StagedFixture } from './fixtures.js';
import { executeJourney } from './browser.js';
import { gradeInvestigation } from './grade.js';
import { renderReport } from './report.js';

export type DiscoveryContext = {
  config: Config;
  prepared: Prepared;
  baseUrl: string;
  headUrl: string;
  headApp: string;
  fixtures: StagedFixture[];
  signal: AbortSignal;
};
export type DiscoveryResult = {
  proposal: Proposal;
  browserUsed: boolean;
  domscribeUsed: boolean;
  model: string | null;
};
export type Discover = (context: DiscoveryContext) => Promise<DiscoveryResult>;
const digest = (value: string) =>
  createHash('sha256').update(value).digest('hex');

export async function investigate(
  rawConfig: unknown,
  out: string,
  discover: Discover,
  externalSignal?: AbortSignal,
) {
  const config = ConfigSchema.parse(rawConfig);
  const prepared = await prepareWorktrees(
    config.repo,
    config.base,
    config.head,
    out,
  );
  const timer = new AbortController();
  const deadline = setTimeout(() => timer.abort(), config.timeouts.total);
  const signal = externalSignal
    ? AbortSignal.any([timer.signal, externalSignal])
    : timer.signal;
  const metadata: Metadata = {
    baseCommit: prepared.baseCommit,
    headCommit: prepared.headCommit,
    configDigest: digest(JSON.stringify(config)),
    diffDigest: digest(prepared.diff),
    at: new Date().toISOString(),
    environment: 'local-trusted-repo',
    agentBrowserUsed: false,
    domscribeUsed: false,
    model: null,
    requestedModel: config.agent.model,
    reasoningEffort: config.agent.reasoningEffort,
  };
  let proposal: Proposal = {
    version: 1,
    plans: [],
    uncovered: config.journeys.map((j) => ({
      journeyId: j.id,
      reason: 'Setup or discovery did not complete; inspect private run logs',
    })),
  };
  const observations: Observation[] = [];
  const sessions: Awaited<ReturnType<typeof startApp>>[] = [];
  let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
  let stage = 'setup';
  try {
    await writeFile(join(prepared.output, 'diff.patch'), prepared.diff, {
      mode: 0o600,
    });
    const baseApp = await safeAppRoot(prepared.baseDir, config.appRoot),
      headApp = await safeAppRoot(prepared.headDir, config.appRoot);
    stage = 'install';
    for (const [phase, app] of [
      ['base', baseApp],
      ['head', headApp],
    ])
      await runCommand(
        config.install,
        app,
        join(prepared.output, phase + '-install.log'),
        config.timeouts.install,
        signal,
      );
    await assertUnchanged(prepared);
    stage = 'startup';
    const base = await startApp(
      config.start,
      baseApp,
      join(prepared.output, 'base-app.log'),
      config.timeouts.start,
      signal,
    );
    sessions.push(base);
    const head = await startApp(
      config.start,
      headApp,
      join(prepared.output, 'head-app.log'),
      config.timeouts.start,
      signal,
    );
    sessions.push(head);
    const fixtures = await stageFixtures(headApp, config.fixtures);
    stage = 'discovery';
    const result = await discover({
      config,
      prepared,
      baseUrl: base.url,
      headUrl: head.url,
      headApp,
      fixtures,
      signal,
    });
    proposal = ProposalSchema.parse(result.proposal);
    metadata.agentBrowserUsed = result.browserUsed;
    metadata.domscribeUsed = result.domscribeUsed;
    metadata.model = result.model;
    // Validate all plan/expectation references before executing any proposed action.
    gradeInvestigation(config, proposal, [], metadata);
    stage = 'integrity';
    await assertUnchanged(prepared);
    stage = 'verification';
    browser = await chromium.launch({
      headless: true,
      timeout: config.timeouts.start,
    });
    await writeFile(
      join(prepared.output, 'verification-browser.json'),
      JSON.stringify(
        { version: browser.version(), node: process.version },
        null,
        2,
      ) + '\n',
      { mode: 0o600 },
    );
    for (const journey of config.journeys) {
      const plan = proposal.plans.find((p) => p.journeyId === journey.id);
      if (!plan) continue;
      for (const [phase, url] of [
        ['base', base.url],
        ['head', head.url],
        ['head-repeat', head.url],
      ] as const) {
        signal.throwIfAborted();
        observations.push(
          await executeJourney(
            browser,
            url,
            plan,
            journey,
            prepared.output,
            phase,
            {
              timeout: config.timeouts.step,
              signal,
              fixtures: config.fixtures,
            },
          ),
        );
      }
    }
    stage = 'integrity';
    await assertUnchanged(prepared);
  } catch {
    await writeFile(
      join(prepared.output, 'diagnostic.json'),
      JSON.stringify({ stage, cancelled: signal.aborted }, null, 2) + '\n',
      { mode: 0o600 },
    );
    // No raw exception goes into a shareable comment: process output may contain
    // repository/private data. Stable, explicit failure is more useful than green.
    if (observations.length) {
      for (const observation of observations) {
        observation.status = 'setup_failed';
        observation.errorCode =
          stage === 'integrity' ? 'source_changed' : 'setup_failed';
      }
    } else
      proposal = {
        version: 1,
        plans: [],
        uncovered: config.journeys.map((j) => ({
          journeyId: j.id,
          reason:
            'Setup, discovery, integrity check or deadline failed; inspect private run logs',
        })),
      };
  } finally {
    clearTimeout(deadline);
    await browser?.close();
    for (const session of sessions.reverse()) await session.stop();
    await prepared.cleanup();
  }
  const report = gradeInvestigation(config, proposal, observations, metadata);
  await writeFile(
    join(prepared.output, 'report.json'),
    JSON.stringify(report, null, 2) + '\n',
    { mode: 0o600 },
  );
  await writeFile(join(prepared.output, 'comment.md'), renderReport(report), {
    mode: 0o600,
  });
  await writeFile(
    join(prepared.output, 'proposal.json'),
    JSON.stringify(proposal, null, 2) + '\n',
    { mode: 0o600 },
  );
  return report;
}
