import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// Add performance configuration object
export const LIGHTING_PERFORMANCE = {
  enabled: true,         // Enable performance mode by default
  updateFrequency: 3,    // Only update every N frames (higher = better performance)
  disableShadows: false, // Option to completely disable shadows
  maxActiveTorches: 3,   // Limit number of active torches
  torchLOD: true         // Enable torch LOD (Level of Detail)
};

export function setupBaseLighting(scene) {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4); 
    scene.add(ambientLight);
    const pointLight = new THREE.PointLight(0xffeedd, 0.7); 
    pointLight.position.set(0, 2, -1);
    pointLight.castShadow = !LIGHTING_PERFORMANCE.disableShadows;
    
    if (pointLight.castShadow) {
      pointLight.shadow.mapSize.width = 512;  
      pointLight.shadow.mapSize.height = 512; 
      pointLight.shadow.camera.near = 0.5;
      pointLight.shadow.camera.far = 20;
    }
    
    scene.add(pointLight);
    
    return { ambientLight, pointLight };
}

/**
 * Adds wall torches to the scene with flickering light effects
 * @param {THREE.Scene} scene - The scene to add torches to
 * @param {Object} walls - The wall objects from createWallEnvironment
 * @param {Object} options - Configuration options
 * @returns {Promise<Array>} - Array of created torch objects
 */
export async function addWallTorches(scene, walls, options = {}) {
  if (!walls) {
    console.error('Cannot add torches: No walls provided');
    return [];
  }
  const performanceMode = LIGHTING_PERFORMANCE.enabled || options.performanceMode || (window.devicePixelRatio < 2);
  const torchCount = Math.min(options.torchCount || 3, LIGHTING_PERFORMANCE.maxActiveTorches);
  
  const config = {
    torchScale: options.torchScale || 3.0, 
    torchCount: torchCount,
    lightIntensity: performanceMode ? 6.0 : 8.0, 
    lightColor: options.lightColor || 0xff5500,
    lightDistance: options.lightDistance || 15, 
    flickerIntensity: options.flickerIntensity || 0.5,
    wallHeight: options.wallHeight || 7,
    floorLevel: options.floorLevel || -3
  };

  console.log('Loading wall torch models...');
  const torches = [];
  const wallDetails = {
    backWallZ: walls.backWall ? walls.backWall.position.z : -10,
    sideWallX: {
      left: walls.leftWall ? walls.leftWall.position.x : -10,
      right: walls.rightWall ? walls.rightWall.position.x : 10
    },
    wallThickness: 0.2,
    wallHeight: options.wallHeight || 7
  };
  
  const torchPositions = [
    // Left wall torch 
    { 
      position: new THREE.Vector3(
        wallDetails.sideWallX.left, 
        config.floorLevel + (wallDetails.wallHeight * 0.6), 
        -5 
      ),
      rotation: new THREE.Euler(0, 0, 0), 
      wallDirection: new THREE.Vector3(-1, 0, 0),    
      embedDepth: 0.5 
    },
    // Right wall torch 
    { 
      position: new THREE.Vector3(
        wallDetails.sideWallX.right, 
        config.floorLevel + (wallDetails.wallHeight * 0.6), 
        -5 
      ),
      rotation: new THREE.Euler(0, Math.PI, 0), 
      wallDirection: new THREE.Vector3(1, 0, 0),     
      embedDepth: 0.5
    },
    // Back wall torch 
    { 
      position: new THREE.Vector3(
        0,
        config.floorLevel + (wallDetails.wallHeight * 0.6),
        wallDetails.backWallZ
      ),
      rotation: new THREE.Euler(0, -Math.PI/2, 0), 
      wallDirection: new THREE.Vector3(0, 0, -1),    
      embedDepth: 0.5
    }
  ];

  const flameGeometry = new THREE.SphereGeometry(
    0.1, 
    performanceMode ? 4 : 8, 
    performanceMode ? 3 : 6  
  );
  const glowGeometry = new THREE.SphereGeometry(
    0.2, 
    performanceMode ? 6 : 10,
    performanceMode ? 4 : 6
  );
  const flameMaterial = new THREE.MeshBasicMaterial({
    color: 0xff2200, 
    transparent: true,
    opacity: 0.9,
  });
  const glowMaterial = new THREE.MeshBasicMaterial({
    color: 0xff5500,
    transparent: true,
    opacity: 0.4,
  });
  const shadowMapSize = performanceMode ? 256 : 512; 
  try {
    const gltfLoader = new GLTFLoader();
    const gltf = await new Promise((resolve, reject) => {
      gltfLoader.load(
        'models/scenery/torches/scene.gltf',
        resolve,
        (xhr) => {
          console.log(`Torch model loading: ${Math.round((xhr.loaded / xhr.total) * 100)}% loaded`);
        },
        reject
      );
    });
    
    // Create and position each torch
    torchPositions.forEach((torchInfo, index) => {
      if (index >= config.torchCount) return; 
      
      // Clone the entire scene for each torch
      const torch = gltf.scene.clone();
      
      // Scale the torch appropriately
      torch.scale.set(config.torchScale, config.torchScale, config.torchScale);
      
      // Position the torch
      torch.position.copy(torchInfo.position);
      torch.rotation.copy(torchInfo.rotation);

      const bbox = new THREE.Box3().setFromObject(torch);
      const modelSize = new THREE.Vector3();
      bbox.getSize(modelSize);
      
      const adjustedEmbedDepth = Math.min(torchInfo.embedDepth, modelSize.x * 0.3);
      const torchOffset = new THREE.Vector3()
        .copy(torchInfo.wallDirection)
        .multiplyScalar(-adjustedEmbedDepth);
        
      torch.position.add(torchOffset);

      // Add point light to torch 
      const light = new THREE.PointLight(
        config.lightColor,
        config.lightIntensity,
        config.lightDistance
      );
      light.position.set(0.3, 1, 0);
      const useShadows = !performanceMode && !LIGHTING_PERFORMANCE.disableShadows;
      light.castShadow = useShadows;
      
      if (light.castShadow) {
        light.shadow.mapSize.width = shadowMapSize;
        light.shadow.mapSize.height = shadowMapSize;
        light.shadow.camera.near = 0.5;
        light.shadow.camera.far = 15; 
        light.shadow.bias = -0.002;
        light.shadow.normalBias = 0;
        light.shadow.radius = 1.0;
      }
      
      light.userData.originalIntensity = config.lightIntensity;
      light.userData.flickering = true;
      light.userData.lastFlicker = 0;
      light.userData.index = index; 
      
      torch.add(light);
      scene.add(torch);

      const torchAmbient = new THREE.PointLight(0xff2200, 1.5, 2.0); 
      torchAmbient.position.copy(light.position); 
      torch.add(torchAmbient);
      const flame = new THREE.Mesh(flameGeometry, flameMaterial);
      flame.position.copy(light.position);
      torch.add(flame);

      const glow = new THREE.Mesh(glowGeometry, glowMaterial);
      glow.position.copy(light.position); 
      torch.add(glow);
      
      torch.traverse((node) => {
        if (node.isMesh && node !== flame && node !== glow) {
          node.castShadow = useShadows; 
          node.receiveShadow = useShadows;
        }
      });
      torches.push({ torch, light, ambientLight: torchAmbient });
    });
    return torches;
  } catch (error) {
    console.error('Failed to load torch models:', error);
    return [];
  }
}

export function updateTorchLights(torches) {
  if (!torches || torches.length === 0) return;
  const frameCount = Math.floor(Date.now() / 30);
  if (frameCount % LIGHTING_PERFORMANCE.updateFrequency !== 0) return;
  const time = Date.now() * 0.001;
  const sinFast = Math.sin(time * 10) * 0.15;  
  const sinSlow = Math.sin(time * 1.2) * 0.2;  
  const updateAllTorches = !LIGHTING_PERFORMANCE.enabled;
  
  torches.forEach(({ torch, light, ambientLight }) => {
    if (!updateAllTorches && (light.userData.index % LIGHTING_PERFORMANCE.updateFrequency) !== (frameCount % LIGHTING_PERFORMANCE.updateFrequency)) {
      return;
    }
    if (light && light.userData.flickering) {
      const noise = LIGHTING_PERFORMANCE.enabled ? 
                    ((time * 1234.5678 % 1) - 0.5) * 0.12 : 
                    ((Math.random() - 0.5) * 0.15);
      const flicker = sinFast + sinSlow + noise;
      const originalIntensity = light.userData.originalIntensity;
      light.intensity = originalIntensity * (0.85 + flicker);
      if (ambientLight) {
        ambientLight.intensity = 1.5 * (0.85 + flicker);
      }
      if (Math.abs(light.userData.lastFlicker - flicker) > 0.2) { 
        light.userData.lastFlicker = flicker;
        
        let flameFound = false;
        let glowFound = false;
        for (let i = 0; i < torch.children.length && (!flameFound || !glowFound); i++) {
          const child = torch.children[i];
          if (!child.isMesh) continue;
          
          if (child.material.opacity > 0.8 && !flameFound) {
            const scale = 0.2 * (1.0 + flicker);
            child.scale.set(scale, scale * 1.5, scale);
            flameFound = true;
          } 
          else if (child.material.opacity < 0.5 && !glowFound) {
            const scale = 0.4 * (1.0 + flicker * 0.6);
            child.scale.set(scale, scale, scale);
            glowFound = true;
          }
          if (flameFound && glowFound) break;
        }
      }
    }
  });
}