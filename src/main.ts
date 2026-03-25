import { StatedButton } from "./stated_button.ts";


type CallbackFunction = (...args: any[]) => void;


function numberToTime(time: number): string {
    time = time ? Math.round(time) : 0;
    return `${Math.floor(time / 60)}:${(time % 60).toString().padStart(2, "0")}`;
}

function clamp(smallest: number, target: number, biggest: number): number {
    return Math.max(smallest, Math.min(biggest, target));
}

class AudioPlayer {
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





type XMLString = string;
type StartIcons = "pause" | "start";
type LoopIcons = "loop" | "unloop";
type MuteIcons = "mute" | "unmute";
type IconName = "stop" | StartIcons | "download" | LoopIcons | MuteIcons | "volume";

const iconNames: IconName[] = ["stop", "pause", "start", "download", "loop", "unloop", "mute", "unmute", "volume"];

/**
 * @desc Stores icon image URLs for the AudioPlayer. The parser automatically replaces these values with the user-provided URLs, if any.
 */
const customIcon: Record<IconName, string> = {
    stop: "{$stop-icon}",
    pause: "{$pause-icon}",
    start: "{$start-icon}",
    download: "{$download-icon}",
    loop: "{$loop-icon}",
    unloop: "{$unloop-icon}",
    mute: "{$mute-icon}",
    unmute: "{$unmute-icon}",
    volume: "{$volume-icon}",
}

/**
 * @desc Raw URL template used as a baseline to determine whether {@link customIcon} has been overridden by the user.
 */
const customIconCode: Record<IconName, string> = {
    stop: "{#stop-icon}".replace("#", "$"),
    pause: "{#pause-icon}".replace("#", "$"),
    start: "{#start-icon}".replace("#", "$"),
    download: "{#download-icon}".replace("#", "$"),
    loop: "{#loop-icon}".replace("#", "$"),
    unloop: "{#unloop-icon}".replace("#", "$"),
    mute: "{#mute-icon}".replace("#", "$"),
    unmute: "{#unmute-icon}".replace("#", "$"),
    volume: "{#volume-icon}".replace("#", "$"),
}

/**
 * @desc Default icons, used as a fallback if no custom URL is provided.
 */
const fallbackIcon: Record<IconName, XMLString> = {
    stop: `<svg width="4vw" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path fill="currentColor" d="M16,4.995v9.808C16,15.464,15.464,16,14.804,16H4.997C4.446,16,4,15.554,4,15.003V5.196C4,4.536,4.536,4,5.196,4h9.808C15.554,4,16,4.446,16,4.995z"/></svg>`,
    pause: `<svg width="4vw" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path fill="currentColor" d="M15,3h-2c-0.553,0-1,0.048-1,0.6v12.8c0,0.552,0.447,0.6,1,0.6h2c0.553,0,1-0.048,1-0.6V3.6C16,3.048,15.553,3,15,3z M7,3H5C4.447,3,4,3.048,4,3.6v12.8C4,16.952,4.447,17,5,17h2c0.553,0,1-0.048,1-0.6V3.6C8,3.048,7.553,3,7,3z"/></svg>`,
    start: `<svg width="4vw" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path fill="currentColor" d="M15,10.001c0,0.299-0.305,0.514-0.305,0.514l-8.561,5.303C5.51,16.227,5,15.924,5,15.149V4.852c0-0.777,0.51-1.078,1.135-0.67l8.561,5.305C14.695,9.487,15,9.702,15,10.001z"/></svg>`,
    download: `<svg width="4vw" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path fill="currentColor" d="M15,7h-3V1H8v6H5l5,5L15,7z M19.338,13.532c-0.21-0.224-1.611-1.723-2.011-2.114C17.062,11.159,16.683,11,16.285,11h-1.757l3.064,2.994h-3.544c-0.102,0-0.194,0.052-0.24,0.133L12.992,16H7.008l-0.816-1.873c-0.046-0.081-0.139-0.133-0.24-0.133H2.408L5.471,11H3.715c-0.397,0-0.776,0.159-1.042,0.418c-0.4,0.392-1.801,1.891-2.011,2.114c-0.489,0.521-0.758,0.936-0.63,1.449l0.561,3.074c0.128,0.514,0.691,0.936,1.252,0.936h16.312c0.561,0,1.124-0.422,1.252-0.936l0.561-3.074C20.096,14.468,19.828,14.053,19.338,13.532z"/></svg>`,
    loop: `<svg width="4vw" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path fill="currentColor" d="M1,12V5h3v6h10V8l5,4.5L14,17v-3H3C1.895,14,1,13.104,1,12z"/></svg>`,
    unloop: `<svg width="4vw" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path fill="currentColor" d="M20,7v7c0,1.103-0.896,2-2,2H2c-1.104,0-2-0.897-2-2V7c0-1.104,0.896-2,2-2h7V3l4,3.5L9,10V8H3v5h14V8h-3V5h4C19.104,5,20,5.896,20,7z"/></svg>`,
    mute: `<svg width="4vw" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path fill="currentColor" d="M5.312,4.566C4.19,5.685-0.715,12.681,3.523,16.918c4.236,4.238,11.23-0.668,12.354-1.789c1.121-1.119-0.335-4.395-3.252-7.312C9.706,4.898,6.434,3.441,5.312,4.566z M14.576,14.156c-0.332,0.328-2.895-0.457-5.364-2.928C6.745,8.759,5.956,6.195,6.288,5.865c0.328-0.332,2.894,0.457,5.36,2.926C14.119,11.258,14.906,13.824,14.576,14.156zM15.434,5.982l1.904-1.906c0.391-0.391,0.391-1.023,0-1.414c-0.39-0.391-1.023-0.391-1.414,0L14.02,4.568c-0.391,0.391-0.391,1.024,0,1.414C14.41,6.372,15.043,6.372,15.434,5.982z M11.124,3.8c0.483,0.268,1.091,0.095,1.36-0.388l1.087-1.926c0.268-0.483,0.095-1.091-0.388-1.36c-0.482-0.269-1.091-0.095-1.36,0.388L10.736,2.44C10.468,2.924,10.642,3.533,11.124,3.8z M19.872,6.816c-0.267-0.483-0.877-0.657-1.36-0.388l-1.94,1.061c-0.483,0.268-0.657,0.878-0.388,1.36c0.268,0.483,0.877,0.657,1.36,0.388l1.94-1.061C19.967,7.907,20.141,7.299,19.872,6.816z"/></svg>`,
    unmute: `<svg width="4vw" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path fill="currentColor" d="M14.201,9.194c1.389,1.883,1.818,3.517,1.559,3.777c-0.26,0.258-1.893-0.17-3.778-1.559l-5.526,5.527c4.186,1.838,9.627-2.018,10.605-2.996c0.925-0.922,0.097-3.309-1.856-5.754L14.201,9.194z M8.667,7.941c-1.099-1.658-1.431-3.023-1.194-3.26c0.233-0.234,1.6,0.096,3.257,1.197l1.023-1.025C9.489,3.179,7.358,2.519,6.496,3.384C5.568,4.31,2.048,9.261,3.265,13.341L8.667,7.941z M18.521,1.478c-0.39-0.391-1.023-0.391-1.414,0L1.478,17.108c-0.391,0.391-0.391,1.024,0,1.414c0.391,0.391,1.023,0.391,1.414,0l15.629-15.63C18.912,2.501,18.912,1.868,18.521,1.478z"/></svg>`,
    volume: `<svg width="4vw" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path fill="currentColor" d="M19,13.805C19,14.462,18.462,15,17.805,15H1.533c-0.88,0-0.982-0.371-0.229-0.822l16.323-9.055C18.382,4.67,19,5.019,19,5.9V13.805z"/></svg>`,
}

async function loadCustomSVG(key: IconName): Promise<XMLString> {
    if (customIcon[key] === customIconCode[key]) {  // Is not changed by user
        console.debug(`[Mit/ImageLoader] Image of key "${key}" is not defined by user.`);
        return fallbackIcon[key];
    }
    const response = await fetch(customIcon[key]);
    if (!response.ok) {
        console.error(`[Mit/ImageLoader] Failed to load image of key "${key}" with the status code "${response.status}".`);
        return fallbackIcon[key];
    }
    const mimeType = response.headers.get("Content-Type");
    if (mimeType && !mimeType.startsWith("image/")) {
        console.error(`[Mit/ImageLoader] Loaded file of key "${key}" is not an image. Expected "image/...", got "${mimeType}" instead.`);
        return fallbackIcon[key];
    }
    if (mimeType !== "image/svg+xml") {
        // Yes, this causes a memory leak. Too bad!
        // https://www.youtube.com/watch?v=k238XpMMn38&t=80s
        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);
        return `<img src="${objectUrl}" alt="${key}">`;
    }
    return response.text();
}

// Both .map and .allSettled preserve original order, therefore...
const results = await Promise.allSettled(iconNames.map(key => loadCustomSVG(key)));
const icons = Object.fromEntries(
    iconNames.map((key, index) => [key, results[index].status === "fulfilled" ? results[index].value : fallbackIcon[key]])  // Should always resolve, but TS is mad as hell
) as Record<IconName, XMLString>;


interface Size {
    width: number;
    height: number;
}

function cSize(HTMLElement: HTMLElement): Size {
    const rect = HTMLElement.getBoundingClientRect();
    return {
        width: rect.width,
        height: rect.height
    };
}


class AudioPlayerSkeleton {
    private player: AudioPlayer;
    private playbackContainerIsDragged: boolean = false;

    public HTMLElements = {
        button: {
            stop: document.getElementById("stop") as HTMLButtonElement,
            playPause: document.getElementById("play-pause") as HTMLButtonElement,
            download: document.getElementById("download") as HTMLButtonElement,
            loop: document.getElementById("loop") as HTMLButtonElement,
            mute: document.getElementById("mute") as HTMLButtonElement,
        },
        playback: {
            seeker: document.getElementById("seeker") as HTMLDivElement,
            slider: document.getElementById("seeker-slider") as HTMLDivElement,
            position: document.getElementById("playback-position") as HTMLSpanElement,
            duration: document.getElementById("playback-duration") as HTMLSpanElement,
        },
        volume: {
            wrapper: document.getElementById("volume") as HTMLDivElement,
            scroll: document.getElementById("slider-container") as HTMLDivElement,
            thumb: document.getElementById("volume-thumb") as HTMLDivElement,
        },
        special: {
            player: document.getElementById("audio-player") as HTMLDivElement,
        }
    };

    public wrappedButtons = {
        playPause: new StatedButton<StartIcons>(this.HTMLElements.button.playPause),
        loop: new StatedButton<LoopIcons>(this.HTMLElements.button.loop),
        mute: new StatedButton<MuteIcons>(this.HTMLElements.button.mute),
    }

    public constructor(player: AudioPlayer) {
        this.player = player;

        // Callbacks setup
        this.onUpdate = this.onUpdate.bind(this);
        this.onStopPress = this.onStopPress.bind(this);
        this.player.onUpdateCallback = this.onUpdate;
        this.player.onPlaybackEndCallback = this.onStopPress;

        // Button setup
        this.wrappedButtons.playPause.addState("pause", this.onStartPress.bind(this));
        this.wrappedButtons.playPause.addState("start", this.onPausePress.bind(this));
        this.onPausePress();

        this.wrappedButtons.loop.addState("unloop", this.onStartLoopPress.bind(this));
        this.wrappedButtons.loop.addState("loop", this.onPauseLoopPress.bind(this));
        this.onPauseLoopPress();

        this.wrappedButtons.mute.addState("unmute", this.onStartMutePress.bind(this));
        this.wrappedButtons.mute.addState("mute", this.onPauseMutePress.bind(this));
        this.onPauseMutePress();

        this.HTMLElements.button.stop.innerHTML = icons.stop;
        this.HTMLElements.button.stop.onclick = this.onStopPress.bind(this);

        this.HTMLElements.button.download.innerHTML = icons.download;
        this.HTMLElements.button.download.onclick = this.onDownloadPress.bind(this);

        for (const button of Object.values(this.HTMLElements.button)) button.disabled = true;

        // Seeker setup
        this.seekerOnPointerDown = this.seekerOnPointerDown.bind(this);
        this.seekerOnPointerUp = this.seekerOnPointerUp.bind(this);
        this.seekerOnPointerMove = this.seekerOnPointerMove.bind(this);

        // Volume setup
        this.HTMLElements.volume.wrapper.insertAdjacentHTML("afterbegin", icons.volume);

        this.volumeOnPointerDown = this.volumeOnPointerDown.bind(this);
        this.volumeOnPointerUp = this.volumeOnPointerUp.bind(this);
        this.volumeOnPointerMove = this.volumeOnPointerMove.bind(this);
    }

    public async init() {
        const isLoaded = await this.player.load();
        if (isLoaded) {
            this.HTMLElements.special.player.classList.replace("not-loaded", "loaded");
            for (const button of Object.values(this.HTMLElements.button)) button.disabled = false;
            this.HTMLElements.playback.duration.innerText = numberToTime(player.duration);
            this.enableSeeker();
            this.enableVolume();
        } else {
            this.HTMLElements.special.player.classList.replace("not-loaded", "failed");
        }
    }

    private onUpdate(): void {
        const playbackPosition = numberToTime(player.playbackPosition % player.duration);
        if (this.HTMLElements.playback.position.innerText !== playbackPosition) this.HTMLElements.playback.position.innerText = playbackPosition;
        if (!this.playbackContainerIsDragged) this.HTMLElements.playback.slider.style.width = `${player.playbackPosition / player.duration * 100}%`;
    }

    private enableSeeker(): void {
        this.HTMLElements.playback.seeker.addEventListener("pointerdown", this.seekerOnPointerDown);
        this.HTMLElements.playback.seeker.addEventListener("pointerup", this.seekerOnPointerUp);
        this.HTMLElements.playback.seeker.addEventListener("pointerout", this.seekerOnPointerUp);
    }
    private seekerOnPointerDown(): void {
        this.playbackContainerIsDragged = true;
        this.HTMLElements.playback.seeker.addEventListener("pointermove", this.seekerOnPointerMove);
    }
    private seekerOnPointerUp(event: PointerEvent): void {
        this.playbackContainerIsDragged = false;
        this.HTMLElements.playback.seeker.removeEventListener("pointermove", this.seekerOnPointerMove);
        if (event.type !== "pointerout") this.seekerOnPointerMove(event);
        if (player.isActive) {
            if (event.type !== "pointerout") player.play(event.offsetX / cSize(this.HTMLElements.playback.seeker).width * player.duration);
        }
    }
    private seekerOnPointerMove(event: PointerEvent): void {
        player.playbackPosition = event.offsetX / cSize(this.HTMLElements.playback.seeker).width * player.duration;
        this.HTMLElements.playback.slider.style.width = `${player.playbackPosition / player.duration * 100}%`;
    }

    private onStartPress(): void {
        this.wrappedButtons.playPause.state = "start";
        this.wrappedButtons.playPause.button.innerHTML = icons.pause;
        this.player.play();
    }
    private onPausePress(): void {
        this.wrappedButtons.playPause.state = "pause";
        this.wrappedButtons.playPause.button.innerHTML = icons.start;
        this.player.pause();
    }

    private onStartLoopPress(): void {
        this.wrappedButtons.loop.state = "loop";
        this.wrappedButtons.loop.button.innerHTML = icons.unloop;
        this.player.looped = true;
    }
    private onPauseLoopPress(): void {
        this.wrappedButtons.loop.state = "unloop";
        this.wrappedButtons.loop.button.innerHTML = icons.loop;
        this.player.looped = false;
    }

    private onStartMutePress(): void {
        this.wrappedButtons.mute.state = "mute";
        this.wrappedButtons.mute.button.innerHTML = icons.unmute;
        this.player.muted = true;
        this.HTMLElements.volume.thumb.style.top = `100%`;
    }
    private onPauseMutePress(): void {
        this.wrappedButtons.mute.state = "unmute";
        this.wrappedButtons.mute.button.innerHTML = icons.mute;
        this.player.muted = false;
        this.HTMLElements.volume.thumb.style.top = `${(1 - this.player.gain) * 100}%`;
    }

    private onStopPress(): void {
        this.player.stop();
        this.onPausePress();
    }
    private onDownloadPress(): void {
        window.open(player.url);
    }

    private enableVolume(): void {
        this.HTMLElements.volume.scroll.addEventListener("pointerdown", this.volumeOnPointerDown);
    }
    private volumeOnPointerDown(event: PointerEvent): void {
        // isThumbMoving = true;
        document.addEventListener("pointermove", this.volumeOnPointerMove);
        document.addEventListener("pointerup", this.volumeOnPointerUp);
        this.volumeOnPointerMove(event);
    }
    private volumeOnPointerUp(): void {
        document.removeEventListener("pointermove", this.volumeOnPointerMove);
        document.removeEventListener("pointerup", this.volumeOnPointerUp);
    }
    private volumeOnPointerMove(event: PointerEvent): void {
        // if (!isThumbMoving) return;

        const height = cSize(this.HTMLElements.volume.scroll).height;
        const posTop = this.HTMLElements.volume.scroll.getBoundingClientRect().top;
        const bottomBorder = posTop + height;
        const posTargeted = clamp(posTop, event.pageY, bottomBorder);
        const volume = (posTargeted - posTop) / height;
        const gain = 1 - volume;
        player.gain = gain;
        if (!gain) {
            this.onStartMutePress();
        } else {
            if (this.wrappedButtons.mute.state !== "unmute") this.onPauseMutePress();
        }
        this.HTMLElements.volume.thumb.style.top = `${volume * 100}%`;
    }
}

// const player = new AudioPlayer("{$audio-file}");
const player = new AudioPlayer("https://files.scpfoundation.net/local--files/draft:mitya-audio-player/1.10%20-%20Chlorine•FM%20(Intermission).mp3");

// await player.load();

const skeleton = new AudioPlayerSkeleton(player);
await skeleton.init();
