/**
 * Nullable type utility
 * @module @domscribe/core/types/nullable
 */

/**
 * Represents a value that might be intentionally absent (null) or
 * missing due to implementation error (undefined).
 *
 * At plugin boundaries, both must be handled defensively.
 */
export type Nullable<T> = T | null | undefined;
