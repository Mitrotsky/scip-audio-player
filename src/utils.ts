export function numberToTime(time: number): string {
    time = time ? Math.round(time) : 0;
    return `${Math.floor(time / 60)}:${(time % 60).toString().padStart(2, "0")}`;
}

export function clamp(smallest: number, target: number, biggest: number): number {
    return Math.max(smallest, Math.min(biggest, target));
}

export function rect(element: HTMLElement): DOMRect {
    return element.getBoundingClientRect();
}
