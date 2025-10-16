# Learning Signals

The contents of this directory are intended to help you deeply understand the
Signal pattern implemented in this repository. The sub directories are as
follows:

- [`v0`](./v0/INTERFACE.md) discusses the Signal interface, particularly the
  `state` and `computed` functions.
- [`v1`](./v1/LAZY_CACHING.md) is our first implementation (just lazy, cached
  values).
- [`v2`](./v2/REACTIVITY.md) is the first Signal that's really a "Signal"--this
  implementation includes reactive updates and state synchronization
- [`v3`](./v3/SIMPLE_OPTIMIZATIONS.md) tightens up some inefficiencies in our
  implementation.
- [`v4`](./v4/EFFECTS.md) adds schedulable side-effects
- [`v5`](./v4/MEMORY_MANAGEMENT.md) discusses garbage collection concerns and a
  simple approach to responsible memory management.
