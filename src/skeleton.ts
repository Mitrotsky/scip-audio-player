import { StatedButton } from "./stated_button.ts";
import { numberToTime, clamp, rect } from "./utils.ts";
import type { AudioPlayer } from "./player.ts";


type StartIcons = "pause" | "start";
type LoopIcons = "loop" | "unloop";
type MuteIcons = "mute" | "unmute";
export type IconName = "stop" | StartIcons | "download" | LoopIcons | MuteIcons | "volume";


export class AudioPlayerSkeleton {
    private player: AudioPlayer;
    private icons: Record<IconName, string>;
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

    public constructor(player: AudioPlayer, icons: Record<IconName, string>) {
        this.player = player;
        this.icons = icons;

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

    public async init(): Promise<void> {
        const isLoaded = await this.player.load();
        if (isLoaded) {
            this.HTMLElements.special.player.classList.replace("not-loaded", "loaded");
            for (const button of Object.values(this.HTMLElements.button)) button.disabled = false;
            this.HTMLElements.playback.duration.innerText = numberToTime(this.player.duration);
            this.enableSeeker();
            this.enableVolume();
        } else {
            this.HTMLElements.special.player.classList.replace("not-loaded", "failed");
        }
    }

    private onUpdate(): void {
        const duration = this.player.duration;
        const playback = this.player.playbackPosition;
        const timePassed = playback !== duration ? playback % duration : duration;
        const playbackTime = numberToTime(timePassed);
        if (this.HTMLElements.playback.position.innerText !== playbackTime) this.HTMLElements.playback.position.innerText = playbackTime;
        if (!this.playbackContainerIsDragged) this.HTMLElements.playback.slider.style.width = `${playback / duration * 100}%`;
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
        if (this.player.isActive) {
            if (event.type !== "pointerout") this.player.play(event.offsetX / rect(this.HTMLElements.playback.seeker).width * this.player.duration);
        }
    }
    private seekerOnPointerMove(event: PointerEvent): void {
        const duration = this.player.duration;
        const playback = clamp(0, event.offsetX / rect(this.HTMLElements.playback.seeker).width * duration, duration);
        this.player.playbackPosition = playback;
        this.HTMLElements.playback.slider.style.width = `${playback / duration * 100}%`;
    }

    private onStartPress(): void {
        this.wrappedButtons.playPause.state = "start";
        this.wrappedButtons.playPause.button.innerHTML = this.icons.pause;
        this.player.play();
    }
    private onPausePress(): void {
        this.wrappedButtons.playPause.state = "pause";
        this.wrappedButtons.playPause.button.innerHTML = this.icons.start;
        this.player.pause();
    }

    private onStartLoopPress(): void {
        this.wrappedButtons.loop.state = "loop";
        this.wrappedButtons.loop.button.innerHTML = this.icons.unloop;
        this.player.looped = true;
    }
    private onPauseLoopPress(): void {
        this.wrappedButtons.loop.state = "unloop";
        this.wrappedButtons.loop.button.innerHTML = this.icons.loop;
        this.player.looped = false;
    }

    private onStartMutePress(): void {
        this.wrappedButtons.mute.state = "mute";
        this.wrappedButtons.mute.button.innerHTML = this.icons.unmute;
        this.player.muted = true;
        this.HTMLElements.volume.thumb.style.top = `100%`;
    }
    private onPauseMutePress(): void {
        this.wrappedButtons.mute.state = "unmute";
        this.wrappedButtons.mute.button.innerHTML = this.icons.mute;
        this.player.muted = false;
        this.HTMLElements.volume.thumb.style.top = `${(1 - this.player.gain) * 100}%`;
    }

    private onStopPress(): void {
        this.player.stop();
        this.onPausePress();
    }
    private onDownloadPress(): void {
        window.open(this.player.url);
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

        const height = rect(this.HTMLElements.volume.scroll).height;
        const posTop = rect(this.HTMLElements.volume.scroll).top;
        const bottomBorder = posTop + height;
        const posTargeted = clamp(posTop, event.pageY, bottomBorder);
        const volume = (posTargeted - posTop) / height;
        const gain = 1 - volume;
        this.player.gain = gain;
        if (!gain) {
            this.onStartMutePress();
        } else {
            if (this.wrappedButtons.mute.state !== "unmute") this.onPauseMutePress();
        }
        this.HTMLElements.volume.thumb.style.top = `${volume * 100}%`;
    }
}
