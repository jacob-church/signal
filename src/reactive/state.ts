import { Signal } from "./signal.ts";

/**
 * A {@link Reactive} "leaf node".
 *
 * A {@link WritableSignal} that exposes an interface for overwriting it's
 * internal value, signaling transitive dependents that they may need to
 * recompute their values.
 */
export class State<T> extends Signal<T> {
    constructor(initialValue: T, equals?: (a: T, b: T) => boolean) {
        super(equals);
        this.setIfChanged(initialValue);
    }

    /**
     * Update internal value
     *
     * @param newValue
     */
    public set(newValue: T): void {
        if (this.setIfChanged(newValue)) {
            this.invalidate();
            this.incrementVersion();
        }
    }
}

/**
 * A {@link Signal} with a public {@link State.set} method.
 */
export type WritableSignal<T = unknown> = State<T>;
