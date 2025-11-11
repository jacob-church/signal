/**
 * v6 - Memory managements
 *
 * Up to this point, we've been ignoring a basic problem we created back in v2:
 * Signals hold references to the Signals that depend on them.
 *
 * This poses a serious problem for garbage collection.
 */
interface SignalNode {}

interface Producer<T = unknown> extends SignalNode {
    value: T;
    resolveValue(): void;
    readonly consumers: Map<Consumer, number>;
    equals(a: T, b: T): boolean;
    readonly valueVersion: number;
}

interface Consumer extends SignalNode {
    invalidate(): void;
    readonly producers: Map<Producer, number>;
    readonly computeVersion: number;
}

export class State<T> implements Producer<T> {
    public readonly consumers = new Map<Consumer, number>();
    public valueVersion = 0;

    constructor(
        public value: T,
        public readonly equals: (a: T, b: T) => boolean = Object.is,
    ) {}

    public get(): T {
        recordAccess(this);
        return this.value;
    }

    public set(value: T): void {
        if (setIfWouldChange(this, value)) {
            ++this.valueVersion;
            notifyConsumers(this);
        }
    }

    public resolveValue(): void {}
}

const UNSET = Symbol("UNSET");
export class Computed<T> implements Producer<T>, Consumer {
    public readonly consumers = new Map<Consumer, number>();
    public readonly producers = new Map<Producer, number>();
    public valueVersion = 0;
    public computeVersion = 0;

    public value = UNSET as T;

    private stale = true;

    constructor(
        private readonly compute: () => T,
        public readonly equals: (a: T, b: T) => boolean = Object.is,
    ) {}

    public get(): T {
        this.resolveValue();
        recordAccess(this);
        return this.value;
    }

    public resolveValue(): void {
        if (
            this.value === UNSET ||
            (this.stale && anyProducersHaveChanged(this))
        ) {
            const newValue = asActiveConsumer(this, this.compute);
            setIfWouldChange(this, newValue) && ++this.valueVersion;
        }
        this.stale = false;
    }

    public invalidate(): void {
        if (this.stale) {
            return;
        }
        this.stale = true;
        notifyConsumers(this);
    }
}

function notifyConsumers(producer: Producer): void {
    for (const consumer of producer.consumers.keys()) {
        !unlinkIfNeeded(consumer, producer) && consumer.invalidate();
    }
}

function recordAccess(producer: Producer): void {
    if (!activeConsumer) {
        return;
    }

    activeConsumer.producers.set(producer, producer.valueVersion);
    producer.consumers.set(activeConsumer, activeConsumer.computeVersion);
}

let activeConsumer: Consumer | undefined = undefined;
function asActiveConsumer<T>(
    consumer: Consumer | undefined,
    fn: () => T,
) {
    const prev = activeConsumer;
    activeConsumer = consumer;
    try {
        return fn();
    } finally {
        activeConsumer = prev;
    }
}

function setIfWouldChange<T>(
    producer: Producer<T>,
    newValue: T,
): boolean {
    if (producer.value == UNSET || !producer.equals(producer.value, newValue)) {
        producer.value = newValue;
        return true;
    }
    return false;
}

function anyProducersHaveChanged(consumer: Consumer): boolean {
    for (const [producer, lastSeenVersion] of consumer.producers.entries()) {
        if (unlinkIfNeeded(consumer, producer)) {
            continue;
        }

        if (producer.valueVersion !== lastSeenVersion) {
            return true;
        }
        producer.resolveValue();
        if (producer.valueVersion !== lastSeenVersion) {
            return true;
        }
    }
    return false;
}

function unlinkIfNeeded(consumer: Consumer, producer: Producer): boolean {
    const lastComputeVersion = producer.consumers.get(consumer);
    if (consumer.computeVersion == lastComputeVersion) {
        return false;
    }

    consumer.producers.delete(producer);
    producer.consumers.delete(consumer);
    return true;
}

export class Effect implements Consumer {
    public static queue = new Set<Effect>();
    public invalidate(): void {
        Effect.queue.add(this);
    }

    constructor(private readonly effectFn: () => void) {
        this.invalidate();
    }

    public readonly producers = new Map<Producer, number>();
    public computeVersion = 0;

    public run(): void {
        if (this.computeVersion == 0 || anyProducersHaveChanged(this)) {
            ++this.computeVersion;
            asActiveConsumer(this, this.effectFn);
        }
    }
}
