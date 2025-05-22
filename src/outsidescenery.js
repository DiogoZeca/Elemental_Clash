import * as THREE from 'three';
import { SCENE_CONFIG, doorZ } from './config.js';
import { sceneObjects } from './gameState.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const gltfLoader = new GLTFLoader();
const stoneModelsCache = [];

/**
 * Loads stone models from the big_stones directory
 * @returns {Promise<Array<THREE.Group>>} - Array of loaded stone models
 */
async function loadStoneModels() {
  if (stoneModelsCache.length > 0) {
    return Promise.resolve([...stoneModelsCache]);
  }
  
  const basePath = 'models/scenery/big_stones/';
  const modelPath = `${basePath}scene.gltf`;
  
  return new Promise((resolve, reject) => {
    gltfLoader.load(
      modelPath,
      (gltf) => {
        console.log('Stone models loaded successfully');
        
        // Find stone meshes in the scene
        const stones = [];
        gltf.scene.traverse((node) => {
          // Look for mesh objects that appear to be stones
          if (node.isMesh && node.name.toLowerCase().includes('stone')) {
            const stoneCopy = node.clone();
            stones.push(stoneCopy);
          }
        });
        
        // If no specific stone meshes found, use the entire scene
        if (stones.length === 0) {
          const mainStone = gltf.scene.clone();
          stones.push(mainStone);
        }
        
        // Cache the models
        stoneModelsCache.push(...stones);
        
        resolve(stones);
      },
      undefined,
      (error) => {
        console.error('Error loading stone models:', error);
        reject(error);
      }
    );
  });
}





/**
 * Creates a path to the room entrance with improved visibility
 * @param {THREE.Scene} scene - The scene to add the path to
 * @param {Object} options - Configuration options
 * @returns {Promise<THREE.Object3D>} - The created path object
 */
export async function createPathToEntrance(scene, options = {}) {
  const config = {
    startPosition: options.startPosition || new THREE.Vector3(0, -3.1, doorZ + 25),
    endPosition: options.endPosition || new THREE.Vector3(0, -3.1, doorZ),
    width: options.width || 4.5,
    heightOffset: options.heightOffset || 0.15,
    pathColor: options.pathColor || 0x884444,
    pathPattern: options.pathPattern || true,
    edgeSpacing: options.edgeSpacing || 1.8 
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
    roughness: 0.5, 
    metalness: 0.3, 
    emissive: 0x552222,  
    emissiveIntensity: 0.5
  });
  
  // Create path mesh and add it to scene 
  const path = new THREE.Mesh(pathGeometry, pathMaterial);
  path.position.copy(config.startPosition).add(pathDirection.clone().multiplyScalar(pathLength / 2));
  path.position.y += config.heightOffset;
  path.rotation.x = -Math.PI / 2;
  const angle = Math.atan2(pathDirection.z, pathDirection.x);
  path.rotation.y = Math.PI / 2 - angle;
  path.receiveShadow = true;
  pathGroup.add(path);
  
  // Add lights along the path 
  const lightCount = Math.ceil(pathLength / 2.5);
  for (let i = 0; i <= lightCount; i++) {
      const light = new THREE.PointLight(0xff9977, 0.8, 5.5);
      const t = i / lightCount;
      const pos = new THREE.Vector3().lerpVectors(config.startPosition, config.endPosition, t);
      pos.y += 0.4;
      light.position.copy(pos);
      scene.add(light);
      
      const sphereGeometry = new THREE.SphereGeometry(0.22, 10, 10);
      const sphereMaterial = new THREE.MeshBasicMaterial({
        color: 0xff8855, 
        transparent: true, 
        opacity: 0.9
      });
      const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
      sphere.position.copy(light.position);
      pathGroup.add(sphere);
  }
  
  // Load stone models for path edges
  let stoneModels;
  try {
    stoneModels = await loadStoneModels();
    if (stoneModels.length === 0) {
      throw new Error('No stone models loaded');
    }
  } catch (error) {
    console.error('Failed to load stone models for path edges, using fallback geometry:', error);
    addFallbackPathEdges(pathGroup, config, pathDirection);
    scene.add(pathGroup);
    return pathGroup;
  }
  
  // Add path edge details using 3D stone models 
  const stoneCount = Math.ceil(pathLength / config.edgeSpacing); 
  
  for (let side = -1; side <= 1; side += 2) {
    for (let i = 0; i < stoneCount; i++) {
      // Calculate position along path
      const t = (i / stoneCount) + (Math.random() * 0.05);
      const pathPos = new THREE.Vector3().lerpVectors(config.startPosition, config.endPosition, t);
      
      // Offset to the side of the path
      const perpendicular = new THREE.Vector3(-pathDirection.z, 0, pathDirection.x);
      const offset = (config.width/2 + 0.4) * side;
      const offsetPos = perpendicular.clone().multiplyScalar(offset);
      const randomOffsetX = (Math.random() - 0.5) * 0.5;
      const randomOffsetZ = (Math.random() - 0.5) * 0.5;
      offsetPos.x += randomOffsetX;
      offsetPos.z += randomOffsetZ;
      
      // Select a random stone model
      const stoneIndex = Math.floor(Math.random() * stoneModels.length);
      const stoneModel = stoneModels[stoneIndex].clone();
      
      // Make the path edge stones smaller
      const size = 0.15 + Math.random() * 0.15; 
      stoneModel.scale.set(size, size * (0.6 + Math.random() * 0.4), size);
      
      // Position the stone model
      stoneModel.position.copy(pathPos).add(offsetPos);
      stoneModel.position.y = -3 + size * 0.3;
      
      // Rotate randomly with limited X and Z rotation to keep them upright
      stoneModel.rotation.x = (Math.random() - 0.5) * Math.PI * 0.2;
      stoneModel.rotation.y = Math.random() * Math.PI * 2;
      stoneModel.rotation.z = (Math.random() - 0.5) * Math.PI * 0.2;
      
      // Enable shadows
      stoneModel.traverse((node) => {
        if (node.isMesh) {
          node.castShadow = true;
          node.receiveShadow = true;
          
          if (node.material) {
            const material = node.material.clone();
            material.color.setHex(0x666666);
            node.material = material;
          }
        }
      });
      
      pathGroup.add(stoneModel);
    }
  }

  if (config.pathPattern) {
    const vertices = pathGeometry.attributes.position.array;
    for (let i = 0; i < vertices.length; i += 3) {
      if (i % 9 !== 0) {
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
 * Fallback method to add simple path edge rocks when models can't be loaded
 * @param {THREE.Group} pathGroup - Group to add stones to
 * @param {Object} config - Path configuration
 * @param {THREE.Vector3} pathDirection - Normalized path direction vector
 */
function addFallbackPathEdges(pathGroup, config, pathDirection) {
  const pathLength = config.endPosition.distanceTo(config.startPosition);
  const stoneCount = Math.ceil(pathLength / 1.8);
  const stoneGeometry = new THREE.DodecahedronGeometry(0.30, 0);
  
  for (let side = -1; side <= 1; side += 2) {
    for (let i = 0; i < stoneCount; i++) {
      const stoneMaterial = new THREE.MeshStandardMaterial({
        color: 0x555555, 
        roughness: 0.7,
        metalness: 0.2,
        emissive: 0x222222,
        emissiveIntensity: 0.3
      });
      
      const stone = new THREE.Mesh(stoneGeometry, stoneMaterial);
      
      const t = (i / stoneCount) + (Math.random() * 0.02);
      const pathPos = new THREE.Vector3().lerpVectors(config.startPosition, config.endPosition, t);
      
      const perpendicular = new THREE.Vector3(-pathDirection.z, 0, pathDirection.x);
      const offset = (config.width/2 + 0.4) * side;
      const offsetPos = perpendicular.clone().multiplyScalar(offset);
      
      stone.position.copy(pathPos).add(offsetPos);
      stone.position.y = -3 + Math.random() * 0.2;
      
      stone.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      );
      
      stone.receiveShadow = true;
      stone.castShadow = true;
      
      pathGroup.add(stone);
    }
  }
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
      groundTextureRepeat: options.groundTextureRepeat || 20
    };
    // Create dark ground
    const groundGeometry = new THREE.PlaneGeometry(config.groundSize, config.groundSize, 1, 1);
    groundGeometry.setAttribute('uv2', groundGeometry.attributes.uv.clone());

    // Load ground textures
    const groundMaterial = await createGroundMaterial(config.groundTextureRepeat)
    .catch(err => {
      console.warn('Failed to load ground textures, using fallback', err);
      return new THREE.MeshStandardMaterial({ 
        color: 0x0f1f18, 
        roughness: 0.95, 
        metalness: 0.05,
        emissive: 0x080505,
        emissiveIntensity: 0.1 
      });
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
      if (i === 4) { 
        color = 0x4a3a3a;
      } else if (i === 5) { 
        color = 0x4a3a3a;
      } else { 
        color = 0x4a3a3a;
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
      moon = await createMoon(scene);
    }
    
    let stars = null;
    if (config.starsEnabled) {
      stars = createStars(scene, config.skyboxSize * 0.9);
    }

    let clouds = null;
    if (config.cloudsEnabled) {
      clouds = await addClouds(scene, {
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
    const rocks = await createRocks(scene, {
      count: 40,
      spread: 95,
      minDistance: 15
    }).catch(err => {
      console.error('Failed to create rocks:', err);
      return [];
    });
    
    return {
      ground,
      skybox,
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
 * Loads the ground textures (Ground068_2K)
 * @param {number} repeat - How many times to repeat the texture
 * @returns {Promise<Object>} The loaded textures
 */
function loadGroundTextures(repeat = 20) {
  const basePath = 'models/textures/Ground068_2K-PNG/';
  
  return Promise.all([
    loadTexture(`${basePath}Ground068_2K-PNG_Color.png`, { repeat: [repeat, repeat] }),
    loadTexture(`${basePath}Ground068_2K-PNG_NormalGL.png`, { repeat: [repeat, repeat] }),
    loadTexture(`${basePath}Ground068_2K-PNG_Roughness.png`, { repeat: [repeat, repeat] }),
    loadTexture(`${basePath}Ground068_2K-PNG_AmbientOcclusion.png`, { repeat: [repeat, repeat] }),
    loadTexture(`${basePath}Ground068_2K-PNG_Displacement.png`, { repeat: [repeat, repeat] }),
  ]).then(([color, normal, roughness, ao, displacement]) => {
    return {
      color,
      normal,
      roughness,
      ao,
      displacement
    };
  });
}

/**
 * Helper function to load textures
 * @param {string} path - Path to the texture file
 * @param {Object} options - Optional settings for the texture
 * @returns {Promise<THREE.Texture>} - The loaded texture 
 */
function loadTexture(path, options = {}) {
  const { repeat = [1, 1] } = options;
  
  const textureLoader = new THREE.TextureLoader();
  return new Promise((resolve, reject) => {
    textureLoader.load(
      path,
      (texture) => {
        // Configure texture for proper tiling
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(repeat[0], repeat[1]);
        
        resolve(texture);
      },
      undefined,
      (error) => reject(new Error(`Failed to load texture: ${path}, ${error}`))
    );
  });
}

/**
 * Creates a PBR material using ground textures
 * @param {number} repeat - Texture repeat value
 * @returns {Promise<THREE.MeshStandardMaterial>} The created material
 */
function createGroundMaterial(repeat = 20) {
  return loadGroundTextures(repeat).then(textures => {
    const material = new THREE.MeshStandardMaterial({
      map: textures.color,
      normalMap: textures.normal,
      roughnessMap: textures.roughness,
      aoMap: textures.ao,
      displacementMap: textures.displacement,
      displacementScale: 0.2, // Subtle displacement for ground detail
      roughness: 0.9,
      metalness: 0.1,
      // Tint the ground slightly to match the red moon atmosphere
      color: 0xaa9999
    });
    
    return material;
  });
}






/**
 * Creates scattered rocks in the environment using 3D models
 * @param {THREE.Scene} scene - The scene to add rocks to
 * @param {Object} options - Configuration options
 * @returns {Promise<Array<THREE.Object3D>>} - Array of rock objects
 */
export async function createRocks(scene, options = {}) {
  const config = {
    count: options.count || 30,
    minSize: options.minSize || 0.3,
    maxSize: options.maxSize || 2.0,
    spread: options.spread || 70,
    minDistance: options.minDistance || 15, 
    buildingPadding: options.buildingPadding || 10, 
    pathWidth: options.pathWidth || 6.0, 
    roomWidth: SCENE_CONFIG.roomWidth,
    roomDepth: SCENE_CONFIG.roomDepth,
    wallOffset: SCENE_CONFIG.wallOffset,
    playerSafeRadius: options.playerSafeRadius || 6.0
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
  
  // Check if position is invalid 
  const isTooCloseToSpawn = (x, z) => {
    const spawnPoint = new THREE.Vector3(0, 0, doorZ + 20);
    const point = new THREE.Vector3(x, 0, z);
    
    return point.distanceTo(spawnPoint) < config.playerSafeRadius;
  };

  const isInvalidPosition = (x, z) => {
    return isInsideBuilding(x, z) || isOnPath(x, z) || isTooCloseToSpawn(x, z);
  };

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
    } while (isInvalidPosition(posX, posZ));
    
    return { posX, posZ, distance };
  };
  
  // Load stone models
  let stoneModels;
  try {
    stoneModels = await loadStoneModels();
    if (stoneModels.length === 0) {
      throw new Error('No stone models loaded');
    }
  } catch (error) {
    console.error('Failed to load stone models, falling back to geometric rocks:', error);
    return createFallbackRocks(scene, options);
  }
  
  // Place rocks in valid positions
  const rocks = [];
  let rockCount = 0;
  let attempts = 0;
  
  while (rockCount < config.count && attempts < 200) {
    const position = generateValidPosition();
    attempts++;
    
    if (!position) continue;
    
    // Random size (smaller for distant rocks to create depth)
    const sizeScale = 1 - (position.distance / (config.spread * 1.5));
    const size = (config.minSize + Math.random() * (config.maxSize - config.minSize)) * Math.max(0.5, sizeScale);
    
    // Select a random stone model
    const stoneIndex = Math.floor(Math.random() * stoneModels.length);
    const stoneModel = stoneModels[stoneIndex].clone();
    
    // Position and scale
    stoneModel.position.set(position.posX, -3 + size*0.25, position.posZ);
    stoneModel.scale.set(size, size * (0.6 + Math.random() * 0.4), size);
    
    // Rotate randomly
    stoneModel.rotation.x = (Math.random() - 0.5) * Math.PI * 0.3; 
    stoneModel.rotation.y = Math.random() * Math.PI * 2;  
    stoneModel.rotation.z = (Math.random() - 0.5) * Math.PI * 0.3;
    
    // Enable shadows
    stoneModel.traverse((node) => {
      if (node.isMesh) {
        node.castShadow = true;
        node.receiveShadow = true;
        
        if (node.material) {
          const material = node.material.clone();
          const hue = (Math.random() * 0.1) - 0.05; 
          material.color.offsetHSL(hue, 0, 0);
          node.material = material;
        }
      }
    });
    
    scene.add(stoneModel);
    rocks.push(stoneModel);
    rockCount++;
  }
  
  console.log(`Created ${rocks.length} stone models`);
  return rocks;
}

/**
 * Creates fallback rocks using simple geometries when 3D models can't be loaded
 * @param {THREE.Scene} scene - The scene to add rocks to
 * @param {Object} options - Configuration options
 * @returns {Array<THREE.Mesh>} - Array of rock meshes
 */
function createFallbackRocks(scene, options = {}) {
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

  // Define building boundaries to avoid (same as in createRocks)
  const buildingBounds = {
    minX: -config.roomWidth/2 - config.buildingPadding,
    maxX: config.roomWidth/2 + config.buildingPadding,
    minZ: config.wallOffset - config.buildingPadding,
    maxZ: doorZ + config.buildingPadding
  };
  
  // Define path boundaries (same as in createRocks)
  const pathStart = new THREE.Vector3(0, -3.1, doorZ + 25);
  const pathEnd = new THREE.Vector3(0, -3.1, doorZ);
  const pathDirection = new THREE.Vector3().subVectors(pathEnd, pathStart).normalize();
  const pathLength = pathEnd.distanceTo(pathStart);

  // Function to check if position is on the path (same as in createRocks)
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

  // Function to check if position is inside building area (same as in createRocks)
  const isInsideBuilding = (x, z) => {
    return x >= buildingBounds.minX && 
           x <= buildingBounds.maxX && 
           z >= buildingBounds.minZ && 
           z <= buildingBounds.maxZ;
  };
  
  // Function to check if position is invalid (same as in createRocks)
  const isInvalidPosition = (x, z) => {
    return isInsideBuilding(x, z) || isOnPath(x, z);
  };

  // Helper to generate valid position (same as in createRocks)
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
    } while (isInvalidPosition(posX, posZ));
    
    return { posX, posZ, distance };
  };

  // Create rock materials for fallback rocks
  const rockMaterials = [
    new THREE.MeshStandardMaterial({ 
      color: 0x222222, // Dark grey
      roughness: 0.9, 
      metalness: 0.2,
      emissive: 0x111111,
      emissiveIntensity: 0.1
    }),
    new THREE.MeshStandardMaterial({ 
      color: 0x332211, // Dark brown
      roughness: 0.85, 
      metalness: 0.1,
      emissive: 0x110a05,
      emissiveIntensity: 0.1
    }),
    new THREE.MeshStandardMaterial({ 
      color: 0x1a1a1a, // Almost black
      roughness: 0.9, 
      metalness: 0.05,
      emissive: 0x0a0a0a,
      emissiveIntensity: 0.1
    })
  ];
  
  // Create various rock geometries
  const rockGeometries = [
    new THREE.DodecahedronGeometry(1, 0),
    new THREE.DodecahedronGeometry(1, 1),
    new THREE.IcosahedronGeometry(1, 0),
    new THREE.OctahedronGeometry(1, 0),
    new THREE.TetrahedronGeometry(1, 0)
  ];
  
  // Place rocks in valid positions
  const rocks = [];
  let rockCount = 0;
  let attempts = 0;
  
  while (rockCount < config.count && attempts < 200) {
    const position = generateValidPosition();
    attempts++;
    
    if (!position) continue;
    
    // Random size (smaller for distant rocks to create depth)
    const sizeScale = 1 - (position.distance / (config.spread * 1.5));
    const size = (config.minSize + Math.random() * (config.maxSize - config.minSize)) * Math.max(0.5, sizeScale);
    
    // Select random geometry and material
    const geoIndex = Math.floor(Math.random() * rockGeometries.length);
    const matIndex = Math.floor(Math.random() * rockMaterials.length);
    const geometry = rockGeometries[geoIndex];
    const material = rockMaterials[matIndex];
    
    // Create rock mesh
    const rock = new THREE.Mesh(geometry, material);
    
    // Position and scale
    rock.position.set(position.posX, -3 + size/2, position.posZ);
    rock.scale.set(
      size * (0.8 + Math.random() * 0.4), 
      size * (0.7 + Math.random() * 0.6), 
      size * (0.8 + Math.random() * 0.4)
    );
    
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
  
  console.log(`Created ${rocks.length} fallback rocks`);
  return rocks;
}










/**
 * Creates a 2D billboard moon that always faces the camera
 * @param {THREE.Scene} scene - The scene to add the moon to
 * @returns {Object} - The moon mesh and its light
 */
function createMoon(scene) {
  return loadTexture('models/textures/moon.png').then(moonTexture => {
    console.log('Moon texture loaded successfully');
    
    // Set texture properties for better quality
    moonTexture.anisotropy = 16;
    
    // For a 2D moon, we use PlaneGeometry instead of SphereGeometry
    const moonGeometry = new THREE.PlaneGeometry(60, 60);
    
    const moonMaterial = new THREE.MeshBasicMaterial({
      map: moonTexture,
      transparent: true,
      side: THREE.DoubleSide
    });

    const moon = new THREE.Mesh(moonGeometry, moonMaterial);
    moon.position.set(40, 100, -100);
    
    // No need for updateRotation function - billboard always faces camera
    
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
    
    // Add moon glow 
    const moonGlow = new THREE.PointLight(0xff5555, 5.0, 500);
    moonGlow.position.copy(moon.position);
    scene.add(moonGlow);
    
    moon.moonLight = moonLight;
    moon.moonGlow = moonGlow;

    return { moon, moonLight, moonGlow };
  }).catch(error => {
    // Fallback implementation remains the same
    console.error('Failed to load moon texture:', error);
    
    const moonGeometry = new THREE.PlaneGeometry(60, 60);
    const moonMaterial = new THREE.MeshBasicMaterial({
      color: 0xff6666,
      side: THREE.DoubleSide
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
    
    const moonGlow = new THREE.PointLight(0xff5555, 3.5, 350);
    moonGlow.position.copy(moon.position);
    scene.add(moonGlow);
    
    const redAmbient = new THREE.HemisphereLight(0xff3333, 0x665555, 1.0);
    scene.add(redAmbient);
    
    moon.moonLight = moonLight;
    moon.moonGlow = moonGlow;
    moon.redAmbient = redAmbient;
    
    return { moon, moonLight, moonGlow, redAmbient };
  });
}


/**
 * Makes the moon always face the camera (billboard effect)
 * @param {THREE.Mesh} moonMesh - The moon mesh
 * @param {THREE.Camera} camera - The camera
 */
export function updateMoonBillboard(moonMesh, camera) {
  if (!moonMesh) return;
  moonMesh.quaternion.copy(camera.quaternion);
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
 * Adds clouds to the night sky that are clearly visible
 * @param {THREE.Scene} scene - The scene to add clouds to
 * @param {Object} options - Configuration options
 * @returns {Array<THREE.Group>} - Array of cloud groups
 */
export async function addClouds(scene, options = {}) {
  const config = {
    count: options.count || 18,
    minHeight: options.minHeight || 18, // Lower height to be more visible
    maxHeight: options.maxHeight || 35,
    minSize: options.minSize || 4,     // Larger minimum size
    maxSize: options.maxSize || 12,    // Larger maximum size
    spreadX: options.spreadX || 80,    // Less horizontal spread to be more centralized
    spreadZ: options.spreadZ || 200,   // Less depth spread to be more visible 
    minDistance: options.minDistance || 20
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
    const sphereCount = 6 + Math.floor(Math.random() * 6); // More spheres for higher density
    
    // Create a pure white cloud material with glow
    const cloudMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,           // Pure white
      roughness: 0.6,            // Less rough for more reflective appearance
      metalness: 0.1,            // Slight metalness to catch light better
      transparent: true,
      opacity: 0.92,             // High opacity but still slightly transparent
      emissive: 0xffffff,        // White emissive for full glow
      emissiveIntensity: 0.35    // Strong enough to be visible in night
    });
    
    // No longer using a darker material - all clouds are pure white
    
    console.log(`Creating cloud at position: ${posX}, ${posY}, ${posZ} with size ${cloudSize}`);
    
    for (let j = 0; j < sphereCount; j++) {
      const size = (0.6 + Math.random() * 0.4) * cloudSize;
      const geometry = new THREE.SphereGeometry(size, 8, 8);
      
      // All spheres use the same white material
      const sphere = new THREE.Mesh(geometry, cloudMaterial);
      
      // Tighter clustering of spheres
      const offsetX = (Math.random() - 0.5) * cloudSize * 1.2;
      const offsetY = (Math.random() - 0.5) * cloudSize * 0.4;
      const offsetZ = (Math.random() - 0.5) * cloudSize * 1.2;
      
      sphere.position.set(offsetX, offsetY, offsetZ);
      cloudGroup.add(sphere);
    }
    
    cloudGroup.userData = {
      speed: 0.005 + Math.random() * 0.01, // Faster movement to be more noticeable
      bobAmount: Math.random() * 0.002,
      bobPhase: Math.random() * Math.PI * 2
    };
    
    cloudGroup.position.set(posX, posY, posZ);
    scene.add(cloudGroup);
    clouds.push(cloudGroup);
  }
  
  console.log(`Created ${clouds.length} clouds`);
  return clouds;
}

/**
 * Animates cloud movement with gentle bobbing for more natural feel
 * @param {Array<THREE.Group>} clouds 
 */
export function animateClouds(clouds) {
  if (!clouds) return;
  
  const time = Date.now() * 0.001; // Current time in seconds for wave motion
  
  clouds.forEach(cloud => {
    if (cloud.userData) {
      // Horizontal movement
      if (cloud.userData.speed) {
        cloud.position.x += cloud.userData.speed;
        if (cloud.position.x > 100) cloud.position.x = -100;
      }
      
      // Add subtle up-and-down bobbing motion
      if (cloud.userData.bobAmount) {
        cloud.position.y += Math.sin(time + cloud.userData.bobPhase) * cloud.userData.bobAmount;
      }
    }
  });
}