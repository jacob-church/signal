import { type EqFunc, Signal } from "./signal.ts";

/**
 * A Signal that computes a value dependent on other signals
 *
 * @param calc a function that relies on other Signals
 * @param eqFn (optional) a method for comparing calculation results to verify if the signal value has meaningfully changed; defaults to "=="
 * @returns Signal<T>
 */
export function computed<T>(calc: () => T, eqFn?: EqFunc<T>): Signal<T> {
    return new Signal(calc, eqFn);
}
