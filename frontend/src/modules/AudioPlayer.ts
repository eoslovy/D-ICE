let audio: HTMLAudioElement | null = null;

export function getAudioInstance(src: string): HTMLAudioElement {
    if (!audio || audio.src !== window.location.origin + src) {
        if (audio) audio.pause();
        audio = new Audio(src);
        audio.loop = true;
        audio.volume = 0.5;
    }
    return audio;
}

export function stopAudio() {
    if (audio) {
        audio.pause();
    }
}
