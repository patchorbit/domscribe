import { z } from 'zod/v4';
import {
  AnnotationIdSchema,
  ComponentIdentitySchema,
  RuntimeContextSchema,
} from './annotation.js';
import { PortableLocatorSchema } from './target.js';
import { ReplayTraceSchema } from './replay.js';

const text = z.string().trim().min(1).max(20000);
export const IssueSourceSchema = z
  .object({
    file: z
      .string()
      .min(1)
      .max(4096)
      .refine(
        (file) =>
          !file.startsWith('/') &&
          !/^[a-z]:/i.test(file) &&
          !/[\\\0]/.test(file) &&
          !file
            .split('/')
            .some((part) => part === '..' || part === '.' || part === ''),
        'Source must be a project-relative POSIX path',
      ),
    line: z.number().int().min(1),
    column: z.number().int().min(0),
    fileHash: z
      .string()
      .regex(/^[a-f0-9]{16}$/)
      .optional(),
  })
  .strict();
export const IssueExportOptionsSchema = z
  .object({
    expected: text,
    observed: text,
    title: z.string().trim().min(1).max(256).optional(),
    steps: z.array(text).max(100).default([]),
    prerequisites: z.array(text).max(100).default([]),
    includeRuntime: z.boolean().default(false),
    includeReplay: z.boolean().default(false),
  })
  .strict();
export type IssueExportOptions = z.input<typeof IssueExportOptionsSchema>;
export const IssuePacketSchema = z
  .object({
    version: z.literal(1),
    title: z.string().trim().min(1).max(256),
    expected: text,
    observed: text,
    steps: z.array(text).max(100),
    prerequisites: z.array(text).max(100),
    capture: z
      .object({
        annotationId: AnnotationIdSchema,
        timestamp: z.iso.datetime(),
        pathname: z
          .string()
          .startsWith('/')
          .max(2048)
          .refine(
            (value) => !/[?#\0]/.test(value),
            'Only a pathname is portable',
          ),
        element: z
          .object({
            tagName: z.string().min(1).max(64),
            text: z.string().max(2048).optional(),
          })
          .strict(),
        locator: PortableLocatorSchema.optional(),
      })
      .strict(),
    source: IssueSourceSchema.optional(),
    runtime: RuntimeContextSchema.extend({
      componentIdentity: ComponentIdentitySchema.strict().optional(),
    })
      .strict()
      .optional(),
    replay: ReplayTraceSchema.optional(),
    portability: z
      .object({
        locator: z.enum([
          'available',
          'not_captured',
          'privacy',
          'context_required',
          'identity_too_long',
        ]),
        replay: z.enum([
          'available',
          'not_included',
          'not_recorded',
          'privacy',
        ]),
      })
      .strict(),
  })
  .strict()
  .superRefine((packet, ctx) => {
    const locator = packet.capture.locator;
    if (
      (packet.portability.locator === 'available') !==
        Boolean(locator && !locator.unsupportedReason) ||
      (locator?.unsupportedReason &&
        packet.portability.locator !== locator.unsupportedReason)
    )
      ctx.addIssue({
        code: 'custom',
        message: 'Locator availability must agree with captured evidence',
      });
    if ((packet.portability.replay === 'available') !== Boolean(packet.replay))
      ctx.addIssue({
        code: 'custom',
        message: 'Replay availability must agree with recorded steps',
      });
  });
export type IssuePacket = z.infer<typeof IssuePacketSchema>;
export const IssueInspectionSchema = z
  .object({
    packet: IssuePacketSchema,
    sourceStatus: z.enum([
      'matched',
      'changed',
      'missing',
      'unverified',
      'unsafe',
    ]),
  })
  .strict();
export type IssueInspection = z.infer<typeof IssueInspectionSchema>;
