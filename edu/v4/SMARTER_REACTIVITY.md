# Fine-grained dependency tracking

Our implementation so far is correct, and reasonably fast, but it hides an
annoying behavior. Consider an example:

```typescript
const useA = state(true);
const a = state("a");
const b = state("b");
computed(() => {
    if (useA.get()) {
        return a.get();
    } else {
        return b.get();
    }
});
```

When a `Computed` function contains branching logic, that means it might be
actively depending on certain Signals one moment, and depend on _different_ ones
in the next. (You can achieve a similar effect if your dependencies are held in
a collection of some kind.)

Ideally, a `Computed` Signal should _not_ be `invalidate`d by things its not
actively depending on. It _certainly_ shouldn't recompute because of changes to
those dependencies.

## Evaluating "stale" links

The useful framing question here is "did this Producer participate in my last
call to `compute`". (We _do_ have to have called `compute` to determine that a
dependency doesn't matter anymore--else we have no way of inspecting how one
change to a Signal dependency could lead to dropping dependencies on others.)

> **Note:** This implies that you _must_ use Signals to track branching logic
> within a `Computed`. Failing to do so falls in the general category of
> "depending on mutable, non-Signal data breaks the guarantees of
> reactivity"--if something important would change the outcome of our function,
> and it's not a Signal, our output will be wrong until an actual Signal
> dependency prompts a recompute.

To do this we can borrow a trick from the last step in our implementation:
version numbers.

```typescript
interface Consumer {
    ...
    computeVersion: number;
    ...
}
```

Think about it, what better way to sync between a Producer and a Consumer than
"I know I participated in the last call to `compute` because I ~~got the t-shirt
at the merch table~~ got the number you handed out to everyone who showed up.

With this version number in hand, its really easy for Producers and Consumers to
avoid needless updating: don't notify Consumers if our link is stale. Don't
check changes to Producers if our link is stale.

```typescript
function unlinkIfNeeded(consumer: Consumer, producer: Producer): boolean {
    const lastComputeVersion = producer.consumers.get(consumer);
    if (consumer.computeVersion == lastComputeVersion) {
        return false;
    }

    consumer.producers.delete(producer);
    producer.consumers.delete(consumer);
    return true;
}
```
