/**
 * v2 - Reactive state
 *
 * Lazy, cached calculations by themselves are useful, but not what make Signals
 * truly special.
 *
 * The secret sauce of a Signal is the ability to automatically track
 * dependencies, and intelligently recalculate when needed
 */

const UNSET = Symbol("UNSET");

/**
 * This base class will be used to aggregate those parts of the Signal
 * that are specifically relevant to reactive state management.
 *
 * In turn, we'll let the Signal classes themselves focus on the inner value
 * and what to do with it.
 */
export abstract class Reactive {
    /**
     * Automatic dependency tracking will rely on "peeking" at the call stack.
     * A global value that we can save off, overwrite, and restore is a tried
     * and true method of sharing information between call stack frames.
     */
    private static activeConsumer: Reactive | undefined = undefined;

    /**
     * We need a simple way to say "this Reactive element should re-run it's
     * computation". Many adjectives get used (dirty, stale, etc). I choose
     * because it will express the idea with the least amount of negation in
     * future code.
     */
    private clean = false;

    /**
     * Reactive elements will depend on other Reactive elements. We need a way
     * to tell those Reactives that they, too, should update when something
     * changes. So we store references at the bottom of the graph that point
     * up the graph to Reactives that "consume" this Reactive's value.
     */
    private consumers = new Set<Reactive>();

    /**
     * We want to keep the notion of updating the Reactive element's internal
     * value vague at this point in the architecture. It's sufficient to say
     * that a Reactive "does something", and this is where it will do it.
     */
    protected abstract update(): void;

    /**
     * Part of the magic of the Signal graph is that we don't update things
     * irresponsibly. We will only update as it is deemed necessary.
     */
    protected maybeUpdate(): void {
        /**
         * Instigating an update may mean that a consumer is interested in
         * what's going on. We should take note of that to keep the Signal
         * graph connected
         */
        this.recordConsumption();
        /**
         * Anytime we consider updating a Reactive, we anoint the current
         * Reactive to "active consumer" so recursive calls to `maybeUpdate
         * can forge links between the current Reactive, and the one that
         * invoked it.
         */
        const prev = Reactive.activeConsumer;
        Reactive.activeConsumer = this;
        try {
            if (this.shouldUpdate()) {
                this.update();
                // if we changed our value, other Reactives may want to update, too
                this.notify();
            }
            /**
             * Whether we have updated this Reactive or not, we can now say for
             * certain it's definitely resolved.
             */
            this.clean = true;
        } finally {
            Reactive.activeConsumer = prev;
        }
    }

    /**
     * We need a way of insisting "this Reactive element has changed, so
     * something else may need to change too"
     *
     * That turns out to be a useful lever to expose publicly if a Signal's
     * internal value is a mutable data structure like an Array.
     */
    public invalidate(): void {
        this.clean = false;
        this.notify();
    }

    private recordConsumption(): void {
        Reactive.activeConsumer && this.consumers.add(Reactive.activeConsumer);
    }

    /**
     * For now, this just means "this Reactive element has been informed that
     * something changed"
     */
    private shouldUpdate(): boolean {
        return !this.clean;
    }

    /**
     * You could use more generic event handling systems than this, but all we
     * need is the ability to recurse up the Signal graph, dirtying the nodes
     * of the graph for future re-computation.
     */
    private notify(): void {
        for (const consumer of this.consumers) {
            consumer.invalidate();
        }
    }
}

export abstract class Signal<T = unknown> extends Reactive {
    protected _value: T = UNSET as T;

    public get(): T {
        this.maybeUpdate();
        return this._value;
    }

    protected override update(): void {
        this._value = this.compute();
    }

    protected compute(): T {
        return this._value;
    }
}

export class State<T> extends Signal<T> {
    constructor(initialValue: T) {
        super();
        this._value = initialValue;
    }

    public set(value: T): void {
        this._value = value;
        /**
         * Writing to a WritableSignal insists that other Signals in the graph
         * will probably need to update their computed values.
         */
        this.invalidate();
    }
}
export type WritableSignal<T = unknown> = State<T>;

export class Computed<T> extends Signal<T> {
    constructor(protected override compute: () => T) {
        super();
    }
}
export type ReadonlySignal<T = unknown> = Computed<T>;
