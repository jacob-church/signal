import { Reactive } from "./reactive.ts";

/**
 * A schedulable, {@link Reactive} side-effect.
 * @see {@link effect}
 */
export class Effect extends Reactive {
    constructor(
        private effect: () => void,
        private enqueue: (me: Effect) => void,
    ) {
        super();
        this.enqueue(this);
    }

    // PUBLIC //////////////////////////////////////////////////////////////////
    /**
     * Forces this {@link Effect} to be scheduled in it's relevant queue.
     *
     * @see {@link Reactive.invalidate}
     */
    public override invalidate(): void {
        super.invalidate();
        this.enqueue(this);
    }

    /**
     * @see {@link Reactive.isWatched}
     */
    public override isWatched(): boolean {
        return true;
    }

    /**
     * Directly runs this {@link Effect}'s function with guaranteed up-to-date
     * dependencies.
     *
     * (May not run the effect if it is determined that there have been no
     * meaningful changes to {@link Signal} dependencies.)
     */
    public maybeRun(): void {
        this.maybeRecompute();
    }

    /**
     * TODO
     */
    public dispose(): void {
        // TODO proper disposal logic
        this.unwatch();
    }

    // PROTECTED ///////////////////////////////////////////////////////////////
    /**
     * @see {@link Reactive.update}
     */
    protected override update(): boolean {
        this.effect();
        return false;
    }
}

/**
 * A safe {@link Effect} type that doesn't allow users to run the {@link Effect}'s
 * action outside of flushing it's relevant queue
 */
export type SecureEffect = Omit<Effect, "maybeRun">;

/**
 * A global registry of queues for scheduling {@link Effect}s.
 *
 * @see {@link flushEffectQueue}
 */
export const EffectQueues = new Map<string, Set<Effect>>();
