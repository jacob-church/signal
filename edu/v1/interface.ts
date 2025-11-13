import { Computed, State } from "./signal.ts";

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
 */
export function effect(fn: () => void) {}

/**
 * Runs all scheduled effects.
 */
export function runEffects(): void {}
