import * as THREE from 'three';

export class Enemy {
    constructor(scene, playerCamera, world) {
        this.scene = scene;
        this.playerCamera = playerCamera;
        this.world = world;

        this.mesh = this.createMesh();
        this.mesh.position.set(30, 0, 5);
        this.scene.add(this.mesh);

        this.state = 'PATROL'; // PATROL, CHASE
        this.speed = 2.5;
        this.chaseSpeed = 5.0;
        this.velocity = new THREE.Vector3();

        this.patrolPoints = [
            new THREE.Vector3(30, 0, 5),
            new THREE.Vector3(30, 0, -5),
            new THREE.Vector3(10, 0, 0),
            new THREE.Vector3(0, 0, 5)
        ];
        this.currentTargetIndex = 0;

        this.detectionRange = 10;
        this.killRange = 1.5;
        this.raycaster = new THREE.Raycaster();
    }

    createMesh() {
        const group = new THREE.Group();

        // Simple "creepy" figure
        const bodyGeom = new THREE.CylinderGeometry(0.5, 0.5, 2, 8);
        const bodyMat = new THREE.MeshStandardMaterial({ color: 0x000000 });
        const body = new THREE.Mesh(bodyGeom, bodyMat);
        body.position.y = 1;
        group.add(body);

        const headGeom = new THREE.SphereGeometry(0.4, 8, 8);
        const headMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
        const head = new THREE.Mesh(headGeom, headMat);
        head.position.y = 2.2;
        group.add(head);

        // Glowing eyes
        const eyeGeom = new THREE.SphereGeometry(0.05, 8, 8);
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        const leftEye = new THREE.Mesh(eyeGeom, eyeMat);
        leftEye.position.set(0.15, 2.3, 0.35);
        group.add(leftEye);

        const rightEye = new THREE.Mesh(eyeGeom, eyeMat);
        rightEye.position.set(-0.15, 2.3, 0.35);
        group.add(rightEye);

        group.castShadow = true;
        return group;
    }

    update(delta) {
        const distToPlayer = this.mesh.position.distanceTo(this.playerCamera.position);

        if (distToPlayer < this.detectionRange) {
            this.state = 'CHASE';
        } else if (this.state === 'CHASE' && distToPlayer > this.detectionRange * 1.5) {
            this.state = 'PATROL';
        }

        if (this.state === 'CHASE') {
            this.chasePlayer(delta);
        } else {
            this.patrol(delta);
        }

        // Check for kill
        if (distToPlayer < this.killRange) {
            this.onPlayerCaught();
        }
    }

    patrol(delta) {
        const target = this.patrolPoints[this.currentTargetIndex];
        const dir = new THREE.Vector3().subVectors(target, this.mesh.position);
        dir.y = 0;

        if (dir.length() < 0.5) {
            this.currentTargetIndex = (this.currentTargetIndex + 1) % this.patrolPoints.length;
        } else {
            dir.normalize();
            this.mesh.position.add(dir.multiplyScalar(this.speed * delta));
            this.mesh.lookAt(target.x, this.mesh.position.y, target.z);
        }
    }

    chasePlayer(delta) {
        const target = this.playerCamera.position.clone();
        const dir = new THREE.Vector3().subVectors(target, this.mesh.position);
        dir.y = 0;

        // Raycast to check for obstacles
        this.raycaster.set(this.mesh.position.clone().add(new THREE.Vector3(0, 1, 0)), dir.clone().normalize());
        const intersects = this.raycaster.intersectObjects(this.world.collidables);

        if (intersects.length > 0 && intersects[0].distance < dir.length()) {
            // Obstacle in the way! Try to find a path around
            // For simplicity, we'll try to find an alternative direction
            const leftDir = dir.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 4).normalize();
            const rightDir = dir.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), -Math.PI / 4).normalize();

            const leftRay = new THREE.Raycaster(this.mesh.position.clone().add(new THREE.Vector3(0, 1, 0)), leftDir);
            const rightRay = new THREE.Raycaster(this.mesh.position.clone().add(new THREE.Vector3(0, 1, 0)), rightDir);

            const leftIntersects = leftRay.intersectObjects(this.world.collidables);
            const rightIntersects = rightRay.intersectObjects(this.world.collidables);

            if (leftIntersects.length === 0 || leftIntersects[0].distance > 2) {
                dir.copy(leftDir);
            } else if (rightIntersects.length === 0 || rightIntersects[0].distance > 2) {
                dir.copy(rightDir);
            } else {
                // Back up or wait if stuck
                dir.multiplyScalar(-0.5);
            }
        } else {
            dir.normalize();
        }

        this.mesh.position.add(dir.multiplyScalar(this.chaseSpeed * delta));
        this.mesh.lookAt(this.mesh.position.x + dir.x, this.mesh.position.y, this.mesh.position.z + dir.z);
    }

    onPlayerCaught() {
        const event = new CustomEvent('playerCaught');
        document.dispatchEvent(event);
    }
}
