/**
 * v2 - Reactive state
 *
 * Lazy, cached calculations by themselves are useful, but not what make Signals
 * truly special.
 *
 * The secret sauce of a Signal is the ability to automatically track
 * dependencies, and intelligently recalculate when needed
 */
interface SignalNode {}

interface Producer<T = unknown> extends SignalNode {
    value: T;
    resolveValue(): void;
    /**
     * If a Signal is to notify it's dependents when something changes, it needs
     * to know who they are.
     */
    readonly consumers: Set<Consumer>;
}

interface Consumer extends SignalNode {
    // all Consumers must understand the notion of "I need to recompute"
    invalidate(): void;
}

export class State<T> implements Producer<T> {
    public readonly consumers = new Set<Consumer>();

    constructor(public value: T) {}

    public get(): T {
        recordAccess(this);
        return this.value;
    }

    public set(value: T): void {
        this.value = value;
        // after a value changes, the rest of the graph needs to know about it
        notifyConsumers(this);
    }

    public resolveValue(): void {}
}

const UNSET = Symbol("UNSET");
export class Computed<T> implements Producer<T>, Consumer {
    public readonly consumers = new Set<Consumer>();

    public value = UNSET as T;

    /**
     * Eager calculations would defeat the purpose of lazy calculations,
     * so we use a simple flag to indicate "this value needs to be recomputed"
     */
    private stale = true;

    constructor(private readonly compute: () => T) {}

    public get(): T {
        this.resolveValue();
        recordAccess(this);
        return this.value;
    }

    public resolveValue(): void {
        /**
         * ...now, when this Signal is "stale", we know we need to rerun
         * the compute function.
         */
        if (this.value === UNSET || this.stale) {
            /**
             * Whenever we run "compute", this Consumer becomes the
             * activeConsumers so that any Producers it accesses can
             * record the dependency.
             *
             * (compute is not bound because it doesn't need to be; it came from
             * an external source, and should maintain whatever "this" it had.)
             */
            this.value = asActiveConsumer(this, this.compute);
        }
        // and regardless, whenever we resolve this Signal, it's no longer stale
        this.stale = false;
    }

    public invalidate(): void {
        // to be invalidated is simply to raise the "stale" flag
        this.stale = true;
        // ...and pass the message along the graph
        notifyConsumers(this);
    }
}

function notifyConsumers(producer: Producer): void {
    for (const consumer of producer.consumers) {
        consumer.invalidate();
    }
}

function recordAccess(producer: Producer): void {
    // we may call get() outside of a Signal context
    if (!activeConsumer) {
        return;
    }

    // else, forge a link
    producer.consumers.add(activeConsumer);
}

// we could use a stack, but we only care about the top...
let activeConsumer: Consumer | undefined = undefined;
function asActiveConsumer<T>(
    consumer: Consumer | undefined,
    fn: () => T,
) {
    // ...and we already have the call stack. So we use that.
    const prev = activeConsumer;
    activeConsumer = consumer;
    try {
        return fn();
    } finally {
        // calling functions is just a DFS of our code, so we need to restore
        // the previous activeConsumer on the way back up
        activeConsumer = prev;
    }
}
