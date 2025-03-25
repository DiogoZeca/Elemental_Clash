import * as THREE from 'three';
import { MOVEMENT_CONFIG } from './config.js';
import { isWithinBoundaries, calculateSlideMovement } from './physics.js';
import { playerState, moveState, checkRoomEntry } from './gameState.js';

// Camera rotation variables
export let cameraPitch = 0;
export let cameraYaw = 0;

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
  
  return { pointerLockChange, handleKeyDown, handleKeyUp, updateMovement };
}

/**
 * Handle pointer lock change
 */
function pointerLockChange(element, instructions) {
  if (document.pointerLockElement === element || 
      document.mozPointerLockElement === element || 
      document.webkitPointerLockElement === element) {
    // Pointer is locked
    playerState.pointerLocked = true;
    instructions.style.display = 'none';
    document.addEventListener('mousemove', onMouseMove, false);
  } else {
    // Pointer is unlocked
    playerState.pointerLocked = false;
    instructions.style.display = 'block';
    document.removeEventListener('mousemove', onMouseMove, false);
  }
}

/**
 * Handle mouse movement for camera rotation
 */
export function onMouseMove(event) {
  if (!playerState.pointerLocked) return;
  
  const movementX = event.movementX || event.mozMovementX || event.webkitMovementX || 0;
  const movementY = event.movementY || event.mozMovementY || event.webkitMovementY || 0;
  
  // Update yaw (left/right rotation)
  cameraYaw -= movementX * MOVEMENT_CONFIG.mouseSensitivity;
  
  // Update pitch (up/down rotation)
  cameraPitch -= movementY * MOVEMENT_CONFIG.mouseSensitivity;
  
  // Limit the pitch rotation to avoid flipping
  cameraPitch = Math.max(-Math.PI/2, Math.min(Math.PI/2, cameraPitch));
}

/**
 * Update camera rotation from pitch and yaw
 */
export function updateCameraRotation(camera) {
  const euler = new THREE.Euler(cameraPitch, cameraYaw, 0, 'YXZ');
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

export function setCameraAngles(yaw, pitch) {
    cameraYaw = yaw;
    cameraPitch = pitch;
}

/**
 * Update player movement based on input and collisions
 */
export function updateMovement(camera) {
  const speed = moveState.running ? MOVEMENT_CONFIG.runSpeed : MOVEMENT_CONFIG.walkSpeed;
  
  // Get camera direction vectors for first-person movement
  const direction = new THREE.Vector3(0, 0, -1);
  direction.applyQuaternion(camera.quaternion);
  direction.y = 0; // Keep horizontal
  direction.normalize();
  
  // Calculate the right vector (perpendicular to forward direction)
  const right = new THREE.Vector3(1, 0, 0);
  right.applyQuaternion(camera.quaternion);
  right.normalize();
  
  // Calculate movement vector
  const movement = new THREE.Vector3(0, 0, 0);
  
  // Apply movement based on key states
  if (moveState.forward) movement.addScaledVector(direction, speed);
  if (moveState.backward) movement.addScaledVector(direction, -speed);
  if (moveState.left) movement.addScaledVector(right, -speed);
  if (moveState.right) movement.addScaledVector(right, speed);
  
  // Calculate new position
  const newPosition = camera.position.clone().add(movement);
  
  // Check boundaries before applying movement
  if (isWithinBoundaries(newPosition)) {
    camera.position.copy(newPosition);
  } else {
    // Optional: Allow sliding along boundaries instead of stopping completely
    const slideMovement = calculateSlideMovement(movement, camera.position);
    if (slideMovement) {
      camera.position.add(slideMovement);
    }
  }
  
  // Keep player at correct height
  camera.position.y = MOVEMENT_CONFIG.playerHeight;
  
  // Check if player has entered the room
  checkRoomEntry(camera.position);
}