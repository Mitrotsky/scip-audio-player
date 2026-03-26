import { numberToTime, clamp } from "./utils.ts";


type CallbackFunction = () => void;


export class AudioPlayer {
    public readonly url: string;
    private readonly _context: AudioContext;
    private readonly _gainNode: GainNode;
    private _gainValue: number;
    private _source: AudioBufferSourceNode | null;
    private _audioBuffer: AudioBuffer | null;
    private _muted: boolean;
    private _looped: boolean;
    private _playTime: number;
    private _playbackPosition: number;
    private _isActive: boolean;
    private _onUpdateCallback: CallbackFunction | null;
    private _onEndCallback: CallbackFunction | null;

    public constructor(url: string) {
        this.url = url;
        this._context = new AudioContext();
        this._gainValue = 1;
        this._gainNode = new GainNode(this._context, {
            gain: this._gainValue
        });
        this._source = null;
        this._audioBuffer = null;

        this._gainNode.connect(this._context.destination);

        this._muted = false;
        this._looped = false;
        this._playTime = 0;
        this._playbackPosition = 0;

        this._isActive = false;
        this._onUpdateCallback = null;
        this._onEndCallback = null;

        this.animatePlayer = this.animatePlayer.bind(this);
        this.animatePlayer();
    }

    public async load(): Promise<boolean> {
        try {
            const response = await fetch(this.url);
            if (!response.ok) {
                console.error(`[Mit/AudioPlayer] Could not load URL: unexpected server response with status ${response.status}`);
                return false;
            }
            const mimeType = response.headers.get("Content-Type");
            if (mimeType && !mimeType.startsWith("audio")) {
                console.error(`[Mit/AudioPlayer] Incorrect file type. Expected "audio/...", got "${mimeType}" instead.`);
                return false;
            }
            const arrayBuffer = await response.arrayBuffer();
            this._audioBuffer = await this._context.decodeAudioData(arrayBuffer);
            console.debug(`[Mit/AudioPlayer] Successfully decoded file of length ${numberToTime(this._audioBuffer.duration)} (${this._audioBuffer.duration}s.)`);
        } catch (error) {
            const errorStart = "[Mit/AudioPlayer] Couldn't decode provided audio:";
            if (error instanceof Error || error instanceof DOMException) {
                console.error(`${errorStart} ${error.message}`);
            } else {
                console.error(`${errorStart} Unexpected error encountered.`);
            }
            console.error(error);
            return false;
        }
        return true;
    }

    public play(offset: number = this._playbackPosition): void {
        if (!this._audioBuffer) {
            console.error("[Mit/AudioPlayer] Audio is not loaded!");
            return;
        }
        if (this._source) {
            this._source.stop();
        }
        this._source = new AudioBufferSourceNode(this._context, {
            buffer: this._audioBuffer,
        });

        this._playTime = this._context.currentTime - offset;
        this._source.connect(this._gainNode);
        this._source.start(0, offset);

        this._isActive = true;
    }

    public pause(): void {
        if (this._source) {
            this._source.stop();
            this._source = null;  // Я ненавижу то что AudioBufferSourceNode одноразовый...
            this._isActive = false;
        }
    }

    public stop(): void {
        this.pause();
        this._playTime = 0;
        this._playbackPosition = 0;
    }

    private animatePlayer(): void {
        if (this._source) {
            this._playbackPosition = this._context.currentTime - this._playTime;
            if (this._playbackPosition > this.duration) this._onNaturalTrackEnd(this._onEndCallback);
        }
        if (this._onUpdateCallback) this._onUpdateCallback();
        requestAnimationFrame(this.animatePlayer);
    }

    private _onNaturalTrackEnd(callback: CallbackFunction | null): void {
        console.debug("[Mit/AudioPlayer] Track has ended naturally. Loop value: ", this.looped);
        this.stop();
        if (callback && !this.looped) callback();
        if (this.looped) this.play(0);
    }

    get muted(): boolean {
        return this._muted;
    }
    set muted(value: boolean) {
        this._muted = value;
        if (this._muted) {
            this._gainNode.gain.value = 0;
        } else {
            this._gainNode.gain.value = this._gainValue;
        }
    }

    get gain(): number {
        return this._gainValue;
    }
    set gain(value: number) {
        this._gainValue = clamp(0, value, 1);
        this._gainNode.gain.value = this._gainValue;
    }

    get looped(): boolean {
        return this._looped;
    }
    set looped(value: boolean) {
        this._looped = value;
    }

    get playbackPosition() {
        return this._playbackPosition;
    }
    set playbackPosition(value: number) {
        this._playbackPosition = value;
    }

    get duration(): number {
        if (this._audioBuffer) {
            return this._audioBuffer.duration;
        } else {
            return 0;
        }
    }
    get isActive() {
        return this._isActive;
    }

    set onUpdateCallback(callback: CallbackFunction) {
        this._onUpdateCallback = callback;
    }
    set onPlaybackEndCallback(callback: CallbackFunction) {
        this._onEndCallback = callback;
    }
}
