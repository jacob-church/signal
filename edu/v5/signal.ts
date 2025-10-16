/**
 * v5 - Memory managements
 *
 * Up to this point, we've been ignoring a basic problem we created back in v2:
 * Signals hold references to the Signals that depend on them.
 *
 * This poses a serious problem for garbage collection.
 */

const UNSET = Symbol("UNSET");

export abstract class Reactive<Comparable = unknown> {
    private static activeConsumer: Reactive | undefined = undefined;

    private clean = false;
    private version = 0;
    /**
     * As we're going to be dealing with WeakRefs, its useful to have a way
     * of referring to recall a specific Signal without holding any hard
     * reference to it.
     */
    private static id = 0;
    private readonly id = Reactive.id++;

    private watchedConsumers = new Set<Reactive>();
    private unwatchedConsumers = new Map<number, WeakRef<Reactive>>();
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

    /**
     * "Watched" is how we describe whether or not a Signal is a transitive
     * dependency of an effect.
     */
    protected isWatched(): boolean {
        return this.watchedConsumers.size > 0;
    }

    private recordConsumption(): void {
        const consumer = Reactive.activeConsumer;
        if (consumer) {
            /**
             * If our consumer is being Watched, we know we're being watched,
             * too.
             *
             * Further, if we're being watched, we can be confident that
             * our references up the graph are still important. We can let the
             * Effect's that are watching us carry the burden of informing the
             * graph when they're no longer active.
             */
            if (consumer.isWatched()) {
                this.watchedConsumers.add(consumer);
            } else {
                this.unwatchedConsumers.set(consumer.id, new WeakRef(consumer));
            }
        }
    }

    private recordProduction(): void {
        Reactive.activeConsumer?.producers.set(this, this.version);
    }

    private unlinkProducers(): void {
        for (const producer of this.producers.keys()) {
            this.producers.delete(producer);
            producer.watchedConsumers.delete(this);
            producer.unwatchedConsumers.delete(this.id);
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
        for (const consumer of this.watchedConsumers) {
            consumer.invalidate();
        }
        for (const [id, ref] of this.unwatchedConsumers.entries()) {
            /**
             * WeakRef's are memory safe, but dereferencing them is slow.
             * That's why we keep separate lists for watched and unwatched
             * consumers.
             *
             * The watched consumers need to be fast, and as long as an Effect
             * is tracking them, we can guarantee that they are.
             *
             * The unwatched consumers can't be fast no matter what we do -- the
             * only way to guarantee safe garbage collection is to eschew
             * upward references, but if we do that the only way to guarantee
             * correctness is by forcing a recompute of the whole graph downward
             * from where we pull a value.
             */
            const consumer = ref.deref();
            if (consumer) {
                consumer.invalidate();
            } else {
                /**
                 * Of course, because we don't hold strong references, we can
                 * dump id's for consumers who go out of memory to avoid wasted
                 * effort in future.
                 */
                this.unwatchedConsumers.delete(id);
            }
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

export class Effect extends Reactive {
    public static queue = new Set<Effect>();
    public static flush(): void {
        for (const effect of this.queue) {
            effect.run();
        }
    }

    constructor(private readonly action: () => void) {
        super();
        Effect.queue.add(this);
    }

    protected override update(): boolean {
        this.action();
        return false;
    }

    private run(): void {
        this.maybeUpdate();
    }

    public override invalidate(): void {
        super.invalidate();
        Effect.queue.add(this);
    }
}
