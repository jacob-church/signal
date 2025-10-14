import { assert } from "../lib/test.ts";
import { computed, effect, signal, Watcher } from "./signal.ts";

Deno.test("watcher should queue effects when a dependency is updated", () => {
    const state = signal(0);
    const compute = computed(() => state.get() + 1);
    const outputs: number[] = [];
    effect(() => outputs.push(compute.get()));
    assert(outputs.length == 0, "effects should not be eagerly evaluated");
    Watcher.flush();
    assert(
        outputs.length == 1 && outputs[0] == 1,
        "effects are automatically enqueued on first creation",
    );
    state.set(1);
    assert(
        outputs.length == 1,
        "enqueing effects is not the same thing as executing them",
    );
    Watcher.flush();
    assert(
        outputs.length == 2 && outputs[1] == 2,
        "effects should be correctly executed when the queue is flushed",
    );
});
