/**
 * v5 - Advanced Optimizations OR Effects TODO
 */
export abstract class Reactive {
    private static consumer: Reactive | null = null;
    private consumers = new Set<Reactive>();
    protected dirty = true;

    protected trackConsumer(): void {
        Reactive.consumer && this.consumers.add(Reactive.consumer);
    }

    protected asConsumer<T>(fn: () => T): T {
        const prev = Reactive.consumer;
        Reactive.consumer = this;
        try {
            return fn();
        } finally {
            Reactive.consumer = prev;
        }
    }

    protected notify() {
        for (const consumer of this.consumers) {
            consumer.changed();
        }
    }

    protected changed() {
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
        if (this.dirty) {
            const newValue = this.asConsumer(() => this.calc());
            if (!this.eq(newValue, this._value)) {
                this._value = newValue;
                this.notify();
            }
            this.dirty = false;
        }
        return this._value;
    }
}

export function computed<T>(calc: () => T): Signal<T> {
    return new Signal(calc);
}

export class WritableSignal<T = unknown> extends Signal<T> {
    constructor(initValue: T) {
        super(() => initValue);
    }

    public set(newVal: T): void {
        if (this._value == Unset || this.eq(newVal, this._value)) {
            this.calc = () => newVal;
            this.changed();
        }
    }
}

export function signal<T>(value: T): WritableSignal<T> {
    return new WritableSignal(value);
}
