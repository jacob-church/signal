import { recordAccess, updateWatched } from "./activeConsumer.ts";
import { notifyConsumers, setIfWouldChange } from "./producer.ts";
import type { Consumer, EqualsFn, Producer, WritableSignal } from "./types.ts";

/**
 * A {@link WritableSignal} that exposes an interface for overwriting it's
 * internal value, signaling transitive dependents that they may need to
 * recompute their values.
 */
export class State<T> implements WritableSignal<T> {
    private node: StateNode<T>;
    constructor(initialValue: T, equals?: EqualsFn<T>) {
        this.node = new StateNode(initialValue, equals);
    }

    public get(): T {
        updateWatched(this.node);
        recordAccess(this.node);
        return this.node.value;
    }

    public set(newValue: T): void {
        if (setIfWouldChange(this.node, newValue)) {
            ++this.node.valueVersion;
            notifyConsumers(this.node);
        }
    }

    public mutate(mutatorFn: (prevValue: T) => void): void {
        mutatorFn(this.node.value);
        ++this.node.valueVersion;
        notifyConsumers(this.node);
    }

    public update(updaterFn: (prevValue: Readonly<T>) => T): void {
        const newValue = updaterFn(this.node.value);
        this.set(newValue);
    }
}

/**
 * As JavaScript does not support multiple inheritance, the roles of "Producer"
 * and "Consumer" are implemented with interfaces and public values. To not
 * expose these public members to users of the Signal framework, they are
 * isolated to Node classes that are not exported.
 */
class StateNode<T> implements Producer<T> {
    public valueVersion = 0;
    public isWatched = false;
    public readonly watched = new Map<Consumer, number>();
    public readonly unwatched = new Map<WeakRef<Consumer>, number>();

    constructor(
        public value: T,
        public readonly equals: EqualsFn<T> = Object.is,
    ) {}

    public resolveValue(): void {} // no-op

    public invalidate(): void {
        notifyConsumers(this);
    }
}
