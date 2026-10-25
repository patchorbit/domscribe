import { z } from 'zod';
import { ManifestEntryIdSchema } from './manifest.js';

const IdentityAttributesSchema = z.partialRecord(
  z.enum([
    'id',
    'data-testid',
    'data-test',
    'aria-label',
    'name',
    'type',
    'role',
  ]),
  z.string().max(256),
);
export const LocatorIdentitySchema = z
  .object({
    tagName: z
      .string()
      .regex(/^[a-z][a-z0-9-]*$/)
      .max(64),
    attributes: IdentityAttributesSchema,
    text: z.string().max(128).optional(),
    heading: z.string().max(128).optional(),
  })
  .strict();
export const PortableLocatorSchema = z
  .object({
    version: z.literal(1),
    pathname: z.string().startsWith('/').max(2048),
    element: LocatorIdentitySchema,
    // Nearest identified ancestor first; these scopes are conjunctive.
    ancestors: z.array(LocatorIdentitySchema).max(4),
  })
  .strict();
export type PortableLocator = z.infer<typeof PortableLocatorSchema>;
export type LocatorIdentity = z.infer<typeof LocatorIdentitySchema>;

export const ElementTargetSchema = z.object({
  instanceId: z.string().min(1).max(128),
  entryId: ManifestEntryIdSchema.optional(),
  selector: z.string().min(1).max(256),
  locator: PortableLocatorSchema,
  disabled: z.boolean(),
});
export type ElementTarget = z.infer<typeof ElementTargetSchema>;

export const TargetQuerySchema = z
  .object({
    mode: z.enum(['list', 'resolve']).default('resolve'),
    entryId: ManifestEntryIdSchema.optional(),
    instanceId: z.string().min(1).max(128).optional(),
    locator: PortableLocatorSchema.optional(),
    limit: z.number().int().min(1).max(200).default(50),
  })
  .strict()
  .refine((value) => !(value.instanceId && value.locator), {
    message: 'Use an instanceId or a portable locator, not both',
  })
  .refine(
    (value) => value.mode !== 'list' || !(value.instanceId || value.locator),
    {
      message: 'List queries accept only a source entry filter',
    },
  );
export type TargetQuery = z.infer<typeof TargetQuerySchema>;
export type TargetQueryInput = z.input<typeof TargetQuerySchema>;

export const TargetStatusSchema = z.enum([
  'listed',
  'resolved',
  'ambiguous',
  'not_found',
  'stale',
  'wrong_page',
  'not_ready',
  'ambiguous_browser',
  'unavailable',
]);
export const TargetResolutionSchema = z.object({
  status: TargetStatusSchema,
  targets: z.array(ElementTargetSchema).max(200),
  total: z.number().int().nonnegative(),
});
export type TargetResolution = z.infer<typeof TargetResolutionSchema>;
