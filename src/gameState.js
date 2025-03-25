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
  pointerLocked: false
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
  // Room entrance is around door position with some tolerance
  if (!playerState.insideRoom && 
      Math.abs(position.x) < 2 &&      // Centered horizontally on door
      position.z < doorZ + 2 &&        // Close to door on Z-axis
      position.z > doorZ - 2) {        // Not too far inside
    playerState.insideRoom = true;
    startGame();
  }
}

/**
 * Start game when player enters the room
 */
export function startGame() {
  console.log("Game started!");
  
  // This function will call any necessary code when the game starts
  // You can add callbacks or event emitters here
  
  // Return true to indicate game has started
  return true;
}

/**
 * Update game lighting based on game state
 */
export function updateGameLighting(pointLight) {
  if (playerState.insideRoom) {
    // Change indoor light color to indicate game has started
    pointLight.color.set(0x00ffff);
    pointLight.intensity = 1.2;
  }
}