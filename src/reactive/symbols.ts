/**
 * A unique value for initializing internal {@link Signal} state.
 *
 * Allows `undefined` and `null` to be valid internal {@link Signal} values,
 * without ambiguity.
 */
export const UNSET = Symbol("Unset");

/**
 * Used to detect circular dependencies in the Signal graph, or changes to the
 * Signal graph while a Signal is computing.
 */
export const COMPUTING = Symbol("Computing");
