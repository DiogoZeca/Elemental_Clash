import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export function setupBaseLighting(scene) {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);
  
    const pointLight = new THREE.PointLight(0xffeedd, 0.9); 
    pointLight.position.set(0, 2, -1);
    pointLight.castShadow = true;
    pointLight.shadow.mapSize.width = 1024; 
    pointLight.shadow.mapSize.height = 1024;
    pointLight.shadow.camera.near = 0.5;
    pointLight.shadow.camera.far = 20;
    
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

  const config = {
    torchScale: options.torchScale || 3.0, 
    torchCount: 3,
    lightIntensity: options.lightIntensity || 8.0, 
    lightColor: options.lightColor || 0xff5500,
    lightDistance: options.lightDistance || 20, 
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
  console.log('Using wall positions:', wallDetails);
  
  const torchPositions = [
    // Left wall torch (centered)
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
    // Right wall torch (centered)
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
    // Back wall torch (centered)
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

  const performanceMode = options.performanceMode || (window.devicePixelRatio < 2) || true;

  const shadowMapSize = performanceMode ? 512 : 1024;


  try {
    const gltfLoader = new GLTFLoader();
    console.log('Loading torch model from models/scenery/torches/scene.gltf');
    
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
    
    console.log('Torch models loaded successfully');

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
      
      console.log(`Torch ${index} dimensions:`, modelSize);

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

      light.position.set(0.3, 0.7, 0);
      
      
      // Configure shadow properties
      light.castShadow = !performanceMode; 
      if (light.castShadow) {
        light.shadow.mapSize.width = shadowMapSize;
        light.shadow.mapSize.height = shadowMapSize;
        light.shadow.camera.near = 0.5;
        light.shadow.camera.far = 15; 
        light.shadow.bias = -0.002;
        light.shadow.normalBias = 0.02;
        light.shadow.radius = 1.0; 
      }
      
      light.userData.originalIntensity = config.lightIntensity;
      light.userData.flickering = true;
      light.userData.lastFlicker = 0;
      
      torch.add(light);
      scene.add(torch);

      const torchAmbient = new THREE.PointLight(0xff2200, 2.0, 2.0);
      torchAmbient.position.copy(light.position); 
      torch.add(torchAmbient);

      const flameGeometry = new THREE.SphereGeometry(
        0.1, 
        performanceMode ? 6 : 12,  
        performanceMode ? 4 : 18   
      );
      const flameMaterial = new THREE.MeshBasicMaterial({
        color: 0xff2200, 
        transparent: true,
        opacity: 0.9,
        emissive: 0xff0000, 
        emissiveIntensity: 2.0
      });
      const flame = new THREE.Mesh(flameGeometry, flameMaterial);
      flame.position.copy(light.position);
      torch.add(flame);

      const glowGeometry = new THREE.SphereGeometry(
        0.2, 
        performanceMode ? 8 : 12,
        performanceMode ? 6 : 8
      );
      const glowMaterial = new THREE.MeshBasicMaterial({
        color: 0xff5500,
        transparent: true,
        opacity: 0.4,
      });
      const glow = new THREE.Mesh(glowGeometry, glowMaterial);
      glow.position.copy(light.position); 
      torch.add(glow);
      
      // Make torch cast shadows
      torch.traverse((node) => {
        if (node.isMesh && node !== flame && node !== glow) {
          node.castShadow = !performanceMode; 
          node.receiveShadow = !performanceMode;
        }
      });
      
      torches.push({ torch, light, ambientLight: torchAmbient });
    });
    
    console.log(`Added ${torches.length} wall torches to the scene`);
    return torches;
    
  } catch (error) {
    console.error('Failed to load torch models:', error);
    return [];
  }
}




export function updateTorchLights(torches) {
  if (!torches || torches.length === 0) return;
  
  // Only update every other frame to save performance
  if (Math.floor(Date.now() / 30) % 2 !== 0) return;
  
  // Use a single shared time value for all calculations
  const time = Date.now() * 0.001;
  
  // Pre-calculate shared values used by all torches to reduce calculations
  const sinFast = Math.sin(time * 15) * 0.15;  // Reduced amplitude
  const sinSlow = Math.sin(time * 1.5) * 0.25; // Reduced amplitude
  
  torches.forEach(({ torch, light, ambientLight }) => {
    if (light && light.userData.flickering) {
      // Use less randomness for better performance
      const noise = ((Math.random() - 0.5) * 0.15); 
      
      // Simplified flicker calculation - fewer operations
      const flicker = sinFast + sinSlow + noise;
      const originalIntensity = light.userData.originalIntensity;
      
      // Apply intensity with simpler math
      light.intensity = originalIntensity * (0.85 + flicker);
      
      // Update ambient light intensity with same flicker
      if (ambientLight) {
        ambientLight.intensity = 2.0 * (0.85 + flicker);
      }
      
      // Update visual mesh sizes
      // Only update when significant change (save performance)
      if (Math.abs(light.userData.lastFlicker - flicker) > 0.15) {
        light.userData.lastFlicker = flicker;
        
        let flameFound = false;
        let glowFound = false;
        
        // Update only the first two matching meshes to save on loop iterations
        for (let i = 0; i < torch.children.length && (!flameFound || !glowFound); i++) {
          const child = torch.children[i];
          if (child.isMesh) {
            if (child.material.opacity > 0.8 && !flameFound) {
              // This is the flame
              const scale = 0.2 * (1.0 + flicker * 1.2);
              child.scale.set(scale, scale * 1.5, scale);
              flameFound = true;
            } 
            else if (child.material.opacity < 0.5 && !glowFound) {
              // This is the glow
              const scale = 0.4 * (1.0 + flicker * 0.8);
              child.scale.set(scale, scale, scale);
              glowFound = true;
            }
          }
        }
      }
    }
  });
}