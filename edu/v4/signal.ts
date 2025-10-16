/**
 * v4 - Effects
 *
 * Building up a graph of reactive calculations is great, but it's worth
 * discussing what we'll actually do with them.
 */

const UNSET = Symbol("UNSET");

export abstract class Reactive<Comparable = unknown> {
    private static activeConsumer: Reactive | undefined = undefined;

    private clean = false;
    private version = 0;

    private consumers = new Set<Reactive>();
    private producers = new Map<Reactive, number>();

    public invalidate(): void {
        if (this.clean) {
            this.clean = false;
            this.notify();
        }
    }

    protected maybeUpdate(): void {
        this.recordConsumption();
        const prev = Reactive.activeConsumer;
        Reactive.activeConsumer = this;
        try {
            if (this.shouldUpdate()) {
                this.unlinkProducers();
                if (this.update()) {
                    this.notify();
                    this.incrementVersion();
                }
            }
            this.clean = true;
        } finally {
            Reactive.activeConsumer = prev;
        }
        this.recordProduction();
    }

    protected abstract update(): boolean;

    public incrementVersion(): void {
        this.version++;
    }

    private recordConsumption(): void {
        Reactive.activeConsumer && this.consumers.add(Reactive.activeConsumer);
    }

    private recordProduction(): void {
        Reactive.activeConsumer?.producers.set(this, this.version);
    }

    private unlinkProducers(): void {
        for (const producer of this.producers.keys()) {
            this.producers.delete(producer);
            producer.consumers.delete(this);
        }
    }

    private shouldUpdate(): boolean {
        if (this.clean) {
            return false;
        }

        if (this.producers.size == 0) {
            return true;
        }

        for (
            const [producer, lastSeenVersion] of this
                .producers.entries()
        ) {
            if (producer.version != lastSeenVersion) {
                return true;
            }
            producer.maybeUpdate();
            if (producer.version != lastSeenVersion) {
                return true;
            }
        }

        return false;
    }

    private notify(): void {
        for (const consumer of this.consumers) {
            consumer.invalidate();
        }
    }
}

export abstract class Signal<T = unknown> extends Reactive {
    protected value: T = UNSET as T;

    constructor(
        public readonly equals: (a: T, b: T) => boolean = Object.is,
    ) {
        super();
    }

    public get(): T {
        this.maybeUpdate();
        return this.value;
    }

    protected override update(): boolean {
        return this.setIfChanged(this.compute());
    }

    protected setIfChanged(value: T): boolean {
        if (this.value == UNSET || !this.equals(value, this.value)) {
            this.value = value;
            return true;
        }
        return false;
    }

    protected compute(): T {
        return this.value;
    }
}

export class State<T> extends Signal<T> {
    constructor(initialValue: T, equals?: (a: T, b: T) => boolean) {
        super(equals);
        this.value = initialValue;
    }

    public set(value: T): void {
        if (this.setIfChanged(value)) {
            this.invalidate();
            this.incrementVersion();
        }
    }
}
export type WritableSignal<T = unknown> = State<T>;

export class Computed<T> extends Signal<T> {
    constructor(
        protected override compute: () => T,
        equals?: (a: T, b: T) => boolean,
    ) {
        super(equals);
    }
}
export type ReadonlySignal<T = unknown> = Computed<T>;

/**
 * For the purpose of education, we'll keep this implementation simple.
 *
 * An Effect is a type of Reactive element, just one that doesn't store any
 * values. Instead, an Effect wraps a function that depends on the values of
 * other reactive elements.
 *
 * Instead of updating an internal value, a function will be run.
 *
 * The interesting question is _when_ to run it.
 */
export class Effect extends Reactive {
    /**
     * If we just ran the function immediately, there would be no point
     * in all of the laziness we've built into this system.
     *
     * Instead, invalidating an Effect will add it to a queue.
     */
    public static queue = new Set<Effect>();
    /**
     * The user of our framework will be responsible for deciding when to
     * trigger queued effects. That might be on a regular render loop, or
     * saving changes to a server periodically or after a debounced interval.
     */
    public static flush(): void {
        for (const effect of this.queue) {
            effect.run();
        }
    }

    constructor(private readonly action: () => void) {
        super();
        Effect.queue.add(this);
    }

    /**
     * Our effects action incorporates into the existing Reactive infrastructure.
     */
    protected override update(): boolean {
        this.action();
        return false;
    }

    /**
     * ...and as a result, the best way to "run" our effect is to invoke
     * the Reactive machinery that not only performs our update, _but decides
     * ultimately whether any update is actually necessary_.
     *
     * This is a nice feature to pick up: even effects can be avoided
     */
    private run(): void {
        this.maybeUpdate();
    }

    public override invalidate(): void {
        super.invalidate();
        Effect.queue.add(this);
    }
}
