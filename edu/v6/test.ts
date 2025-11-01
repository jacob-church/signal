import { assert } from "../lib/test.ts";
import { computed, effect, state } from "./interface.ts";
import { Effect } from "./signal.ts";

Deno.test("unwatched signals should still yield correct values", () => {
    const leaf = state(0);
    const left = computed(() => leaf.get());
    effect(() => left.get());

    const right = computed(() => leaf.get());
    const unwatched = computed(() => right.get());

    Effect.flush(); // now we're "watching"
    leaf.set(1); // now everyone should be notified
    assert(unwatched.get() == 1, "unwatched signal should still be correct");
});

Deno.test("unwatched signals are still lazy", () => {
    const leaf = state(1);
    let count1 = 0;
    const abs = computed(() => {
        count1++;
        return Math.abs(leaf.get());
    });
    let count2 = 0;
    const top = computed(() => {
        count2++;
        return abs.get();
    });

    top.get();
    assert(count1 == 1 && count2 == 1, "first compute");

    leaf.set(1);
    top.get();
    assert(count1 == 1 && count2 == 1, "still lazy and cached");

    leaf.set(-1);
    top.get();
    assert(count1 == 2 && count2 == 1, "still lazy and cautious");
});
