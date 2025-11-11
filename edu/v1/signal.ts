/**
 * v1 - Lazy, cached calculation
 *
 * A wrapper isn't interesting.
 *
 * The first mark of a Signal is lazy, cached calculations. With these we can
 * define a hierarchy of calculations to be evaluated lazily
 */

interface SignalNode {}

interface Producer<T = unknown> extends SignalNode {
    value: T;
    resolveValue(): void;
}

interface Consumer extends SignalNode {}

export class State<T> implements Producer<T> {
    constructor(public value: T) {}

    public get(): T {
        return this.value;
    }

    public set(value: T): void {
        this.value = value;
    }

    public resolveValue(): void {}
}

const UNSET = Symbol("UNSET");
export class Computed<T> implements Producer<T>, Consumer {
    public value = UNSET as T;

    constructor(private readonly compute: () => T) {}

    public get(): T {
        this.resolveValue();
        return this.value;
    }

    public resolveValue(): void {
        /**
         * That's it! We already have lazy computation by virtue of waiting
         * until get() is called to compute the value, this check makes sure
         * that our value is also cached for future calls.
         */
        if (this.value === UNSET) {
            this.value = this.compute();
        }
    }
}
