import { assert } from "../lib/test.ts";
import { computed } from "./signal.ts";

Deno.test("should incorporate dependencies", () => {
    const a = computed(() => 3);
    const b = computed(() => 4);
    const c = computed(() => a.get() + b.get());

    assert(c.get() == 7, "computed value should combine dependencies");
});
