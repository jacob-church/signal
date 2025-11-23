import type { SignalNode } from "./types.ts";

/**
 * Whether or not a {@link Computed} Signal should be re-evaluated.
 */
export const STALE = 1;
/**
 * Whether or not a {@link Consumer} is currently running its computation.
 */
export const COMPUTING = 2;
/**
 * Whether or not a {@link Signal} is a transitive dependency of an
 * {@link Effect}.
 */
export const WATCHED = 4;

export function hasFlags(node: SignalNode, flags: number): boolean {
    return (node.flags & flags) === flags;
}
export function setFlags(node: SignalNode, flags: number): void {
    node.flags |= flags;
}

export function clearFlags(node: SignalNode, flags: number): void {
    node.flags &= ~flags;
}
