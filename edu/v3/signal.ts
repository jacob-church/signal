/**
 * v3 - Simple optimizations
 *
 * There are a number of ways we can avoid some extra work.
 */

abstract class Reactive {
    private static activeConsumer: Reactive | null = null;
    private consumers = new Set<Reactive>();
    private producers = new Map<Reactive, number>();
    private dirty = true;
    private version = 0;

    protected recordConsumption(): void {
        Reactive.activeConsumer && this.consumers.add(Reactive.activeConsumer);
        Reactive.activeConsumer?.producers.set(this, this.version);
    }

    private shouldRecalculate(): boolean {
        return this.dirty &&
            this.producers.entries().some(([producer, lastVersionSeen]) =>
                producer.version != lastVersionSeen
            );
    }

    protected asConsumer(calculate: () => boolean): void {
        const prev = Reactive.activeConsumer;
        Reactive.activeConsumer = this;
        try {
            if (this.shouldRecalculate()) {
                prev?.producers.clear();
                calculate() && this.notify();
            }
            this.dirty = false;
        } finally {
            Reactive.activeConsumer = prev;
        }
    }

    private notify() {
        for (const consumer of this.consumers) {
            consumer.invalidate();
        }
    }

    public invalidate() {
        if (!this.dirty) { // prevents notifying the same nodes more than once
            this.dirty = true;
            this.notify();
        }
    }
}

type EqFn<T> = (a: T, b: T) => boolean;
const Unset = Symbol("Unset");
export class Signal<T = unknown> extends Reactive { // TODO: perhaps push this down into a base Signal and pull up the calc function into a ReadonlySignal
    protected _value: T = Unset as T;

    constructor(
        protected calc: () => T,
        private readonly eq: EqFn<T> = Object.is,
    ) {
        super();
    }

    public get(): T {
        this.asConsumer(() => this.setIfChanged(this.calc()));
        this.recordConsumption();
        return this._value;
    }

    protected setIfChanged(newValue: T): boolean {
        if (this._value == Unset || !this.eq(newValue, this._value)) { // only update a value if doing so is actually relevant
            this._value = newValue;
            return true;
        }
        return false;
    }
}

export class WritableSignal<T = unknown> extends Signal<T> {
    constructor(initValue: T) {
        super(() => initValue);
    }

    public set(newVal: T): void {
        this.setIfChanged(newVal) && this.invalidate();
    }
}
