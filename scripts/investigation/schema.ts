import { z } from 'zod/v4';

const id = z.string().regex(/^[a-z][a-z0-9-]{0,63}$/);
const text = z.string().trim().min(1).max(2000);
const relative = z
  .string()
  .min(1)
  .max(2048)
  .refine(
    (v) =>
      !v.startsWith('/') &&
      !/^[a-z]:/i.test(v) &&
      !/[\\\0]/.test(v) &&
      !v.split('/').some((p) => p === '..' || p === '.' || p === ''),
  );
export const TargetSchema = z
  .object({
    role: z.enum([
      'button',
      'textbox',
      'checkbox',
      'combobox',
      'heading',
      'cell',
      'row',
      'link',
      'region',
      'article',
      'dialog',
      'listitem',
      'status',
      'alert',
      'tab',
      'option',
      'table',
      'list',
      'navigation',
    ]),
    name: z.string().min(1).max(300),
    scope: z
      .object({
        role: z.enum([
          'article',
          'region',
          'dialog',
          'row',
          'listitem',
          'table',
          'list',
          'navigation',
        ]),
        name: z.string().min(1).max(300),
      })
      .strict()
      .optional(),
  })
  .strict();
const value = z.union([
  z.string().max(2000),
  z.boolean(),
  z.number().int().min(0).max(100000),
]);
export const ExpectationSchema = z.discriminatedUnion('kind', [
  z
    .object({
      id,
      target: TargetSchema,
      kind: z.literal('text'),
      expected: z.string().max(2000),
    })
    .strict(),
  z
    .object({
      id,
      target: TargetSchema,
      kind: z.literal('value'),
      expected: z.string().max(2000),
    })
    .strict(),
  z
    .object({
      id,
      target: TargetSchema,
      kind: z.literal('checked'),
      expected: z.boolean(),
    })
    .strict(),
  z
    .object({
      id,
      target: TargetSchema,
      kind: z.literal('count'),
      expected: z.number().int().min(0).max(100000),
    })
    .strict(),
]);
export const JourneySchema = z
  .object({
    id,
    intent: text,
    expectations: z.array(ExpectationSchema).min(1).max(20),
  })
  .strict()
  .refine(
    (j) =>
      new Set(j.expectations.map((e) => e.id)).size === j.expectations.length,
    'Duplicate expectation IDs',
  );
const argv = z
  .array(
    z
      .string()
      .min(1)
      .max(2048)
      .refine((v) => !v.includes('\0')),
  )
  .min(1)
  .max(40);
export const ConfigSchema = z
  .object({
    version: z.literal(1),
    repo: z.string().min(1).max(4096),
    base: text,
    head: text,
    appRoot: z.union([z.literal('.'), relative]).default('.'),
    install: argv,
    start: argv.refine(
      (args) => args.some((v) => v.includes('{port}')),
      'Start command must include {port}',
    ),
    brief: z.string().max(12000).default(''),
    journeys: z.array(JourneySchema).min(1).max(10),
    timeouts: z
      .object({
        install: z.number().int().min(100).max(300000).default(180000),
        start: z.number().int().min(100).max(120000).default(60000),
        agent: z.number().int().min(100).max(900000).default(360000),
        step: z.number().int().min(100).max(15000).default(5000),
        total: z.number().int().min(1000).max(1800000).default(900000),
      })
      .strict()
      .default({
        install: 180000,
        start: 60000,
        agent: 360000,
        step: 5000,
        total: 900000,
      }),
    domscribe: z.boolean().default(false),
  })
  .strict()
  .refine(
    (c) => new Set(c.journeys.map((j) => j.id)).size === c.journeys.length,
    'Duplicate journey IDs',
  );
const target = TargetSchema;
export const StepSchema = z.discriminatedUnion('action', [
  z
    .object({
      action: z.literal('navigate'),
      pathname: z
        .string()
        .startsWith('/')
        .max(2048)
        .refine(
          (v) =>
            !v.startsWith('//') &&
            !/[\\\0?#]/.test(v) &&
            !v.split('/').some((s) => s === '..' || s === '.'),
          'Same-origin pathname required',
        ),
    })
    .strict(),
  z.object({ action: z.literal('click'), target }).strict(),
  z
    .object({ action: z.literal('fill'), target, value: z.string().max(1000) })
    .strict(),
  z
    .object({ action: z.literal('check'), target, checked: z.boolean() })
    .strict(),
  z
    .object({ action: z.literal('select'), target, value: z.string().max(300) })
    .strict(),
]);
export const ProposalSchema = z
  .object({
    version: z.literal(1),
    plans: z
      .array(
        z
          .object({ journeyId: id, steps: z.array(StepSchema).min(1).max(40) })
          .strict(),
      )
      .max(10),
    uncovered: z
      .array(z.object({ journeyId: id, reason: text }).strict())
      .max(10),
  })
  .strict()
  .refine((p) => {
    const ids = [...p.plans, ...p.uncovered].map((p) => p.journeyId);
    return new Set(ids).size === ids.length;
  }, 'Duplicate journey plans');
export const ObservationSchema = z
  .object({
    journeyId: id,
    phase: z.enum(['base', 'head', 'head-repeat']),
    status: z.enum(['completed', 'action_failed', 'setup_failed']),
    actuals: z.array(z.object({ expectationId: id, value }).strict()).max(20),
    artifacts: z.array(relative).max(5),
    errorCount: z.number().int().min(0),
    errorCode: z
      .enum([
        'target_unavailable',
        'target_ambiguous',
        'unsafe_target',
        'navigation_blocked',
        'browser_error',
        'setup_failed',
        'source_changed',
      ])
      .optional(),
  })
  .strict()
  .refine(
    (o) =>
      new Set(o.actuals.map((a) => a.expectationId)).size === o.actuals.length,
    'Duplicate actual observations',
  );
export const MetadataSchema = z
  .object({
    baseCommit: z
      .string()
      .regex(/^[a-f0-9]{40}$/)
      .nullable(),
    headCommit: z
      .string()
      .regex(/^[a-f0-9]{40}$/)
      .nullable(),
    configDigest: z.string().regex(/^[a-f0-9]{64}$/),
    diffDigest: z
      .string()
      .regex(/^[a-f0-9]{64}$/)
      .nullable(),
    at: z.iso.datetime(),
    environment: z.literal('local-trusted-repo'),
    agentBrowserUsed: z.boolean(),
    domscribeUsed: z.boolean(),
    model: z.string().max(200).nullable(),
  })
  .strict();
const FindingSchema = z
  .object({
    fingerprint: z.string().regex(/^[a-f0-9]{64}$/),
    expectationId: id,
    expected: value,
    actual: value,
    artifacts: z.array(relative).max(15),
  })
  .strict();
export const ReportSchema = z
  .object({
    version: z.literal(1),
    metadata: MetadataSchema,
    status: z.enum(['verified', 'partial', 'blocked', 'unqualified']),
    journeys: z
      .array(
        z
          .object({
            id,
            intent: text,
            status: z.enum([
              'regression',
              'passed',
              'pre_existing',
              'inconclusive',
              'uncovered',
            ]),
            reason: text,
            findings: z.array(FindingSchema).max(20),
            observations: z.array(ObservationSchema).max(3),
          })
          .strict(),
      )
      .max(10),
  })
  .strict();
export type Config = z.infer<typeof ConfigSchema>;
export type Proposal = z.infer<typeof ProposalSchema>;
export type Observation = z.infer<typeof ObservationSchema>;
export type Metadata = z.infer<typeof MetadataSchema>;
export type Report = z.infer<typeof ReportSchema>;
export type Journey = z.infer<typeof JourneySchema>;
export type Target = z.infer<typeof TargetSchema>;
export function parseProposal(encoded: string): Proposal {
  if (Buffer.byteLength(encoded) > 1048576)
    throw Error('Proposal exceeds 1MiB');
  return ProposalSchema.parse(JSON.parse(encoded));
}
