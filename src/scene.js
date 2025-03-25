import * as THREE from 'three';
import { SCENE_CONFIG, doorZ } from './config.js';
import { createWallEnvironment, createMetalCeiling, createTilesFloor } from './sceneLoader.js';
import { createOutsideScenery, addClouds, createPathToEntrance } from './outsidescenery.js';
import { sceneObjects } from './gameState.js';

export async function setupScene(scene) {
  try {
    // Create path to entrance
    const path = createPathToEntrance(scene, {
      startPosition: new THREE.Vector3(0, -3.1, doorZ + 25),
      endPosition: new THREE.Vector3(0, -3.1, doorZ),
      width: 3.5
    });
  
    // Load all scene elements in parallel with proper error handling
    const [walls, floor, ceiling, outside] = await Promise.all([
      createWallEnvironment(scene, {
        wallHeight: SCENE_CONFIG.wallHeight,  
        floorLevel: SCENE_CONFIG.floorLevel,
        wallOffset: SCENE_CONFIG.wallOffset,
        backWallWidth: SCENE_CONFIG.roomWidth,
        sideWallLength: SCENE_CONFIG.roomDepth,
        useConcrete: true,
        includeFrontWall: true,
        invisibleWalls: true
      }).catch(err => {
        console.error('Failed to create walls:', err);
        return null;
      }),
      
      createTilesFloor(scene, {
        width: SCENE_CONFIG.roomWidth,
        depth: SCENE_CONFIG.roomDepth,
        floorLevel: SCENE_CONFIG.floorLevel,
        wallOffset: SCENE_CONFIG.wallOffset
      }).catch(err => {
        console.error('Failed to create floor:', err);
        return null;
      }),
      
      createMetalCeiling(scene, {
        width: SCENE_CONFIG.roomWidth,
        depth: SCENE_CONFIG.roomDepth,
        floorLevel: SCENE_CONFIG.floorLevel,
        wallOffset: SCENE_CONFIG.wallOffset
      }).catch(err => {
        console.error('Failed to create ceiling:', err);
        return null;
      }),
      
      createOutsideScenery(scene).catch(err => {
        console.error('Failed to create outside scenery:', err);
        return null;
      })
    ]);
    
    // Store outside elements for animation with explicit logging
    if (outside) {
      sceneObjects.outsideElements = outside;
      console.log('Outside elements stored:', outside);
    }
    
    // Add clouds with error handling
    try {
      sceneObjects.clouds = addClouds(scene);
      console.log('Clouds added:', sceneObjects.clouds);
    } catch (error) {
      console.error('Failed to add clouds:', error);
    }
    
    console.log('Scene initialization complete');
    return { walls, floor, ceiling, outside, path };
  } catch (error) {
    console.error('Error initializing scene:', error);
    return null;
  }
}

// Setup shadows for scene elements
export function setupShadows(walls, floor, ceiling) {
  console.log('Setting up shadows for:', { walls, floor, ceiling });
  
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
  if (ceiling) ceiling.receiveShadow = true;
  
  // Setup moon light shadows with detailed logging
  if (sceneObjects.outsideElements?.moon?.moonLight) {
    console.log('Setting up moon shadows');
    
    const moonLight = sceneObjects.outsideElements.moon.moonLight;
    moonLight.castShadow = true;
    
    // Configure shadow quality
    moonLight.shadow.mapSize.width = 2048;
    moonLight.shadow.mapSize.height = 2048;
    
    // Setup shadow camera frustum
    moonLight.shadow.camera.near = 10;
    moonLight.shadow.camera.far = 200;
    moonLight.shadow.camera.left = -50;
    moonLight.shadow.camera.right = 50;
    moonLight.shadow.camera.top = 50;
    moonLight.shadow.camera.bottom = -50;
    moonLight.shadow.bias = -0.0005;
  }
  
  console.log('Shadow setup complete');
}