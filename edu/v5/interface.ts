import {
    Computed,
    Effect,
    type ReadonlySignal,
    State,
    type WritableSignal,
} from "./signal.ts";

/**
 * Defines a leaf node in a reactive state graph.
 * @see {@link State}
 */
export function state<T>(
    initialValue: T,
    equals?: (a: T, b: T) => boolean,
): WritableSignal<T> {
    return new State(initialValue, equals);
}

/**
 * Defines a readonly node in a reactive state graph, whose value is
 * computed as a product of other reactive nodes
 * @see {@link Computed}
 */
export function computed<T>(
    compute: () => T,
    equals?: (a: T, b: T) => boolean,
): ReadonlySignal<T> {
    return new Computed(compute, equals);
}

/**
 * An schedulable action that should run as a result of changes to reactive state
 * (e.g. rendering, saving/serialization, etc.)
 * @see {@link Effect}
 */
export function effect(fn: () => void): Effect {
    return new Effect(fn);
}
