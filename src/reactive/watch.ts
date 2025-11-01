import { unlinkIfNeeded } from "./consumer.ts";
import type { Consumer } from "./types.ts";

/**
 * Recursively updates the watched status for a Consumer's Producers.
 *
 * Any Producers that no longer have watched Consumers are no longer watched
 * themselves.
 */
export function unwatchProducers(consumer: Consumer): void {
    // avoid unnecessary recursion
    if (!consumer.isWatched) {
        return;
    }
    for (const producer of consumer.producers.keys()) {
        // anytime we iterate through Producers is an opportunity to clean up
        // unneeded links
        if (unlinkIfNeeded(producer, consumer)) {
            return;
        }
        producer.unwatched.set(consumer.weakRef, consumer.computeVersion);
        producer.watched.delete(consumer);
        // Computed Signals are both Producers and Consumers
        isConsumer(producer) && unwatchProducers(producer);
        // updating isWatched after recursion makes sure that the check at the
        // beginning of this function works
        if (producer.watched.size == 0) {
            producer.isWatched = false;
        }
    }
}

// deno-lint-ignore no-explicit-any
function isConsumer(node: any): node is Consumer {
    return node.producers instanceof Map;
}
