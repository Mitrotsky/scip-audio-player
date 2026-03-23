export const DynamicButtonStates = {
    default: "default",        // Does nothing, as it should
    paused: "paused",          // paused -> playing
    playing: "playing",        // playing -> paused
    looping: "looping",        // looping -> notLooping
    notLooping: "notLooping",  // notLooping -> looping
    muted: "muted",            // muted -> unmuted
    unmuted: "unmuted"         // unmuted -> muted
}


export class DynamicButton {
    private _states: Map<string, (event: MouseEvent) => void>;
    private _button: HTMLButtonElement;
    private _baseClasses: string;

    constructor(HTMLButton: HTMLButtonElement) {
        /** @type {Map<string, function(MouseEvent): any>} */
        this._states = new Map();
        this._states.set(DynamicButtonStates.default, () => { /* no op */ });
        /** @type {HTMLElement} */
        this._button = HTMLButton;
        this._baseClasses = this._button.className;

        this.setState(DynamicButtonStates.default);
    }

    addState(stateName: string, callback: (arg0: MouseEvent) => any) {
        this._states.set(stateName, callback.bind(this));  // Bind to this or button
    }

    setState(stateName: string) {
        if (this._states.has(stateName)) {
            this._button.onclick = this._states.get(stateName);
            this._button.className = this._baseClasses ? this._baseClasses + ` ${stateName}` : stateName;
        } else {
            console.error(`"${stateName}" is not a valid state`);
            this._button.onclick = this._states.get(DynamicButtonStates.default);
            this._button.className = this._baseClasses;
        }
    }
}
