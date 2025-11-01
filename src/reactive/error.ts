export class SignalCircularDependencyError extends Error {
    constructor() {
        super("Cycle detected in Signal graph.");
    }
}

export class SignalChangedWhileComputingError extends Error {
    constructor() {
        super(
            "A WritableSignal was updated while this Signal was computing.",
        );
    }
}
