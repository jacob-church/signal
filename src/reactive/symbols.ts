/**
 * A unique value for initializing internal {@link Signal} state.
 *
 * Allows `undefined` and `null` to be valid internal {@link Signal} values,
 * without ambiguity.
 */
export const Unset = Symbol("Unset");
