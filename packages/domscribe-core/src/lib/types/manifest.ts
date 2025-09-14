/**
 * Canonical Manifest data model for Domscribe.
 * Represents the DOM→source mapping index for element resolution.
 * @module @domscribe/core/types/manifest
 */

import { z } from 'zod';
import { PATTERNS } from '../constants/index.js';

export const ManifestEntryIdSchema = z
  .string()
  .regex(PATTERNS.MANIFEST_ENTRY_ID)
  .describe('8-character nanoid for the manifest entry');

export const SourcePositionSchema = z.object({
  line: z.number().nullable().describe('Line number (1-indexed)'),
  column: z.number().nullable().describe('Column number (0-indexed)'),
  offset: z.number().optional().describe('Byte offset from start of file'),
});

export const StyleInfoSchema = z.object({
  file: z.string().optional().describe('Path to style file'),
  classNames: z.array(z.string()).optional().describe('Class names'),
  modules: z.boolean().optional().describe('Whether CSS modules are used'),
  inline: z.string().optional().describe('Inline style content'),
});

/**
 * Framework-specific component metadata
 */
export const ComponentMetadataSchema = z.record(
  z.string(),
  z.union([
    z.record(z.string(), z.unknown()),
    z.string(),
    z.number(),
    z.boolean(),
  ]),
);

export const ManifestEntrySchema = z.object({
  id: ManifestEntryIdSchema.describe(
    'Unique identifier for the manifest entry',
  ),
  elementId: z
    .string()
    .optional()
    .describe('Element ID from the <id> attribute'),
  file: z.string().describe('File path from project root'),
  start: SourcePositionSchema.describe('Start position in source'),
  end: SourcePositionSchema.optional().describe('End position in source'),
  tagName: z.string().optional().describe('HTML tag name'),
  styles: StyleInfoSchema.optional().describe('Associated styles'),
  parent: z.string().optional().describe('Parent entry ID'),
  children: z.array(z.string()).optional().describe('Child entry IDs'),
  isApproximateLocation: z
    .boolean()
    .optional()
    .describe('Whether the source location is approximate'),
  componentName: z.string().optional().describe('Component name'),
  dataBindings: z
    .record(z.string(), z.unknown())
    .optional()
    .describe('Component data bindings'),
  wrappers: z
    .array(z.string())
    .optional()
    .describe('Wrapper component names in order'),
  componentMetadata: ComponentMetadataSchema.optional().describe(
    'Framework-specific component metadata',
  ),
  fileHash: z
    .string()
    .optional()
    .describe('xxhash64 hash of file content at transform time (16 hex chars)'),
});

export const ManifestMetadataSchema = z.object({
  schemaVersion: z.string().describe('Schema version for the manifest format'),
  generatedAt: z.string().describe('Timestamp of manifest generation'),
  projectRoot: z.string().describe('Project root path'),
  framework: z.string().optional().describe('Framework being used'),
  frameworkVersion: z.string().optional().describe('Framework version'),
});

export const ManifestSchema = z.object({
  metadata: ManifestMetadataSchema.describe('Manifest metadata'),
  entries: z
    .map(ManifestEntryIdSchema, ManifestEntrySchema)
    .describe('Map of entry IDs to manifest entries'),
});

export const ManifestIndexSchema = z.object({
  idToFile: z
    .map(ManifestEntryIdSchema, z.string())
    .describe('Map of entry IDs to file paths'),
  fileToIds: z
    .map(z.string(), z.array(ManifestEntryIdSchema))
    .describe('Map of file paths to entry IDs'),
  componentToIds: z
    .map(z.string(), z.array(ManifestEntryIdSchema))
    .describe('Map of component names to entry IDs'),
  lastRebuild: z.string().describe('Timestamp of the last manifest rebuild'),
  entryCount: z.number().describe('Total number of entries in the manifest'),
});

export type SourcePosition = z.infer<typeof SourcePositionSchema>;
export type StyleInfo = z.infer<typeof StyleInfoSchema>;
export type ComponentMetadata = z.infer<typeof ComponentMetadataSchema>;

export type ManifestEntryId = z.infer<typeof ManifestEntryIdSchema>;
export type ManifestEntry = z.infer<typeof ManifestEntrySchema>;
export type ManifestMetadata = z.infer<typeof ManifestMetadataSchema>;
export type Manifest = z.infer<typeof ManifestSchema>;
export type ManifestIndex = z.infer<typeof ManifestIndexSchema>;
