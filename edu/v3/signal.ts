/**
 * v3 - Simple optimizations
 *
 * There are a number of simple ways we can avoid some extra work.
 */

const UNSET = Symbol("UNSET");

export abstract class Reactive<Comparable = unknown> {
    private static activeConsumer: Reactive | undefined = undefined;

    private clean = false;
    /**
     * A very simple tool to measure "did this really update". We'll increment
     * this number only when a meaningful change has taken place.
     *
     * P.S. don't worry about integer overflow. The max-safe-integer in
     * JavaScript is 2^53 - 1. That's so big that if you were to do nothing
     * but increment this value every millisecond, all day every day, it would
     * take hundreds of thousands of years for this value to overflow.
     */
    private version = 0;

    private consumers = new Set<Reactive>();
    /**
     * We can track our dependencies directly to query them for meaningful
     * changes before running a potentially expensive update.
     *
     * The number will be the last version number we observed on that dependency.
     */
    private producers = new Map<Reactive, number>();

    /**
     * We need a way of insisting "this Reactive element has changed, so
     * something else may need to change too"
     *
     * That turns out to be a useful lever to expose publicly if a Signal's
     * internal value is a mutable data structure like an Array.
     */
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
                /**
                 * Whenever we decide an update is necessary, it's worth
                 * re-evaluating our producers entirely to shake off any
                 * that are no longer needed because of changes to conditional
                 * logic or iterables.
                 */
                this.unlinkProducers();
                /**
                 * Notifying and updating our version is contingent on a
                 * meaningful change taking place!
                 */
                if (this.update()) {
                    this.notify();
                    this.incrementVersion();
                }
            }
            this.clean = true;
        } finally {
            Reactive.activeConsumer = prev;
        }
        /**
         * We postpone updating the our producer entry so it can contain the
         * most up-to-date version.
         */
        this.recordProduction();
    }

    /**
     * By making this a boolean we can check "did something actually change?"
     */
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
        /**
         * If we're clean, what are we even talking about?
         */
        if (this.clean) {
            return false;
        }

        /**
         * If we're not clean, but we have no producers, then we've never
         * updated, so we should go ahead and do that.
         */
        if (this.producers.size == 0) {
            return true;
        }

        /**
         * Otherwise, we'll iterate through all our dependencies and only
         * recompute if any of them have meaningfully changed
         */
        for (
            const [producer, lastSeenVersion] of this
                .producers.entries()
        ) {
            if (producer.version != lastSeenVersion) {
                return true;
            }
            /**
             * This gives our dependency the chance to resolve and maybe inform
             * us that actually they haven't changed at all.
             */
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

    /**
     * If we're going to evaluate "meaningful change" then we have to enshrine
     * some notion of equality between any two values a Signal might hold.
     *
     * By default we use simple reference comparison, but alternative
     * definitions can be preffered on a case-by-case basis.
     */
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

    /**
     * It's a useful construct to be careful about actually updating our value.
     */
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
        /**
         * Our construct is especially useful in our leaf nodes where meaningful
         * changes originate!
         */
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
