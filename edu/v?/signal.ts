export class Signal<T = unknown> {
    public get(): T {
    }
}

export class WriteableSignal<T = unknown> extends Signal<T> {
    public set(newVal: T): void {
    }
}
