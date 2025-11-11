import { assert } from "../lib/test.ts";
import { computed, state } from "./interface.ts";

Deno.test("should not recompute if State did not actually change", () => {
    const a = state(0);
    let count = 0;
    const b = computed(() => {
        count += 1;
        return a.get();
    });

    b.get();
    assert(count == 1, "first computation");
    a.set(0);
    b.get();
    assert(count == 1, "shouldn't recompute for no-op change");
});

Deno.test("should not recompute if a Computed did not actually change", () => {
    const a = state(1);
    let bCount = 0;
    const b = computed(() => {
        bCount += 1;
        return Math.abs(a.get());
    });
    let cCount = 0;
    const c = computed(() => {
        cCount += 1;
        return b.get();
    });

    c.get();
    assert(bCount == 1 && cCount == 1, "first computation");
    a.set(-1);
    c.get();
    assert(
        bCount == 2 && cCount == 1,
        "shouldn't rerun computations if their dependencies haven't changed",
    );
});