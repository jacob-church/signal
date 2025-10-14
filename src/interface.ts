import { Computed, type ReadonlySignal } from "./reactive/computed.ts";
import { Effect, EffectQueues } from "./reactive/effect.ts";
import { State, type WritableSignal } from "./reactive/state.ts";

/** */
export function state<T>(
    value: T,
    equals?: (a: T, b: T) => boolean,
): WritableSignal<T> {
    return new State(value, equals);
}

/** */
export function computed<T>(
    calc: () => T,
    equals?: (a: T, b: T) => boolean,
): ReadonlySignal<T> {
    return new Computed(calc, equals);
}

/**
 * A schedulable side-effect that depends on up-to-date {@link Signal} values.
 *
 * @param fn a side-effect computation that depends on {@link Signal}s.
 * @param namespace an optional identifier for a unique queue to
 *  associate the returned {@link Effect} with ({@default "*"})
 */
export function effect(
    fn: () => void,
    { namespace = "*" } = {},
): Effect {
    const effect = new Effect(
        fn,
        () => EffectQueues.get(namespace)?.add(effect),
    );
    if (!EffectQueues.has(namespace)) {
        EffectQueues.set(namespace, new Set());
    }
    return effect;
}

export function flushEffectQueue(namespace?: string): void {
    if (!namespace) {
        for (const key of EffectQueues.keys()) {
            const effects = Array.from(EffectQueues.get(key)!);
            EffectQueues.get(key)?.clear();
            for (const effect of effects) {
                effect.maybeRun();
            }
        }
    } else {
        const effects = Array.from(EffectQueues.get(namespace) ?? []);
        EffectQueues.get(namespace)?.clear();
        for (const effect of effects) {
            effect.maybeRun();
        }
    }
}
