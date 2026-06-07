/**
 * Unit tests for FileAnnotationStorage
 *
 * Uses real temp directories to verify disk-based storage operations.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  mkdtempSync,
  rmSync,
  existsSync,
  readFileSync,
  writeFileSync,
} from 'fs';
import path from 'path';
import { tmpdir } from 'os';
import {
  ANNOTATION_SCHEMA_VERSION,
  AnnotationStatusEnum,
  type Annotation,
  type AnnotationStatus,
} from '@domscribe/core';
import { FileAnnotationStorage } from './file-annotation-storage.js';

const STATUSES: readonly AnnotationStatus[] = [
  AnnotationStatusEnum.QUEUED,
  AnnotationStatusEnum.PROCESSING,
  AnnotationStatusEnum.PROCESSED,
  AnnotationStatusEnum.FAILED,
  AnnotationStatusEnum.ARCHIVED,
] as const;

function createAnnotation(
  overrides: Partial<{
    id: string;
    status: AnnotationStatus;
    timestamp: string;
    userMessage: string;
  }> = {},
): Annotation {
  return {
    metadata: {
      id: overrides.id ?? 'test1234',
      timestamp: overrides.timestamp ?? '2025-01-01T00:00:00.000Z',
      mode: 'element-click',
      status: overrides.status ?? AnnotationStatusEnum.QUEUED,
    },
    interaction: {
      type: 'element-annotation',
      selectedElement: {
        tagName: 'div',
        selector: 'body > div',
      },
    },
    context: {
      pageUrl: 'http://localhost:3000',
      pageTitle: 'Test',
      viewport: { width: 1920, height: 1080 },
      userAgent: 'Test/1.0',
      userMessage: overrides.userMessage ?? 'Make it red',
    },
  } as Annotation;
}

describe('FileAnnotationStorage', () => {
  let baseDir: string;
  let storage: FileAnnotationStorage;

  beforeEach(() => {
    baseDir = mkdtempSync(path.join(tmpdir(), 'file-storage-test-'));
    storage = new FileAnnotationStorage(baseDir);
  });

  afterEach(() => {
    rmSync(baseDir, { recursive: true, force: true });
  });

  describe('initialize', () => {
    it('should create status directories', async () => {
      await storage.initialize(STATUSES);

      for (const status of STATUSES) {
        expect(existsSync(path.join(baseDir, status))).toBe(true);
      }
    });

    it('should be idempotent', async () => {
      await storage.initialize(STATUSES);
      await storage.initialize(STATUSES);

      for (const status of STATUSES) {
        expect(existsSync(path.join(baseDir, status))).toBe(true);
      }
    });
  });

  describe('write and read', () => {
    beforeEach(async () => {
      await storage.initialize(STATUSES);
    });

    it('should write annotation as JSON and read it back', async () => {
      const annotation = createAnnotation();

      await storage.write(annotation);

      const result = await storage.read(
        'test1234',
        AnnotationStatusEnum.QUEUED,
      );
      expect(result).not.toBeNull();
      expect(result?.metadata.id).toBe('test1234');
      expect(result?.context.userMessage).toBe('Make it red');
    });

    it('should return null for non-existent annotation', async () => {
      const result = await storage.read(
        'nonexistent',
        AnnotationStatusEnum.QUEUED,
      );
      expect(result).toBeNull();
    });

    it('should write valid JSON to disk', async () => {
      const annotation = createAnnotation();
      await storage.write(annotation);

      const filePath = path.join(baseDir, 'queued', 'test1234.json');
      const raw = readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(raw) as Annotation;
      expect(parsed.metadata.id).toBe('test1234');
    });

    it('should overwrite existing annotation', async () => {
      const annotation = createAnnotation();
      await storage.write(annotation);

      annotation.context.userMessage = 'Updated message';
      await storage.write(annotation);

      const result = await storage.read(
        'test1234',
        AnnotationStatusEnum.QUEUED,
      );
      expect(result?.context.userMessage).toBe('Updated message');
    });
  });

  describe('remove', () => {
    beforeEach(async () => {
      await storage.initialize(STATUSES);
    });

    it('should remove existing annotation and return true', async () => {
      const annotation = createAnnotation();
      await storage.write(annotation);

      const removed = await storage.remove(
        'test1234',
        AnnotationStatusEnum.QUEUED,
      );
      expect(removed).toBe(true);

      const result = await storage.read(
        'test1234',
        AnnotationStatusEnum.QUEUED,
      );
      expect(result).toBeNull();
    });

    it('should return false for non-existent annotation', async () => {
      const removed = await storage.remove(
        'nonexistent',
        AnnotationStatusEnum.QUEUED,
      );
      expect(removed).toBe(false);
    });
  });

  describe('listByStatus', () => {
    beforeEach(async () => {
      await storage.initialize(STATUSES);
    });

    it('should return empty array for empty status bucket', async () => {
      const result = await storage.listByStatus(AnnotationStatusEnum.QUEUED);
      expect(result).toEqual([]);
    });

    it('should return all annotations in a status bucket', async () => {
      await storage.write(createAnnotation({ id: 'ann00001' }));
      await storage.write(createAnnotation({ id: 'ann00002' }));
      await storage.write(
        createAnnotation({
          id: 'ann00003',
          status: AnnotationStatusEnum.PROCESSING,
        }),
      );

      const queued = await storage.listByStatus(AnnotationStatusEnum.QUEUED);
      expect(queued).toHaveLength(2);

      const processing = await storage.listByStatus(
        AnnotationStatusEnum.PROCESSING,
      );
      expect(processing).toHaveLength(1);
    });
  });

  describe('schema migration on read', () => {
    beforeEach(async () => {
      await storage.initialize(STATUSES);
    });

    it('should stamp schemaVersion on read when missing from persisted data', async () => {
      // Write a legacy annotation without schemaVersion directly to disk
      const legacy = createAnnotation({ id: 'legacy01' });
      const filePath = path.join(baseDir, 'queued', 'legacy01.json');
      writeFileSync(filePath, JSON.stringify(legacy, null, 2));

      const result = await storage.read(
        'legacy01',
        AnnotationStatusEnum.QUEUED,
      );
      expect(result).not.toBeNull();
      expect(result?.metadata.schemaVersion).toBe(ANNOTATION_SCHEMA_VERSION);
    });

    it('should stamp schemaVersion on listByStatus when missing from persisted data', async () => {
      const legacy = createAnnotation({ id: 'legacy02' });
      const filePath = path.join(baseDir, 'queued', 'legacy02.json');
      writeFileSync(filePath, JSON.stringify(legacy, null, 2));

      const results = await storage.listByStatus(AnnotationStatusEnum.QUEUED);
      expect(results).toHaveLength(1);
      expect(results[0].metadata.schemaVersion).toBe(ANNOTATION_SCHEMA_VERSION);
    });
  });

  describe('countByStatus', () => {
    beforeEach(async () => {
      await storage.initialize(STATUSES);
    });

    it('should return 0 for empty bucket', async () => {
      const count = await storage.countByStatus(AnnotationStatusEnum.QUEUED);
      expect(count).toBe(0);
    });

    it('should return correct count', async () => {
      await storage.write(createAnnotation({ id: 'ann00001' }));
      await storage.write(createAnnotation({ id: 'ann00002' }));

      const count = await storage.countByStatus(AnnotationStatusEnum.QUEUED);
      expect(count).toBe(2);
    });
  });
});
