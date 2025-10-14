/**
 * v2 - Reactive state
 *
 * Lazy, cached calculations by themselves are useful, but not what makes Signals
 * truly special.
 *
 * The secret sauce of a Signal is the ability to automatically track dependencies,
 * and intelligently recalculate when needed
 */

// TODO: design this around which STATE should be managed by which part
//       try to put the "reactive" stuff into COMPONENT via composition rather than inheritance

const Unset = Symbol("Unset");
abstract class Signal<T = unknown> {
    private static activeConsumer: Signal | null = null;

    protected _value: T = Unset as T;

    private consumers = new Set<Signal>();
    protected dirty = true;

    public get(): T {
        this.asConsumer(() => {
            if (this.dirty) {
                this._value = this.calculate();
                this.notify;
            }
            this.dirty = false;
        });
        this.recordConsumption();
        return this._value;
    }

    private asConsumer(fn: () => void): void {
        const prev = Signal.activeConsumer;
        Signal.activeConsumer = this;
        try {
            fn();
        } finally {
            Signal.activeConsumer = prev;
        }
    }

    protected abstract calculate(): T;

    private notify() {
        for (const sub of this.consumers) {
            sub.invalidate();
        }
    }

    protected recordConsumption(): void {
        Signal.activeConsumer && this.consumers.add(Signal.activeConsumer);
    }

    public invalidate() {
        this.dirty = true;
        this.notify();
    }
}

export class ReadonlySignal<T = unknown> extends Signal<T> {
    constructor(protected override calculate: () => T) {
        super();
    }
}

export class WriteableSignal<T = unknown> extends Signal<T> {
    constructor(initialValue: T) {
        super();
        this.set(initialValue);
    }

    protected override calculate(): T {
        return this._value;
    }

    public set(newVal: T) {
        this._value = newVal;
        this.invalidate();
    }
}
