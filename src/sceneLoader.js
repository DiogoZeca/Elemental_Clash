import * as THREE from 'three';

// Texture cache
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
 * Loads the new metal textures (Metal023)
 * @returns {Promise<Object>} The loaded textures
 */
function loadMetalTextures() {
  const basePath = 'models/textures/Metal023_4K-PNG/';
  
  return Promise.all([
    loadTexture(`${basePath}Metal023_4K-PNG_Color.png`, { repeat: [3, 3] }),
    loadTexture(`${basePath}Metal023_4K-PNG_NormalGL.png`, { repeat: [3, 3] }),
    loadTexture(`${basePath}Metal023_4K-PNG_Roughness.png`, { repeat: [3, 3] }),
    loadTexture(`${basePath}Metal023_4K-PNG_Metalness.png`, { repeat: [3, 3] }),
    loadTexture(`${basePath}Metal023_4K-PNG_Displacement.png`, { repeat: [3, 3] }),
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
function loadConcreteTextures() {
  const basePath = 'models/textures/Concrete033_4K-PNG/';
  
  return Promise.all([
    loadTexture(`${basePath}Concrete033_4K-PNG_Color.png`, { repeat: [2, 2] }),
    loadTexture(`${basePath}Concrete033_4K-PNG_NormalGL.png`, { repeat: [2, 2] }),
    loadTexture(`${basePath}Concrete033_4K-PNG_Roughness.png`, { repeat: [2, 2] }),
    loadTexture(`${basePath}Concrete033_4K-PNG_AmbientOcclusion.png`, { repeat: [2, 2] }),
    loadTexture(`${basePath}Concrete033_4K-PNG_Displacement.png`, { repeat: [2, 2] }),
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
 * Loads the tile textures (Tiles133D)
 * @returns {Promise<Object>} The loaded textures
 */
function loadTilesTextures() {
  const basePath = 'models/textures/Tiles133D_2K-PNG/';
  
  return Promise.all([
    loadTexture(`${basePath}Tiles133D_2K-PNG_Color.png`, { repeat: [4, 4] }),
    loadTexture(`${basePath}Tiles133D_2K-PNG_NormalGL.png`, { repeat: [4, 4] }),
    loadTexture(`${basePath}Tiles133D_2K-PNG_Roughness.png`, { repeat: [4, 4] }),
    loadTexture(`${basePath}Tiles133D_2K-PNG_AmbientOcclusion.png`, { repeat: [4, 4] }),
    loadTexture(`${basePath}Tiles133D_2K-PNG_Displacement.png`, { repeat: [4, 4] }),
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
function createConcreteMaterial() {
  return loadConcreteTextures().then(textures => {
    const material = new THREE.MeshStandardMaterial({
      map: textures.color,
      normalMap: textures.normal,
      roughnessMap: textures.roughness,
      aoMap: textures.ao,
      displacementMap: textures.displacement,
      displacementScale: 0.1,
      roughness: 1.0,
      metalness: 0.0
    });
    
    return material;
  });
}

/**
 * Creates a PBR material using tile textures
 * @returns {Promise<THREE.MeshStandardMaterial>} The created material
 */
function createTilesMaterial() {
  return loadTilesTextures().then(textures => {
    const material = new THREE.MeshStandardMaterial({
      map: textures.color,
      normalMap: textures.normal,
      roughnessMap: textures.roughness,
      aoMap: textures.ao,
      displacementMap: textures.displacement,
      displacementScale: 0.05,
      roughness: 0.8,
      metalness: 0.1
    });
    
    return material;
  });
}

/**
 * Creates a PBR material using new metal textures
 * @returns {Promise<THREE.MeshStandardMaterial>} The created material
 */
function createMetalMaterial() {
  return loadMetalTextures().then(textures => {
    const material = new THREE.MeshStandardMaterial({
      map: textures.color,
      normalMap: textures.normal,
      roughnessMap: textures.roughness,
      metalnessMap: textures.metalness,
      displacementMap: textures.displacement,
      displacementScale: 0.05,
      metalness: 0.9,
      roughness: 0.4
    });
    
    return material;
  });
}

/**
 * Creates a floor with tile texture that aligns with the walls
 * @param {THREE.Scene} scene - The scene to add the floor to
 * @param {Object} options - Configuration options
 * @returns {Promise<THREE.Mesh>} - The created floor
 */
export async function createTilesFloor(scene, options = {}) {
  try {
    console.log('Creating tiles textured floor...');
    
    // Default options
    const config = {
      width: options.width || 20,
      depth: options.depth || 15,
      floorLevel: options.floorLevel || -3,
      wallOffset: options.wallOffset || -10
    };
    
    // Get tiles material
    let floorMaterial;
    try {
      floorMaterial = await createTilesMaterial();
      console.log('Using tiles material for floor');
    } catch (error) {
      console.error('Failed to load tiles floor material:', error);
      floorMaterial = new THREE.MeshStandardMaterial({ color: 0x999999 });
    }
    
    // Create floor mesh with second set of UVs for aoMap
    const floorGeometry = new THREE.PlaneGeometry(config.width, config.depth);
    floorGeometry.setAttribute('uv2', floorGeometry.attributes.uv.clone());
    
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2; // Rotate to be horizontal
    
    // Position floor to align with back wall
    floor.position.set(
      0,
      config.floorLevel, 
      config.wallOffset + (config.depth / 2)
    );
    
    floor.receiveShadow = true;
    
    scene.add(floor);
    console.log('Tiles floor created successfully');
    return floor;
    
  } catch (error) {
    console.error('Error creating tiles floor:', error);
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
      ceilingHeight: options.ceilingHeight || 12,
      floorLevel: options.floorLevel || -3,
      wallOffset: options.wallOffset || -10
    };
    
    // Get appropriate material
    let ceilingMaterial;
    try {
      ceilingMaterial = await createMetalMaterial();
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
      0,
      config.floorLevel + config.ceilingHeight,
      config.wallOffset + (config.depth / 2)
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
      wallOffset: options.wallOffset || -10,
      floorLevel: options.floorLevel || -3,
      useConcrete: options.useConcrete || true,
      includeFrontWall: options.includeFrontWall || true,
      invisibleWalls: options.invisibleWalls || false
    };
    
    // Get appropriate material
    let wallMaterial;
    try {
      if (config.useConcrete) {
        wallMaterial = await createConcreteMaterial();
        console.log('Using concrete material for walls');
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

    // 4. FRONT WALL (NEW)
    let frontWall = null;
    if (config.includeFrontWall) {
      // Create doorway
      const doorWidth = 4;
      const doorHeight = 8;
      
      // Left section of front wall
      const leftFrontWallGeometry = new THREE.BoxGeometry(
        (config.backWallWidth - doorWidth) / 2, 
        config.wallHeight, 
        config.wallDepth
      );
      const leftFrontWall = new THREE.Mesh(leftFrontWallGeometry, wallMaterial);
      leftFrontWall.position.set(
        -(config.backWallWidth + doorWidth) / 4, 
        config.wallHeight/2 + config.floorLevel, 
        config.wallOffset + config.sideWallLength
      );
      leftFrontWall.castShadow = true;
      leftFrontWall.receiveShadow = true;
      scene.add(leftFrontWall);
      
      // Right section of front wall
      const rightFrontWallGeometry = new THREE.BoxGeometry(
        (config.backWallWidth - doorWidth) / 2, 
        config.wallHeight, 
        config.wallDepth
      );
      const rightFrontWall = new THREE.Mesh(rightFrontWallGeometry, wallMaterial);
      rightFrontWall.position.set(
        (config.backWallWidth + doorWidth) / 4, 
        config.wallHeight/2 + config.floorLevel, 
        config.wallOffset + config.sideWallLength
      );
      rightFrontWall.castShadow = true;
      rightFrontWall.receiveShadow = true;
      scene.add(rightFrontWall);
      
      // Top section of front wall (above door)
      const topFrontWallGeometry = new THREE.BoxGeometry(
        doorWidth, 
        config.wallHeight - doorHeight, 
        config.wallDepth
      );
      const topFrontWall = new THREE.Mesh(topFrontWallGeometry, wallMaterial);
      topFrontWall.position.set(
        0, 
        config.floorLevel + config.wallHeight - (config.wallHeight - doorHeight) / 2, 
        config.wallOffset + config.sideWallLength
      );
      topFrontWall.castShadow = true;
      topFrontWall.receiveShadow = true;
      scene.add(topFrontWall);
      
      frontWall = { leftFrontWall, rightFrontWall, topFrontWall };
      console.log('Front wall with doorway created successfully');
    }
    
    console.log('3-wall environment created successfully');
    
    return {
      backWall,
      leftWall,
      rightWall,
      frontWall
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