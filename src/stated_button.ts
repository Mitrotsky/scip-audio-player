type WithDefault<States> = States | "default";
export type ButtonCallback = (ev: PointerEvent) => void;


export class StatedButton<States extends string> {
    private buttonElement: HTMLButtonElement;
    private states: Map<WithDefault<States>, ButtonCallback>;
    private _state: WithDefault<States> = "default";

    constructor(button: HTMLButtonElement) {
        this.buttonElement = button;
        this.states = new Map();
        this.addState("default", () => console.error("[Mit/StatedButton] Default state should never be called."));
        this.state = "default";
    }

    public addState(state: WithDefault<States>, callback: ButtonCallback): void {
        if (this.states.has(state)) console.debug(`[Mit/StatedButton] Provided state "${state}" already exists. Updating callback.`);
        this.states.set(state, callback.bind(this));
    }

    public set state(state: WithDefault<States>) {
        const callback = this.states.get(state);
        if (callback) {
            this.buttonElement.onclick = callback;
            this.buttonElement.classList.remove(this._state);
            this.buttonElement.classList.add(state);
            this._state = state;
            return;
        }
        throw new Error(`[Mit/StatedButton] Provided state "${state}" doesn't exist.`);
    }

    public get state(): WithDefault<States> {
        return this._state;
    }
}
