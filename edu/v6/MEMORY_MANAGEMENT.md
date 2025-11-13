# Memory Management

Up to this point I have been ignoring a glaring problem with our Signals:
garbage collection.

<link to Garbage Collection>

## Back-references

The problem falls on these `Consumer` links.

`Producer` links are generally not problematic--this is the way that most code
is written! You define an object of some kind, then you define other objects
that depend on that object. As long as the second object is in memory, it will
need the first to come along with it. As soon as the second object disappears,
the first may persist, if needed.

This is the relationship that a `Computed` or `Effect` has with it's
dependencies, and it's normal and natural.

But holding links to `Consumer`s inverts this natural order, and effectively
prevents those objects from being garbage collection. _Ever_.

## Solutions

There are a variety of ways to handle this problem, each with their trade-offs.

### Disposables

Perhaps the simplest approach is to make all of your Signals `Disposable`. This
means putting the responsibility for memory-management _back_ into the hands of
the programmers.

Essentially, when a Signal is created, the programmer must account for when it
goes out of scope, and `dispose` that object manually. Under the hood, disposal
just needs to remove the `Consumer` links. It's pretty easy to implement.

...but I hate it. Disposables are _annoying_. And they're easy to forget, and
even with the shiny new tools that exist for it in `TypeScript`, there are still
plenty of cases that need to be accounted for. Plus, it 's like a code
infection--once one thing is Disposable, other things follow.

(So I'm not going to do it 😃)

### "Watched" vs. "Unwatched"

This is the popular solution among frameworks. The responsibility for
memory-management can't be _completely_ avoided, but at least it can be
restrained: only the `Effect`s need to be `Disposable`. Then, as long as a
`Signal` is depended on (transitively) by an `Effect`, it's ok to maintain
`Consumer` links and reap their sweet benefits. Putting this another way,
`Consumer` links are ok if the Signal is being "watched" by an Effect.

To implement this safely though it means that "unwatched" Signals have to drop
those links, and that comes with a big trade-off: without `Consumer` links, its
impossible to `invalidate` the graph, and if it's impossible to `invalidate` the
graph, then the only* way for a `Computed` to guarantee it's value is up to date
is to recompute it. _Every time_. This is _horrendously_ inefficient.

In practice though it's not _that_ bad, because most Signals are being watched
_most_ of the time. Notable exceptions might include a button which, when
clicked, pulls a value from the graph for some purpose. The momentary,
ephemeral, and immediate nature of this interaction makes using an `Effect`
ineffective (har har). But also, unwatched nodes of this sort _tend_ do live
higher in the graph, with shallower dependencies, or near-connections to watched
portions of the Signal graph.

> \* Angular does have _one_ cute little trick to avoid this: a global tracking
> number that updates when _any_ Signal changes. The thinking is "if _nobody in
> the whole world" has changed, then I don't have to recompute. In a system
> packed full of Signals and user interactions this is a rare benefit, however.

### WeakRefs

Another solution to our problem is "weak references". Remember the Mark and
Sweep algorithm? Well, the "mark" step only follows _strong_ references. The
entire idea behind a weak reference is "don't follow this during the Mark and
Sweep algorithm".

So we can just replace all our `Consumer` links with `WeakRef`s. (link)

At first, this seems like a silver bullet. The problem is, `WeakRef`s have to be
manually `deref`ed, and this is _slow_. Like, slow enough to bring a complex
application to a grinding halt. So this solution won't cut it.

### FinalizationRegistry

If you know about `WeakRef`, you've probably heard of `FinalizationRegistry`.
The idea is simple: register an object, and a callback for _stuff_ you want to
happen when that object is garbage-collected.

It's not _immediately_ obvious how we could leverage this--our values aren't
being garbage-collected to begin with--but with a little tinkering we could
approach something that _looks_ like it ought to work.

Imagine that we split up the implementation of our Signals. The inner kernel is
the _bare_ Signal. The pieces that participate in the reactive framework. The
outer shell is the public interface, the Signal object with it's getter (and
setter).

```typescript
export class State<T> implements WritableSignal<T> {
    private node: StateNode;
    ...
}

class StateNode<T> implements Producer<T> {
    ...
}
```

If our `Consumer` links only point to the _inner_ part of a Signal, then the
_outer_ part can go out of scope and get garbage collected, right? Then, we just
register the _outer_ part, with a callback to clean up dispose references to the
_inner_ portion!

Unfortunately, this doesn't quite work, and the problem comes down to the
`compute` function: it's held inside of the reactive framework, and it _holds_
references to things in it's function closure.

Look at this simple, reasonable example:

```typescript
class Container {
    private s = state(0);
    private c = computed(() => this.s.get());
}
```

It's subtle, but this `Computed` is tied to the `Container`. Ideally, the
`Container` would fall out of memory, so the `Computed` would fall out of
memory, so the `FinalizationRegistry` would be triggered and we could cleanup
the `Consumer` links in the graph separately. But even an inner `Computed` node
needs to hold this function closure, and that function closure holds the
`Container`... so no garbage-collection, no cleanup.

This is not even to mention that `FinalizationRegistry` has very weak guarantees
from the outset. (link)

## A hybrid approach

So what should we choose? Well, for the sake of being adventurous, we're going
to try something a little novel: a hybrid approach of the watched vs. unwatched
graph, and weak references.

Basically, in the watched vs. unwatched approach, we're _already_ accepting a
circumstantial slowdown. But recomputing every time is _harsh_. If the "best"
(because widespread Disposables are lame) approach is already slow, we can pick
our slow, and for this guide, I choose weak references (for unwatched nodes).

### Watching

(TODO: image; watched parents, make watched children) First, we will assume that
the graph is "unwatched" by default. This is the safe choice, but also makes the
next step easier: when does a node in the graph become watched? Simple:

- when an Effect depends on it
- when a "watched" node depends on it

Once we've established room for watched and unwatched consumers to sit side by
side, this is easy to implement. We'll consider an Effect to be perpetually
watched, then as we access nodes, in the pre-order traversal (e.g. "on the way
down"), a node will become "watched" if it is ever accessed by another watched
node.

With this in place, we need only to make sure we store references to watched and
unwatched Consumers correctly in each Producer.

```typescript
function recordAccess(producer: Producer): void {
    if (!activeConsumer) {
        return;
    }

    activeConsumer.producers.set(producer, producer.valueVersion);
    const computeVersion = activeConsumer.computeVersion;
    if (activeConsumer.isWatched) {
        producer.watched.set(activeConsumer, computeVersion);
        producer.unwatched.delete(activeConsumer.weakRef);
    } else {
        producer.unwatched.set(activeConsumer.weakRef, computeVersion);
    }
}
```

### Un-watching

We could say that we "watch" nodes lazily: we do it when we find that we have
to. Unwatching nodes, however, is sudden and dramatic.

An Effect is disposed (sigh. Can't be avoided completely.), and a whole portion
of the graph needs to be updated immediately.

This is a simple recursive process: transfer the unwatching node from the
watched set to the unwatched set in each of it's Producers. If a Producer no
longer has any "watchers", mark it unwatched and recurse.

```typescript
function unwatchProducers(consumer: Consumer): void {
    for (const producer of consumer.producers.keys()) {
        if (unlinkIfNeeded(consumer, producer) || !producer.isWatched) {
            continue;
        }

        producer.watched.delete(consumer);
        producer.unwatched.set(consumer.weakRef, consumer.computeVersion);
        if (producer.watched.size === 0) {
            producer.isWatched = false;
            isConsumer(producer) && unwatchProducers(producer);
        }
    }
}
```

(TODO: image)

#### Effects and conditional logic

There is _one more_ place we have to be mindful of unwatching, and it's a little
subtle. Thinking back to [SMARTER_REACTIVITY.md](../v4/SMARTER_REACTIVITY.md),
conditional logic in a Signal's function can change the Signals that are
depended on.

```typescript
const useA = state(true);
const a = computed(...);
const b = computed(...);
effect(() => {
    if (useA.get()) {
        console.log(a.get());
    } else {
        console.log(b.get());
    }
});
```

This means that an Effect can _lose sight_ of some of it's Producers, and thus
be unable to unwatch them when disposal time comes around. Therefore, the
responsible thing to do is to make sure those dependencies are unwatched when
the dependencies are dropped. (There's a clue that we should do this in the
code: whenever we delete a watched link, we might find that we don't have any
left!)

```typescript
function unlinkIfNeeded(consumer: Consumer, producer: Producer): boolean {
    const lastComputeVersion = producer.watched.get(consumer);
    if (consumer.computeVersion == lastComputeVersion) {
        return false;
    }

    consumer.producers.delete(producer);
    producer.watched.delete(consumer);
    producer.unwatched.set(consumer.weakRef, lastComputeVersion!);

    if (producer.isWatched && producer.watched.size === 0) {
        producer.isWatched = false;
        isConsumer(producer) && unwatchProducers(producer);
    }
    return true;
}
```

> [**Prev - Effects**](../v5/EFFECTS.md)