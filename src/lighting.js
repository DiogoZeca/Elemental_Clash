import * as THREE from 'three';

export function setupBaseLighting(scene) {
    // Base ambient light - reduced intensity
    const ambientLight = new THREE.AmbientLight(0x3a1010, 0.4); // Reduced from 0.7
    scene.add(ambientLight);
  
    // Interior point light - reduced intensity
    const pointLight = new THREE.PointLight(0xff8866, 0.5); // Reduced from 0.8
    pointLight.position.set(0, 2, -1);
    pointLight.castShadow = true;
    pointLight.shadow.mapSize.width = 1024;
    pointLight.shadow.mapSize.height = 1024;
    scene.add(pointLight);
    
    return { ambientLight, pointLight };
  }