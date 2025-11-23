import { asActiveConsumer } from "./activeConsumer.ts";
import { anyProducersHaveChanged } from "./consumer.ts";
import type { Consumer, Producer } from "./types.ts";
import { unwatchProducers } from "./watch.ts";
import { SignalChangedWhileComputingError } from "./error.ts";
import { clearFlags, COMPUTING, hasFlags, setFlags, WATCHED } from "./flags.ts";

/**
 * A schedulable side-effect.
 * @see {@link effect}
 */
export class Effect {
    private readonly node: EffectNode;

    constructor(
        effect: () => void,
        enqueue: (node: EffectNode) => void,
        private readonly unenqueue: (node: EffectNode) => void,
    ) {
        this.node = new EffectNode(effect, enqueue);
        /**
         * Enqueueing on construction ensures that this Effect will initialize
         * state and record it's Producer dependencies.
         */
        enqueue(this.node);
    }

    public [Symbol.dispose]() {
        this.node[Symbol.dispose]();
        this.unenqueue(this.node);
    }
}

/**
 * As JavaScript does not support multiple inheritance, the roles of "Producer"
 * and "Consumer" are implemented with interfaces and public values. To not
 * expose these public members to users of the Signal framework, they are
 * isolated to Node classes that are not exported.
 */
class EffectNode implements Consumer {
    public computeVersion = 0;
    public readonly producers: Map<Producer, number> = new Map<
        Producer,
        number
    >();
    public flags = WATCHED;
    public readonly weakRef: WeakRef<EffectNode> = new WeakRef(this);

    private disposed?: true;

    constructor(
        private readonly effectFn: () => void,
        public readonly enqueue: (me: EffectNode) => void,
    ) {}

    public run(): void {
        if (this.disposed) {
            return;
        }
        if (this.computeVersion == 0 || anyProducersHaveChanged(this)) {
            ++this.computeVersion;
            setFlags(this, COMPUTING);
            try {
                asActiveConsumer(this, this.effectFn);
            } catch (e) {
                --this.computeVersion;
                throw e;
            } finally {
                clearFlags(this, COMPUTING);
            }
            /**
             * If there are still no Producer dependencies after running this
             * Effect as the activeConsumer, there is no reason to model this
             * function as an effect.
             */
            if (this.producers.size == 0) {
                console.warn(
                    "Effect created without any Signal dependencies; note that this means the effect will never run again.",
                );
            }
        }
    }

    public invalidate(): void {
        if (this.disposed) {
            return;
        }
        if (hasFlags(this, COMPUTING)) {
            throw new SignalChangedWhileComputingError();
        }
        this.enqueue(this);
    }

    public [Symbol.dispose]() {
        if (this.disposed) {
            return;
        }
        clearFlags(this, WATCHED);
        unwatchProducers(this);
        this.disposed = true;
    }
}

/**
 * A global registry of queues for scheduling {@link Effect}s.
 *
 * @see {@link flushEffectQueue}
 */
export const EffectQueues = new Map<string, Set<EffectNode>>();
