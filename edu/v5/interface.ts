import { Computed, Effect, State } from "./signal.ts";

export interface Signal<T> {
    get(): T;
}
export type ReadonlySignal<T> = Signal<T>;

export interface WritableSignal<T> extends Signal<T> {
    set(value: T): void;
}

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
 */
export function effect(fn: () => void) {
    return new Effect(fn);
}

/**
 * Runs all scheduled effects.
 */
export function runEffects(): void {
    Effect.flush();
}
