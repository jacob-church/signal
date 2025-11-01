import type { ReadonlySignal } from "./types.ts";

/**
 * A simple wrapper around a value, for use in cases where an interface
 * wants a Signal, but there's no need for the memory overhead of an actual
 * Signal object.
 */
export class Constant<T> implements ReadonlySignal<Readonly<T>> {
    constructor(private readonly value: T) {}

    public get(): T {
        return this.value;
    }
}
