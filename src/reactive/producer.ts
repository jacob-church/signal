import { asActiveConsumer } from "./activeConsumer.ts";
import { unlinkIfNeeded } from "./consumer.ts";
import { UNSET } from "./symbols.ts";
import type { Producer } from "./types.ts";

/**
 * Determines if a new value represents a meaningful change to the `Producer`'s
 * value. If so, the value is stored, and the function returns `true`,
 */
export function setIfWouldChange<T>(producer: Producer<T>, value: T): boolean {
    if (
        producer.value !== UNSET &&
        asActiveConsumer(
            undefined,
            /**
             * The Producer itself should be configured to determine what constitutes a
             * "meaningful change".
             * Running the equality function without an `activeConsumer` ensures
             * that Signal dependencies aren't recorded by this function.
             */
            producer.equals.bind(undefined, producer.value, value),
        )
    ) {
        return false;
    }
    producer.value = value;
    return true;
}

/**
 * Trigger every `Consumer` of the given `Producer` to potentially recompute on
 * the next evaluation of that `SignalNode `
 */
export function notifyConsumers(producer: Producer): void {
    for (const [weakRef, lastSeenVersion] of producer.unwatched.entries()) {
        const consumer = weakRef.deref();
        /**
         * In this case, not only might a link be no longer needed, it might
         * also refer to a Consumer that has been garbage collected. In either
         * case we save time and memory by cleaning up the link.
         */
        if (consumer && consumer.computeVersion == lastSeenVersion) {
            consumer.invalidate();
        } else {
            producer.unwatched.delete(weakRef);
            consumer?.producers.delete(producer);
        }
    }
    for (const consumer of producer.watched.keys()) {
        // anytime we iterate over links is an opportunity to clean up unneeded
        // links
        !unlinkIfNeeded(producer, consumer) && consumer.invalidate();
    }
}
