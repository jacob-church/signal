import { clearFlags, hasFlags, WATCHED } from "./flags.ts";
import { type Consumer, isConsumer, type Producer } from "./types.ts";
import { unwatchProducers } from "./watch.ts";

/**
 * Determine if a any of a Consumers dependencies have actually changed.
 */
export function anyProducersHaveChanged(consumer: Consumer): boolean {
    for (const [producer, lastSeenVersion] of consumer.producers.entries()) {
        // anytime we iterate through Producers is an opportunity to clean up
        // unneeded links
        if (unlinkIfNeeded(producer, consumer)) {
            continue;
        }

        if (producer.valueVersion != lastSeenVersion) {
            return true;
        }
        /**
         * just because the valueVersion matches doesn't guarantee that a
         * Computed value hasn't changed. Recomputing that value isn't wasteful,
         * as we would need to do it anyways if we find any producers have
         * changed. (Remember also that resolved values are cached)
         */
        producer.resolveValue();
        // only once we've "fetched" a dependencies value can we be sure if it
        // has changed or not
        if (producer.valueVersion != lastSeenVersion) {
            return true;
        }
    }
    return false;
}

/**
 * Determine if a "link" between a `Producer` and `Consumer` is "active" e.g.
 * if the `Producer` participated in the last evaluation of the `Consumer`.
 *
 * If not, the link can be dropped to avoid wasteful or innaccurate calculation.
 *
 * Note: dropping a link may cause a Producer and it's dependencies to become
 * "unwatched".
 *
 * @returns `true` if the link was broken, else `false`
 */
export function unlinkIfNeeded(producer: Producer, consumer: Consumer) {
    const lastSeenVersion = producer.watched.get(consumer) ??
        producer.unwatched.get(consumer.weakRef);
    if (consumer.computeVersion == lastSeenVersion) {
        return false;
    }

    consumer.producers.delete(producer);
    producer.watched.delete(consumer);
    producer.unwatched.delete(consumer.weakRef);

    /**
     * Unlinking from a watched Consumer can cause a Producer to become
     * unwatched.
     */
    if (hasFlags(producer, WATCHED) && producer.watched.size == 0) {
        clearFlags(producer, WATCHED);
        // Computed Signals are both Producers and Consumers
        isConsumer(producer) && unwatchProducers(producer);
    }
    return true;
}
