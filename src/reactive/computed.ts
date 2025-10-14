import { Signal } from "./signal.ts";

/**
 * A {@link Reactive} cached computation.
 *
 * A {@link ReadonlySignal} that computes a given function and returns it's
 * output.
 *
 * Guaranteed to be up-to-date with any updates to transitive {@link Signal}
 * dependencies.
 */
export class Computed<T> extends Signal<T> {
    constructor(
        protected override compute: () => T,
        equals?: (a: T, b: T) => boolean,
    ) {
        super(equals);
    }
}

/**
 * A {@link Signal} that exposes only it's public getter.
 */
export type ReadonlySignal<T> = Computed<T>;
