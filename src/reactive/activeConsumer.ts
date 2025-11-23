import { hasFlags, setFlags, WATCHED } from "./flags.ts";
import type { Consumer, Producer } from "./types.ts";

/**
 * This variable models the top of the callstack; if a Producer is being
 * accessed as the result of a Consumer executing it's function, that Consumer
 * can be found on the callstack just below the Producer. By saving that
 * Consumer here before calling that function, the Producer can effectively
 * "peek" at whoever called it.
 *
 * @see asActiveConsumer
 */
let activeConsumer: Consumer | undefined = undefined;

/**
 * Save the previous `activeConsumer` (if any) in the callstack, and run a
 * provided function with the given `Consumer | undefined` as the
 * `activeConsumer`.
 *
 * In practice this proves useful to abstract across several different use
 * cases.
 */
export function asActiveConsumer<T>(
    consumer: Consumer | undefined,
    fn: () => T,
) {
    const prev = activeConsumer;
    activeConsumer = consumer;
    try {
        return fn();
    } finally {
        activeConsumer = prev;
    }
}

/**
 * When the activeConsumer is depended on by an Effect, all transitive
 * dependencies are moved to a watched state.
 */
export function updateWatched(producer: Producer): void {
    if (!activeConsumer) {
        return;
    }

    // Producers can be consumed by a variety of Signals, but it only takes
    // 1 Consumer that is watched to move the Producer to a watched state
    setFlags(producer, activeConsumer.flags & WATCHED);
}

/**
 * When an activeConsumer depends on a Signal links are established in both
 * directions for the purpose of propogating changes and recomputing sparingly.
 *
 * @see {@link notifyConsumers} and {@link anyProducersHaveChanged}
 */
export function recordAccess(producer: Producer): void {
    if (!activeConsumer) {
        return;
    }

    activeConsumer.producers.set(producer, producer.valueVersion);
    const computeVersion = activeConsumer.computeVersion;
    if (hasFlags(activeConsumer, WATCHED)) {
        producer.watched.set(activeConsumer, computeVersion);
        producer.unwatched.delete(activeConsumer.weakRef);
    } else {
        producer.unwatched.set(activeConsumer.weakRef, computeVersion);
        // deletion is not necessary, because unwatching only happens
        // (eagerly) when an Effect is disposed
    }
}
