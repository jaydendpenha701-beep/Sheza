import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { PlayerController } from './player.js';
import { World } from './world.js';
import { InteractionSystem } from './interactions.js';
import { Enemy } from './enemy.js';
import { AudioManager } from './audio.js';

class Game {
    constructor() {
        this.init();
        this.setupEventListeners();
        this.animate();
    }

    init() {
        // Scene setup
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x050505);
        this.scene.fog = new THREE.FogExp2(0x050505, 0.15);

        // Camera setup
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.y = 1.7; // Eye level

        // Renderer setup
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        document.getElementById('game-container').appendChild(this.renderer.domElement);

        // Initialize World
        this.world = new World(this.scene);

        // Controls setup
        this.controls = new PointerLockControls(this.camera, document.body);
        this.player = new PlayerController(this.camera, document.body, this.scene, this.world);
        this.interactions = new InteractionSystem(this.camera, this.scene, this.world);
        this.enemy = new Enemy(this.scene, this.camera, this.world);
        this.audio = new AudioManager(this.camera);

        const ambientLight = new THREE.AmbientLight(0x404040, 0.5); // Soft white light
        this.scene.add(ambientLight);

        // Player flashlight (will be attached to camera later)
        this.flashlight = new THREE.SpotLight(0xffffff, 1, 15, Math.PI / 6, 0.5, 1);
        this.flashlight.castShadow = true;
        this.flashlight.shadow.mapSize.width = 1024;
        this.flashlight.shadow.mapSize.height = 1024;
        this.scene.add(this.flashlight);
        this.scene.add(this.flashlight.target);

        this.lastTime = performance.now();
        this.isGameOver = false;

        // Handle window resize
        window.addEventListener('resize', () => this.onWindowResize());
    }

    setupEventListeners() {
        const startBtn = document.getElementById('start-btn');
        const resumeBtn = document.getElementById('resume-btn');

        startBtn.addEventListener('click', () => {
            const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
            if (isTouch) {
                document.getElementById('mobile-controls').classList.remove('hidden');
            } else {
                this.controls.lock();
            }
            document.getElementById('main-menu').classList.add('hidden');
            document.getElementById('hud').classList.remove('hidden');
            this.audio.startAmbient();
        });

        resumeBtn.addEventListener('click', () => {
            this.controls.lock();
            document.getElementById('pause-menu').classList.add('hidden');
        });

        document.getElementById('retry-btn').addEventListener('click', () => {
            window.location.reload();
        });

        document.getElementById('exit-btn').addEventListener('click', () => {
            window.location.reload();
        });

        document.getElementById('win-menu-btn').addEventListener('click', () => {
            window.location.reload();
        });

        document.addEventListener('itemCollected', (e) => {
            this.audio.playCollection();
            if (e.detail.count >= 5) {
                document.getElementById('objective-text').innerText = "Escape through the main gate!";
                this.allKeysCollected = true;
            }
        });

        document.addEventListener('playerCaught', () => {
            this.audio.playJumpScare();
            this.gameOver();
        });

        this.controls.addEventListener('lock', () => {
            console.log('Pointer locked');
        });

        this.controls.addEventListener('unlock', () => {
            if (!document.getElementById('main-menu').classList.contains('hidden') ||
                !document.getElementById('game-over').classList.contains('hidden') ||
                !document.getElementById('win-screen').classList.contains('hidden')) {
                return;
            }
            document.getElementById('pause-menu').classList.remove('hidden');
        });
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    gameOver() {
        if (this.isGameOver) return;
        this.isGameOver = true;

        // Jumpscare visual
        const jumpscare = document.getElementById('jumpscare-image');
        jumpscare.classList.remove('hidden');

        setTimeout(() => {
            this.controls.unlock();
            document.getElementById('game-over').classList.remove('hidden');
            document.getElementById('hud').classList.add('hidden');
            jumpscare.classList.add('hidden');
        }, 1000);
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        const time = performance.now();
        const delta = (time - this.lastTime) / 1000;
        this.lastTime = time;

        const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

        if ((this.controls.isLocked || isTouch) && !this.isGameOver) {
            this.player.update(this.controls.isLocked, this.audio);
            this.interactions.update();
            this.enemy.update(delta);

            // Update Sanity
            const distToEnemy = this.camera.position.distanceTo(this.enemy.mesh.position);
            if (distToEnemy < 10) {
                this.player.sanity -= (10 - distToEnemy) * 2 * delta;
            } else {
                this.player.sanity += 2 * delta;
            }
            this.player.sanity = Math.max(0, Math.min(this.player.maxSanity, this.player.sanity));
            document.getElementById('sanity-bar').style.width = `${this.player.sanity}%`;

            if (this.player.sanity <= 0) {
                this.gameOver();
            }

            // Flicker flashlight
            if (Math.random() > 0.98) {
                this.flashlight.intensity = Math.random() * 1.5;
            } else {
                this.flashlight.intensity = 1.0;
            }

            // Update flashlight position and target
            this.flashlight.position.copy(this.camera.position);
            const vector = new THREE.Vector3(0, 0, -1);
            vector.applyQuaternion(this.camera.quaternion);
            this.flashlight.target.position.copy(this.camera.position).add(vector);

            // Win condition check
            if (this.allKeysCollected && this.camera.position.distanceTo(new THREE.Vector3(0, 0, 0)) < 2) {
                this.win();
            }
        }

        this.renderer.render(this.scene, this.camera);
    }

    win() {
        if (this.isGameOver) return;
        this.isGameOver = true;
        this.controls.unlock();
        document.getElementById('win-screen').classList.remove('hidden');
        document.getElementById('hud').classList.add('hidden');
    }
}

// Start the game
window.addEventListener('DOMContentLoaded', () => {
    new Game();
});
