/**
 * v1 - Lazy, cached calculation
 *
 * A wrapper isn't interesting.
 *
 * The first mark of a Signal is lazy, cached calculations. With these we can
 * define a hierarchy of calculations to be evaluated lazily
 */

const UNSET = Symbol("UNSET");

export abstract class Signal<T = unknown> {
    protected _value: T = UNSET as T;

    public get(): T {
        /**
         * Computation is only necessary if the inner value hasn't been set
         * yet. Afterwards, our value is settled, and we don't need to repeat
         * the computation
         */
        if (this._value == UNSET) {
            this._value = this.compute();
        }
        return this._value;
    }

    /**
     * Resolving the Signal needs to happen only on demand, so we'll separate
     * it from the getter.
     */
    protected compute(): T {
        return this._value;
    }
}

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

export class Computed<T> extends Signal<T> {
    // That's it!
    constructor(protected override compute: () => T) {
        super();
    }
}
export type ReadonlySignal<T = unknown> = Computed<T>;
