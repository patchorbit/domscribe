/**
 * Domscribe project configuration schema.
 * @module @domscribe/core/types/config
 */
import { z } from 'zod';

/**
 * Schema for `domscribe.config.json`.
 *
 * @remarks
 * Used in monorepo setups where the coding agent starts at the repo root
 * but the frontend app lives in a subdirectory. The config file sits at
 * the repo root and points to the app root where `.domscribe/` is located.
 */
export const DomscribeConfigSchema = z.object({
  appRoot: z
    .string()
    .describe(
      'Relative path from the config file to the frontend app root directory',
    ),
});

export type DomscribeConfig = z.infer<typeof DomscribeConfigSchema>;
