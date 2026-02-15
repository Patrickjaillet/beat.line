import * as THREE from 'three';

export class AvatarManager {
    constructor(scene) {
        this.scene = scene;
        this.group = new THREE.Group();
        this.head = null;
        this.body = null;
        this.eyeL = null;
        this.eyeR = null;
        this.init();
    }

    init() {
        // Simple Robot Avatar
        const material = new THREE.MeshStandardMaterial({ 
            color: 0x333333, 
            roughness: 0.2, 
            metalness: 0.8,
            emissive: 0x00f3ff,
            emissiveIntensity: 0.2
        });

        // Body
        const bodyGeo = new THREE.CylinderGeometry(0.5, 0.3, 1.5, 8);
        this.body = new THREE.Mesh(bodyGeo, material);
        this.body.position.y = -0.75;
        this.group.add(this.body);

        // Head
        const headGeo = new THREE.BoxGeometry(0.8, 0.6, 0.6);
        this.head = new THREE.Mesh(headGeo, material.clone());
        this.head.position.y = 0.5;
        this.group.add(this.head);

        // Eyes
        const eyeGeo = new THREE.PlaneGeometry(0.2, 0.1);
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0x00f3ff });
        
        this.eyeL = new THREE.Mesh(eyeGeo, eyeMat);
        this.eyeL.position.set(-0.2, 0.05, 0.31);
        this.head.add(this.eyeL);

        this.eyeR = new THREE.Mesh(eyeGeo, eyeMat);
        this.eyeR.position.set(0.2, 0.05, 0.31);
        this.head.add(this.eyeR);

        // Add light for the avatar
        const light = new THREE.PointLight(0x00f3ff, 1, 5);
        light.position.set(0, 1, 2);
        this.group.add(light);

        this.scene.add(this.group);
    }

    update(time, mouseX, mouseY) {
        // Idle animation
        this.group.position.y = Math.sin(time * 2) * 0.1;

        // Look at mouse
        const targetX = mouseX * 1.0;
        const targetY = mouseY * 0.5;

        this.head.rotation.y = THREE.MathUtils.lerp(this.head.rotation.y, targetX, 0.1);
        this.head.rotation.x = THREE.MathUtils.lerp(this.head.rotation.x, -targetY, 0.1);
        
        this.body.rotation.y = THREE.MathUtils.lerp(this.body.rotation.y, targetX * 0.5, 0.05);
    }

    setColor(hex) {
        this.head.material.emissive.setHex(hex);
        this.body.material.emissive.setHex(hex);
        this.eyeL.material.color.setHex(hex);
        this.eyeR.material.color.setHex(hex);
    }

    dispose() {
        this.scene.remove(this.group);
        // Dispose geometries/materials if needed
    }
}