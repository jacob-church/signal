# What are Signals?

[Signals](https://github.com/tc39/proposal-signals) are a framework for
**reactive state management**, with **high performance** characteristics, and a
**declarative syntax**.

## The Signal graph

<image src="./graph.png" width="800">

Signals are one way of composing an application's data. At the bottom of graph
are simple pieces of mutable "state". These can be basic properties, user
inputs, etc. In the middle of the graph are bits of "computed" state. These are
the more refined, processed values, computed essentially like "pure functions"
of more basic data (lower in the graph). At the top are "side-effects" (or just
"effects" for short). These answer the question "what do I need to _do_ with
this data", and often include things like updating the
[DOM](https://developer.mozilla.org/en-US/docs/Web/API/Document_Object_Model),
rendering to a canvas, or even uploading application state to a server.

## Reactive

Signals are a way of composing data such that the values and functions at the
top of the graph are automatically updated in lock step with the inputs at the
bottom of the graph. This means that at any time that you read a "computed"
value, or run an "effect", the inputs to those functions are guaranteed to be in
a state consistent with the rest of the graph.

## Performant

Signals are _fast_. More specifically, they're _extremely_ lazy, and their
computed values are cached. This means that a Signal will not compute it's value
until the last possible moment (when that value is explicitly requested for the
first time), and the result of that calculation will be stored for to answer
future requests. As long as the inputs to the graph don't change, those stored
values will remain in place, and any future request for data is lightning fast.
Think of it like one big, very sophisticated dynamic programming system.

## Declarative

Signals are defined in terms of what they "are" rather than in terms of a
sequence of manipulations of system memory. They're like formulas: when you read
a math formula, you don't think about "state", only inputs and outputs. This
makes the outcome of a formula easier to reason about. Compare that to an
imperative style, where one needs to be mindful of step by step changes in
_state_, at different points in _time_.

## The interface

Before we implement anything we should understand the interface we'll be
supporting.

A Signal is effectively a wrapper around a value, with a simple getter:

```typescript
interface Signal<T> {
    get(): T;
}
```

The input-Signals at the bottom of the graph are slightly more. They include a
setter:

```typescript
interface WritableSignal<T> extends Signal<T> {
    set(value: T): void;
}
```

To generate our Signals, we start with two atomic builders. One for the mutable
"state", and another for the "computed" values:

```typescript
function state<T>(value: T): WritableSignal<T> {
    return new State(value);
}
function computed<T>(compute: () => T): Signal<T> {
    return new Computed(compute);
}
```

Finally, we can generate our side-effects like so:

```typescript
function effect(fn: () => void): Effect {
    return new Effect(fn);
}
```

The only guarantee the above function gives is "the function you provided will
be scheduled when it's Signal dependencies change". To then run any scheduled
effects, we can expose another function:

```typescript
function runEffects() {...}
```

The details don't matter; just know that calling this function will run any
functions that depend on updated Signals.

### Putting it into practice

This topic is well served by an example. Let's say you have a webpage that lists
some _stuff_. At the top of that webpage is a search bar which filters the
elements on the screen.

With Signals, you might model that something like this:

```typescript
// input from the page load
const stuffList = state<Stuff[]>([]);
loadDataPromise.then((theStuff) => stuffList.set(theStuff));

// input from a user
const searchValue = state("");
const searchBar = document.getElementById("search-bar");
searchBar.addEventListener(
    "input",
    (event) => searchValue.set(event.target.value),
);

// combining that data in a meaningful way
const filteredList = computed(() =>
    filterListBySearch(stuffList.get(), searchValue.get())
);

// reflecting that combination to the screen
effect(() => {
    const listToDisplay = filteredList.get();
    // update the DOM...
});

// updating the screen on a sensible schedule
(function renderLoop() {
    runEffects();
    requestAnimationFrame(renderLoop);
})();
```

(Of course, the syntactic details of this will vary heavily from one framework
to another, but this is the conceptual gist).

> [**Why Signals**](./WHY_SIGNALS.md)

> [**Next - Laziness and Caching**](../v1/LAZY_CACHING.md)
