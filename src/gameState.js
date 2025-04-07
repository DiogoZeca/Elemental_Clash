import * as THREE from 'three';
import { doorZ } from './config.js';

// Player movement state
export const moveState = {
  forward: false,
  backward: false,
  left: false,
  right: false,
  running: false
};

// Player game state
export const playerState = {
  insideRoom: false,
  pointerLocked: false,
  inGame: false
};

// Scene objects references
export const sceneObjects = {
  clouds: null,
  outsideElements: null
};

/**
 * Check if player has entered the room
 */
export function checkRoomEntry(position) {
  if (!playerState.insideRoom && 
      Math.abs(position.x) < 2 &&
      position.z < doorZ + 2 &&
      position.z > doorZ - 2) {
    playerState.insideRoom = true;
    onRoomEntry();
  }
}

/**
 * Actions to perform when player enters the room
 */
export function onRoomEntry() {
  // Room entry logic here
  return true;
}

/**
 * Update game lighting based on game state
 */
export function updateGameLighting(pointLight) {
  if (playerState.insideRoom) {
    pointLight.color.set(0x00ffff);
    pointLight.intensity = 1.2;
  }
}

// Table interaction state
export const tableInteraction = {
  isNearTable: false,
  tablePlayDistance: 12, 
  canPlay: false
};

/**
 * Check if player is near the table for starting the game
 * @param {THREE.Vector3} playerPosition - Current player position
 * @param {THREE.Object3D} table - Reference to the table object
 */
export function checkTableProximity(playerPosition, table) {
  if (!table || !table.userData || !table.userData.collision) {
    return false;
  }
  
  try {
    // Get table center position
    const tablePosition = new THREE.Vector3(
      (table.userData.collision.minX + table.userData.collision.maxX) / 2,
      playerPosition.y,
      (table.userData.collision.minZ + table.userData.collision.maxZ) / 2
    );
    
    // Calculate distance to table
    const distance = playerPosition.distanceTo(tablePosition);
    
    // Update state if near table
    const wasNearTable = tableInteraction.isNearTable;
    tableInteraction.isNearTable = (distance < tableInteraction.tablePlayDistance);
    
    // If state changed, update UI
    if (wasNearTable !== tableInteraction.isNearTable && window.playPrompt) {
      window.playPrompt.style.display = tableInteraction.isNearTable ? 'block' : 'none';
      
      if (tableInteraction.isNearTable) {
        window.playPrompt.style.opacity = '0';
        setTimeout(() => {
          window.playPrompt.style.transition = 'opacity 0.5s';
          window.playPrompt.style.opacity = '1';
        }, 10);
      }
    }
    
    return tableInteraction.isNearTable;
  } catch (error) {
    return false;
  }
}