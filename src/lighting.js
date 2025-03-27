import * as THREE from 'three';

export function setupBaseLighting(scene) {
    // Base ambient light - increased intensity and changed to a more neutral color
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7); // Changed from dark red 0x3a1010, 0.4
    scene.add(ambientLight);
  
    // Interior point light - increased intensity
    const pointLight = new THREE.PointLight(0xffeedd, 0.9); // Changed from 0xff8866, 0.5
    pointLight.position.set(0, 2, -1);
    pointLight.castShadow = true;
    pointLight.shadow.mapSize.width = 1024;
    pointLight.shadow.mapSize.height = 1024;
    scene.add(pointLight);
    
    return { ambientLight, pointLight };
  }