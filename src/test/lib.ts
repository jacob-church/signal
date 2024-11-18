export function assert(
    expression: boolean,
    msg: string = "Assertion failed.",
): void {
    if (!expression) {
        throw new Error(msg);
    }
}
