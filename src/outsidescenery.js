import * as THREE from 'three';

// Texture cache (similar to the one in sceneLoader.js)
const textureCache = new Map();

/**
 * Helper function to load textures
 * @param {string} path - Path to the texture file
 * @param {Object} options - Optional settings for the texture
 * @returns {Promise<THREE.Texture>} - The loaded texture 
 */
function loadTexture(path, options = {}) {
  const { repeat = [1, 1] } = options;

  if (textureCache.has(path)) {
    return Promise.resolve(textureCache.get(path));
  }
  
  const textureLoader = new THREE.TextureLoader();
  return new Promise((resolve, reject) => {
    textureLoader.load(
      path,
      (texture) => {
        // Configure texture for proper tiling
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(repeat[0], repeat[1]);
        
        textureCache.set(path, texture);
        resolve(texture);
      },
      undefined,
      (error) => reject(new Error(`Failed to load texture: ${path}, ${error}`))
    );
  });
}

/**
 * Creates a path to the room entrance
 * @param {THREE.Scene} scene - The scene to add the path to
 * @param {Object} options - Configuration options
 * @returns {THREE.Object3D} - The created path object
 */
export function createPathToEntrance(scene, options = {}) {
    console.log('Creating path to room entrance...');
    
    const config = {
      startPosition: options.startPosition || new THREE.Vector3(-25, -3.1, 0),
      endPosition: options.endPosition || new THREE.Vector3(-12, -3.1, 0),
      width: options.width || 2.5,
      heightOffset: options.heightOffset || 0.05 // Slightly above ground
    };
    
    // Create a group to hold path segments
    const pathGroup = new THREE.Group();
    
    // Create path direction vector
    const pathDirection = new THREE.Vector3().subVectors(config.endPosition, config.startPosition);
    const pathLength = pathDirection.length();
    pathDirection.normalize();
    
    // Create path geometry
    const pathGeometry = new THREE.PlaneGeometry(pathLength, config.width);
    
    // Create path material with stone texture
    const pathMaterial = new THREE.MeshStandardMaterial({
      color: 0x777788, // Bluish gray color for stone
      roughness: 0.8,
      metalness: 0.1,
      emissive: 0x223344, // Subtle glow for night visibility
      emissiveIntensity: 0.15
    });
    
    // Create path mesh
    const path = new THREE.Mesh(pathGeometry, pathMaterial);
    
    // Position and rotate path
    path.position.copy(config.startPosition).add(
        pathDirection.clone().multiplyScalar(pathLength / 2)
    );
    path.position.y += config.heightOffset;
    
    // Calculate rotation to lay flat on ground
    path.rotation.x = -Math.PI / 2;
    
    // Calculate rotation around Y axis to align with path direction
    const angle = Math.atan2(pathDirection.z, pathDirection.x);
    path.rotation.y = Math.PI / 2 - angle;
    
    // Make path receive shadows
    path.receiveShadow = true;
    
    // Add path to group
    pathGroup.add(path);
    
    // Add lights along the path for better visibility
    const lightCount = Math.ceil(pathLength / 4);
    
    for (let i = 0; i <= lightCount; i++) {
        // Create a small point light
        const light = new THREE.PointLight(0x8888ff, 0.3, 3);
        
        // Calculate position along path
        const t = i / lightCount;
        const pos = new THREE.Vector3().lerpVectors(config.startPosition, config.endPosition, t);
        pos.y += 0.2; // Lift light slightly above path
        
        light.position.copy(pos);
        
        // Add light to scene
        scene.add(light);
      
        // Create small glowing sphere at light position
        const sphereGeometry = new THREE.SphereGeometry(0.1, 8, 8);
        const sphereMaterial = new THREE.MeshBasicMaterial({
          color: 0x8888ff, 
          transparent: true, 
          opacity: 0.7
        });
        const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
        sphere.position.copy(light.position);
        pathGroup.add(sphere);
    }
    
    // Make path receive shadows
    path.receiveShadow = true;
    
    // Add path to group
    pathGroup.add(path);
    
    // Add group to scene
    scene.add(pathGroup);
    
    console.log('Path to room entrance created');
    return pathGroup;
}


/**
 * Creates a night-time outside landscape with ground and sky
 * @param {THREE.Scene} scene - The scene to add elements to
 * @param {Object} options - Configuration options
 * @returns {Promise<Object>} - References to created elements
 */
export async function createOutsideScenery(scene, options = {}) {
  try {
    console.log('Creating night-time outside scenery...');
    
    // Default options
    const config = {
      groundSize: options.groundSize || 100,
      skyboxSize: options.skyboxSize || 500,
      mountainsEnabled: options.mountainsEnabled || false, // Mountains disabled by default
      moonEnabled: options.moonEnabled !== undefined ? options.moonEnabled : true,
      starsEnabled: options.starsEnabled !== undefined ? options.starsEnabled : true
    };
    
    // Create dark ground
    const groundGeometry = new THREE.PlaneGeometry(config.groundSize, config.groundSize);
    const groundMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x0a1f15,  // Very dark green for night ground
      roughness: 0.9, 
      metalness: 0.1
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2; // Horizontal
    ground.position.y = -3.2; // Slightly below the indoor floor
    ground.receiveShadow = true;
    scene.add(ground);
    
    // Create night skybox
    const skyGeometry = new THREE.BoxGeometry(config.skyboxSize, config.skyboxSize, config.skyboxSize);
    const skyMaterials = [];
    
    // Create dark night sky
    for (let i = 0; i < 6; i++) {
      // Different sides of the skybox can have subtle color variations
      let color;
      if (i === 4) { // Top side
        color = 0x0a0a1a; // Very dark blue-black
      } else if (i === 5) { // Bottom side
        color = 0x050510; // Almost black
      } else { // Other sides
        color = 0x07071a; // Very dark blue
      }
      
      skyMaterials.push(new THREE.MeshBasicMaterial({
        color: color,
        side: THREE.BackSide
      }));
    }
    
    const skybox = new THREE.Mesh(skyGeometry, skyMaterials);
    scene.add(skybox);
    
    // Add moon if enabled
    let moon = null;
    if (config.moonEnabled) {
      moon = createMoon(scene);
    }
    
    // Add stars if enabled
    let stars = null;
    if (config.starsEnabled) {
      stars = createStars(scene, config.skyboxSize * 0.9);
    }
    
    // Add mountains if enabled (kept from original code but disabled by default)
    let mountains = null;
    if (config.mountainsEnabled) {
      mountains = createSimpleMountains(scene);
    }
    
    console.log('Night-time scenery created successfully');
    return {
      ground,
      skybox,
      mountains,
      moon,
      stars
    };
  } catch (error) {
    console.error('Error creating outside scenery:', error);
    return null;
  }
}

/**
 * Creates a glowing moon that acts as the main light source
 * @param {THREE.Scene} scene - The scene to add the moon to
 * @returns {Object} - The moon mesh and its light
 */
function createMoon(scene) {
    const moonGeometry = new THREE.SphereGeometry(8, 32, 32);
    const moonMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffdd,
      emissive: 0xffffcc,
      emissiveIntensity: 0.9,
      roughness: 0.5
    });
  
    const moon = new THREE.Mesh(moonGeometry, moonMaterial);
  
  // Position the moon in the night sky
  moon.position.set(40, 60, -100);
  
  // Add a light source from the moon - use a directional light for better shadows
  const moonLight = new THREE.DirectionalLight(0xc9e6ff, 1.0);
  moonLight.position.copy(moon.position);
  moonLight.target.position.set(0, 0, 0); // Make it point at the center of the scene
  
  // Setup for shadow casting
  moonLight.castShadow = true;
  moonLight.shadow.mapSize.width = 2048;
  moonLight.shadow.mapSize.height = 2048;
  moonLight.shadow.camera.near = 10;
  moonLight.shadow.camera.far = 200;
  moonLight.shadow.camera.left = -50;
  moonLight.shadow.camera.right = 50;
  moonLight.shadow.camera.top = 50;
  moonLight.shadow.camera.bottom = -50;
  moonLight.shadow.bias = -0.0005;

    
  // Add a soft point light at the moon's position for local illumination
  const moonGlow = new THREE.PointLight(0xd8e7ff, 0.8, 200);
  moonGlow.position.copy(moon.position);
  
  scene.add(moon);
  scene.add(moonLight);
  scene.add(moonLight.target);
  scene.add(moonGlow);
  
  return { moon, moonLight, moonGlow };

}

/**
 * Creates stars in the night sky
 * @param {THREE.Scene} scene - The scene to add stars to
 * @param {number} radius - The radius of the star field
 * @returns {THREE.Points} - The stars object
 */
function createStars(scene, radius) {
  // Create star particles
  const starsGeometry = new THREE.BufferGeometry();
  const starsCount = 2000;
  const starsPositions = [];
  
  for (let i = 0; i < starsCount; i++) {
    // Create a random position on a sphere
    const theta = 2 * Math.PI * Math.random();
    const phi = Math.acos(2 * Math.random() - 1);
    const r = radius * (0.6 + Math.random() * 0.4); // Vary the radius slightly
    
    const x = r * Math.sin(phi) * Math.cos(theta);
    const y = r * Math.sin(phi) * Math.sin(theta);
    const z = r * Math.cos(phi);
    
    starsPositions.push(x, y, z);
  }
  
  starsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starsPositions, 3));
  
  // Create star material with varying sizes
  const starsMaterial = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 1.5,
    sizeAttenuation: true,
  });
  
  const stars = new THREE.Points(starsGeometry, starsMaterial);
  scene.add(stars);
  
  return stars;
}


/**
 * Adds dark clouds to the night sky
 * @param {THREE.Scene} scene - The scene to add clouds to
 * @param {Object} options - Configuration options
 * @returns {Array<THREE.Mesh>} - Array of cloud meshes
 */
export function addClouds(scene, options = {}) {
  const config = {
    count: options.count || 10,
    minHeight: options.minHeight || 20,
    maxHeight: options.maxHeight || 40,
    minSize: options.minSize || 3,
    maxSize: options.maxSize || 8
  };
  
  const clouds = [];
  
  for (let i = 0; i < config.count; i++) {
    // Create cloud group (multiple spheres clustered together)
    const cloudGroup = new THREE.Group();
    
    // Random position
    const posX = (Math.random() - 0.5) * 100;
    const posY = config.minHeight + Math.random() * (config.maxHeight - config.minHeight);
    const posZ = -30 - Math.random() * 70;
    
    const cloudSize = config.minSize + Math.random() * (config.maxSize - config.minSize);
    const sphereCount = 3 + Math.floor(Math.random() * 5);
    
    // Dark cloud material for night
    const cloudMaterial = new THREE.MeshStandardMaterial({
      color: 0x222233,  // Dark blue-grey for night clouds
      roughness: 0.7,
      metalness: 0,
      transparent: true,
      opacity: 0.9
    });
    
    // Create cluster of spheres
    for (let j = 0; j < sphereCount; j++) {
      const size = (0.6 + Math.random() * 0.4) * cloudSize;
      const geometry = new THREE.SphereGeometry(size, 8, 8);
      const sphere = new THREE.Mesh(geometry, cloudMaterial);
      
      // Position each sphere in the cloud
      const offsetX = (Math.random() - 0.5) * cloudSize * 1.5;
      const offsetY = (Math.random() - 0.5) * cloudSize * 0.5;
      const offsetZ = (Math.random() - 0.5) * cloudSize * 1.5;
      
      sphere.position.set(offsetX, offsetY, offsetZ);
      cloudGroup.add(sphere);
    }
    
    // Add animation properties
    cloudGroup.userData = {
      speed: 0.01 + Math.random() * 0.05
    };
    
    cloudGroup.position.set(posX, posY, posZ);
    scene.add(cloudGroup);
    clouds.push(cloudGroup);
  }
  
  return clouds;
}

/**
 * Animates cloud movement
 * @param {Array<THREE.Group>} clouds - The clouds to animate
 */
export function animateClouds(clouds) {
  if (!clouds) return;
  
  clouds.forEach(cloud => {
    if (cloud.userData && cloud.userData.speed) {
      cloud.position.x += cloud.userData.speed;
      if (cloud.position.x > 75) cloud.position.x = -75;
    }
  });
}