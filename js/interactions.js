import * as THREE from 'three';

export class InteractionSystem {
    constructor(camera, scene, world) {
        this.camera = camera;
        this.scene = scene;
        this.world = world;
        this.raycaster = new THREE.Raycaster();
        this.raycaster.far = 3; // Interaction distance
        this.inventory = [];
        this.interactables = [];

        this.setupItems();
        this.setupEventListeners();
    }

    setupItems() {
        // Place 5 collectable items (e.g., keys/fuses)
        const itemPositions = [
            { x: 5, y: 1, z: 5, name: 'Main Gate Key' },
            { x: 35, y: 1, z: 5, name: 'Basement Key' },
            { x: 15, y: 1, z: 12, name: 'Office Key' },
            { x: -2, y: 1, z: -2, name: 'Toolbox Key' },
            { x: 25, y: 1, z: 2, name: 'Final Exit Key' }
        ];

        itemPositions.forEach((pos, index) => {
            const geom = new THREE.SphereGeometry(0.2, 16, 16);
            const mat = new THREE.MeshStandardMaterial({ color: 0xffff00, emissive: 0x333300 });
            const item = new THREE.Mesh(geom, mat);
            item.position.set(pos.x, pos.y, pos.z);
            item.userData = {
                interactable: true,
                type: 'collectible',
                name: pos.name,
                id: index
            };
            this.scene.add(item);
            this.interactables.push(item);
        });
    }

    setupEventListeners() {
        document.addEventListener('mousedown', (event) => {
            if (event.button === 0) { // Left click
                this.interact();
            }
        });

        document.addEventListener('keydown', (event) => {
            if (event.code === 'KeyE') {
                this.interact();
            }
        });
    }

    interact() {
        this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
        const intersects = this.raycaster.intersectObjects(this.interactables);

        if (intersects.length > 0) {
            const object = intersects[0].object;
            if (object.userData.type === 'collectible') {
                this.collectItem(object);
            }
        }
    }

    collectItem(item) {
        this.inventory.push(item.userData.name);
        this.scene.remove(item);
        this.interactables = this.interactables.filter(i => i !== item);

        this.updateHUD();

        // Custom event for game logic
        const event = new CustomEvent('itemCollected', {
            detail: {
                name: item.userData.name,
                count: this.inventory.length
            }
        });
        document.dispatchEvent(event);
    }

    updateHUD() {
        const itemCount = document.getElementById('item-count');
        itemCount.innerText = `${this.inventory.length} / 5 Items Collected`;

        const invList = document.getElementById('inventory-list');
        const li = document.createElement('li');
        li.innerText = this.inventory[this.inventory.length - 1];
        invList.appendChild(li);
    }

    update() {
        // Highlight interactables or show prompt
        this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
        const intersects = this.raycaster.intersectObjects(this.interactables);

        const prompt = document.getElementById('interaction-prompt');
        if (intersects.length > 0) {
            prompt.classList.remove('hidden');
        } else {
            prompt.classList.add('hidden');
        }
    }
}
