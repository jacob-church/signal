import { type EqFunc, Signal } from "./signal.ts";

export function computed<T>(calc: () => T, eq?: EqFunc<T>): Signal<T> {
    return new Computed(calc, eq);
}

class Computed<T> extends Signal<T> {
    constructor(private calc: () => T, equals?: EqFunc<T>) {
        super(equals);
    }

    protected override getValue(): T {
        return this.calc();
    }

    protected override setValue(_: T): void {
        throw new Error("`.value` is not writeable.");
    }
}
