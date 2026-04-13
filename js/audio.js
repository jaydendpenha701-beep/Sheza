import * as THREE from 'three';

export class AudioManager {
    constructor(camera) {
        this.camera = camera;
        this.listener = new THREE.AudioListener();
        this.camera.add(this.listener);
        this.sounds = {};
        this.audioContext = THREE.AudioContext.getContext();
    }

    // Since we don't have actual assets, we'll synthesize some creepy sounds
    // or use OscillatorNodes for placeholders.

    playJumpScare() {
        this.playSound(440, 'sawtooth', 0.5, 1.0);
        this.playSound(110, 'square', 0.5, 1.0);
    }

    playCollection() {
        this.playSound(880, 'sine', 0.1, 0.2);
    }

    playFootstep() {
        // Low thump sound
        this.playSound(100, 'sine', 0.05, 0.1);
    }

    playSound(freq, type, volume, duration) {
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.audioContext.currentTime);

        gain.gain.setValueAtTime(volume, this.audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);

        osc.connect(gain);
        gain.connect(this.audioContext.destination);

        osc.start();
        osc.stop(this.audioContext.currentTime + duration);
    }

    // Ambient "drone"
    startAmbient() {
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(50, this.audioContext.currentTime);
        gain.gain.setValueAtTime(0.05, this.audioContext.currentTime);
        osc.connect(gain);
        gain.connect(this.audioContext.destination);
        osc.start();
    }
}
