/**
 * v1 - Lazy, cached calculation
 *
 * A wrapper isn't interesting.
 *
 * The first mark of a Signal is lazy, cached calculations. With these we can
 * define a hierarchy of calculations to be evaluated lazily
 */

const Unset = Symbol("Unset");
export class Signal<T = unknown> {
    protected _value: T = Unset as T;

    // given a calculation, we can lazily evaluate it
    constructor(protected calc: () => T) {}

    public get(): T {
        if (this._value == Unset) {
            // ...and store the result
            this._value = this.calc();
        }
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
