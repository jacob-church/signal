# Simple, declarative, reactive, _lazy_

A declarative design pattern for reactive state management (developed with Deno)<br>
(for a detailed break down of how Signals work, see [EDU.md](./EDU.md))

## Motivation

`Signal`s offer essentially 2 benefits:

1. Declarative, reactive calculations

   Write simple, declarative code; automatically get updated outputs when
   dependency data changes

2. Lazy, cached calculations

   Computed signals only recalculate their values when asked, and only if their
   dependency data has meaningfully changed

In this way, `Signal`s function easily as both a reactivity pattern and a
performance enhancement pattern!

## Usage

To make a piece of state a `Signal`, simply wrap it with the `state` method:

```typescript
const num = state(0);
const str = state("");
const bool = state(true);
const obj = state({});

// access
console.log(num.get()); // 0

// update
num.set(10);
```

To build complex, reactive state, use the `computed` method:

```typescript
const data = signal(0);
const complex = computed(() => data.get() + 10);
console.log(complex.get()); // 10
complex.set(100); // <<ERROR>> - writing to a computed signal is not allowed
data.set(100);
console.log(complex.get()); // 110
```

To manipulate `state`, use the `set`, `mutate`, or `update` functions.

`set` is for overwriting values:

```typescript
const n = state(0);
console.log(n.get()); // 0
n.set(10);
console.log(n.get()); // 10
```

`mutate` is for updating values in place. In particular, for manipulating data
structures in a way that will track changes reactively:

```typescript
const obj = state({ hello: "world" });
console.log(obj): // { hello: "world" }
obj.mutate((value) => value.hello = "devs");
console.log(obj); // { hello: 'devs' }
```

`update` is for computing new values _based on_ previous values:

```typescript
const counter = state(0);
console.log(counter.get()); // 0
counter.update((val) => val + 1);
console.log(counter.get()); // 1
```

Changes to `state` values are automatically reflected in `computed` values on
their next read:

```typescript
const num = state(0);
const plusOne = computed(() => num.get() + 1);
console.log(plusOne.get()); // 1
plusOne.set(5);
console.log(plusOne.get()); // 6
```

# Effects

`Signal`s _always_ track their dependencies, but without the use of the `effect`
function, updating Signal values will be significantly **less efficient**.

`effect` is a special function for describing a side-effect that depends on the
value of some number of `Signal`s. By default, the provided calculation will
_not_ run when it's dependencies change. Instead, it is left to the user to
decide how frequently the function should run by calling `flushEffectQueue()`.

This pattern ensures that the laziness of `Signal`s isn't in vain by only
forcing `Signal` values to compute when it's reasonably necessary (such as at
regular rendering intervals).

## Usage

Define an effect like so:

```typescript
effect(() => {
    console.log(someSignal.get());
});
```

...and schedule it's evaluation according to your needs:

```typescript
function flushEffects() {
    flushEffectsQueue();
    requestAnimationFrame(flushEffects); // continuously flush the queue each frame
}
flushEffects();
```

If you wish to maintain multiple queues for different purposes (e.g. rendering
vs. saving/serializing state changes), simply define associate an `effect` with
a specific `namespace` through it's optional parameter.

Then, if you want to flush a specific queue, pass this identifier to
`flushEffectsQueue()`:

```typescript
effect(() => document.getElementsByTagName('body').innerHtml = bodyContents.get(), {
   namespace: 'render',
});
...
flushEffectsQueue('render');
```

> **_NOTE_**: Calling `flushEffectsQueue` will flush _all_ queues, regardless of
> namespace, so be mindful about defining effect namespaces and flushing their
> relevant queues.
