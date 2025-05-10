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
 * Loads the brick textures (Bricks076C)
 * @param {number} repeat - How many times to repeat the texture
 * @returns {Promise<Object>} The loaded textures
 */
function loadBrickTextures(repeat = 3) {
  const basePath = 'models/textures/Bricks076C_2K-PNG/';
  
  return Promise.all([
    loadTexture(`${basePath}Bricks076C_2K-PNG_Color.png`, { repeat: [repeat, repeat] }),
    loadTexture(`${basePath}Bricks076C_2K-PNG_NormalGL.png`, { repeat: [repeat, repeat] }),
    loadTexture(`${basePath}Bricks076C_2K-PNG_Roughness.png`, { repeat: [repeat, repeat] }),
    loadTexture(`${basePath}Bricks076C_2K-PNG_AmbientOcclusion.png`, { repeat: [repeat, repeat] }),
    loadTexture(`${basePath}Bricks076C_2K-PNG_Displacement.png`, { repeat: [repeat, repeat] }),
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
 * Creates a PBR material using brick textures
 * @param {number} repeat - Texture repeat value
 * @returns {Promise<THREE.MeshStandardMaterial>} The created material
 */
function createBrickMaterial(repeat = 3) {
  return loadBrickTextures(repeat).then(textures => {
    const material = new THREE.MeshStandardMaterial({
      map: textures.color,
      normalMap: textures.normal,
      roughnessMap: textures.roughness,
      aoMap: textures.ao,
      displacementMap: textures.displacement,
      displacementScale: 0.02,
      roughness: 0.9,
      metalness: 0.1
    });
    
    return material;
  });
}

/**
 * Loads the tiles textures (Tiles133D)
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
 * Creates a fallback material for metal surfaces
 * @returns {THREE.MeshStandardMaterial} The created material
 */
function createFallbackMetalMaterial() {
  return new THREE.MeshStandardMaterial({ 
    color: 0x888899,
    roughness: 0.4,
    metalness: 0.9
  });
}

/**
 * Creates a fallback material for concrete surfaces
 * @returns {THREE.MeshStandardMaterial} The created material
 */
function createFallbackConcreteMaterial() {
  return new THREE.MeshStandardMaterial({ 
    color: 0x554433,
    roughness: 0.75,
    metalness: 0.2
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
 * Creates a ceiling with a simple metal-like material
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
    
    // Use fallback metal material since we don't have metal textures
    const ceilingMaterial = createFallbackMetalMaterial();
    
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


export function createTable(scene, options = {}) {
  console.log('Creating table...');
  
  // Default options with bigger dimensions
  const config = {
    width: options.width || 10,
    depth: options.depth || 7,
    height: options.height || 3,
    positionX: options.positionX || 0,
    positionZ: options.positionZ || -5,
    floorLevel: options.floorLevel || -3,
    woodColor: options.woodColor || 0x5c3a21,
    legThickness: options.legThickness || 0.4
  };
  
  // Create a group to hold all table parts
  const tableGroup = new THREE.Group();
  
  // Create table top
  const tableTopGeometry = new THREE.BoxGeometry(
    config.width, 
    0.3, // Top thickness - increased 
    config.depth
  );
  
  // Create wood material with slight texture and shine
  const woodMaterial = new THREE.MeshStandardMaterial({
    color: config.woodColor,
    roughness: 0.7,
    metalness: 0.2,
    bumpScale: 0.02
  });
  
  // Create table top
  const tableTop = new THREE.Mesh(tableTopGeometry, woodMaterial);
  tableTop.position.set(
    config.positionX,
    config.floorLevel + config.height,
    config.positionZ
  );
  tableTop.castShadow = true;
  tableTop.receiveShadow = true;
  tableGroup.add(tableTop);
  
  // Create table legs (4 legs at corners)
  const legPositions = [
    // Front left
    {x: config.positionX - config.width/2 + config.legThickness/2, 
     z: config.positionZ - config.depth/2 + config.legThickness/2},
    // Front right
    {x: config.positionX + config.width/2 - config.legThickness/2, 
     z: config.positionZ - config.depth/2 + config.legThickness/2},
    // Back left
    {x: config.positionX - config.width/2 + config.legThickness/2, 
     z: config.positionZ + config.depth/2 - config.legThickness/2},
    // Back right
    {x: config.positionX + config.width/2 - config.legThickness/2, 
     z: config.positionZ + config.depth/2 - config.legThickness/2}
  ];
  
  // Create each leg
  legPositions.forEach(pos => {
    const legGeometry = new THREE.BoxGeometry(
      config.legThickness,
      config.height,
      config.legThickness
    );
    
    const leg = new THREE.Mesh(legGeometry, woodMaterial);
    leg.position.set(
      pos.x,
      config.floorLevel + config.height/2,
      pos.z
    );
    leg.castShadow = true;
    leg.receiveShadow = true;
    tableGroup.add(leg);
  });
  
  // Add a subtle highlight to the table top
  const highlight = new THREE.DirectionalLight(0xffffaa, 0.4);
  highlight.position.set(0, 5, 0);
  highlight.target = tableTop;
  tableGroup.add(highlight);
  
  // Store collision boundaries in userData for physics
  tableGroup.userData.collision = {
    minX: config.positionX - config.width/2,
    maxX: config.positionX + config.width/2,
    minZ: config.positionZ - config.depth/2,
    maxZ: config.positionZ + config.depth/2
  };
  
  // Add the table group to the scene
  scene.add(tableGroup);
  
  console.log('Table created successfully');
  return tableGroup;
}


/**
 * Creates a 3-wall environment with concrete-like material
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
      includeFrontWall: options.includeFrontWall || true,
      invisibleWalls: options.invisibleWalls || false,
      textureRepeat: options.textureRepeat || 3 
    };
    
    // Get brick material
    let wallMaterial;
    try {
      wallMaterial = await createBrickMaterial(config.textureRepeat);
      console.log('Using brick material for walls');
    } catch (error) {
      console.error('Failed to load brick material:', error);
      wallMaterial = createFallbackConcreteMaterial();
      console.log('Falling back to concrete material for walls');
    }
    
    // Helper function to create geometry with UV2 for ambient occlusion
    const createGeometryWithUV2 = (geometry) => {
      geometry.setAttribute('uv2', geometry.attributes.uv.clone());
      return geometry;
    };
    
    // 1. BACK WALL
    const backWallGeometry = createGeometryWithUV2(new THREE.BoxGeometry(
      config.backWallWidth, 
      config.wallHeight, 
      config.wallDepth
    ));
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
    const leftWallGeometry = createGeometryWithUV2(new THREE.BoxGeometry(
      config.wallDepth, 
      config.wallHeight, 
      config.sideWallLength
    ));

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
    const rightWallGeometry = createGeometryWithUV2(new THREE.BoxGeometry(
      config.wallDepth, 
      config.wallHeight, 
      config.sideWallLength
    ));
    const rightWall = new THREE.Mesh(rightWallGeometry, wallMaterial);
    rightWall.position.set(
      config.backWallWidth/2, 
      config.wallHeight/2 + config.floorLevel, 
      config.wallOffset + config.sideWallLength/2
    );
    rightWall.castShadow = true;
    rightWall.receiveShadow = true;
    scene.add(rightWall);


    // 4. FRONT WALL (FIXED TEXTURE MAPPING)
    let frontWall = null;
    if (config.includeFrontWall) {
      // Create doorway
      const doorWidth = 4;
      const doorHeight = 8;
      
      // Create wall with doorway cutout using ShapeGeometry
      const wallShape = new THREE.Shape();
      // Define outer wall rectangle
      wallShape.moveTo(-config.backWallWidth/2, -config.wallHeight/2);
      wallShape.lineTo(config.backWallWidth/2, -config.wallHeight/2);
      wallShape.lineTo(config.backWallWidth/2, config.wallHeight/2);
      wallShape.lineTo(-config.backWallWidth/2, config.wallHeight/2);
      wallShape.lineTo(-config.backWallWidth/2, -config.wallHeight/2);
      
      // Create door hole (counterclockwise)
      const doorHole = new THREE.Path();
      doorHole.moveTo(-doorWidth/2, -config.wallHeight/2); // Bottom left corner
      doorHole.lineTo(doorWidth/2, -config.wallHeight/2); // Bottom right corner
      doorHole.lineTo(doorWidth/2, doorHeight - config.wallHeight/2); // Top right corner
      doorHole.lineTo(-doorWidth/2, doorHeight - config.wallHeight/2); // Top left corner
      doorHole.lineTo(-doorWidth/2, -config.wallHeight/2); // Back to start
      
      // Add hole to shape
      wallShape.holes.push(doorHole);
      
      // Create geometry with proper extrusion settings
      const wallGeometry = new THREE.ExtrudeGeometry(wallShape, {
        depth: config.wallDepth,
        bevelEnabled: false
      });
      
      // Fix UV mapping for consistent texture appearance
      wallGeometry.computeVertexNormals();
      
      // Create a scaled material specifically for the front wall
      const frontWallMaterial = wallMaterial.clone();
      
      // This creates a new material with adjusted scaling for the extruded geometry
      frontWallMaterial.map = wallMaterial.map.clone();
      frontWallMaterial.normalMap = wallMaterial.normalMap?.clone();
      frontWallMaterial.roughnessMap = wallMaterial.roughnessMap?.clone();
      frontWallMaterial.aoMap = wallMaterial.aoMap?.clone();
      
      // Adjust UV scaling to match the other walls
      const uvScaleFactor = 0.07; 
      frontWallMaterial.map.repeat.set(
        config.textureRepeat * uvScaleFactor, 
        config.textureRepeat * uvScaleFactor
      );
      
      // Apply the same scaling to other texture maps
      if (frontWallMaterial.normalMap) {
        frontWallMaterial.normalMap.repeat.copy(frontWallMaterial.map.repeat);
        frontWallMaterial.normalMap.wrapS = frontWallMaterial.normalMap.wrapT = THREE.RepeatWrapping;
      }
      if (frontWallMaterial.roughnessMap) {
        frontWallMaterial.roughnessMap.repeat.copy(frontWallMaterial.map.repeat);
        frontWallMaterial.roughnessMap.wrapS = frontWallMaterial.roughnessMap.wrapT = THREE.RepeatWrapping;
      }
      if (frontWallMaterial.aoMap) {
        frontWallMaterial.aoMap.repeat.copy(frontWallMaterial.map.repeat);
        frontWallMaterial.aoMap.wrapS = frontWallMaterial.aoMap.wrapT = THREE.RepeatWrapping;
      }
      
      // Create mesh with correctly positioned UVs for the material
      const wallMesh = new THREE.Mesh(wallGeometry, frontWallMaterial);
      
      // FIXED POSITION: Position the wall exactly at the front edge
      wallMesh.position.set(
        0,
        config.wallHeight/2 + config.floorLevel,
        config.wallOffset + config.sideWallLength
      );
      
      // Rotate to correct orientation (normal pointing inward)
      wallMesh.rotation.y = Math.PI;
      
      // Add shadow properties
      wallMesh.castShadow = true;
      wallMesh.receiveShadow = true;
      scene.add(wallMesh);
      
      frontWall = { wallMesh };
      console.log('Front wall with doorway cutout created successfully');
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