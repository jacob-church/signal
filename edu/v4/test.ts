import { assert } from "../lib/test.ts";
import { computed, effect, state } from "./interface.ts";
// import { Effect } from "./signal.ts";

Deno.test("should not track dependencies that aren't currently relevant", () => {
    const useA = state(true);
    const a = state("green");
    const b = state("red");
    let count = 0;
    const color = computed(() => {
        count += 1;
        if (useA.get()) {
            return a.get();
        } else {
            return b.get();
        }
    });

    assert(color.get() == "green" && count == 1, "first computation");
    useA.set(false);
    assert(color.get() == "red" && count == 2, "toggle conditional");
    a.set("yellow");
    assert(
        color.get() == "red" && count == 2,
        "change to untracked dependency shouldn't cause recompute",
    );
});

// Deno.test("basic effects", () => {
//     const value = state(0);
//     const indirect = computed(() => value.get());
//     const out: number[] = [];
//     effect(() => out.push(indirect.get()));

//     assert(out.length == 0, "effect does not execute on initialization");
//     Effect.flush();
//     assert(out.length == 1, "effect should enqueue on initialization");
//     Effect.flush();
//     assert(out.length == 1, "queue should clear on flush");
//     value.set(1);
//     Effect.flush();
//     assert(
//         out.length == 2,
//         "invalidating a dependency should enqueue the effect",
//     );
// });
