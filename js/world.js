import * as THREE from 'three';

export class World {
    constructor(scene) {
        this.scene = scene;
        this.objects = [];
        this.collidables = [];
        this.textures = {};
        this.generateTextures();
        this.createWorld();
    }

    generateTextures() {
        // Create a "dirty" wall texture using Canvas
        const wallCanvas = document.createElement('canvas');
        wallCanvas.width = 512;
        wallCanvas.height = 512;
        const ctx = wallCanvas.getContext('2d');

        // Base color
        ctx.fillStyle = '#444';
        ctx.fillRect(0, 0, 512, 512);

        // Add noise/dirt
        for (let i = 0; i < 20000; i++) {
            const x = Math.random() * 512;
            const y = Math.random() * 512;
            const size = Math.random() * 2;
            const opacity = Math.random() * 0.2;
            ctx.fillStyle = `rgba(0,0,0,${opacity})`;
            ctx.fillRect(x, y, size, size);
        }

        // Add some cracks
        ctx.strokeStyle = 'rgba(20,20,20,0.4)';
        ctx.lineWidth = 1;
        for (let i = 0; i < 5; i++) {
            ctx.beginPath();
            ctx.moveTo(Math.random() * 512, Math.random() * 512);
            ctx.lineTo(Math.random() * 512, Math.random() * 512);
            ctx.stroke();
        }

        const wallTexture = new THREE.CanvasTexture(wallCanvas);
        wallTexture.wrapS = THREE.RepeatWrapping;
        wallTexture.wrapT = THREE.RepeatWrapping;
        this.textures.wall = wallTexture;

        // Floor texture (concrete-like)
        const floorCanvas = document.createElement('canvas');
        floorCanvas.width = 512;
        floorCanvas.height = 512;
        const fctx = floorCanvas.getContext('2d');
        fctx.fillStyle = '#333';
        fctx.fillRect(0, 0, 512, 512);
        for (let i = 0; i < 30000; i++) {
            const x = Math.random() * 512;
            const y = Math.random() * 512;
            const size = Math.random() * 1.5;
            const color = Math.random() * 50;
            fctx.fillStyle = `rgb(${color},${color},${color})`;
            fctx.fillRect(x, y, size, size);
        }
        const floorTexture = new THREE.CanvasTexture(floorCanvas);
        floorTexture.wrapS = THREE.RepeatWrapping;
        floorTexture.wrapT = THREE.RepeatWrapping;
        this.textures.floor = floorTexture;
    }

    createWorld() {
        // Simple Hospital-like layout
        // Room 1 (Start)
        this.createRoom(0, 0, 10, 10, 4, { north: true, south: false, east: true, west: true });

        // Corridor
        this.createRoom(10, 0, 20, 4, 4, { north: true, south: true, east: true, west: true });

        // Room 2
        this.createRoom(30, 0, 10, 10, 4, { north: true, south: true, east: true, west: true });

        // Room 3 (Side room)
        this.createRoom(15, 10, 8, 8, 4, { north: true, south: true, east: true, west: true });

        // Adding some random pillars/obstacles
        this.createBox(5, 2, 5, 1, 4, 1);
        this.createBox(15, 2, -2, 1, 4, 1);
    }

    createRoom(x, z, width, depth, height, doors) {
        const wallMat = new THREE.MeshStandardMaterial({ map: this.textures.wall });
        const floorMat = new THREE.MeshStandardMaterial({ map: this.textures.floor });
        const ceilingMat = new THREE.MeshStandardMaterial({ color: 0x111111 });

        // Floor
        const floor = new THREE.Mesh(new THREE.BoxGeometry(width, 0.1, depth), floorMat);
        floor.position.set(x, -0.05, z);
        floor.receiveShadow = true;
        this.scene.add(floor);
        // Do not add floor to collidables for PlayerController's AABB check

        // Ceiling
        const ceiling = new THREE.Mesh(new THREE.BoxGeometry(width, 0.1, depth), ceilingMat);
        ceiling.position.set(x, height + 0.05, z);
        this.scene.add(ceiling);

        // Walls
        const wallThickness = 0.2;

        // North
        if (!doors.north) {
            this.createWall(x, z - depth/2, width, height, wallThickness, wallMat);
        } else {
            // Wall with door hole (simplified: two small walls)
            this.createWall(x - width/3, z - depth/2, width/3, height, wallThickness, wallMat);
            this.createWall(x + width/3, z - depth/2, width/3, height, wallThickness, wallMat);
        }

        // South
        if (!doors.south) {
            this.createWall(x, z + depth/2, width, height, wallThickness, wallMat);
        } else {
            this.createWall(x - width/3, z + depth/2, width/3, height, wallThickness, wallMat);
            this.createWall(x + width/3, z + depth/2, width/3, height, wallThickness, wallMat);
        }

        // East
        if (!doors.east) {
            this.createWall(x + width/2, z, wallThickness, height, depth, wallMat);
        } else {
            this.createWall(x + width/2, z - depth/3, wallThickness, height, depth/3, wallMat);
            this.createWall(x + width/2, z + depth/3, wallThickness, height, depth/3, wallMat);
        }

        // West
        if (!doors.west) {
            this.createWall(x - width/2, z, wallThickness, height, depth, wallMat);
        } else {
            this.createWall(x - width/2, z - depth/3, wallThickness, height, depth/3, wallMat);
            this.createWall(x - width/2, z + depth/3, wallThickness, height, depth/3, wallMat);
        }
    }

    createWall(x, z, w, h, d, mat) {
        const wall = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
        wall.position.set(x, h/2, z);
        wall.castShadow = true;
        wall.receiveShadow = true;
        this.scene.add(wall);
        this.collidables.push(wall);
    }

    createBox(x, y, z, w, h, d) {
        const box = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ color: 0x444444 }));
        box.position.set(x, y, z);
        box.castShadow = true;
        box.receiveShadow = true;
        this.scene.add(box);
        this.collidables.push(box);
    }
}
