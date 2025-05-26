import { Euler, Vector3 } from 'three';
import { MOVEMENT_CONFIG } from './config.js';
import { isWithinBoundaries, calculateSlideMovement } from './physics.js';
import { playerState, moveState, checkRoomEntry, tableInteraction } from './gameState.js';
import { startGame } from './game.js';

// Camera rotation variables
export let cameraPitch = 0;
export let cameraYaw = 0;

// Jump state variables
let isJumping = false;
let jumpVelocity = 0;
const jumpInitialVelocity = 0.2;
const gravity = 0.01;

/**
 * Initialize pointer lock controls
 */
export function initControls(camera, element, instructions) {
  // Click to request pointer lock
  element.addEventListener('click', () => {
    if (!playerState.pointerLocked) {
      element.requestPointerLock = element.requestPointerLock || 
                                  element.mozRequestPointerLock ||
                                  element.webkitRequestPointerLock;
      element.requestPointerLock();
    }
  });

  // Handle pointer lock change
  document.addEventListener('pointerlockchange', () => pointerLockChange(element, instructions), false);
  document.addEventListener('mozpointerlockchange', () => pointerLockChange(element, instructions), false);
  document.addEventListener('webkitpointerlockchange', () => pointerLockChange(element, instructions), false);
  
  // Handle key events
  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('keyup', handleKeyUp);
  
  // Add mouse move event listener for camera rotation
  document.addEventListener('mousemove', handleMouseMove, false);
  
  return { pointerLockChange, handleKeyDown, handleKeyUp, updateMovement };
}

/**
 * Handle pointer lock change events
 */
function pointerLockChange(element, instructions) {
  if (document.pointerLockElement === element ||
      document.mozPointerLockElement === element ||
      document.webkitPointerLockElement === element) {
    // Pointer locked - game is running
    playerState.pointerLocked = true;
    if (instructions) {
      instructions.style.display = 'none';
    }
  } else {
    // Pointer unlocked - show instructions unless in game
    playerState.pointerLocked = false;
    if (!playerState.inGame && instructions) {
      instructions.style.display = 'block';
    }
  }
}

/**
 * Handle mouse movement to rotate camera
 */
function handleMouseMove(event) {
  if (!playerState.pointerLocked || playerState.inGame) return;
  
  const movementX = event.movementX || event.mozMovementX || event.webkitMovementX || 0;
  const movementY = event.movementY || event.mozMovementY || event.webkitMovementY || 0;
  
  // Update camera rotation angles
  cameraYaw -= movementX * 0.002;
  cameraPitch -= movementY * 0.002;
  
  // Clamp vertical look (pitch) to avoid flipping
  cameraPitch = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, cameraPitch));
}

/**
 * Set camera angles directly
 */
export function setCameraAngles(yaw, pitch) {
  cameraYaw = yaw;
  cameraPitch = pitch;
}

/**
 * Update camera rotation based on current angles
 */
export function updateCameraRotation(camera) {
  // Create quaternion from Euler angles
  const euler = new Euler(cameraPitch, cameraYaw, 0, 'YXZ');
  camera.quaternion.setFromEuler(euler);
}

/**
 * Handle key down events
 */
function handleKeyDown(event) {
  switch(event.code) {
    case 'KeyW': moveState.forward = true; break;
    case 'KeyS': moveState.backward = true; break;
    case 'KeyA': moveState.left = true; break;
    case 'KeyD': moveState.right = true; break;
    case 'ShiftLeft': moveState.running = true; break;
    case 'Space': 
      if (!isJumping && !playerState.inGame) {
        isJumping = true;
        jumpVelocity = jumpInitialVelocity;
      }
      break;
    case 'KeyE': 
      // Interact with table if close enough
      if (tableInteraction.isNearTable && !tableInteraction.canPlay && window.gameCamera && window.gameTable) {
        tableInteraction.canPlay = true;
        startGame(window.gameCamera, window.gameTable);
      }
      break;
  }
}


/**
 * Handle key up events
 */
function handleKeyUp(event) {
  switch(event.code) {
    case 'KeyW': moveState.forward = false; break;
    case 'KeyS': moveState.backward = false; break;
    case 'KeyA': moveState.left = false; break;
    case 'KeyD': moveState.right = false; break;
    case 'ShiftLeft': moveState.running = false; break;
  }
}



/**
 * Update player movement based on input and collisions
 */
export function updateMovement(camera) {
  const speed = moveState.running ? MOVEMENT_CONFIG.runSpeed : MOVEMENT_CONFIG.walkSpeed;
  
  // Handle horizontal movement (same as before)
  const direction = new Vector3(0, 0, -1);
  direction.applyQuaternion(camera.quaternion);
  direction.y = 0; // Keep horizontal
  direction.normalize();
  
  // Calculate the right vector (perpendicular to forward direction)
  const right = new Vector3(1, 0, 0);
  right.applyQuaternion(camera.quaternion);
  right.normalize();
  
  // Calculate movement vector
  const movement = new Vector3(0, 0, 0);
  
  // Apply movement based on key states
  if (moveState.forward) movement.addScaledVector(direction, speed);
  if (moveState.backward) movement.addScaledVector(direction, -speed);
  if (moveState.left) movement.addScaledVector(right, -speed);
  if (moveState.right) movement.addScaledVector(right, speed);
  
  // Handle jumping and vertical movement
  if (isJumping) {
    // Apply velocity to position
    camera.position.y += jumpVelocity;
    
    // Apply gravity to velocity
    jumpVelocity -= gravity;
    
    // Check if we've landed
    if (camera.position.y <= MOVEMENT_CONFIG.playerHeight) {
      camera.position.y = MOVEMENT_CONFIG.playerHeight;
      isJumping = false;
      jumpVelocity = 0;
    }
  } else {
    // When not jumping, keep at normal height
    camera.position.y = MOVEMENT_CONFIG.playerHeight;
  }
  
  // If not moving horizontally, skip those collision checks
  if (movement.x !== 0 || movement.z !== 0) {
    // Calculate new position (only x and z)
    const newPosition = camera.position.clone().add(movement);
    
    // Check boundaries before applying movement
    if (isWithinBoundaries(newPosition)) {
      // Direct movement is possible
      camera.position.x = newPosition.x;
      camera.position.z = newPosition.z;
    } else {
      // Try separate X and Z movement to allow sliding along walls
      const xMovement = new Vector3(movement.x, 0, 0);
      const zMovement = new Vector3(0, 0, movement.z);
      
      const xPosition = camera.position.clone().add(xMovement);
      const zPosition = camera.position.clone().add(zMovement);
      
      // Check if we can move along X axis
      if (isWithinBoundaries(xPosition)) {
        camera.position.x = xPosition.x;
      }
      
      // Check if we can move along Z axis
      if (isWithinBoundaries(zPosition)) {
        camera.position.z = zPosition.z;
      }
    }
  }
  
  // Check if player has entered the room
  checkRoomEntry(camera.position);
}