# Effects: The basics

To talk about Effects I need to give you a disclaimer: while the implementations
of Signals across frameworks are remarkably similar, effects are different. The
details are strongly coupled to the particular needs of the framework.
Therefore, while the implementation of `State` and `Computed` in this guide are
reasonably mature, the implementation of `Effect`s provided here is trite by
comparison. Just enough to illustrate the essential principles.

## Scheduling: when should side-effects run?

Ultimately, we have to _do_ something with all this data, or it's a waste of
space. But up until this point, we have been doing quite a lot to _avoid_ doing
much at all.

Yet, side-effects must run. The question is when? And how often?

Obviously at this point, if a side-effect ran _immediately_ upon it's
invalidation, we would utterly waste all that laziness we built into this
framework. Worse, if we ran an effect immediately when something changed, we
would frequently end up with inconsistent behavior, because half of the graph
may not have even been marked stale yet (and therefore can't be relied upon to
provide us with consistent values).

So, instead, we put the effect in a queue for later.

```typescript
// see Effect.invalidate
public invalidate(): void {
    Effect.queue.add(this);
}
```

## Trust the user (or the framework)

From there, deciding when to run _queued_ effects is ultimately a user (or
framework) decision. They should run infrequently enough to benefit from
laziness, and frequently enough to be _useful_. The right frequency for you
depends on what you want your effects to _do_. Is it updating the DOM, or
rendering to a canvas? Then flush the queue on every animation frame (or enough
of them to meet a target framerate). Is it saving changes to your backend? Then
flush some unit of time after the last user input. The answer will depend on
your particular needs.

> [**Prev - Smarter Reactivity**](../v4/SMARTER_REACTIVITY.md)

> [**Next - Memory Management**](../v6/MEMORY_MANAGEMENT.md)