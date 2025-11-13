# Simple optimizations

The code we've written so far is "correct" and "complete" in that it satisfies
our interfaces and will produce accurate values. However, at this point it's
still pretty slow.

## Optimization 1: "Memoized" stale-marking

(TODO: image)

This is the lowest hanging fruit: once part of the graph is stale, it does no
good to receive further notifications.

```typescript
// see Computed.invalidate
if (this.stale) {
    return;
}
this.stale = true;
notifyConsumers(this);
```

Consider: there are only two ways for a `Computed` to become `stale`. Either it
was the subject of a previous notification (in which case it diligently informed
everyone up the graph as well) and hasn't been recomputed yet (which means
nobody above it could have recomputed either), OR its brand new... in which case
nobody above it could have computed either. Either way, all the nodes above this
`stale` one are already notified.

## Optimization 2: Stingy notifications

(TODO: image)

When values at the bottom of the graph change, the rest of the graph is
notified. However, we would really prefer if this only happened for _meaningful_
changes. If, for whatever reason, I set a `State` to a value it already holds,
the framework should regard this as a no-op, and nothing should recompute.

To do this, we need a way for a `Producer` to check if a _new_ value is
functionally the same as its _current_ value.

```typescript
// see State.set
if (setIfWouldChange(this, newValue)) {
    notifyConsumers(this);
}
...

function setIfWouldChange<T>(producer: Producer<T>, value: T): boolean {
    if (producer.value === UNSET || !producer.equals(producer.value, value)) {
        producer.value = value;
        return true;
    }
    return false;
}
```

### Congifuring equality

Equality is an odd duck. Initially it seems simple, but it quickly becomes less
so. In JavaScript, equality is simple* where primitives are concerned: numbers
are generally simple to compare, as are booleans, strings, etc. Objects are less
obvious. Should we compare references? Or do a deep comparison of properties?
The answer is "it depends".

Performance is a high priority for Signals, and equality can be a cumbersome
operation if the things we want to compare are big. Therefore, it's ideal to
expose equality as a **configurable option**.

```typescript
class State<T> implements Producer<T> {
    constructor(public value: T, equals: (a: T, b: T) => boolean = Object.is) {}
    ...
}
```

Some users may decide that their use-case calls for deep equality checks. Some
may decide that the performance hit won't be worth it, and a simpler comparison
is viable. Some, with confidence, may decide that any call to `set()` is highly
intentional, and no sense of equality matters at all: always notify.

## Optimization 3: Reluctant recomputation

(TODO: image)

Computations can be _expensive_. Especially when there are a lot of them--though
even a simple `Computed` can be pretty hefty. Therefore, we don't want to run
these computations _any_ more than we have to. Consider the above example:
absolute value is a classic case of a many-to-one function. So, it's highly
possible for different inputs to the function to produce the same outputs, and
when that's the case, it would be unfortunate to needlessly recompute values
higher in the graph (notifying them is already done, and we can't avoid that
without eager calculations, which is a very big no-no).

`Computed` functions are _basically_ **pure functions** (pedantically they are
not, but the difference isn't terribly relevant here): they compute values based
on their inputs, and the output should always be the same if the inputs are the
same.

This means that if the "inputs" to our `Computed` haven't changed, _we don't
have to recompute_.

```typescript
// see Computed.resolveValue
if (this.value === UNSET || (this.stale && anyProducersHaveChange(this))) {
    this.value = asActiveConsumer(this, this.compute);
}
this.stale = false;
```

Evaluating this means tracking a Consumer's Producers, and since we're already
linking in the other direction, thats not hard to achieve. However, once we have
those links, we need a cheap and fast way (performance!) to check if those
Producers are holding a meaningful change to their values.

### Cheap comparisons

We've already established that comparing values could be expensive, so we should
hesitate a little to simply compare a Producers old value with its new value.
(Thats certainly an option, but let's treat it as the option of last resort for
now.)

Consider our needs: we only want to answer the question "is this value
meaningfully different since the last time I saw it". To do that we don't
necessarily need to compare outputs (or store potentially problematic references
to old data). Instead, we can just track a _version number_.

```typescript
interface Producer<T> {
    value: T;
    valueVersion: number;
    ...
}
```

Each producer has a number, alongside it's value. When the value changes, _the
number changes_. Consumers can store this number without hassle, and now we have
a cheap heuristic to verify inputs.

```typescript
// see State.set
if (setIfWouldChange(this, value)) {
    // see also Computed.resolveValue
    ++this.valueVersion;
    notifyConsumers(this);
}

...

function anyProducersHaveChanged(consumer: Consumer) {
    for (const [producer, lastSeenVersion] of consumer.producers.entries()) {
        if (producer.valueVersion != lastSeenVersion) {
            return true;
        }
    }
    return false;
}
```

### Uncertainty

However, there is one thing we still need to consider: let's say our
Producer-dependency is itself a `Computed`. It may well be the case that this
dependency _would change_, but it just hasn't yet--its lazily waiting to be
read. Well, since its going to have to do that anyways (and we cache values,
remember) theres no harm in forcing it to change _before_ calling `compute`.
Then we can say with absolute certainty whether or not the dependency has
changed in any meaningful way.

```typescript
function anyProducersHaveChanged(consumer: Consumer) {
    for (const [producer, lastSeenVersion] of consumer.producers.entries()) {
        if (producer.valueVersion != lastSeenVersion) {
            return true;
        }
        producer.resolveValue();
        if (producer.valueVersion != lastSeenVersion) {
            return true;
        }
    }
    return false;
}
```

#### Wasteful computes?

Wait a second, isn't that what we were trying to avoid in the first place?!
Well, strictly _no_. At this point, we're evaluating a `Computed`--we're not
sure we want to run its `compute` function, because that might be very
expensive. Well, if that's true, the most expensive part of the function _isn't_
calling `get()` on dependencies. It's what we intend to _do_ with that
information. Further, this entire process is recursive: when we ask Producers
for their values, _they too_ will look at their dependencies skeptically and
avoid recomputing where possible. So it may be that our dependencies don't have
to recompute either to settle the matter! Either way: after calling `get()` we
can say with absolute confidence _whether the Producer has changed or not_.
