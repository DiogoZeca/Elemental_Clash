import { Texture, TextureLoader, RepeatWrapping, MeshStandardMaterial, Scene, Mesh, PlaneGeometry, DoubleSide, BoxGeometry, Group, DirectionalLight, Shape, Path, ExtrudeGeometry } from 'three';

// Texture cache
const textureCache = new Map();

/**
 * Helper function to load textures
 * @param {string} path - Path to the texture file
 * @param {Object} options - Optional settings for the texture
 * @returns {Promise<Texture>} - The loaded texture 
 */
function loadTexture(path, options = {}) {
  const { repeat = [1, 1] } = options;

  if (textureCache.has(path)) {
    return Promise.resolve(textureCache.get(path));
  }
  
  const textureLoader = new TextureLoader();
  return new Promise((resolve, reject) => {
    textureLoader.load(
      path,
      (texture) => {
        texture.wrapS = RepeatWrapping;
        texture.wrapT = RepeatWrapping;
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
 * @returns {Promise<MeshStandardMaterial>} The created material
 */
function createBrickMaterial(repeat = 3) {
  return loadBrickTextures(repeat).then(textures => {
    const material = new MeshStandardMaterial({
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
 * @returns {Promise<MeshStandardMaterial>} The created material
 */
function createTilesMaterial() {
  return loadTilesTextures().then(textures => {
    const material = new MeshStandardMaterial({
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
 * Creates a floor with tile texture that aligns with the walls
 * @param {Scene} scene - The scene to add the floor to
 * @param {Object} options - Configuration options
 * @returns {Promise<Mesh>} - The created floor
 */
export async function createTilesFloor(scene, options = {}) {
  console.log('Creating tiles textured floor...');
  const config = {
    width: options.width || 20,
    depth: options.depth || 15,
    floorLevel: options.floorLevel || -3,
    wallOffset: options.wallOffset || -10
  };
  
  // Get tiles material - no fallback
  const floorMaterial = await createTilesMaterial();
  console.log('Using tiles material for floor');
  
  const floorGeometry = new PlaneGeometry(config.width, config.depth);
  floorGeometry.setAttribute('uv2', floorGeometry.attributes.uv.clone());
  const floor = new Mesh(floorGeometry, floorMaterial);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(
    0,
    config.floorLevel, 
    config.wallOffset + (config.depth / 2)
  );
  floor.receiveShadow = true;
  scene.add(floor);
  console.log('Tiles floor created successfully');
  return floor;
}

/**
 * Creates a ceiling with the same brick texture as the walls
 * @param {Scene} scene - The scene to add the ceiling to
 * @param {Object} options - Configuration options
 * @returns {Promise<Mesh>} - The created ceiling
 */
export async function createMetalCeiling(scene, options = {}) {
  console.log('Creating brick textured ceiling...');
  const config = {
    width: options.width || 20,
    depth: options.depth || 15,
    ceilingHeight: options.ceilingHeight || 12,
    floorLevel: options.floorLevel || -3,
    wallOffset: options.wallOffset || -10,
    thickness: options.thickness || 0.5 
  };
  
  // Get ceiling material - no fallback
  const ceilingMaterial = await createBrickMaterial(5.02);
  ceilingMaterial.side = DoubleSide;
  ceilingMaterial.transparent = false;
  ceilingMaterial.opacity = 1.0;
  if (ceilingMaterial.displacementMap) {
    ceilingMaterial.displacementScale = 0.01; 
  }

  const ceilingGeometry = new BoxGeometry(
    config.width, 
    config.thickness, 
    config.depth
  );
  ceilingGeometry.setAttribute('uv2', ceilingGeometry.attributes.uv.clone());
  const ceiling = new Mesh(ceilingGeometry, ceilingMaterial);
  ceiling.position.set(
    0,
    config.floorLevel + config.ceilingHeight - (config.thickness/2), 
    config.wallOffset + (config.depth / 2)
  );
  ceiling.receiveShadow = true;
  ceiling.castShadow = true;
  scene.add(ceiling);
  console.log('Brick ceiling created successfully - light blocking enabled');
  return ceiling;
}


export function createTable(scene, options = {}) {
  console.log('Creating table...');
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
  const tableGroup = new Group();
  const tableTopGeometry = new BoxGeometry(
    config.width, 
    0.3, 
    config.depth
  );
  const woodMaterial = new MeshStandardMaterial({
    color: config.woodColor,
    roughness: 0.7,
    metalness: 0.2,
    bumpScale: 0.02
  });
  const tableTop = new Mesh(tableTopGeometry, woodMaterial);
  tableTop.position.set(
    config.positionX,
    config.floorLevel + config.height,
    config.positionZ
  );
  tableTop.castShadow = true;
  tableTop.receiveShadow = true;
  tableGroup.add(tableTop);
  const legPositions = [
    {x: config.positionX - config.width/2 + config.legThickness/2, 
     z: config.positionZ - config.depth/2 + config.legThickness/2},
    {x: config.positionX + config.width/2 - config.legThickness/2, 
     z: config.positionZ - config.depth/2 + config.legThickness/2},
    {x: config.positionX - config.width/2 + config.legThickness/2, 
     z: config.positionZ + config.depth/2 - config.legThickness/2},
    {x: config.positionX + config.width/2 - config.legThickness/2, 
     z: config.positionZ + config.depth/2 - config.legThickness/2}
  ];
  legPositions.forEach(pos => {
    const legGeometry = new BoxGeometry(
      config.legThickness,
      config.height,
      config.legThickness
    );
    const leg = new Mesh(legGeometry, woodMaterial);
    leg.position.set(
      pos.x,
      config.floorLevel + config.height/2,
      pos.z
    );
    leg.castShadow = true;
    leg.receiveShadow = true;
    tableGroup.add(leg);
  });
  const highlight = new DirectionalLight(0xffffaa, 0.4);
  highlight.position.set(0, 5, 0);
  highlight.target = tableTop;
  tableGroup.add(highlight);
  tableGroup.userData.collision = {
    minX: config.positionX - config.width/2,
    maxX: config.positionX + config.width/2,
    minZ: config.positionZ - config.depth/2,
    maxZ: config.positionZ + config.depth/2
  };
  scene.add(tableGroup);
  console.log('Table created successfully');
  return tableGroup;
}


/**
 * Creates a 3-wall environment with concrete-like material
 * @param {Scene} scene - The scene to add walls to
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
    let wallMaterial;
    try {
      wallMaterial = await createBrickMaterial(config.textureRepeat);
      console.log('Using brick material for walls');
    } catch (error) {
      console.error('Failed to load brick material:', error);
      wallMaterial = createFallbackConcreteMaterial();
      console.log('Falling back to concrete material for walls');
    }
    const createGeometryWithUV2 = (geometry) => {
      geometry.setAttribute('uv2', geometry.attributes.uv.clone());
      return geometry;
    };
    
    // 1. BACK WALL
    const backWallGeometry = createGeometryWithUV2(new BoxGeometry(
      config.backWallWidth, 
      config.wallHeight, 
      config.wallDepth
    ));
    const backWall = new Mesh(backWallGeometry, wallMaterial);
    backWall.position.set(
      0, 
      config.wallHeight/2 + config.floorLevel, 
      config.wallOffset
    );
    backWall.castShadow = true;
    backWall.receiveShadow = true;
    scene.add(backWall);
    
    // 2. LEFT SIDE WALL
    const leftWallGeometry = createGeometryWithUV2(new BoxGeometry(
      config.wallDepth, 
      config.wallHeight, 
      config.sideWallLength
    ));

    const leftWall = new Mesh(leftWallGeometry, wallMaterial);
    leftWall.position.set(
      -config.backWallWidth/2, 
      config.wallHeight/2 + config.floorLevel, 
      config.wallOffset + config.sideWallLength/2
    );
    leftWall.castShadow = true;
    leftWall.receiveShadow = true;
    scene.add(leftWall);
    
    // 3. RIGHT SIDE WALL
    const rightWallGeometry = createGeometryWithUV2(new BoxGeometry(
      config.wallDepth, 
      config.wallHeight, 
      config.sideWallLength
    ));
    const rightWall = new Mesh(rightWallGeometry, wallMaterial);
    rightWall.position.set(
      config.backWallWidth/2, 
      config.wallHeight/2 + config.floorLevel, 
      config.wallOffset + config.sideWallLength/2
    );
    rightWall.castShadow = true;
    rightWall.receiveShadow = true;
    scene.add(rightWall);


    // 4. FRONT WALL
    let frontWall = null;
    if (config.includeFrontWall) {
      // Create doorway
      const doorWidth = 4;
      const doorHeight = 8;
      
      // Create wall with doorway cutout using ShapeGeometry
      const wallShape = new Shape();
      wallShape.moveTo(-config.backWallWidth/2, -config.wallHeight/2);
      wallShape.lineTo(config.backWallWidth/2, -config.wallHeight/2);
      wallShape.lineTo(config.backWallWidth/2, config.wallHeight/2);
      wallShape.lineTo(-config.backWallWidth/2, config.wallHeight/2);
      wallShape.lineTo(-config.backWallWidth/2, -config.wallHeight/2);
      const doorHole = new Path();
      doorHole.moveTo(-doorWidth/2, -config.wallHeight/2); 
      doorHole.lineTo(doorWidth/2, -config.wallHeight/2);
      doorHole.lineTo(doorWidth/2, doorHeight - config.wallHeight/2); 
      doorHole.lineTo(-doorWidth/2, doorHeight - config.wallHeight/2); 
      doorHole.lineTo(-doorWidth/2, -config.wallHeight/2); 
      wallShape.holes.push(doorHole);
      const wallGeometry = new ExtrudeGeometry(wallShape, {
        depth: config.wallDepth,
        bevelEnabled: false
      });
      wallGeometry.computeVertexNormals();
      const frontWallMaterial = wallMaterial.clone();
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
      if (frontWallMaterial.normalMap) {
        frontWallMaterial.normalMap.repeat.copy(frontWallMaterial.map.repeat);
        frontWallMaterial.normalMap.wrapS = frontWallMaterial.normalMap.wrapT = RepeatWrapping;
      }
      if (frontWallMaterial.roughnessMap) {
        frontWallMaterial.roughnessMap.repeat.copy(frontWallMaterial.map.repeat);
        frontWallMaterial.roughnessMap.wrapS = frontWallMaterial.roughnessMap.wrapT = RepeatWrapping;
      }
      if (frontWallMaterial.aoMap) {
        frontWallMaterial.aoMap.repeat.copy(frontWallMaterial.map.repeat);
        frontWallMaterial.aoMap.wrapS = frontWallMaterial.aoMap.wrapT = RepeatWrapping;
      }
      const wallMesh = new Mesh(wallGeometry, frontWallMaterial);
      wallMesh.position.set(
        0,
        config.wallHeight/2 + config.floorLevel,
        config.wallOffset + config.sideWallLength
      );
      wallMesh.rotation.y = Math.PI;
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
    const wallGeometry = new PlaneGeometry(20, 15);
    const wallMaterial = new MeshStandardMaterial({ color: 0x554433 });
    const wall = new Mesh(wallGeometry, wallMaterial);
    wall.position.z = -10;
    wall.receiveShadow = true;
    scene.add(wall);
    console.log('Fallback wall created');
    return { backWall: wall };
  }
}