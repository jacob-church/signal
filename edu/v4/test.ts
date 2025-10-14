import { assert } from "../lib/test.ts";
import { computed } from "../v3/signal.ts";
import { signal } from "./signal.ts";

Deno.test("should not propagate changes when the value didn't actually change", () => {
    const a = signal(0);
    let count = 0;
    const b = computed(() => {
        count += 1;
        return a.get();
    });
    assert(b.get() === 0, "should compute correct value");
    assert(count == 1, "should compute once");
    a.set(0);
    assert(b.get() === 0, "should not change the value");
    assert(count == 1, "should not recompute");
});
