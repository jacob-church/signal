/**
 * v3 - Simple optimizations
 *
 * There are a number of simple ways we can avoid some extra work.
 */
interface SignalNode {}

interface Producer<T = unknown> extends SignalNode {
    value: T;
    resolveValue(): void;
    readonly consumers: Set<Consumer>;
    /**
     * As Signals can hold arbitrary values, it's useful for them to have
     * their own notion of what "equality" means for those values.
     */
    equals(a: T, b: T): boolean;
    /**
     * A very cheap and fast way to track "has this Producer changed" is to 
     * track the last version of the value it produced and compare those.
     */
    readonly valueVersion: number;
}

interface Consumer extends SignalNode {
    invalidate(): void;
    /**
     * By tracking our Producers directly, along with the last valueVersion we
     * saw from them, we can make a cheap comparison to see if anything has 
     * changed
     */
    readonly producers: Map<Producer, number>;
}

export class State<T> implements Producer<T> {
    public readonly consumers = new Set<Consumer>();
    public valueVersion = 0;

    constructor(
        public value: T,
        /**
         * This is a good notion to configure. For most things, simple equality
         * may be enough. But, with an eye towards performance, more complex
         * objects may require specialized or optimized equality checks
         */
        public readonly equals: (a: T, b: T) => boolean = Object.is,
    ) {}

    public get(): T {
        recordAccess(this);
        return this.value;
    }

    public set(value: T): void {
        // only set and notify if the value actually changes
        if (setIfWouldChange(this, value)) {
            // as long as valueVersion only changes in lockstep with the value
            // it's a useful proxy
            ++this.valueVersion;
            notifyConsumers(this);
        }
    }

    public resolveValue(): void {}
}

const UNSET = Symbol("UNSET");
export class Computed<T> implements Producer<T>, Consumer {
    public readonly consumers = new Set<Consumer>();
    public readonly producers = new Map<Producer, number>();
    public valueVersion = 0;

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
        /**
         * What does it mean to say "we don't need to recompute"?
         * Well, if our Computed value is a pure function, it's as simple as 
         * "have any of our inputs changed"
         */
        if (this.value === UNSET || (this.stale && anyProducersHaveChanged(this))) {
            const newValue = asActiveConsumer(this, this.compute);
            setIfWouldChange(this, newValue) && ++this.valueVersion;
        }
        this.stale = false;
    }

    public invalidate(): void {
        if (this.stale) {
            /**
             * If we're already stale, no need to do anything.
             * Either it's because this is a new Signal, and things above it
             * haven't computed yet either, or it's because we've already
             * been marked stale, and that means we already marked Consumers
             * stale as well
             */
            return;
        }
        this.stale = true;
        notifyConsumers(this);
    }
}

function notifyConsumers(producer: Producer): void {
    for (const consumer of producer.consumers) {
        consumer.invalidate();
    }
}

function recordAccess(producer: Producer): void {
    if (!activeConsumer) {
        return;
    }

    // when creating the link, it's a good opportunity to record the 
    // valueVersion for future comparisons.
    activeConsumer.producers.set(producer, producer.valueVersion);
    producer.consumers.add(activeConsumer);
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
    /**
     * An UNSET value should always change, and is not safe to test for equality.
     * 
     * The Producer defines it's notion of equality for its values. 
     */    
    if (producer.value == UNSET || !producer.equals(producer.value, newValue)) {
        producer.value = newValue;
        return true;
    }
    return false;
}

function anyProducersHaveChanged(consumer: Consumer): boolean {
    for (const [producer, lastSeenVersion] of consumer.producers) {
        // now we can do a super-cheap comparison. If the value is different,
        // we have to recompute.
        if (producer.valueVersion !== lastSeenVersion) {
            return true;
        }

        // ...but, if it's the same that's not enough. It's possible the value
        // is just stale, and needs a recompute.
        producer.resolveValue();
        // this might seem like a waste, but its the Consumer's compute we're
        // trying to avoid, so it's worth it. (And this whole process is
        // recursive, so transitive dependencies may avoid recomputes as well.
        if (producer.valueVersion !== lastSeenVersion) {
            // now we can fully trust this valueVersion to be up to date
            return true;
        }
    }
    return false;
}