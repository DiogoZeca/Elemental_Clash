import * as THREE from 'three';
import { SCENE_CONFIG, doorZ } from './config.js';
import { sceneObjects } from './gameState.js';

/**
 * Creates a path to the room entrance with improved visibility
 * @param {THREE.Scene} scene - The scene to add the path to
 * @param {Object} options - Configuration options
 * @returns {THREE.Object3D} - The created path object
 */
export function createPathToEntrance(scene, options = {}) {
  const config = {
    startPosition: options.startPosition || new THREE.Vector3(0, -3.1, doorZ + 25),
    endPosition: options.endPosition || new THREE.Vector3(0, -3.1, doorZ),
    width: options.width || 4.0,
    heightOffset: options.heightOffset || 0.15, // Increased height to stand out more
    pathColor: options.pathColor || 0x884444, // Brighter reddish color
    pathPattern: options.pathPattern || true
  };
  
  // Create a group to hold path segments
  const pathGroup = new THREE.Group();
  
  // Create path direction vector
  const pathDirection = new THREE.Vector3().subVectors(config.endPosition, config.startPosition);
  const pathLength = pathDirection.length();
  pathDirection.normalize();
  
  // Create path geometry with more segments for better detail
  const pathGeometry = new THREE.PlaneGeometry(pathLength, config.width, 20, 2);
  
  // Create path material with a more distinctive color and stronger emissive
  const pathMaterial = new THREE.MeshStandardMaterial({
    color: config.pathColor,
    roughness: 0.5, // Smoother to reflect more light
    metalness: 0.3, // Slightly more metallic for better reflections
    emissive: 0x552222, // Stronger red emissive 
    emissiveIntensity: 0.4  // Doubled emissive intensity
  });
  
  // Create path mesh
  const path = new THREE.Mesh(pathGeometry, pathMaterial);
  
  // Position and rotate path - raised slightly higher
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
  
  // Add BRIGHTER lights along the path for better visibility
  const lightCount = Math.ceil(pathLength / 3); // More lights
  
  for (let i = 0; i <= lightCount; i++) {
      // Create a small point light with brighter reddish color to match moon
      const light = new THREE.PointLight(0xff9977, 0.7, 5.0); // Brighter, wider range
      
      // Calculate position along path
      const t = i / lightCount;
      const pos = new THREE.Vector3().lerpVectors(config.startPosition, config.endPosition, t);
      pos.y += 0.4; // Higher off the ground
      
      light.position.copy(pos);
      scene.add(light);
    
      // Create larger glowing sphere at light position
      const sphereGeometry = new THREE.SphereGeometry(0.2, 10, 10); // Larger, more detailed
      const sphereMaterial = new THREE.MeshBasicMaterial({
        color: 0xff8855, 
        transparent: true, 
        opacity: 0.8 // More opaque
      });
      const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
      sphere.position.copy(light.position);
      pathGroup.add(sphere);
  }
  
  // Add path edge details - larger stones with more contrast
  const stoneCount = Math.ceil(pathLength / 1.2); // More stones
  const stoneGeometry = new THREE.DodecahedronGeometry(0.25, 0); // Larger stones
  
  for (let side = -1; side <= 1; side += 2) {
      for (let i = 0; i < stoneCount; i++) {
          const stoneMaterial = new THREE.MeshStandardMaterial({
              color: 0x555555, // Lighter gray for better contrast
              roughness: 0.7,
              metalness: 0.2,
              emissive: 0x222222,
              emissiveIntensity: 0.3
          });
          
          const stone = new THREE.Mesh(stoneGeometry, stoneMaterial);
          
          // Calculate position along path
          const t = (i / stoneCount) + (Math.random() * 0.02);
          const pathPos = new THREE.Vector3().lerpVectors(config.startPosition, config.endPosition, t);
          
          // Offset to the side of the path
          const perpendicular = new THREE.Vector3(-pathDirection.z, 0, pathDirection.x);
          const offset = (config.width/2 + 0.2) * side;
          const offsetPos = perpendicular.clone().multiplyScalar(offset);
          
          stone.position.copy(pathPos).add(offsetPos);
          stone.position.y = -3 + Math.random() * 0.2; // More height variation
          
          // Random rotation
          stone.rotation.set(
              Math.random() * Math.PI,
              Math.random() * Math.PI,
              Math.random() * Math.PI
          );
          
          // Stone receives and casts shadows
          stone.receiveShadow = true;
          stone.castShadow = true;
          
          pathGroup.add(stone);
      }
  }

  // Optional: Add subtle pattern to path using bump geometry
  if (config.pathPattern) {
    // Distort path geometry slightly to create a cobblestone effect
    const vertices = pathGeometry.attributes.position.array;
    for (let i = 0; i < vertices.length; i += 3) {
      // Only affect Y values (which will be up after rotation)
      if (i % 9 !== 0) { // Don't displace edge vertices
        vertices[i + 1] += (Math.random() - 0.5) * 0.1;
      }
    }
    pathGeometry.attributes.position.needsUpdate = true;
    pathGeometry.computeVertexNormals();
  }
  
  scene.add(pathGroup);
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
    const config = {
      groundSize: options.groundSize || 100,
      skyboxSize: options.skyboxSize || 500,
      moonEnabled: options.moonEnabled !== undefined ? options.moonEnabled : true,
      starsEnabled: options.starsEnabled !== undefined ? options.starsEnabled : true,
      cloudsEnabled: options.cloudsEnabled !== undefined ? options.cloudsEnabled : true,
      cloudsCount: options.cloudsCount || 12,
      mountainsEnabled: options.mountainsEnabled || false
    };
    // Create dark ground
    const groundGeometry = new THREE.PlaneGeometry(config.groundSize, config.groundSize);
    const groundMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x0f1f18, 
      roughness: 0.95, 
      metalness: 0.05,
      emissive: 0x080505,
      emissiveIntensity: 0.1 
    });

    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -3.2;
    ground.receiveShadow = true;
    scene.add(ground);
    
    // Create night skybox
    const skyGeometry = new THREE.BoxGeometry(config.skyboxSize, config.skyboxSize, config.skyboxSize);
    const skyMaterials = [];
    
    // Create a brighter night sky
    for (let i = 0; i < 6; i++) {
      let color;
      if (i === 4) { // Top side
        color = 0x4a3535;
      } else if (i === 5) { // Bottom side
        color = 0x3a2a2a;
      } else { // Other sides
        color = 0x4a3030;
      }
          
      skyMaterials.push(new THREE.MeshBasicMaterial({
        color: color,
        side: THREE.BackSide
      }));
    }

    const skybox = new THREE.Mesh(skyGeometry, skyMaterials);
    scene.add(skybox);
    
    // Create objects based on enabled flags
    let moon = null;
    if (config.moonEnabled) {
      moon = createMoon(scene);
    }
    
    let stars = null;
    if (config.starsEnabled) {
      stars = createStars(scene, config.skyboxSize * 0.9);
    }

    let clouds = null;
    if (config.cloudsEnabled) {
      clouds = addClouds(scene, {
        count: config.cloudsCount,
        minHeight: 25,
        maxHeight: 50,
        minSize: 3,
        maxSize: 10,
        spreadX: 200,          
        spreadZ: 150,         
        minDistance: 28  
      });
      sceneObjects.clouds = clouds;
    }
    
    // Create rocks
    const rocks = createRocks(scene, {
      count: 30,
      spread: 70,
      minDistance: 15
    });

    // Add mountains if enabled
    let mountains = null;
    if (config.mountainsEnabled) {
      mountains = createSimpleMountains(scene);
    }
    
    return {
      ground,
      skybox,
      mountains,
      moon,
      stars,
      rocks,
      clouds
    };
  } catch (error) {
    console.error('Error creating outside scenery:', error);
    return null;
  }
}

/**
 * Creates scattered rocks in the environment
 * @param {THREE.Scene} scene - The scene to add rocks to
 * @param {Object} options - Configuration options
 * @returns {Array<THREE.Mesh>} - Array of rock meshes
 */
export function createRocks(scene, options = {}) {
  const config = {
    count: options.count || 30,
    minSize: options.minSize || 0.5,
    maxSize: options.maxSize || 3.5,
    spread: options.spread || 70,
    minDistance: options.minDistance || 10, 
    buildingPadding: options.buildingPadding || 10, 
    pathWidth: options.pathWidth || 6.0, 
    roomWidth: SCENE_CONFIG.roomWidth,
    roomDepth: SCENE_CONFIG.roomDepth,
    wallOffset: SCENE_CONFIG.wallOffset
  };

  // Define building boundaries to avoid
  const buildingBounds = {
    minX: -config.roomWidth/2 - config.buildingPadding,
    maxX: config.roomWidth/2 + config.buildingPadding,
    minZ: config.wallOffset - config.buildingPadding,
    maxZ: doorZ + config.buildingPadding
  };
  
  // Define path boundaries
  const pathStart = new THREE.Vector3(0, -3.1, doorZ + 25);
  const pathEnd = new THREE.Vector3(0, -3.1, doorZ);
  const pathDirection = new THREE.Vector3().subVectors(pathEnd, pathStart).normalize();
  const pathLength = pathEnd.distanceTo(pathStart);

  // Function to check if position is on the path
  const isOnPath = (x, z) => {
    const point = new THREE.Vector3(x, -3.1, z);
    const v = new THREE.Vector3().subVectors(point, pathStart);
    const projection = v.dot(pathDirection);
    
    if (projection >= 0 && projection <= pathLength) {
      const projectedPoint = new THREE.Vector3().copy(pathStart).add(
        pathDirection.clone().multiplyScalar(projection)
      );
      
      const distance = point.distanceTo(projectedPoint);
      return distance < (config.pathWidth / 2);
    }
    
    return false;
  };

  // Function to check if position is inside building area
  const isInsideBuilding = (x, z) => {
    return x >= buildingBounds.minX && 
           x <= buildingBounds.maxX && 
           z >= buildingBounds.minZ && 
           z <= buildingBounds.maxZ;
  };
  
  // Function to check if position is invalid (inside building or on path)
  const isInvalidPosition = (x, z) => {
    return isInsideBuilding(x, z) || isOnPath(x, z);
  };

  // Create rock materials
  const rockMaterials = [
    new THREE.MeshStandardMaterial({ 
      color: 0x222222, // Dark grey
      roughness: 0.9, 
      metalness: 0.2 
    }),
    new THREE.MeshStandardMaterial({ 
      color: 0x332211,  // Dark brown
      roughness: 0.85, 
      metalness: 0.1 
    }),
    new THREE.MeshStandardMaterial({ 
      color: 0x1a1a1a,  // Almost black
      roughness: 0.9, 
      metalness: 0.05 
    })
  ];
  
  const rockGeometries = [
    new THREE.DodecahedronGeometry(1, 0),
    new THREE.DodecahedronGeometry(1, 1),
    new THREE.IcosahedronGeometry(1, 0),
    new THREE.OctahedronGeometry(1, 0)
  ];
  
  const rocks = [];
  
  // Helper to generate valid position
  const generateValidPosition = () => {
    let attempts = 0;
    let posX, posZ, distance;
    
    do {
      const angle = Math.random() * Math.PI * 2;
      distance = config.minDistance + Math.random() * (config.spread - config.minDistance);
      posX = Math.cos(angle) * distance;
      posZ = Math.sin(angle) * distance;
      
      attempts++;
      if (attempts > 50) {
        return null;
      }
    } while (isInvalidPosition(posX, posZ)); // Now uses combined check
    
    return { posX, posZ, distance };
  };
  
  // Place rocks in valid positions
  let rockCount = 0;
  let attempts = 0;
  
  while (rockCount < config.count && attempts < 200) {
    const position = generateValidPosition();
    attempts++;
    
    if (!position) continue;
    
    // Random size (smaller for distant rocks to create depth)
    const sizeScale = 1 - (position.distance / (config.spread * 1.5));
    const size = (config.minSize + Math.random() * (config.maxSize - config.minSize)) * Math.max(0.5, sizeScale);
    
    // Random geometry and material
    const geometry = rockGeometries[Math.floor(Math.random() * rockGeometries.length)];
    const material = rockMaterials[Math.floor(Math.random() * rockMaterials.length)];
    
    // Create rock
    const rock = new THREE.Mesh(geometry, material);
    
    // Position and scale
    rock.position.set(position.posX, -3 + size/2, position.posZ);
    rock.scale.set(size, size * (0.7 + Math.random() * 0.6), size);
    
    // Rotate randomly
    rock.rotation.x = Math.random() * Math.PI;
    rock.rotation.y = Math.random() * Math.PI;
    rock.rotation.z = Math.random() * Math.PI;
    
    // Enable shadows
    rock.castShadow = true;
    rock.receiveShadow = true;
    
    scene.add(rock);
    rocks.push(rock);
    rockCount++;
  }
  
  console.log(`Created ${rocks.length} rocks`);
  return rocks;
}

/**
 * Creates a glowing moon that acts as the main light source
 * @param {THREE.Scene} scene - The scene to add the moon to
 * @returns {Object} - The moon mesh and its light
 */
function createMoon(scene) {
  const moonGeometry = new THREE.SphereGeometry(32, 32, 32);
  const moonMaterial = new THREE.MeshStandardMaterial({
    color: 0xff6666,
    emissive: 0xff7777,
    emissiveIntensity: 3.0,
    roughness: 0.2
  });

  const moon = new THREE.Mesh(moonGeometry, moonMaterial);
  moon.position.set(40, 100, -100);
  scene.add(moon);

  // Add a light source from the moon
  const moonLight = new THREE.DirectionalLight(0xff4444, 5.0);
  moonLight.position.copy(moon.position);
  moonLight.target.position.set(0, 0, 0);
  scene.add(moonLight);
  scene.add(moonLight.target);

  // Setup for shadow casting
  moonLight.castShadow = true;
  moonLight.shadow.mapSize.width = 4096;
  moonLight.shadow.mapSize.height = 4096;
  moonLight.shadow.camera.near = 10;
  moonLight.shadow.camera.far = 350;
  moonLight.shadow.camera.left = -150;
  moonLight.shadow.camera.right = 150;
  moonLight.shadow.camera.top = 150;
  moonLight.shadow.camera.bottom = -150;
  moonLight.shadow.bias = -0.0003;
    
  // Add a soft red point light for the moon's glow 
  const moonGlow = new THREE.PointLight(0xff5555, 3.5, 350);
  moonGlow.position.copy(moon.position);
  scene.add(moonGlow);

  // Add a secondary ambient light to brighten the scene
  const redAmbient = new THREE.HemisphereLight(0xff3333, 0x665555, 1.0);
  scene.add(redAmbient);
  
  moon.moonLight = moonLight;
  moon.moonGlow = moonGlow;
  moon.redAmbient = redAmbient;

  return { moon, moonLight, moonGlow, redAmbient };
}

/**
 * Animates the moon movement across the sky
 * @param {Object} moon - The moon object from createMoon function
 * @param {number} time - Current timestamp for animation
 */
export function animateMoon(moonObject, time = Date.now()) {
  if (!moonObject || !moonObject.moon) return;
  
  const cycle = 500000; 
  const t = (time % cycle) / cycle;
  const oscillation = Math.sin(t * Math.PI * 2);
  
  const radius = 150;
  const x = oscillation * radius;
  const z = -100;
  const heightVariation = 30 * (1 - (oscillation * oscillation));
  const y = 100 + heightVariation;
  
  // Update positions
  moonObject.moon.position.set(x, y, z);
  
  if (moonObject.moonLight) {
    moonObject.moonLight.position.copy(moonObject.moon.position);
  }
  
  if (moonObject.moonGlow) {
    moonObject.moonGlow.position.copy(moonObject.moon.position);
  }
  
  if (moonObject.moonLight && moonObject.moonLight.target) {
    moonObject.moonLight.target.position.set(x * 0.3, 0, z * 0.3);
  }
}

/**
 * Creates stars in the night sky
 * @param {THREE.Scene} scene - The scene to add stars to
 * @param {number} radius - The radius of the star field
 * @returns {THREE.Points} - The stars object
 */
function createStars(scene, radius) {
  const starsGeometry = new THREE.BufferGeometry();
  const starsCount = 2000;
  const starsPositions = [];
  const starsSizes = [];
  
  for (let i = 0; i < starsCount; i++) {
    const theta = 2 * Math.PI * Math.random();
    const phi = Math.acos(2 * Math.random() - 1);
    const r = radius * (0.6 + Math.random() * 0.4);
    
    const x = r * Math.sin(phi) * Math.cos(theta);
    const y = r * Math.sin(phi) * Math.sin(theta);
    const z = r * Math.cos(phi);
    
    starsPositions.push(x, y, z);
    starsSizes.push(0.5 + Math.random() * 3.0);
  }
  
  starsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starsPositions, 3));
  starsGeometry.setAttribute('size', new THREE.Float32BufferAttribute(starsSizes, 1));
  
  const starsMaterial = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 2.5,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.9,
    fog: true,
    blending: THREE.AdditiveBlending,
    map: createStarTexture()
  });
  
  const stars = new THREE.Points(starsGeometry, starsMaterial);
  scene.add(stars);
  
  return stars;
}

/**
 * Creates a glowing star texture
 * @returns {THREE.Texture} - The created star texture
 */
function createStarTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 32;
  canvas.height = 32;
  
  const context = canvas.getContext('2d');
  const gradient = context.createRadialGradient(
    canvas.width / 2, canvas.height / 2, 0,
    canvas.width / 2, canvas.height / 2, canvas.width / 2
  );
  
  gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
  gradient.addColorStop(0.2, 'rgba(240, 240, 255, 1)');
  gradient.addColorStop(0.4, 'rgba(220, 220, 255, 0.6)');
  gradient.addColorStop(1, 'rgba(200, 200, 255, 0)');
  
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);
  
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  
  return texture;
}

/**
 * Adds dark clouds to the night sky with better separation
 * @param {THREE.Scene} scene - The scene to add clouds to
 * @param {Object} options - Configuration options
 * @returns {Array<THREE.Mesh>} - Array of cloud meshes
 */
export function addClouds(scene, options = {}) {
  const config = {
    count: options.count || 18,
    minHeight: options.minHeight || 20,
    maxHeight: options.maxHeight || 40,
    minSize: options.minSize || 3,
    maxSize: options.maxSize || 8,
    spreadX: options.spreadX || 100,
    spreadZ: options.spreadZ || 500,
    minDistance: options.minDistance || 25
  };
  
  const clouds = [];
  const cloudPositions = [];
  let attempts = 0;
  
  while (clouds.length < config.count && attempts < config.count * 3) {
    attempts++;
    
    const posX = (Math.random() - 0.5) * config.spreadX;
    const posY = config.minHeight + Math.random() * (config.maxHeight - config.minHeight);
    const posZ = (Math.random() - 0.5) * config.spreadZ;
    
    // Check distance from other clouds
    let tooClose = false;
    for (const pos of cloudPositions) {
      const dx = pos.x - posX;
      const dy = pos.y - posY;
      const dz = pos.z - posZ;
      const distSquared = dx*dx + dy*dy + dz*dz;
      
      if (distSquared < config.minDistance * config.minDistance) {
        tooClose = true;
        break;
      }
    }
    
    if (tooClose) continue;
    
    cloudPositions.push({ x: posX, y: posY, z: posZ });
    
    const cloudGroup = new THREE.Group();
    const cloudSize = config.minSize + Math.random() * (config.maxSize - config.minSize);
    const sphereCount = 3 + Math.floor(Math.random() * 5);
    
    const cloudMaterial = new THREE.MeshStandardMaterial({
      color: 0x222233,
      roughness: 0.7,
      metalness: 0,
      transparent: true,
      opacity: 0.9
    });
    
    for (let j = 0; j < sphereCount; j++) {
      const size = (0.6 + Math.random() * 0.4) * cloudSize;
      const geometry = new THREE.SphereGeometry(size, 8, 8);
      const sphere = new THREE.Mesh(geometry, cloudMaterial);
      
      const offsetX = (Math.random() - 0.5) * cloudSize * 1.2;
      const offsetY = (Math.random() - 0.5) * cloudSize * 0.4;
      const offsetZ = (Math.random() - 0.5) * cloudSize * 1.2;
      
      sphere.position.set(offsetX, offsetY, offsetZ);
      cloudGroup.add(sphere);
    }
    
    cloudGroup.userData = {
      speed: 0.002 + Math.random() * 0.015
    };
    
    cloudGroup.position.set(posX, posY, posZ);
    scene.add(cloudGroup);
    clouds.push(cloudGroup);
  }
  
  return clouds;
}

/**
 * Animates cloud movement
 * @param {Array<THREE.Group>} clouds 
 */
export function animateClouds(clouds) {
  if (!clouds) return;
  
  clouds.forEach(cloud => {
    if (cloud.userData && cloud.userData.speed) {
      cloud.position.x += cloud.userData.speed;
      if (cloud.position.x > 100) cloud.position.x = -100;
    }
  });
}