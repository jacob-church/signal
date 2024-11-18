import { type EqFunc, Signal } from "./signal.ts";

export function signal<T>(defaultValue: T, eqFn?: EqFunc<T>): Signal<T> {
    return new Simple(defaultValue, eqFn);
}

class Simple<T> extends Signal<T> {
    constructor(defaultValue: T, equals?: EqFunc<T>) {
        super(equals);
        this._value = defaultValue;
    }

    protected override getValue(): T {
        return this._value;
    }

    protected override setValue(value: T): void {
        if (!this.equals(value, this._value)) {
            this._value = value;
            this.setDirty();
        }
    }
}
