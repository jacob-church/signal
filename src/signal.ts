function eq<T>(a: T, b: T) {
    return a == b;
}
export type EqFunc<T> = (a: T, b: T) => boolean;

const NoSignal = Symbol("NoSignal");

// deno-lint-ignore no-explicit-any
export abstract class Signal<T = any> {
    //////////////////////////////////////////////////////////////////////////////
    private static calculating: Signal | undefined = undefined;
    private static calculatingSet = new Set<Signal>();
    //////////////////////////////////////////////////////////////////////////////
    protected _value = NoSignal as T;
    private dirty = true;
    private dependents = new Set<Signal>();
    //////////////////////////////////////////////////////////////////////////////
    constructor(protected equals: EqFunc<T> = eq) {}
    //////////////////////////////////////////////////////////////////////////////
    public get value(): T {
        if (this.dirty) {
            this._value = this.recalculate();
            this.dirty = false;
        }
        return this._value;
    }
    public set value(value: T) {
        this.setValue(value);
    }
    //////////////////////////////////////////////////////////////////////////////
    protected abstract getValue(): T;
    protected abstract setValue(value: T): void;

    protected setDirty(): void {
        if (!this.dirty) {
            this.dirty = true;
            for (const dependent of this.dependents) {
                dependent.setDirty();
            }
        }
    }
    //////////////////////////////////////////////////////////////////////////////
    private recalculate(): T {
        if (Signal.calculatingSet.has(this)) {
            throw new Error("Cyclic signal dependency detected.");
        }
        Signal.calculatingSet.add(this);
        Signal.calculating && this.dependents.add(Signal.calculating);
        const prevCalculating = Signal.calculating;
        Signal.calculating = this;
        try {
            return this.getValue();
        } finally {
            Signal.calculating = prevCalculating;
            Signal.calculatingSet.delete(this);
        }
    }
}
