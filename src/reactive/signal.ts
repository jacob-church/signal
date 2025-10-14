import { Reactive } from "./reactive.ts";
import { Unset } from "./symbols.ts";

/**
 * A {@link Reactive} wrapper for a value that automatically tracks other Signal
 * dependencies, and updates lazily (on request/pull) when transitive dependencies
 * are meaningfully updated.
 */
export abstract class Signal<T = unknown> extends Reactive {
    /**
     * The internal cached value. (Initialized to a unique Symbol to allow
     * undefined/null as valid values.)
     * @see {@link Unset}
     */
    private _value: T = Unset as T;

    constructor(private equals: (a: T, b: T) => boolean = Object.is) {
        super();
    }

    // PUBLIC //////////////////////////////////////////////////////////////////
    /**
     * @returns the most up-to-date value for this {@link Signal}, based on
     * the values of any transitive dependencies.
     */
    public get(): T {
        this.recordConsumption();
        this.maybeRecompute();
        this.recordProduction();
        return this._value;
    }

    // PROTECTED ///////////////////////////////////////////////////////////////
    /**
     * @see {@link Reactive.update}
     */
    protected override update(): boolean {
        return this.setIfChanged(this.compute());
    }

    /**
     * Internal value getter
     *
     * @returns the current settled value of this {@link Signal}
     */
    protected compute(): T {
        return this._value;
    }

    /**
     * Internal value setter
     *
     * @param newValue
     * @returns true if the internal value was actually modified
     */
    protected setIfChanged(newValue: T): boolean {
        if (this._value == Unset || !this.equals(this._value, newValue)) {
            this._value = newValue;
            return true;
        }
        return false;
    }
}
