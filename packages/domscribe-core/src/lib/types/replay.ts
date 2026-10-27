import { z } from 'zod/v4';
import { PortableLocatorSchema } from './target.js';

const RecordedValueSchema = z
  .string()
  .max(10000)
  .refine(
    (value) => !value.includes('[REDACTED'),
    'Redacted input cannot be replayed',
  );
export const ReplayActionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('click') }).strict(),
  z.object({ action: z.literal('fill'), value: RecordedValueSchema }).strict(),
  z.object({ action: z.literal('check'), checked: z.boolean() }).strict(),
  z
    .object({ action: z.literal('select'), value: RecordedValueSchema })
    .strict(),
]);
export type ReplayAction = z.infer<typeof ReplayActionSchema>;
export const ReplayStepSchema = z
  .object({
    target: PortableLocatorSchema,
    action: z.enum(['click', 'fill', 'check', 'select']),
    value: RecordedValueSchema.optional(),
    checked: z.boolean().optional(),
  })
  .strict()
  .superRefine((step, ctx) => {
    const { target, ...action } = step;
    if (!ReplayActionSchema.safeParse(action).success)
      ctx.addIssue({ code: 'custom', message: 'Invalid replay action' });
    if (
      target.unsupportedReason ||
      JSON.stringify(target).includes('[REDACTED')
    )
      ctx.addIssue({
        code: 'custom',
        message:
          target.unsupportedReason === 'context_required'
            ? 'Portable dialog replay requires a stable, non-secret data-ds-context key'
            : 'Portable identity cannot be replayed',
      });
    if (
      ['password', 'file'].includes(
        (target.element.attributes.type ?? '').toLowerCase(),
      )
    )
      ctx.addIssue({
        code: 'custom',
        message: 'Sensitive input targets cannot be replayed',
      });
  });
export const ReplayTraceSchema = z
  .object({
    version: z.literal(1),
    steps: z.array(ReplayStepSchema).min(1).max(200),
  })
  .strict();
export type ReplayTrace = z.infer<typeof ReplayTraceSchema>;
export type ReplayStep = ReplayTrace['steps'][number];
