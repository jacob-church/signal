import {
    asActiveConsumer,
    recordAccess,
    updateWatched,
} from "./activeConsumer.ts";
import { anyProducersHaveChanged } from "./consumer.ts";
import {
    SignalChangedWhileComputingError,
    SignalCircularDependencyError,
} from "./error.ts";
import { clearFlags, COMPUTING, hasFlags, setFlags, STALE } from "./flags.ts";
import { notifyConsumers, setIfWouldChange } from "./producer.ts";
import { UNSET } from "./symbols.ts";
import type { Consumer, EqualsFn, Producer, ReadonlySignal } from "./types.ts";

/**
 * A {@link ReadonlySignal} that computes a given function and returns it's
 * output.
 *
 * Produces it's value via the `get()` method, with a guarantee that it's
 * value will be up to date with changes to transitive dependencies.
 */
export class Computed<T> implements ReadonlySignal<T> {
    private node: ComputedNode<T>;
    constructor(compute: () => T, equals?: EqualsFn<T>) {
        this.node = new ComputedNode(compute, equals);
    }

    /**
     * @see {@link Signal.get}
     */
    public get(): T {
        updateWatched(this.node);
        this.node.resolveValue();
        recordAccess(this.node);
        /**
         * Creating a Computed Signal that doesn't depend on other Signals
         * is wasteful. It would be simpler to just compute a function.
         */
        if (this.node.producers.size == 0) {
            console.warn(
                "Computed created without any Signal dependencies; note that this means the value will never be computed again.",
            );
        }
        return this.node.value;
    }
}

/**
 * As JavaScript does not support multiple inheritance, the roles of "Producer"
 * and "Consumer" are implemented with interfaces and public values. To not
 * expose these public members to users of the Signal framework, they are
 * isolated to Node classes that are not exported.
 */
class ComputedNode<T> implements Producer<T>, Consumer {
    public value = UNSET as T;
    public valueVersion = 0;
    public computeVersion = 0;
    public flags = STALE;
    public readonly weakRef = new WeakRef(this);
    public readonly producers = new Map<Producer, number>();
    public readonly watched = new Map<Consumer, number>();
    public readonly unwatched = new Map<WeakRef<Consumer>, number>();

    constructor(
        private readonly compute: () => T,
        public readonly equals: EqualsFn<T> = Object.is,
    ) {}

    public resolveValue() {
        if (hasFlags(this, COMPUTING)) {
            throw new SignalCircularDependencyError();
        }
        if (
            this.value === UNSET ||
            (hasFlags(this, STALE) && anyProducersHaveChanged(this))
        ) {
            ++this.computeVersion;
            let newValue: T;
            try {
                setFlags(this, COMPUTING);
                newValue = asActiveConsumer(this, this.compute);
            } catch (e) {
                // keep computeVersion in sync with SUCCESSFUL computation
                --this.computeVersion;
                throw e;
            } finally {
                clearFlags(this, COMPUTING);
            }
            setIfWouldChange(this, newValue) && ++this.valueVersion;
        }
        /**
         * Regardless of what happens in this function, successful completion
         * indicates that work does not need to be repeated until a transitive
         * dependency marks this Signal as "stale" again.
         */
        clearFlags(this, STALE);
    }

    public invalidate(): void {
        if (hasFlags(this, COMPUTING)) {
            throw new SignalChangedWhileComputingError();
        }
        if (hasFlags(this, STALE)) return;
        setFlags(this, STALE);
        notifyConsumers(this);
    }
}
