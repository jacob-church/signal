import { assert } from "../lib/test.ts";
import { computed } from "./interface.ts";

Deno.test("should be lazy", () => {
    let count = 0;
    const signal = computed(() => {
        count += 1;
        return 0;
    });
    // we haven't "read" the signal yet
    assert(count == 0, "should not eagerly calculate");
    signal.get();
    assert(count == 1, "should calculate when value is requested");
});

Deno.test("should cache value", () => {
    let count = 0;
    const signal = computed(() => {
        count += 1;
        return 0;
    });
    let value = signal.get();
    assert(value == 0, "should produce computed value");
    value = signal.get(); // read it again
    assert(value == 0, "should remain consistent");
    assert(count == 1, "should only compute once");
});
