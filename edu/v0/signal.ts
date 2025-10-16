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

const UNSET = Symbol("UNSET");

export abstract class Signal<T = unknown> {
    /**
     * Using a unique Symbol for our uninitialized state guarantees that we can
     * store values like `null` and `undefined` without ambiguity
     */
    protected _value: T = UNSET as T;

    // all Signals expose a getter to the internal value
    public get(): T {
        return this._value;
    }
}

/**
 * The basic purpose of a State/Writable Signal is to act as a "leaf node" in a
 * Signal graph.
 *
 * This Signal type holds a piece of state, and can be easily overwritten,
 * representing a change in fundamental state from which other computations
 * flow.
 */
export class State<T> extends Signal<T> {
    constructor(initialValue: T) {
        super();
        this._value = initialValue;
    }

    public set(value: T): void {
        this._value = value;
    }
}
export type WritableSignal<T = unknown> = State<T>;

/**
 * A typical Computed/ReadonlySignal is a dependant value--it computes as a
 * function of other Signals (whether they be WritableSignals, or other
 * ReadonlySignals).
 */
export class Computed<T> extends Signal<T> {
    constructor(compute: () => T) {
        super();
        this._value = compute();
    }
}
export type ReadonlySignal<T = unknown> = Computed<T>;
