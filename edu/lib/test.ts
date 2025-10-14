export function assert(expression: boolean, message?: string) {
    if (!expression) {
        throw new Error(message ?? "Assertion failed.");
    }
}
