import * as THREE from 'three';

export class PlayerController {
    constructor(camera, domElement, scene, world) {
        this.camera = camera;
        this.scene = scene;
        this.world = world;
        this.velocity = new THREE.Vector3();
        this.direction = new THREE.Vector3();
        this.moveForward = false;
        this.moveBackward = false;
        this.moveLeft = false;
        this.moveRight = false;
        this.canJump = false;
        this.isRunning = false;
        this.isCrouching = false;

        this.walkSpeed = 30.0;
        this.runSpeed = 60.0;
        this.crouchSpeed = 15.0;

        this.height = 1.7;
        this.crouchHeight = 0.8;

        this.prevTime = performance.now();
        this.footstepTimer = 0;
        this.stamina = 100;
        this.maxStamina = 100;
        this.sanity = 100;
        this.maxSanity = 100;

        this.touchLook = {
            active: false,
            lastX: 0,
            lastY: 0
        };

        this.joystick = {
            active: false,
            startX: 0,
            startY: 0,
            moveX: 0,
            moveY: 0
        };

        this.setupEventListeners();
    }

    setupEventListeners() {
        const onKeyDown = (event) => {
            switch (event.code) {
                case 'ArrowUp':
                case 'KeyW':
                    this.moveForward = true;
                    break;
                case 'ArrowLeft':
                case 'KeyA':
                    this.moveLeft = true;
                    break;
                case 'ArrowDown':
                case 'KeyS':
                    this.moveBackward = true;
                    break;
                case 'ArrowRight':
                case 'KeyD':
                    this.moveRight = true;
                    break;
                case 'ShiftLeft':
                case 'ShiftRight':
                    this.isRunning = true;
                    break;
                case 'ControlLeft':
                case 'ControlRight':
                    this.isCrouching = true;
                    break;
            }
        };

        const onKeyUp = (event) => {
            switch (event.code) {
                case 'ArrowUp':
                case 'KeyW':
                    this.moveForward = false;
                    break;
                case 'ArrowLeft':
                case 'KeyA':
                    this.moveLeft = false;
                    break;
                case 'ArrowDown':
                case 'KeyS':
                    this.moveBackward = false;
                    break;
                case 'ArrowRight':
                case 'KeyD':
                    this.moveRight = false;
                    break;
                case 'ShiftLeft':
                case 'ShiftRight':
                    this.isRunning = false;
                    break;
                case 'ControlLeft':
                case 'ControlRight':
                    this.isCrouching = false;
                    break;
            }
        };

        document.addEventListener('keydown', onKeyDown);
        document.addEventListener('keyup', onKeyUp);

        // Mobile Events
        const joystickContainer = document.getElementById('joystick-container');
        const joystickKnob = document.getElementById('joystick-knob');
        const mobileInteract = document.getElementById('mobile-interact');

        joystickContainer.addEventListener('touchstart', (e) => {
            this.joystick.active = true;
            this.joystick.startX = e.touches[0].clientX;
            this.joystick.startY = e.touches[0].clientY;
        });

        document.addEventListener('touchmove', (e) => {
            if (this.joystick.active) {
                const dx = e.touches[0].clientX - this.joystick.startX;
                const dy = e.touches[0].clientY - this.joystick.startY;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const maxDist = 50;
                const ratio = Math.min(dist, maxDist) / dist;

                this.joystick.moveX = (dx * ratio) / maxDist;
                this.joystick.moveY = (dy * ratio) / maxDist;

                joystickKnob.style.transform = `translate(calc(-50% + ${dx * ratio}px), calc(-50% + ${dy * ratio}px))`;

                this.moveForward = this.joystick.moveY < -0.2;
                this.moveBackward = this.joystick.moveY > 0.2;
                this.moveLeft = this.joystick.moveX < -0.2;
                this.moveRight = this.joystick.moveX > 0.2;
            } else if (e.touches[0].clientX > window.innerWidth / 2) {
                // Touch look on right side of screen
                if (!this.touchLook.active) {
                    this.touchLook.active = true;
                    this.touchLook.lastX = e.touches[0].clientX;
                    this.touchLook.lastY = e.touches[0].clientY;
                } else {
                    const movementX = e.touches[0].clientX - this.touchLook.lastX;
                    const movementY = e.touches[0].clientY - this.touchLook.lastY;

                    this.camera.rotation.y -= movementX * 0.005;
                    this.camera.rotation.x -= movementY * 0.005;
                    this.camera.rotation.x = Math.max(-Math.PI/2, Math.min(Math.PI/2, this.camera.rotation.x));

                    this.touchLook.lastX = e.touches[0].clientX;
                    this.touchLook.lastY = e.touches[0].clientY;
                }
            }
        });

        document.addEventListener('touchend', () => {
            this.joystick.active = false;
            this.joystick.moveX = 0;
            this.joystick.moveY = 0;
            joystickKnob.style.transform = `translate(-50%, -50%)`;
            this.moveForward = false;
            this.moveBackward = false;
            this.moveLeft = false;
            this.moveRight = false;
            this.touchLook.active = false;
        });

        mobileInteract.addEventListener('touchstart', () => {
            document.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyE' }));
        });
    }

    checkCollisions(oldPosition) {
        if (!this.world || !this.world.collidables) return;

        const playerRadius = 0.5;
        const playerPos = this.camera.position;

        for (const object of this.world.collidables) {
            // Simple AABB collision for boxes
            if (object.geometry.type === 'BoxGeometry') {
                const box = new THREE.Box3().setFromObject(object);
                const playerBox = new THREE.Box3().setFromCenterAndSize(
                    playerPos,
                    new THREE.Vector3(playerRadius * 2, this.height, playerRadius * 2)
                );

                if (box.intersectsBox(playerBox)) {
                    // Primitive collision resolution: push back to old position on X/Z
                    playerPos.x = oldPosition.x;
                    playerPos.z = oldPosition.z;
                }
            }
        }
    }

    update(isLocked, audio) {
        const time = performance.now();
        const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

        if (isLocked || isTouch) {
            const delta = (time - this.prevTime) / 1000;

            const oldPosition = this.camera.position.clone();

            this.velocity.x -= this.velocity.x * 10.0 * delta;
            this.velocity.z -= this.velocity.z * 10.0 * delta;
            this.velocity.y -= 9.8 * 10.0 * delta; // Gravity

            this.direction.z = Number(this.moveForward) - Number(this.moveBackward);
            this.direction.x = Number(this.moveRight) - Number(this.moveLeft);
            this.direction.normalize();

            let currentSpeed = this.walkSpeed;
            if (this.isRunning && !this.isCrouching && this.stamina > 0) {
                currentSpeed = this.runSpeed;
                this.stamina -= 20 * delta;
            } else {
                this.stamina += 10 * delta;
                if (this.isRunning && this.stamina <= 0) currentSpeed = this.walkSpeed;
            }
            this.stamina = Math.max(0, Math.min(this.maxStamina, this.stamina));
            document.getElementById('stamina-bar').style.width = `${this.stamina}%`;

            if (this.isCrouching) currentSpeed = this.crouchSpeed;

            if (this.moveForward || this.moveBackward) this.velocity.z -= this.direction.z * currentSpeed * delta;
            if (this.moveLeft || this.moveRight) this.velocity.x -= this.direction.x * currentSpeed * delta;

            // Footsteps
            if ((this.moveForward || this.moveBackward || this.moveLeft || this.moveRight) && this.velocity.y === 0) {
                this.footstepTimer += delta;
                const footstepInterval = this.isRunning ? 0.3 : 0.6;
                if (this.footstepTimer > footstepInterval) {
                    if (audio) audio.playFootstep();
                    this.footstepTimer = 0;
                }
            }

            // Fix movement to be purely horizontal
            const camForward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
            camForward.y = 0;
            camForward.normalize();

            const camRight = new THREE.Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion);
            camRight.y = 0;
            camRight.normalize();

            const moveVec = new THREE.Vector3();
            moveVec.addScaledVector(camForward, -this.velocity.z * delta);
            moveVec.addScaledVector(camRight, -this.velocity.x * delta);

            this.camera.position.add(moveVec);

            this.checkCollisions(oldPosition);

            this.camera.position.y += (this.velocity.y * delta);

            // Floor collision
            const currentHeight = this.isCrouching ? this.crouchHeight : this.height;
            if (this.camera.position.y < currentHeight) {
                this.velocity.y = 0;
                this.camera.position.y = currentHeight;
                this.canJump = true;
            }
        }
        this.prevTime = time;
    }
}
