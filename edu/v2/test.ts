import { assert } from "../lib/test.ts";
import { computed, state } from "./interface.ts";

Deno.test("should update reactively", () => {
    const leaf = state(0);
    const plusOne = computed(() => leaf.get() + 1);

    assert(plusOne.get() == 1, "should incorporate dependency");

    leaf.set(1);
    assert(
        plusOne.get() == 2,
        "should invalidate cache when dependencies change",
    );
});
