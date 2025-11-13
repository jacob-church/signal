import { unlinkIfNeeded } from "./consumer.ts";
import { type Consumer, isConsumer } from "./types.ts";

/**
 * Recursively updates the watched status for a Consumer's Producers.
 *
 * Any Producers that no longer have watched Consumers are no longer watched
 * themselves.
 */
export function unwatchProducers(consumer: Consumer): void {
    for (const producer of consumer.producers.keys()) {
        // anytime we iterate through Producers is an opportunity to clean up
        // unneeded links
        if (unlinkIfNeeded(producer, consumer) || !producer.isWatched) {
            return;
        }

        producer.unwatched.set(consumer.weakRef, consumer.computeVersion);
        producer.watched.delete(consumer);
        if (producer.watched.size == 0) {
            producer.isWatched = false;
            // Computed Signals are both Producers and Consumers
            isConsumer(producer) && unwatchProducers(producer);
        }
    }
}
