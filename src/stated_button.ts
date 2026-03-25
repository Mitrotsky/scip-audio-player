type WithDefault<States> = States | "default";
export type ButtonCallback = (ev: PointerEvent) => void;


/**
 * Button wrapper with minimal states
 */
export class StatedButton<States extends string> {
    private buttonElement: HTMLButtonElement;
    private states: Map<WithDefault<States>, ButtonCallback>;
    private _state: WithDefault<States> = "default";

    /**
     * @desc Creates a button wrapper with state management. By default, only the `"default"` state is available.
     * To define additional states, use the generic type parameter:
     * ```ts
     * const buttonWrapper = new StatedButton<"playing" | "paused">(button);
     * ```
     * @desc Then register each state using the {@link StatedButton#addState} method:
     * ```ts
     * buttonWrapper.addState("playing", () => console.log("Playing!"));
     * ```
     */
    constructor(button: HTMLButtonElement) {
        this.buttonElement = button;
        this.states = new Map();
        this.addState("default", () => console.error("[Mit/StatedButton] Default state should never be called."));
        this.state = "default";
    }

    /**
     * @desc Registers a state.
     * @param state - A string literal corresponding to one of the defined states.
     * @param callback - A {@link PointerEvent} callback fired each time the button is clicked.
     */
    public addState(state: WithDefault<States>, callback: ButtonCallback): void {
        if (this.states.has(state)) console.debug(`[Mit/StatedButton] Provided state "${state}" already exists. Updating callback.`);
        this.states.set(state, callback);
    }

    /**
     * @desc Sets a specified state.
     * @param state - A string literal corresponding to one of the defined states.
     * @throws {RangeError} if provided state doesn't exist.
     */
    public set state(state: WithDefault<States>) {
        const callback = this.states.get(state);
        if (callback) {
            this.buttonElement.onclick = callback;
            this.buttonElement.classList.remove(this._state);
            this.buttonElement.classList.add(state);
            this._state = state;
            return;
        }
        throw new RangeError(`[Mit/StatedButton] Provided state "${state}" doesn't exist.`);
    }

    /**
     * @desc Returns current state.
     */
    public get state(): WithDefault<States> {
        return this._state;
    }

    public get button(): HTMLButtonElement {
        return this.buttonElement;
    }
}
