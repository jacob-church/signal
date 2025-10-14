import { assert } from "../lib/test.ts";
import { computed, signal } from "./signal.ts";

Deno.test("should propagate changes reactively", () => {
    const a = signal(0);
    const b = signal(5);
    const c = computed(() => a.get() + b.get());

    assert(c.get() == 5, "should compute correctly based on dependencies");

    a.set(5);
    assert(c.get() == 10, "should update correctly based on dependencies");
});

Deno.test("should update lazily", () => {
    const a = signal(0);
    let count = 0;
    const b = computed(() => {
        count += 1;
        return a.get();
    });
    b.get();
    assert(count == 1, "should compute value");
    a.set(1);
    assert(count == 1, "should not eagerly evaluate changes");
});

Deno.test("should track dependencies across deep call stacks", () => {
    const a = signal(0);
    function first() {
        return a.get() + 1;
    }
    function second() {
        return first() + 1;
    }
    function third() {
        return second() + 1;
    }
    function fourth() {
        return third() + 1;
    }

    const b = computed(() => fourth() + 1);

    assert(b.get() == 5, "should return correct value");
    a.set(1);
    assert(b.get() == 6, "should track dependency through nested functions");
});
