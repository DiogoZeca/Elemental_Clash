import { CanvasTexture, Vector3, Group, Box3, PlaneGeometry, MeshBasicMaterial, DoubleSide, AdditiveBlending, Mesh, Color } from 'three';
import { SCENE_CONFIG, doorZ } from './config.js';
import { createWallEnvironment, createMetalCeiling, createTilesFloor, createTable } from './sceneLoader.js';
import { createOutsideScenery, addClouds, createPathToEntrance } from './outsidescenery.js';
import { sceneObjects } from './gameState.js';
import { setTableReference } from './physics.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { setupBaseLighting, addWallTorches } from './lighting.js';


function createTextTexture(text, options = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = options.width || 700;
  canvas.height = options.height || 128;
  
  const context = canvas.getContext('2d');
  context.clearRect(0, 0, canvas.width, canvas.height);
  
  // Text settings
  context.font = options.font || 'bold 40px Trebuchet MS, Arial, sans-serif';
  context.textAlign = 'center';
  context.textBaseline = 'middle';

  const colors = [
    { color: 'rgba(0, 204, 255, 0.3)', blur: 20 },
    { color: 'rgba(138, 43, 226, 0.3)', blur: 15 },
    { color: 'rgba(255, 102, 0, 0.3)', blur: 10 }
  ];
  
  context.shadowColor = colors[0].color;
  context.shadowBlur = colors[0].blur;
  context.shadowOffsetX = 0;
  context.shadowOffsetY = 0;
  context.fillStyle = 'rgba(255, 255, 255, 1.0)';
  
  const lines = text.split('\n');
  lines.forEach((line, index) => {
    context.fillText(line, canvas.width/2, canvas.height/2 - 20 + (index * 40));
  });
  const texture = new CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

export function updateFloatingText(textMesh, camera) {
  if (!textMesh) return;
  textMesh.quaternion.copy(camera.quaternion);
  const time = Date.now() * 0.001; 
  if (textMesh.userData && textMesh.userData.baseY !== undefined) {
    textMesh.position.y = textMesh.userData.baseY + 
      Math.sin(time) * textMesh.userData.floatHeight;
  }
}








export async function setupScene(scene) {
  try {
    // Create path to entrance
    const path = createPathToEntrance(scene, {
      startPosition: new Vector3(0, -3.1, doorZ + 25), 
      endPosition: new Vector3(0, -3.1, doorZ),        
      width: 4.0,                                          
      pathColor: 0x664444                                
    });
  
    // Load wall environment first
    const walls = await createWallEnvironment(scene, {
      wallHeight: SCENE_CONFIG.wallHeight +1,  
      floorLevel: SCENE_CONFIG.floorLevel,
      wallOffset: SCENE_CONFIG.wallOffset,
      backWallWidth: SCENE_CONFIG.roomWidth,
      sideWallLength: SCENE_CONFIG.roomDepth,
      useConcrete: true,
      includeFrontWall: true,
      invisibleWalls: false  
    }).catch(err => {
      console.error('Failed to create walls:', err);
      return null;
    });
    console.log('Walls created successfully');


    let torches = [];
    if (walls) {
      torches = await addWallTorches(scene, walls, {
        torchCount: 6,
        floorLevel: SCENE_CONFIG.floorLevel,
        wallHeight: SCENE_CONFIG.wallHeight
      }).catch(err => {
        console.error('Failed to create wall torches:', err);
        return [];
      });
      
      if (torches.length > 0) {
        console.log('Wall torches added successfully');
        sceneObjects.torches = torches;
      }
    }



    
    // Load floor
    const floor = await createTilesFloor(scene, {
      width: SCENE_CONFIG.roomWidth,
      depth: SCENE_CONFIG.roomDepth,
      floorLevel: SCENE_CONFIG.floorLevel,
      wallOffset: SCENE_CONFIG.wallOffset
    }).catch(err => {
      console.error('Failed to create floor:', err);
      return null;
    });
    console.log('Floor created successfully');
    
    // Load ceiling
    const ceiling = await createMetalCeiling(scene, {
      width: SCENE_CONFIG.roomWidth,
      depth: SCENE_CONFIG.roomDepth,
      floorLevel: SCENE_CONFIG.floorLevel,
      wallOffset: SCENE_CONFIG.wallOffset,
      ceilingHeight: SCENE_CONFIG.wallHeight, 
      thickness: 0.8 
    }).catch(err => {
      console.error('Failed to create ceiling:', err);
      return null;
    });
    console.log('Ceiling created successfully');
    
    // Load outside scenery
    const outside = await createOutsideScenery(scene, {
      groundSize: 150,
      skyboxEnabled: false
    }).catch(err => {
      console.error('Failed to create outside scenery:', err);
      return null;
    });
    console.log('Outside scenery created successfully');
    

    // Create table 
    let table = null;
    try {
      table = new Group();
      
      const config = {
        positionX: 0,
        positionZ: SCENE_CONFIG.wallOffset + SCENE_CONFIG.roomDepth * 0.5,
        floorLevel: SCENE_CONFIG.floorLevel
      };
      
       const gltfLoader = new GLTFLoader();
      await new Promise((resolve, reject) => {
        gltfLoader.load(
          'models/scenery/wooden_table/scene.gltf',
          (gltf) => {
            const tableModel = gltf.scene;
            
            tableModel.scale.set(6, 6, 6);
            tableModel.position.set(
              config.positionX,
              config.floorLevel,
              config.positionZ
            );
            tableModel.traverse((node) => {
              if (node.isMesh) {
                node.castShadow = true;
                node.receiveShadow = true;
              }
            });
            table.add(tableModel);
            const boundingBox = new Box3().setFromObject(tableModel);
            table.userData = {
              collision: {
                minX: boundingBox.min.x,
                maxX: boundingBox.max.x,
                minZ: boundingBox.min.z,
                maxZ: boundingBox.max.z
              }
            };
            console.log('Table collision bounds from model:', table.userData.collision);
            
            resolve(tableModel);
           },
           (xhr) => {
             console.log(`Table model loading: ${(xhr.loaded / xhr.total) * 100}% loaded`);
           },
           (error) => {
             console.error('Error loading table model:', error);
             reject(error);
           }
         );
       });
       scene.add(table);
      setTableReference(table);
      console.log('Table created successfully');
      } catch (err) {
      console.error('Failed to create table:', err);
      }
    
    if (outside) {
      sceneObjects.outsideElements = outside;
    }

    let floatingText = null;
    try {
      const texture = createTextTexture('Welcome, Challenger!\nStep into the Elemental Chamber', {
        width: 700,
        height: 128,
        font: 'bold 42px "Trebuchet MS", Arial, sans-serif'
      });
      
      const geometry = new PlaneGeometry(14, 3.5);
      const material = new MeshBasicMaterial({
        map: texture,
        transparent: true,
        side: DoubleSide,
        opacity: 1.0,
        blending: AdditiveBlending 
      });
      floatingText = new Mesh(geometry, material);
      floatingText.position.set(-8, 1.5, doorZ + 15);
      floatingText.userData = {
        floatHeight: 0.4,
        baseY: 1.5 
      };
      scene.add(floatingText);
      sceneObjects.floatingText = floatingText;
      console.log('Floating text created successfully');
    } catch (err) {
      console.error('Failed to create floating text:', err);
    }
    console.log('Scene initialization complete');
    return { walls, floor, ceiling, outside, path, table, torches };
  } catch (error) {
    console.error('Error initializing scene:', error);
    return { walls: null, floor: null, ceiling: null, outside: null, path: null, table: null, torches: [] };
  }
}

// Setup shadows for scene elements
export function setupShadows(walls, floor, ceiling, table) {
  console.log('Setting up shadows for:', { walls, floor, ceiling, table });
  if (walls) {
    if (walls.frontWall) {
      console.log('Setting up front wall shadows');
      const frontWallParts = walls.frontWall;
      Object.values(frontWallParts).forEach(part => {
        if (part) {
          part.receiveShadow = part.castShadow = true;
        }
      });
    }
    ['backWall', 'leftWall', 'rightWall'].forEach(wallName => {
      if (walls[wallName]) {
        walls[wallName].receiveShadow = walls[wallName].castShadow = true;
      }
    });
  }
  
  // Setup floor and ceiling shadows
  if (floor) floor.receiveShadow = true;
  if (ceiling) {
    ceiling.receiveShadow = true;
    ceiling.castShadow = true;
  }
  
  // Setup table shadows
  if (table) {
    if (table.children) {
      table.children.forEach(part => {
        part.castShadow = true;
        part.receiveShadow = true;
      });
    }
  }
  
  // Setup moon light shadows with detailed logging
  if (sceneObjects.outsideElements?.moon?.moonLight) {
    console.log('Setting up moon shadows');
    
    const moonLight = sceneObjects.outsideElements.moon.moonLight;
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
  }
  console.log('Shadow setup complete');
}
export function updateFloatingTextToVictory() {
  if (!sceneObjects) {
    console.warn('sceneObjects is undefined');
    return;
  }
  if (!sceneObjects.floatingText) {
    console.warn('sceneObjects.floatingText is undefined');
    return;
  }
  try {
    if (sceneObjects.floatingText.material.map) {
      sceneObjects.floatingText.material.map.dispose();
    }
    const victoryTexture = createTextTexture('Congratulations! You are an Elemental Master!', {
      width: 700,
      height: 128,
      font: 'bold 42px "Trebuchet MS", Arial, sans-serif'
    });

    victoryTexture.needsUpdate = true;
    sceneObjects.floatingText.material.map = victoryTexture;
    sceneObjects.floatingText.material.needsUpdate = true;
    sceneObjects.floatingText.material.emissive = new Color(0xffd700);
    sceneObjects.floatingText.material.emissiveIntensity = 0.3;
    console.log('Floating text updated to victory message');
  } catch (error) {
    console.error('Failed to update floating text:', error);
  }
}