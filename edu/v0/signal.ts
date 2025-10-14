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

export class Signal<T = unknown> {
    protected _value: T;

    // at it's most basic, a signal is a wrapper around a value
    constructor(protected calc: () => T) {
        this._value = calc();
    }

    // getting the inner value requires unwrapping the box
    public get(): T {
        return this._value;
    }
}

export class WriteableSignal<T = unknown> extends Signal<T> {
    constructor(initialValue: T) {
        super(() => initialValue);
    }

    public set(newVal: T) {
        this.calc = () => newVal;
        this._value = newVal;
    }
}
