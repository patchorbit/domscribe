import { z } from 'zod';

/**
 * v1 session payload, ratified in RFC 0002 §(4).
 *
 * Fields are deliberately enumerated (strict mode) — any unknown field is rejected.
 * This is a privacy guarantee: a relay cannot accidentally leak content by adding
 * a new field; the server returns 400 until the schema is bumped here in lockstep.
 */
export const SessionPayloadSchema = z
  .object({
    protocol_version: z
      .string()
      .regex(/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/, 'expected SemVer'),
    daemon_version: z
      .string()
      .regex(/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/, 'expected SemVer'),
    session_id: z
      .string()
      .min(8)
      .max(64)
      .regex(/^[A-Za-z0-9_-]+$/, 'expected url-safe id'),
    platform: z.enum(['darwin', 'linux', 'win32', 'freebsd', 'openbsd']),
    node_version: z
      .string()
      .regex(/^v?\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/, 'expected node SemVer'),
    primary_framework: z.enum([
      'react',
      'vue',
      'next',
      'nuxt',
      'svelte',
      'astro',
      'solid',
      'unknown',
    ]),
  })
  .strict();

export type SessionPayload = z.infer<typeof SessionPayloadSchema>;

/**
 * KV record stored under `session:<week>:<session_id>`.
 *
 * Held flat (no envelope) so the value stays small and a future reader can JSON.parse
 * without a wrapper. `first_seen_at` is the only field added server-side.
 */
export interface StoredSession {
  protocol_version: string;
  daemon_version: string;
  platform: string;
  node_version: string;
  primary_framework: string;
  first_seen_at: string;
}
