/**
 * v0 - Interface
 *
 * A signal starts with a wrapper around a value, and a means of unwrapping
 * that value.
 *
 * More interesting are the public functions: our basic building blocks are
 * a function for defining a writable leaf "node", a function for defining a
 * readonly, dependent calculation, and a function for defining side-effects
 * of calculations
 */

interface SignalNode {}

/**
 * Every node in the graph with lines coming up out of it is a "Producer".
 *
 * They "produce" values to their dependents higher in the graph.
 */
interface Producer<T = unknown> extends SignalNode {
    value: T;
    /**
     * Because some Producers must compute their value, it's handy to have
     * a common interface for guaranteeing that their value is up to date.
     */
    resolveValue(): void;
}

/**
 * Every node in the graph with lines coming down out of it is a "Consumer".
 *
 * They "consume" values from their dependencies lower in the graph.
 */
interface Consumer extends SignalNode {}

/**
 * "State"s are simple, mutable wrappers around their values.
 *
 * They are the "inputs" to the Signal graph--the "basic facts" from which
 * all other calculations flow.
 */
export class State<T> implements Producer<T> {
    /**
     * It's unfortunate that value is public on this class, but our interfaces
     * help us to not expose it where we don't want to.
     *
     * Even so, compare the implementation in /src for another way to keep
     * these values hidden.
     */
    constructor(public value: T) {}

    public get(): T {
        return this.value;
    }

    public set(value: T): void {
        this.value = value;
    }

    // No-op for State, as its value is directly set
    public resolveValue(): void {}
}

const UNSET = Symbol("UNSET");
/**
 * "Computed"s are readonly, derived values. They should be thought of as
 * pure functions that take other Producers as inputs.
 */
export class Computed<T> implements Producer<T>, Consumer {
    /**
     * UNSET may seem an odd choice here, but consider that we want to support
     * `null` and `undefined` as valid computed values. Therefore it's not
     * possible to use either of those as a sentinel for "not yet computed".
     *
     * Symbols have the useful property of being unique--they are only equal to
     * themselves--so we can be sure that no Computed can ever return this value.
     */
    public value = UNSET as T;

    constructor(private readonly compute: () => T) {}

    public get(): T {
        // let the value settle before returning it
        this.resolveValue();
        return this.value;
    }

    public resolveValue(): void {
        this.value = this.compute();
    }
}
