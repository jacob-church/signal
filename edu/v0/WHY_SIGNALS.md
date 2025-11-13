# Why are Signals so popular?

## Events

(TODO: example code)

Before Signals, the most obvious way to deal with **reactive state** would be to
use some form of Events.

```typescript
...
eventHub.emit('someEvent', optionalPayload)
...

...
// somewhere else...
eventHub.listen('someEvent', (payload) => {
    // do things with that data
})
...
```

Perhaps this is familiar: a user clicks a button or enters some text and an
Event is fired. Something somewhere listens to that Event, reads the new data,
and does some computation with it. This is a perfectly reasonable and functional
approach.

However, it can come with some drawbacks.

For one, depending on how events are implemented, it can be a bit opaque tracing
_what happens_ when that user clicks the button. You know an event is being
fired, and you now look for places that register listeners for that event. You
may well find more than one, and each begins manipulating other data in reaction
to the original change. It may be difficult to tell in what order these
manipulations take place, and it's certainly difficult to _guarantee_ that none
of them can step on each other's toes. These problems are inherent to the
**imperative** style of this kind of code. (Not that these aren't solvable
problems, but it's _your_ job to solve them.)

In addition, these calculations are **eager**. As _soon_ as an event is fired,
you start processing. If a user clicks that button repeatedly, or changes come
in especially fast (think, for example, an object being dragged across the
screen), then whatever logic you've wired up will run and run _and run_ for
every event. (Again, unless _you_ write some special code to debounce or delay
this stuff).

## Signals

(TODO: example code)

Contrast this with Signals. Effectively, they're just an abstraction around
these common needs when dealing with **reactive state management**.

Because Signals are **lazy**, you guarantee that data changes aren't calculated
until they're _needed_. Because they're **cached**, you gaurantee that changes
are only calculated _once_ per _meaningful change_. Because Signals are composed
**declaratively**, you don't need to think about the order things happen in,
only what your data "is", and what other data it depends on. Even if multiple
Signals share dependencies, all of those values will be calculated _in the order
they're needed_--you don't have to worry about proper sequencing at all.

It turns out these are great guarantees for writing web apps at scale.
