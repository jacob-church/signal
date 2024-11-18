function eq<T>(a: T, b: T) {
    return a == b;
}
export type EqFunc<T> = (a: T, b: T) => boolean;

const NoSignal = Symbol("NoSignal");

// deno-lint-ignore no-explicit-any
export class Signal<T = any> {
    // STATIC //////////////////////////////////////////////////////////////////
    private static calculating: Signal | undefined = undefined;
    private static calculatingSet = new Set<Signal>();
    // MEMBERS /////////////////////////////////////////////////////////////////
    protected internal = NoSignal as T;
    private dirty = true;
    private dependents = new Set<Signal>();
    // CONSTRUCTOR /////////////////////////////////////////////////////////////
    constructor(protected calc: () => T, protected equals: EqFunc<T> = eq) {}
    // PUBLIC //////////////////////////////////////////////////////////////////
    public get value(): T {
        if (this.dirty) {
            this.internal = this.recalculate();
            this.dirty = false;
        }
        return this.internal;
    }
    public set value(_: T) {
        throw new Error(".value is not writeable");
    }
    // PROTECTED ///////////////////////////////////////////////////////////////
    protected setDirty(): void {
        if (!this.dirty) {
            this.dirty = true;
            for (const dependent of this.dependents) {
                dependent.setDirty();
            }
        }
    }
    // PRIVATE /////////////////////////////////////////////////////////////////
    private recalculate(): T {
        if (Signal.calculatingSet.has(this)) {
            throw new Error("Cyclic signal dependency detected.");
        }
        Signal.calculatingSet.add(this);
        Signal.calculating && this.dependents.add(Signal.calculating);
        const prevCalculating = Signal.calculating;
        Signal.calculating = this;
        try {
            return this.calc();
        } finally {
            Signal.calculating = prevCalculating;
            Signal.calculatingSet.delete(this);
        }
    }
}
