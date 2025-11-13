import { assert } from "../lib/test.ts";
import { computed, state } from "./interface.ts";

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
