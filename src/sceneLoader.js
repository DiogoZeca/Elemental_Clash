import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// Cache for loaded models and textures
const modelCache = new Map();
const textureCache = new Map();

/**
 * Loads a GLTF model and returns it via Promise
 * @param {string} path - Path to the GLTF file
 * @param {Function} onProgress - Optional callback for loading progress
 * @returns {Promise<THREE.Group>} The loaded model
 */
export function loadGLTFModel(path, onProgress) {
  // Return cached model if available
  if (modelCache.has(path)) {
    return Promise.resolve(modelCache.get(path).clone());
  }
  
  const loader = new GLTFLoader();
  
  return new Promise((resolve, reject) => {
    loader.load(
      path, 
      (gltf) => {
        // Store in cache for future use
        modelCache.set(path, gltf.scene.clone());
        resolve(gltf.scene);
      },
      onProgress,
      (error) => reject(new Error(`Failed to load model: ${path}, ${error}`))
    );
  });
}

/**
 * Loads the metal plate model specifically
 * @returns {Promise<THREE.Group>} The metal plate model
 */
export function loadMetalPlateModel() {
  return loadGLTFModel('models/textures/metal_plate_02_4k.gltf/metal_plate_02_4k.gltf');
}

/**
 * Loads the metal plate textures for use as wall material
 * @returns {Promise<Object>} The loaded textures
 */
export function loadMetalPlateTextures() {
  const textureLoader = new THREE.TextureLoader();
  const basePath = 'models/textures/metal_plate_02_4k.gltf/textures/';
  
  const loadTexture = (path) => {
    if (textureCache.has(path)) {
      return Promise.resolve(textureCache.get(path).clone());
    }
    
    return new Promise((resolve, reject) => {
      textureLoader.load(
        path,
        (texture) => {
          // Configure texture for proper tiling
          texture.wrapS = THREE.RepeatWrapping;
          texture.wrapT = THREE.RepeatWrapping;
          texture.repeat.set(2, 2); // Adjust repeating as needed
          
          textureCache.set(path, texture);
          resolve(texture);
        },
        undefined,
        (error) => reject(new Error(`Failed to load texture: ${path}, ${error}`))
      );
    });
  };
  
  return Promise.all([
    loadTexture(`${basePath}metal_plate_02_diff_4k.jpg`),  // Diffuse (color)
    loadTexture(`${basePath}metal_plate_02_nor_gl_4k.jpg`), // Normal map
    loadTexture(`${basePath}metal_plate_02_arm_4k.jpg`),   // AO/Roughness/Metallic
  ]).then(([diffuse, normal, arm]) => {
    return {
      diffuse,
      normal,
      arm
    };
  });
}

/**
 * Loads the new metal textures (Metal023)
 * @returns {Promise<Object>} The loaded textures
 */
export function loadMetalTextures() {
  const textureLoader = new THREE.TextureLoader();
  const basePath = 'models/textures/Metal023_4K-PNG/';
  
  const loadTexture = (path) => {
    if (textureCache.has(path)) {
      return Promise.resolve(textureCache.get(path));
    }
    
    return new Promise((resolve, reject) => {
      textureLoader.load(
        path,
        (texture) => {
          // Configure texture for proper tiling
          texture.wrapS = THREE.RepeatWrapping;
          texture.wrapT = THREE.RepeatWrapping;
          texture.repeat.set(3, 3); // Adjust repeating as needed
          
          textureCache.set(path, texture);
          resolve(texture);
        },
        undefined,
        (error) => reject(new Error(`Failed to load texture: ${path}, ${error}`))
      );
    });
  };
  
  return Promise.all([
    loadTexture(`${basePath}Metal023_4K-PNG_Color.png`),
    loadTexture(`${basePath}Metal023_4K-PNG_NormalGL.png`),
    loadTexture(`${basePath}Metal023_4K-PNG_Roughness.png`),
    loadTexture(`${basePath}Metal023_4K-PNG_Metalness.png`),
    loadTexture(`${basePath}Metal023_4K-PNG_Displacement.png`),
  ]).then(([color, normal, roughness, metalness, displacement]) => {
    return {
      color,
      normal,
      roughness,
      metalness,
      displacement
    };
  });
}

/**
 * Loads the concrete textures (Concrete033)
 * @returns {Promise<Object>} The loaded textures
 */
export function loadConcreteTextures() {
  const textureLoader = new THREE.TextureLoader();
  const basePath = 'models/textures/Concrete033_4K-PNG/';
  
  const loadTexture = (path) => {
    if (textureCache.has(path)) {
      return Promise.resolve(textureCache.get(path));
    }
    
    return new Promise((resolve, reject) => {
      textureLoader.load(
        path,
        (texture) => {
          // Configure texture for proper tiling
          texture.wrapS = THREE.RepeatWrapping;
          texture.wrapT = THREE.RepeatWrapping;
          texture.repeat.set(2, 2); // Adjust repeating as needed
          
          textureCache.set(path, texture);
          resolve(texture);
        },
        undefined,
        (error) => reject(new Error(`Failed to load texture: ${path}, ${error}`))
      );
    });
  };
  
  return Promise.all([
    loadTexture(`${basePath}Concrete033_4K-PNG_Color.png`),
    loadTexture(`${basePath}Concrete033_4K-PNG_NormalGL.png`),
    loadTexture(`${basePath}Concrete033_4K-PNG_Roughness.png`),
    loadTexture(`${basePath}Concrete033_4K-PNG_AmbientOcclusion.png`),
    loadTexture(`${basePath}Concrete033_4K-PNG_Displacement.png`),
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
 * Creates a PBR material using concrete textures
 * @returns {Promise<THREE.MeshStandardMaterial>} The created material
 */
export function createConcreteMaterial() {
  return loadConcreteTextures().then(textures => {
    const material = new THREE.MeshStandardMaterial({
      map: textures.color,
      normalMap: textures.normal,
      roughnessMap: textures.roughness,
      aoMap: textures.ao,
      displacementMap: textures.displacement,
      displacementScale: 0.1, // Adjust based on your scene scale
      roughness: 1.0,
      metalness: 0.0
    });
    
    return material;
  });
}

/**
 * Creates a PBR material using metal plate textures
 * @returns {Promise<THREE.MeshStandardMaterial>} The created material
 */
export function createMetalPlateMaterial() {
  return loadMetalPlateTextures().then(textures => {
    return new THREE.MeshStandardMaterial({
      map: textures.diffuse,
      normalMap: textures.normal,
      metalnessMap: textures.arm,
      roughnessMap: textures.arm,
      metalness: 0.8,
      roughness: 0.6
    });
  });
}

/**
 * Creates a PBR material using new metal textures
 * @returns {Promise<THREE.MeshStandardMaterial>} The created material
 */
export function createMetalMaterial() {
  return loadMetalTextures().then(textures => {
    const material = new THREE.MeshStandardMaterial({
      map: textures.color,
      normalMap: textures.normal,
      roughnessMap: textures.roughness,
      metalnessMap: textures.metalness,
      displacementMap: textures.displacement,
      displacementScale: 0.05, // Adjust based on your scene scale
      metalness: 0.9,
      roughness: 0.4
    });
    
    return material;
  });
}

/**
 * Creates a floor with metal texture that aligns with the walls
 * @param {THREE.Scene} scene - The scene to add the floor to
 * @param {Object} options - Configuration options
 * @returns {Promise<THREE.Mesh>} - The created floor
 */
export async function createMetalFloor(scene, options = {}) {
  try {
    console.log('Creating metal textured floor...');
    
    // Default options
    const config = {
      width: options.width || 20,
      depth: options.depth || 15,
      floorLevel: options.floorLevel || -3,
      wallOffset: options.wallOffset || -10, // Z position of back wall (for alignment)
      useNewMetal: options.useNewMetal !== false, // Use new metal by default
    };
    
    // Get appropriate material
    let floorMaterial;
    try {
      if (config.useNewMetal) {
        floorMaterial = await createMetalMaterial();
      } else {
        floorMaterial = await createMetalPlateMaterial();
      }
    } catch (error) {
      console.error('Failed to load metal floor material:', error);
      floorMaterial = new THREE.MeshStandardMaterial({ color: 0x777777 });
    }
    
    // Create floor mesh
    const floorGeometry = new THREE.PlaneGeometry(config.width, config.depth);
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2; // Rotate to be horizontal
    
    // Position floor to align with back wall
    floor.position.set(
      0,                // Centered on X
      config.floorLevel, // At floor level
      config.wallOffset + (config.depth / 2) // Align with back wall
    );
    
    floor.receiveShadow = true;
    
    scene.add(floor);
    console.log('Metal floor created successfully');
    return floor;
    
  } catch (error) {
    console.error('Error creating metal floor:', error);
    return null;
  }
}

/**
 * Creates a ceiling with metal texture that aligns with the walls
 * @param {THREE.Scene} scene - The scene to add the ceiling to
 * @param {Object} options - Configuration options
 * @returns {Promise<THREE.Mesh>} - The created ceiling
 */
export async function createMetalCeiling(scene, options = {}) {
  try {
    console.log('Creating metal textured ceiling...');
    
    // Default options
    const config = {
      width: options.width || 20,
      depth: options.depth || 15,
      ceilingHeight: options.ceilingHeight || 12, // Height of ceiling
      floorLevel: options.floorLevel || -3,       // Reference for height calculation
      wallOffset: options.wallOffset || -10,      // Z position of back wall (for alignment)
      useNewMetal: options.useNewMetal !== false, // Use new metal by default
    };
    
    // Get appropriate material
    let ceilingMaterial;
    try {
      if (config.useNewMetal) {
        ceilingMaterial = await createMetalMaterial();
      } else {
        ceilingMaterial = await createMetalPlateMaterial();
      }
    } catch (error) {
      console.error('Failed to load metal ceiling material:', error);
      ceilingMaterial = new THREE.MeshStandardMaterial({ color: 0x777777 });
    }
    
    // Create ceiling mesh
    const ceilingGeometry = new THREE.PlaneGeometry(config.width, config.depth);
    const ceiling = new THREE.Mesh(ceilingGeometry, ceilingMaterial);
    ceiling.rotation.x = Math.PI / 2; // Rotate to be horizontal, facing down
    
    // Position ceiling to align with back wall and side walls
    ceiling.position.set(
      0,                                        // Centered on X
      config.floorLevel + config.ceilingHeight, // At ceiling height
      config.wallOffset + (config.depth / 2)    // Align with back wall
    );
    
    ceiling.receiveShadow = true;
    
    scene.add(ceiling);
    console.log('Metal ceiling created successfully');
    return ceiling;
    
  } catch (error) {
    console.error('Error creating metal ceiling:', error);
    return null;
  }
}

/**
 * Creates a 3-wall environment with concrete or metal texture
 * @param {THREE.Scene} scene - The scene to add walls to
 * @param {Object} options - Wall configuration options
 * @returns {Promise<Object>} - References to created walls
 */
export async function createWallEnvironment(scene, options = {}) {
  try {
    console.log('Creating 3-wall environment...');
    
    // Default options
    const config = {
      wallHeight: options.wallHeight || 15,
      backWallWidth: options.backWallWidth || 20,
      sideWallLength: options.sideWallLength || 15,
      wallDepth: options.wallDepth || 0.2,
      wallOffset: options.wallOffset || -10, // Z position of back wall
      floorLevel: options.floorLevel || -3,   // Y position offset for the base of walls
      useNewMetal: options.useNewMetal || false,  // Don't use metal by default
      useConcrete: options.useConcrete || false,  // Don't use concrete by default
    };
    
    // Get appropriate material
    let wallMaterial;
    try {
      if (config.useConcrete) {
        wallMaterial = await createConcreteMaterial();
        console.log('Using concrete material for walls');
      } else if (config.useNewMetal) {
        wallMaterial = await createMetalMaterial();
        console.log('Using metal material for walls');
      } else {
        // Fallback to basic material
        wallMaterial = new THREE.MeshStandardMaterial({ 
          color: 0x554433,
          roughness: 0.75,
          metalness: 0.2
        });
        console.log('Using basic material for walls');
      }
    } catch (error) {
      console.error('Failed to load wall material:', error);
      wallMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x554433,
        roughness: 0.75,
        metalness: 0.2
      });
    }
    
    // Set uvs for concrete texture
    if (config.useConcrete) {
      // Create UV coordinates for the walls
      function setupUVs(geometry, width, height) {
        const uvs = geometry.attributes.uv;
        for (let i = 0; i < uvs.count; i++) {
          uvs.setXY(i, uvs.getX(i) * (width / 5), uvs.getY(i) * (height / 5));
        }
      }
    }
    
    // 1. BACK WALL
    const backWallGeometry = new THREE.BoxGeometry(
      config.backWallWidth, 
      config.wallHeight, 
      config.wallDepth
    );
    const backWall = new THREE.Mesh(backWallGeometry, wallMaterial);
    backWall.position.set(
      0, 
      config.wallHeight/2 + config.floorLevel, 
      config.wallOffset
    );
    backWall.castShadow = true;
    backWall.receiveShadow = true;
    scene.add(backWall);
    
    // 2. LEFT SIDE WALL
    const leftWallGeometry = new THREE.BoxGeometry(
      config.wallDepth, 
      config.wallHeight, 
      config.sideWallLength
    );
    const leftWall = new THREE.Mesh(leftWallGeometry, wallMaterial);
    leftWall.position.set(
      -config.backWallWidth/2, 
      config.wallHeight/2 + config.floorLevel, 
      config.wallOffset + config.sideWallLength/2
    );
    leftWall.castShadow = true;
    leftWall.receiveShadow = true;
    scene.add(leftWall);
    
    // 3. RIGHT SIDE WALL
    const rightWallGeometry = new THREE.BoxGeometry(
      config.wallDepth, 
      config.wallHeight, 
      config.sideWallLength
    );
    const rightWall = new THREE.Mesh(rightWallGeometry, wallMaterial);
    rightWall.position.set(
      config.backWallWidth/2, 
      config.wallHeight/2 + config.floorLevel, 
      config.wallOffset + config.sideWallLength/2
    );
    rightWall.castShadow = true;
    rightWall.receiveShadow = true;
    scene.add(rightWall);
    
    console.log('3-wall environment created successfully');
    
    return {
      backWall,
      leftWall,
      rightWall
    };
  } catch (error) {
    console.error('Error creating walls:', error);
    
    // Simple fallback wall if everything fails
    const wallGeometry = new THREE.PlaneGeometry(20, 15);
    const wallMaterial = new THREE.MeshStandardMaterial({ color: 0x554433 });
    const wall = new THREE.Mesh(wallGeometry, wallMaterial);
    wall.position.z = -10;
    wall.receiveShadow = true;
    scene.add(wall);
    console.log('Fallback wall created');
    
    return { backWall: wall };
  }
}

/**
 * Helper function to position and scale a model after loading
 * @param {THREE.Object3D} model - The loaded model
 * @param {Object} options - Position, rotation, scale options
 */
export function setupModel(model, options = {}) {
  const { position, rotation, scale } = options;
  
  if (position) {
    model.position.set(
      position.x || 0,
      position.y || 0,
      position.z || 0
    );
  }
  
  if (rotation) {
    model.rotation.set(
      rotation.x || 0,
      rotation.y || 0,
      rotation.z || 0
    );
  }
  
  if (scale) {
    if (typeof scale === 'number') {
      model.scale.set(scale, scale, scale);
    } else {
      model.scale.set(
        scale.x || 1,
        scale.y || 1,
        scale.z || 1
      );
    }
  }
  
  return model;
}