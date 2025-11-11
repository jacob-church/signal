/**
 * v4 - Smarter reactivity
 *
 * The previous implementation largely works, but it's not very smart about
 * conditional dependencies.
 */
interface SignalNode {}

interface Producer<T = unknown> extends SignalNode {
    value: T;
    resolveValue(): void;
    /**
     * By tracking a version with our Consumers, we can answer "did they compute
     * without me?"
     */
    readonly consumers: Map<Consumer, number>;
    equals(a: T, b: T): boolean;
    readonly valueVersion: number;
}

interface Consumer extends SignalNode {
    invalidate(): void;
    readonly producers: Map<Producer, number>;
    /**
     * Like the value version, a Producer can track "did I participate in your
     * last compute?"
     */
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
        // any time we iterate over Consumers is a good chance to clean up stale
        // links
        !unlinkIfNeeded(consumer, producer) && consumer.invalidate();
    }
}

function recordAccess(producer: Producer): void {
    if (!activeConsumer) {
        return;
    }

    activeConsumer.producers.set(producer, producer.valueVersion);
    // just like the Producer, an access updates the last version seen on the
    // Consumer
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
        // any time we iterate over producers is a good chance to clean up
        // stale links
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
        return false; // the link is still good!
    }

    // else, the link is stale; remove it
    consumer.producers.delete(producer);
    producer.consumers.delete(consumer);
    return true;
}
