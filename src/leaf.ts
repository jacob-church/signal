import { type EqFunc, Signal } from "./signal.ts";

/**
 * A signal that houses a value; a leaf node in the signal graph
 *
 * @param defaultValue the initial value that this Signal returns
 * @param eqFn (optional) a method for comparing signal inputs to verify if the signal value has meaningfully changed; defaults to "=="
 * @returns Signal<T>
 */
export function signal<T>(defaultValue: T, eqFn?: EqFunc<T>): Signal<T> {
    return new Leaf(defaultValue, eqFn);
}

class Leaf<T> extends Signal<T> {
    constructor(defaultValue: T, equals?: EqFunc<T>) {
        super(() => defaultValue, equals);
    }

    public override get value(): T {
        return super.value;
    }

    public override set value(value: T) {
        if (!this.equals(value, this.internal)) {
            this.calc = () => value;
            this.setDirty();
        }
    }
}
