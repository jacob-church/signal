import { computed, effect, flushEffectQueue, state } from "../interface.ts";
import { assert } from "./lib.ts";

Deno.test("lazy, cached", () => {
    let count = 0;
    const c = computed(() => {
        count += 1;
        return 0;
    });

    assert(count == 0, "shouldn't eager evaluate");
    assert(c.get() == 0, "should be able to calculate value");
    assert(count == 1, "should calculate once");
    c.get();
    assert(count == 1, "shouldn't recalculate unless needed");
});

Deno.test("tracks changes", () => {
    const a = state(0);
    const b = computed(() => a.get());

    assert(b.get() == 0, "should return correct value");
    a.set(1);
    assert(b.get() == 1, "should recompute when dependencies change");
});

Deno.test("ignore state.set if it doesn't change", () => {
    const a = state(1);
    let count1 = 0;
    const b = computed(() => {
        count1 += 1;
        return Math.abs(a.get());
    });
    let count2 = 0;
    const c = computed(() => {
        count2 += 1;
        return b.get();
    });

    assert(c.get() == 1, "initial value");
    assert(count1 == 1, "initial calculate (b)");
    assert(count2 == 1, "initial calculate (c)");
    a.set(1);
    assert(c.get() == 1, "no change");
    assert(count1 == 1, "shouldn't recalculate if nothing actually changed");

    // TODO break out this use case into a later test
    a.set(-1);
    assert(c.get() == 1, "still no change");
    assert(count1 == 2, "recalculate where necessary");
    assert(
        count2 == 1,
        "shouldn't recalculate (transitively) if things didn't change",
    );
});

Deno.test("should only track changes to dependencies that actually matter", () => {
    const toggle = state(true);
    const negative = state(-1);
    const positive = state(2);

    let count = 0;
    const compound = computed(() => {
        count += 1;
        if (toggle.get()) {
            return negative.get();
        } else {
            return positive.get();
        }
    });

    assert(compound.get() == -1, "initial value");

    positive.set(1);
    compound.get();
    assert(
        count == 1,
        "shouldn't recalculate when unimportant state changes (positive)",
    );

    toggle.set(false);
    assert(compound.get() == 1, "should respond to state change correctly");
    assert(count == 2, "should recalculate again");

    negative.set(-2);
    assert(
        compound.get() == 1,
        "value shouldn't change because of irrelevant state",
    );
    assert(
        count == 2,
        "shouldn't recalculate when unimportant state changes (negative)",
    );
});

Deno.test("should track unwatched changes", () => {
    const leaf = state(0);
    const a = computed(() => leaf.get());
    const b = computed(() => a.get());
    const c = computed(() => a.get());
    const unwatched = computed(() => b.get());
    const watched = computed(() => c.get());
    const out: number[] = [];
    effect(() => out.push(watched.get()));

    assert(
        // deno-lint-ignore no-explicit-any
        (watched as any).node.isWatched == false,
        "not watched until the effect is run",
    );
    flushEffectQueue();
    assert(
        // deno-lint-ignore no-explicit-any
        (watched as any).node.isWatched == true,
        "should be watched after run of the queue",
    );
    assert(out.length == 1, "queue should run effect");

    assert(
        // deno-lint-ignore no-explicit-any
        (unwatched as any).node.isWatched == false,
        "no effect has watched this signal",
    );
    leaf.set(1);
    flushEffectQueue();
    assert(
        out.length == 2 && out[1] == 1,
        "effect should run with up to date data",
    );
    assert(
        unwatched.get() == 1,
        "unwatched effect should still produce correct value",
    );
});
