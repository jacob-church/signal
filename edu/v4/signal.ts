/**
 * v4 - Simple Optimizations
 */
export abstract class Reactive {
    private static consumer: Reactive | null = null;
    private consumers = new Set<Reactive>();
    protected dirty = true;

    protected trackConsumer(): void {
        Reactive.consumer && this.consumers.add(Reactive.consumer);
    }

    protected shouldRecalculate(): boolean {
        return this.dirty;
    }

    protected asConsumer<T>(calculate: () => boolean): void {
        const prev = Reactive.consumer;
        Reactive.consumer = this;
        try {
            calculate() && this.notify();
            this.dirty = false;
        } finally {
            Reactive.consumer = prev;
        }
    }

    private notify() {
        for (const consumer of this.consumers) {
            consumer.invalidate();
        }
    }

    public invalidate() {
        if (!this.dirty) {
            this.dirty = true;
            this.notify();
        }
    }
}

const Unset = Symbol("Unset");
export class Signal<T = unknown> extends Reactive {
    protected _value: T = Unset as T;

    constructor(
        protected calc: () => T,
        protected readonly eq: (a: T, b: T) => boolean = Object.is,
    ) {
        super();
    }

    public get(): T {
        this.trackConsumer();

        this.shouldRecalculate() &&
            this.asConsumer(() => this.setIfChanged(this.calc()));

        return this._value;
    }

    protected setIfChanged(newValue: T): boolean {
        if (this._value == Unset || !this.eq(newValue, this._value)) {
            this._value = newValue;
            return true;
        }
        return false;
    }
}

export function computed<T>(calc: () => T): Signal<T> {
    return new Signal(calc);
}

export class WritableSignal<T = unknown> extends Signal<T> {
    constructor(initValue: T, eq?: (a: T, b: T) => boolean) {
        super(() => initValue, eq);
    }

    public set(newVal: T): void {
        this.setIfChanged(newVal) && this.invalidate();
    }
}

export function signal<T>(value: T): WritableSignal<T> {
    return new WritableSignal(value);
}
