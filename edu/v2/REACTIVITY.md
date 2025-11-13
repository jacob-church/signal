# Change tracking

Perhaps the core feature of Signals is **reactive state management**. That means
that when you read a Signal's value, it should _always_ be **consistent** with
the values of it's dependencies.

Fundamentally, keeping our Signal graph in a consistent state requires some way
for Producers to notify their consumers when a change has happened, but to do
that, first a Producer needs to know who it's Consumers _are_.

This is an easy problem to solve if we understand the call stack.

## Wrapping our heads around recursion and the callstack

(TODO links to source code)

Hopefully if you're reading this you understand what a stack is, but let's be
clear about the _call stack_.

Calling functions is basically a depth-first search (DFS) through your code.
(Code is frequently modeled as a tree, and traversing a tree from its roots to
its leaves is basically what a DFS _is_.) Famously, the simplest implementation
of a DFS uses a stack, and the call-stack is no different: when you call a
function, the function's local data is stored on **the call stack** (and before
calling a function, the line of code to return to is generally pushed onto the
stack as well). The deeper we go, the more data this stack holds.

Signals work by calling functions--specifically the `compute` function, for a
`Computed`. Inside of those functions, we access other Signals' values by
calling `get`. This means that for any given _Producer_ we can find it's
_Consumer_ by looking up the call stack.

Now, programming languages don't typically _expose_ their call stack (for good
reason), but that's fine; we only really need the "top" of the stack anyways.

Therefore, figuring out who the current Consumer is only requires saving that
Consumer in a place we can access before reaching inside of it's dependencies (a
global variable does the trick), and restoring values is as simple as keeping
previous values of our global variable in the call stack, and restoring them
with a `try {} finally {}`.

## Notification and invalidation

Once a Producer can keep track of its Consumers, it can notify them of changes.
This is a simple process: a Producer iterates over its Consumers and
`invalidate`s them. Importantly however, **this should not cause eager
recalculations**. Instead, `Computed` values mark a flag that communicates "next
time my value is accessed I may need to recompute it". This maintains the
laziness of our application--for all we know a notified `Computed` may never be
accessed again! In any case, the notification must be recursive (up the graph in
this case) so that all transitive dependencies can have the opportunity to
recompute.
