import {
    Computed,
    type ReadonlySignal,
    State,
    type WritableSignal,
} from "./signal.ts";

/**
 * Defines a leaf node in a reactive state graph.
 * @see {@link State}
 */
export function state<T>(initialValue: T): WritableSignal<T> {
    return new State(initialValue);
}

/**
 * Defines a readonly node in a reactive state graph, whose value is
 * computed as a product of other reactive nodes
 * @see {@link Computed}
 */
export function computed<T>(compute: () => T): ReadonlySignal<T> {
    return new Computed(compute);
}

/**
 * An schedulable action that should run as a result of changes to reactive state
 * (e.g. rendering, saving/serialization, etc.)
 *
 * (We won't come back to this for a while, but it's valuable to know that it's
 * coming.)
 */
export function effect(fn: () => void) {}
