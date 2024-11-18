import { computed } from "../computed.ts";
import type { Signal } from "../signal.ts";
import { signal } from "../leaf.ts";
import { assert } from "./lib.ts";

Deno.test("simple signal", () => {
    const num = signal(5);
    const str = signal("test");
    const bool = signal(true);
    assert(num.value === 5, "number signal should be 5");
    assert(str.value === "test", 'string signal should be "test"');
    assert(bool.value === true, "bool value should be 'true'");

    num.value = 10;
    str.value = "pass";
    bool.value = false;
    assert(num.value === 10, "number signal should be 10");
    assert(str.value === "pass", 'string signal should be "pass"');
    assert(bool.value === false, "bool value should be 'false'");
});

Deno.test("computed signal", async (test) => {
    await test.step("should return correct values", () => {
        const a = signal(5);
        const b = signal(10);
        const c = computed(() => a.value + b.value);
        assert(c.value === 15, "computed should be 15");

        a.value = 10;
        assert(c.value === 20, "computed should be 20");
    });

    await test.step("should only recalculate on changes to dependencies", () => {
        let recalculated = true;
        const s = signal(0);
        const c = computed(() => {
            recalculated = true;
            return s.value;
        });
        assert(c.value === 0, "should be 0");
        s.value = 10;
        recalculated = false;
        assert(c.value === 10, "should be 10");
        assert(recalculated, "should have recalculated");
        s.value = 10;
        recalculated = false;
        assert(c.value === 10 && !recalculated, "should not have recalculated");
    });
});

Deno.test("should error on circular dependencies", () => {
    let a: Signal<number> | undefined = undefined;
    const b = computed(() => a?.value ?? 0);
    const c = computed(() => b.value);
    a = c; // make circular link
    let caught = false;
    try {
        console.log(c.value);
    } catch {
        caught = true;
    }
    assert(caught, "should have thrown error");
});
