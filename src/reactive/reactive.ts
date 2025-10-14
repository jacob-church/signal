/**
 * R
 */
export abstract class Reactive {
    private static id = 0;
    private id = Reactive.id++;
    private version = 0;
    private clean = false;

    protected static activeConsumer: Reactive | undefined = undefined;
    private producers = new Map<Reactive, number>();
    private watchedConsumers = new Set<Reactive>();
    private unwatchedConsumers = new Map<number, WeakRef<Reactive>>();

    public invalidate(): void {
        if (this.clean) {
            this.clean = false;
            this.notify();
        }
    }

    protected abstract update(): boolean | void;

    protected recordConsumption(): void { // easy reactive only
        const consumer = Reactive.activeConsumer;
        if (consumer) {
            if (consumer.isWatched()) {
                this.watchedConsumers.add(consumer);
            } else if (!this.unwatchedConsumers.has(consumer.id)) {
                this.unwatchedConsumers.set(consumer.id, new WeakRef(consumer));
            }
        }
    }

    private shouldRecompute(): boolean { // maybe easy reactive only...
        if (this.clean) {
            return false;
        }

        if (this.producers.size == 0) {
            return true;
        }
        for (const [producer, lastSeenVersion] of this.producers.entries()) {
            if (
                producer.version != lastSeenVersion ||
                (producer.maybeRecompute() &&
                    producer.version != lastSeenVersion)
            ) {
                return true;
            }
        }

        return false;
    }

    protected recordProduction(): void { // easy reactive only
        Reactive.activeConsumer?.producers.set(this, this.version);
    }

    protected maybeRecompute(): boolean { // sticky bit if Reactive and Signal are to be split
        const prev = Reactive.activeConsumer;
        Reactive.activeConsumer = this;
        try {
            if (this.shouldRecompute()) {
                this.unlinkProducers();
                if (this.update()) {
                    this.incrementVersion();
                    this.notify();
                    return true;
                }
            }
        } finally {
            this.clean = true;
            Reactive.activeConsumer = prev;
        }
        return false;
    }

    protected incrementVersion(): void {
        this.version++;
    }

    private unlinkProducers(): void { // easy reactive only
        for (const producer of this.producers.keys()) {
            this.producers.delete(producer);
            producer.watchedConsumers.delete(this);
            producer.unwatchedConsumers.delete(this.id);
        }
    }

    private notify(): void { // easy Reactive only
        for (const consumer of this.watchedConsumers) {
            consumer.invalidate();
        }
        for (const [id, weakRef] of this.unwatchedConsumers.entries()) {
            const consumer = weakRef.deref();
            if (consumer) {
                consumer.invalidate();
            } else {
                this.unwatchedConsumers.delete(id);
            }
        }
    }

    public isWatched(): boolean { // easy reactive only
        return this.watchedConsumers.size > 0;
    }

    protected unwatch(): void {
        for (const producer of this.producers.keys()) {
            producer.watchedConsumers.delete(this);
            producer.unwatchedConsumers.set(this.id, new WeakRef(this));
            if (!producer.isWatched()) {
                producer.unwatch();
            }
        }
    }
}
