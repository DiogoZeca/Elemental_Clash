import * as THREE from 'three';
import { SCENE_CONFIG, doorZ } from './config.js';
import { createWallEnvironment, createMetalCeiling, createTilesFloor, createTable } from './sceneLoader.js';
import { createOutsideScenery, addClouds, createPathToEntrance } from './outsidescenery.js';
import { sceneObjects } from './gameState.js';
import { setTableReference } from './physics.js';

export async function setupScene(scene) {
  try {
    // Create path to entrance
    const path = createPathToEntrance(scene, {
      startPosition: new THREE.Vector3(0, -3.1, doorZ + 25), 
      endPosition: new THREE.Vector3(0, -3.1, doorZ),        
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
      invisibleWalls: false  // Change this from true to false
    }).catch(err => {
      console.error('Failed to create walls:', err);
      return null;
    });
    console.log('Walls created successfully');
    
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
      thickness: 0.8 // Increased thickness for better light blocking
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
    

    // Create table WITHOUT light to avoid potential issues
    let table = null;
    try {
      // Create a simplified version of the table
      table = new THREE.Group();
      
      const config = {
        width: 17,
        depth: 12,
        height: 3,
        positionX: 0,
        positionZ: SCENE_CONFIG.wallOffset + SCENE_CONFIG.roomDepth * 0.5,
        floorLevel: SCENE_CONFIG.floorLevel,
        woodColor: 0x5c3a21,
        legThickness: 0.6
      };
      
      // Create wood material
      const woodMaterial = new THREE.MeshStandardMaterial({
        color: config.woodColor,
        roughness: 0.7,
        metalness: 0.2
      });
      
      // Create table top
      const tableTopGeometry = new THREE.BoxGeometry(
        config.width, 
        0.3,
        config.depth
      );
      const tableTop = new THREE.Mesh(tableTopGeometry, woodMaterial);
      tableTop.position.set(
        config.positionX,
        config.floorLevel + config.height,
        config.positionZ
      );
      tableTop.castShadow = true;
      tableTop.receiveShadow = true;
      table.add(tableTop);
      
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
        table.add(leg);
      });

      table.userData = {
        collision: {
          minX: config.positionX - config.width/2,
          maxX: config.positionX + config.width/2,
          minZ: config.positionZ - config.depth/2,
          maxZ: config.positionZ + config.depth/2
        }
      };
      console.log('Table collision bounds:', table.userData.collision);

      scene.add(table);

      // Register table with physics system
      setTableReference(table);

      console.log('Table with legs created successfully');
      } catch (err) {
      console.error('Failed to create table:', err);
      }
    
    // Store outside elements
    if (outside) {
      sceneObjects.outsideElements = outside;
    }
    
    console.log('Scene initialization complete');
    return { walls, floor, ceiling, outside, path, table };
  } catch (error) {
    console.error('Error initializing scene:', error);
    // Try to return basic scene for fallback
    return { walls: null, floor: null, ceiling: null, outside: null, path: null, table: null };
  }
}

// Setup shadows for scene elements
export function setupShadows(walls, floor, ceiling, table) {
  console.log('Setting up shadows for:', { walls, floor, ceiling, table });
  
  // Setup wall shadows
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
    
    // Setup individual wall shadows with checks
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
  if (ceiling) ceiling.receiveShadow = true;
  
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
    
    // Configure shadow quality
    moonLight.shadow.mapSize.width = 4096;
    moonLight.shadow.mapSize.height = 4096;
    
    // Setup shadow camera frustum
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