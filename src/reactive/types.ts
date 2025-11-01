////////////////////////////////////////////////////////////////////////////////
// Signal Types
/**
 * A reactive wrapper around a value.
 */
export interface Signal<T = unknown> {
    /** unwraps the inner value held by a `Signal` */
    get(): T;
}

/**
 * A `Signal` that supports only the readonly `get()` operation.
 */
export type ReadonlySignal<T> = Signal<T>;

/**
 * A `Signal` with a setter and mutator methods.
 */
export interface WritableSignal<T = unknown> extends Signal<T> {
    /**
     * Guarantees that the inner value will match the provided `value`, and
     * any dependent Signals will be notified of the change (if necessary).
     */
    set(value: T): void;
    /**
     * Exposes the inner value to a provided function, allowing in-place
     * manipulation (e.g. for inner values that are data structures).
     *
     * Guarantees that dependent Signals will be notified, and may recompute
     * on their next access.
     */
    mutate(mutatorFn: (prevValue: T) => void): void;
    /**
     * Exposes the inner value in a readonly state to the provided function,
     * allowing for the computation of a new value based on it's previous value.
     *
     * If the new value is meaningfully changed, dependent Signals will be
     * notified, and may recompute on their next access.
     */
    update(updaterFn: (prevValue: Readonly<T>) => T): void;
}

////////////////////////////////////////////////////////////////////////////////
// Signal Node Types
export interface SignalNode {
    /**
     * whether or not a Signal is an Effect or transitive dependency of one
     */
    isWatched: boolean;
    /**
     * every Signal has a notion of being marked for future re-evaluation
     */
    invalidate(): void;
}

/**
 * `Signal`s that are depended on by other `Signal`s "Produce" values to their
 * dependents.
 */
export interface Producer<T = unknown> extends SignalNode {
    /**
     * The inner data cache that a `Producer` provides to it's `Consumer`s
     */
    value: T;
    /**
     * A monotonically increasing number that only increments when the value
     * changes; available for cheap comparison to track which `Producer`s are
     * up to date, or need to be recomputed.
     */
    readonly valueVersion: number;
    /**
     * The set of `Consumer`s of this `Producer` that are in a "watched" state.
     * @see SignalNode.isWatched
     * A mapping from `Consumer` to the last observed
     * {@link Consumer.computeVersion}, indicating whether this `Producer`
     * participated in the last recompute, or if the link needs to be cleaned up.
     */
    readonly watched: Map<Consumer, number>;
    /**
     * As `watched` above, but for `Consumer`s that are in an unwatched state.
     */
    readonly unwatched: Map<WeakRef<Consumer>, number>;
    /**
     * The notion of equality between potential `Signal` values of the same type.
     *
     * Used to prevent unneccessary updates to `valueVersion`, and unnecessary
     * calls to {@link notifyConsumers}
     */
    equals(a: T, b: T): boolean;
    /**
     * A function to be called to guarantee that the inner `value` of this
     * `Producer` is settled and up to date with it's own transitive
     * dependencies. Also guarantees that `valueVersion` is up to date.
     */
    resolveValue(): void;
}

export interface Consumer extends SignalNode {
    /**
     * A monotonically increasing number that only increments when a `Consumer`
     * fully re-evaluates (e.g. a `Computed` runs it's compute function, or an
     * `Effect` runs it's effect function); used to track which `Producer`s are
     * no longer needed dependencies
     */
    readonly computeVersion: number;
    /**
     * Mapping from `Producer` dependency to the last {@link Producer.valueVersion}
     * that was accessed by this `Consumer`; used by
     * {@link anyProducersHaveChanged} to short-circuit recomputations
     */
    readonly producers: Map<Producer, number>;
    /**
     * Used to track {@link Producer.unwatched} `Consumer`s without preventing
     * the `Consumer` from being garbage collected.
     */
    readonly weakRef: WeakRef<Consumer>;
}

////////////////////////////////////////////////////////////////////////////////

export type EqualsFn<T> = (a: T, b: T) => boolean;
