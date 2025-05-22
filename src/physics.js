import * as THREE from 'three';
import { BOUNDARY_CONFIG, WALL_CONFIG, SCENE_CONFIG, doorZ } from './config.js';

// Add a reference to store the table object
let tableObject = null;

/**
 * Set table reference for collision detection
 * @param {THREE.Group} table - The table object
 */
export function setTableReference(table) {
  tableObject = table;
}

/**
 * Simple doorway check 
 */
function isInDoorway(position) {
  return (position.x >= WALL_CONFIG.doorway.minX &&
          position.x <= WALL_CONFIG.doorway.maxX &&
          position.z >= WALL_CONFIG.doorway.minZ - 0.5 &&
          position.z <= WALL_CONFIG.doorway.maxZ + 0.5);
}

/**
 * Simple wall collision check
 */
export function isCollidingWithWalls(position) {
  // Skip wall checks if in doorway
  if (isInDoorway(position)) {
    return false;
  }
  
  // Check back wall
  if (position.z >= WALL_CONFIG.backWall.minZ &&
      position.z <= WALL_CONFIG.backWall.maxZ &&
      position.x >= WALL_CONFIG.backWall.minX &&
      position.x <= WALL_CONFIG.backWall.maxX) {
    return true;
  }
  
  // Check left wall
  if (position.x >= WALL_CONFIG.leftWall.minX &&
      position.x <= WALL_CONFIG.leftWall.maxX &&
      position.z >= WALL_CONFIG.leftWall.minZ &&
      position.z <= WALL_CONFIG.leftWall.maxZ) {
    return true;
  }
  
  // Check right wall
  if (position.x >= WALL_CONFIG.rightWall.minX &&
      position.x <= WALL_CONFIG.rightWall.maxX &&
      position.z >= WALL_CONFIG.rightWall.minZ &&
      position.z <= WALL_CONFIG.rightWall.maxZ) {
    return true;
  }
  
  // Check front wall (except doorway)
  if (position.z >= WALL_CONFIG.frontWall.minZ &&
      position.z <= WALL_CONFIG.frontWall.maxZ &&
      position.x >= WALL_CONFIG.frontWall.minX &&
      position.x <= WALL_CONFIG.frontWall.maxX &&
      !isInDoorway(position)) {
    return true;
  }
  
  return false;
}

/**
 * Simple table collision check
 */
function isCollidingWithTable(position) {
  if (!tableObject || !tableObject.userData || !tableObject.userData.collision) {
    return false;
  }
  
  const bounds = tableObject.userData.collision;
  
  const margin = 0.3;
  return (
    position.x >= bounds.minX - margin &&
    position.x <= bounds.maxX + margin &&
    position.z >= bounds.minZ - margin &&
    position.z <= bounds.maxZ + margin
  );
}

/**
 * Check if position is within game boundaries
 */
export function isWithinBoundaries(position) {
  // Check outer boundaries first
  if (position.x < BOUNDARY_CONFIG.minX ||
      position.x > BOUNDARY_CONFIG.maxX ||
      position.z < BOUNDARY_CONFIG.minZ ||
      position.z > BOUNDARY_CONFIG.maxZ) {
    return false;
  }
  
  // Check walls (skip if in doorway)
  if (isCollidingWithWalls(position)) {
    return false;
  }
  
  // Check table
  if (isCollidingWithTable(position)) {
    return false;
  }
  
  return true;
}

/**
 * Very simple movement calculation - no sliding or adjustments
 */
export function calculateSlideMovement(currentPosition, intendedPosition) {
  // If intended position is valid, allow it
  if (isWithinBoundaries(intendedPosition)) {
    return intendedPosition;
  }
  
  // Otherwise, stay at current position
  return currentPosition;
}