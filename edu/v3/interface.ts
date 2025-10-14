import { Signal, WriteableSignal } from "./signal.ts";

/**
 * Defines a leaf node in a reactive state graph.
 */
export function signal<T>(value: T): WriteableSignal<T> {
    return new WriteableSignal(value);
}

/**
 * Defines a readonly node in a reactive state graph, whose value is
 * computed as a product of other reactive nodes
 */
export function computed<T>(calc: () => T): Signal<T> {
    return new Signal(calc);
}

/**
 * An action that should run as a result of changes to reactive state
 * (e.g. rendering, serializing/saving, etc.)
 */
export function effect(fn: () => void) {}
