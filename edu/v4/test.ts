import { assert } from "../lib/test.ts";
import { computed, effect, state } from "./interface.ts";
import { Effect } from "./signal.ts";

Deno.test("basic effects", () => {
    const value = state(0);
    const indirect = computed(() => value.get());
    const out: number[] = [];
    effect(() => out.push(indirect.get()));

    assert(out.length == 0, "effect does not execute on initialization");
    Effect.flush();
    assert(out.length == 1, "effect should enqueue on initialization");
    Effect.flush();
    assert(out.length == 1, "queue should clear on flush");
    value.set(1);
    Effect.flush();
    assert(
        out.length == 2,
        "invalidating a dependency should enqueue the effect",
    );
});
