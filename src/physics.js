import * as THREE from 'three';
import { BOUNDARY_CONFIG, WALL_CONFIG, SCENE_CONFIG, doorZ } from './config.js';

/**
 * Check if a position would collide with any wall
 */
export function isCollidingWithWalls(position) {
    // First do a quick check if we're near the room (optimization)
    const nearRoom = (
      position.x >= -SCENE_CONFIG.roomWidth/2 - 3 &&
      position.x <= SCENE_CONFIG.roomWidth/2 + 3 &&
      position.z >= SCENE_CONFIG.wallOffset - 3 &&
      position.z <= doorZ + 3
    );
    
    if (!nearRoom) return false;
    
    // Check collision with back wall
    if (position.z >= WALL_CONFIG.backWall.minZ &&
        position.z <= WALL_CONFIG.backWall.maxZ &&
        position.x >= WALL_CONFIG.backWall.minX &&
        position.x <= WALL_CONFIG.backWall.maxX) {
      // console.log('Collision with back wall');
      return true;
    }
    
    // Check collision with left wall
    if (position.x >= WALL_CONFIG.leftWall.minX &&
        position.x <= WALL_CONFIG.leftWall.maxX &&
        position.z >= WALL_CONFIG.leftWall.minZ &&
        position.z <= WALL_CONFIG.leftWall.maxZ) {
      // console.log('Collision with left wall');
      return true;
    }
    
    // Check collision with right wall
    if (position.x >= WALL_CONFIG.rightWall.minX &&
        position.x <= WALL_CONFIG.rightWall.maxX &&
        position.z >= WALL_CONFIG.rightWall.minZ &&
        position.z <= WALL_CONFIG.rightWall.maxZ) {
      // console.log('Collision with right wall');
      return true;
    }
    
    // Check collision with front wall (except doorway)
    if (position.z >= WALL_CONFIG.frontWall.minZ &&
        position.z <= WALL_CONFIG.frontWall.maxZ &&
        position.x >= WALL_CONFIG.frontWall.minX &&
        position.x <= WALL_CONFIG.frontWall.maxX) {
        
      // Skip if in doorway
      if (position.x >= WALL_CONFIG.doorway.minX &&
          position.x <= WALL_CONFIG.doorway.maxX) {
        return false;
      }
      
      // console.log('Collision with front wall');
      return true;
    }
    
    return false;
  }

/**
 * Check if position is within game boundaries
 */
export function isWithinBoundaries(position) {
  // First check outer world boundaries
  const withinOuterBoundaries = (
    position.x >= BOUNDARY_CONFIG.minX &&
    position.x <= BOUNDARY_CONFIG.maxX &&
    position.z >= BOUNDARY_CONFIG.minZ &&
    position.z <= BOUNDARY_CONFIG.maxZ
  );
  
  if (!withinOuterBoundaries) return false;
  
  // Then check if trying to walk through walls
  if (isCollidingWithWalls(position)) {
    // Special case: Allow walking through doorway
    if (isInDoorway(position)) {
      return true;
    }
    return false;
  }
  
  return true;
}

/**
 * Check if a position is in the doorway
 * @param {THREE.Vector3} position - The position to check
 * @returns {boolean} - True if in doorway, false otherwise
 */
export function isInDoorway(position) {
    return (
      position.x >= WALL_CONFIG.doorway.minX &&
      position.x <= WALL_CONFIG.doorway.maxX &&
      position.z >= WALL_CONFIG.doorway.minZ &&
      position.z <= WALL_CONFIG.doorway.maxZ
    );
}

/**
 * Calculate sliding movement along boundaries
 * @param {THREE.Vector3} movement - Desired movement vector
 * @param {THREE.Vector3} currentPosition - Current position
 * @returns {THREE.Vector3|null} - Adjusted movement or null if no movement possible
 */
export function calculateSlideMovement(movement, currentPosition) {
    // Create a sliding movement that keeps the component that doesn't violate boundaries
    const slideMovement = new THREE.Vector3();
    
    // Try to slide in X direction
    const newPosX = currentPosition.clone().add(new THREE.Vector3(movement.x, 0, 0));
    if (isWithinBoundaries(newPosX)) {
      slideMovement.x = movement.x;
    } else {
      // Try smaller increments to get closer to walls
      const signX = Math.sign(movement.x);
      const smallerX = signX * Math.max(0.05, Math.abs(movement.x) * 0.5);
      const testPosX = currentPosition.clone().add(new THREE.Vector3(smallerX, 0, 0));
      if (isWithinBoundaries(testPosX)) {
        slideMovement.x = smallerX;
      }
    }
    
    // Try to slide in Z direction
    const newPosZ = currentPosition.clone().add(new THREE.Vector3(0, 0, movement.z));
    if (isWithinBoundaries(newPosZ)) {
      slideMovement.z = movement.z;
    } else {
      // Try smaller increments to get closer to walls
      const signZ = Math.sign(movement.z);
      const smallerZ = signZ * Math.max(0.05, Math.abs(movement.z) * 0.5);
      const testPosZ = currentPosition.clone().add(new THREE.Vector3(0, 0, smallerZ));
      if (isWithinBoundaries(testPosZ)) {
        slideMovement.z = smallerZ;
      }
    }
    
    // Check for diagonal corner cases
    if (slideMovement.x !== 0 && slideMovement.z !== 0) {
      const combinedPos = currentPosition.clone().add(slideMovement);
      if (!isWithinBoundaries(combinedPos)) {
        // If diagonal movement causes collision, prioritize the direction with larger movement
        if (Math.abs(movement.x) > Math.abs(movement.z)) {
          slideMovement.z = 0;
        } else {
          slideMovement.x = 0;
        }
      }
    }
    
    return slideMovement.length() > 0 ? slideMovement : null;
}