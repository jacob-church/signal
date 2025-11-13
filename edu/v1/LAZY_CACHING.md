# Laziness & Caching

The easiest features to implement are laziness and caching.

The principle is simple: don't calculate a Computed value until someone asks for
it, and don't recalculate it if someone asks for it again.

For now, that's it, but we'll see in future versions how we work to maintain
honor those priorities.
