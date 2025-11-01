/**
 * v6 - Memory managements
 *
 * Up to this point, we've been ignoring a basic problem we created back in v2:
 * Signals hold references to the Signals that depend on them.
 *
 * This poses a serious problem for garbage collection.
 */

export interface Signal<T> {
    get(): T;
}
export type ReadonlySignal<T> = Signal<T>;
export interface WritableSignal<T> extends Signal<T> {
    set(value: T): void;
    invalidate(): void;
}

interface Reactive {
    isWatched: boolean;
    invalidate(): void;
}

interface Producer<T = unknown> extends Reactive {
    value: T;
    readonly valueVersion: number;
    readonly watched: Map<Consumer, number>;
    readonly unwatchedRefs: Map<number, WeakRef<Consumer>>;
    readonly unwatchedVersions: Map<number, number>;
    get(): T;
    equals(a: T, b: T): boolean;
}

function setIfWouldChange<T>(producer: Producer, value: T): boolean {
    if (producer.value == UNSET || !producer.equals(producer.value, value)) {
        producer.value = value;
        return true;
    }
    return false;
}

let ConsumerId = 0;
interface Consumer extends Reactive {
    readonly id: number;
    readonly weakRef: WeakRef<Consumer>;
    readonly computeVersion: number;
    readonly producers: Map<Producer, number>;
}

function unlinkIfNeeded(consumer: Consumer, producer: Producer) {
    const computedVersion = producer.watched.get(consumer) ??
        producer.unwatchedVersions.get(consumer.id);
    if (consumer.computeVersion != computedVersion) {
        producer.watched.delete(consumer);
        producer.unwatchedRefs.delete(consumer.id);
        producer.unwatchedVersions.delete(consumer.id);
        consumer.producers.delete(producer);
        return true;
    }
    return false;
}

function anyProducersHaveChanged(consumer: Consumer): boolean {
    for (const [producer, lastSeenVersion] of consumer.producers) {
        if (unlinkIfNeeded(consumer, producer)) {
            continue;
        }

        if (producer.valueVersion != lastSeenVersion) {
            return true;
        }
        asActiveConsumer(undefined, producer.get.bind(producer));
        if (producer.valueVersion != lastSeenVersion) {
            return true;
        }
    }
    return false;
}

function notifyConsumers(producer: Producer): void {
    for (const consumer of producer.watched.keys()) {
        if (!unlinkIfNeeded(consumer, producer)) {
            consumer.invalidate();
        }
    }
    for (const [id, ref] of producer.unwatchedRefs.entries()) {
        const consumer = ref.deref();
        if (
            consumer &&
            consumer.computeVersion ==
                producer.unwatchedVersions.get(consumer.id)
        ) {
            consumer.invalidate();
        } else {
            producer.unwatchedRefs.delete(id);
            producer.unwatchedVersions.delete(id);
        }
    }
}

let activeConsumer: Consumer | undefined = undefined;

function asActiveConsumer<T>(consumer: Consumer | undefined, fn: () => T) {
    const prev = activeConsumer;
    activeConsumer = consumer;
    try {
        return fn();
    } finally {
        activeConsumer = prev;
    }
}

function checkWatched(producer: Producer): void {
    producer.isWatched ||= !!activeConsumer?.isWatched;
}

function recordAccess(producer: Producer): void {
    if (activeConsumer) {
        activeConsumer.producers.set(producer, producer.valueVersion);
        if (producer.isWatched) {
            producer.watched.set(activeConsumer, activeConsumer.computeVersion);
            producer.unwatchedRefs.delete(activeConsumer.id);
            producer.unwatchedVersions.delete(activeConsumer.id);
        } else {
            producer.unwatchedRefs.set(
                activeConsumer.id,
                activeConsumer.weakRef,
            );
            producer.unwatchedVersions.set(
                activeConsumer.id,
                activeConsumer.computeVersion,
            );
            producer.watched.delete(activeConsumer);
        }
    }
}

const UNSET = Symbol("UNSET");

export class State<T> implements WritableSignal<T>, Producer<T> {
    public valueVersion = 0;
    public isWatched = false;
    public readonly watched = new Map<Consumer, number>();
    public readonly unwatchedRefs = new Map<number, WeakRef<Consumer>>();
    public readonly unwatchedVersions = new Map<number, number>();

    constructor(
        public value: T,
        public readonly equals: (a: T, b: T) => boolean = Object.is,
    ) {}

    public get(): T {
        checkWatched(this);
        recordAccess(this);
        return this.value;
    }

    public set(value: T): void {
        if (setIfWouldChange(this, value)) {
            ++this.valueVersion;
            notifyConsumers(this);
        }
    }

    public invalidate(): void {
        notifyConsumers(this);
    }
}

export class Computed<T> implements ReadonlySignal<T>, Producer<T>, Consumer {
    public value = UNSET as T;
    public valueVersion = 0;
    public computeVersion = 0;
    public readonly id = ConsumerId++;
    public isWatched = false;
    public readonly weakRef = new WeakRef(this);

    public readonly producers = new Map<Producer, number>();
    public readonly watched = new Map<Consumer, number>();
    public readonly unwatchedRefs = new Map<number, WeakRef<Consumer>>();
    public readonly unwatchedVersions = new Map<number, number>();

    private dirty = true;

    constructor(
        private readonly compute: () => T,
        public readonly equals: (a: T, b: T) => boolean = Object.is,
    ) {}

    public get(): T {
        checkWatched(this);
        if (
            this.value == UNSET || (this.dirty && anyProducersHaveChanged(this))
        ) {
            ++this.computeVersion;
            const newValue = asActiveConsumer(this, this.compute.bind(this));
            setIfWouldChange(this, newValue) && ++this.valueVersion;
        }
        this.dirty = false;
        recordAccess(this);
        return this.value;
    }

    public invalidate(): void {
        if (!this.dirty) {
            this.dirty = true;
            notifyConsumers(this);
        }
    }
}

export class Effect implements Consumer {
    public readonly id = ConsumerId++;
    public readonly isWatched = true;
    public weakRef = new WeakRef(this);
    public computeVersion = 0;
    public readonly producers = new Map<Producer, number>();

    public static queue = new Set<Effect>();

    public static flush(): void {
        for (const effect of this.queue) {
            effect.run();
        }
    }

    constructor(private readonly effect: () => void) {
        Effect.queue.add(this);
    }

    private run(): void {
        if (this.producers.size == 0 || anyProducersHaveChanged(this)) {
            ++this.computeVersion;
            asActiveConsumer(this, this.effect.bind(this));
        }
    }

    public invalidate(): void {
        Effect.queue.add(this);
    }
}
