# Simple, declarative, reactive, lazy

A declarative design pattern for reactive state management, written with Deno

## Motivation

Signals offer essentially 2 benefits:

1. Declarative, reactive calculations

   Write simple, declarative code; automatically get updated outputs when
   dependency data changes

2. Lazy, cached calculations

   Computed signals only recalculate their values when asked, and only if their
   dependency data has meaningfully changed

In this way, Signals function easily as both a reactivity pattern and a
performance enhancement pattern!

## Usage

To make a piece of state a signal, simply wrap it with the `signal` method:

```typescript
const num = signal(0);
const str = signal("");
const bool = signal(true);
const obj = signal({});

// access
console.log(num.value); // 0

// update
num.value = 10;
```

To build complex, reactive state, use the `computed` method:

```typescript
const data = signal(0);
const complex = computed(() => data.value + 10);
console.log(complex.value); // 10
complex.value = 100; // <<ERROR>> - writing to a computed signal is not allowed
data.value = 100;
console.log(complex.value); // 110
```

> **_NOTE_:** For the moment, wrapping an object in a signal does not
> automatically invalidate `computed` calculations when object properties are
> updated; for these cases use an optional equality function and reassign
> `.value`:
>
> ```typescript
> const obj = signal({}, () => false);
> obj.value["hello"] = "world";
> obj.value = obj.value;
> ```
