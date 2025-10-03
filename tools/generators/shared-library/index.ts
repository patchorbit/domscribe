/**
 * Shared library generator stubs out the structure for future Nx generators that
 * build workspace-level libraries. The implementation is intentionally lean so
 * teams can extend it as we formalize our conventions.
 */
import type { Tree } from '@nx/devkit';

/**
 * Schema describing the consumer-supplied options for the shared library generator.
 */
export interface SharedLibraryGeneratorSchema {
  /** Normalized name of the library to scaffold. */
  name: string;
}

/**
 * Placeholder implementation for the shared library generator. For now it simply
 * validates that a name is provided and returns without mutating the tree. The
 * stub keeps unit tests and future extensions in place while we finalize the
 * desired scaffold.
 */
export default async function sharedLibraryGenerator(
  _tree: Tree,
  options: SharedLibraryGeneratorSchema,
): Promise<void> {
  if (!options.name || options.name.trim().length === 0) {
    throw new Error('sharedLibraryGenerator requires a non-empty "name" option.');
  }
}
