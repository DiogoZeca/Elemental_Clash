import { playerState, tableInteraction } from "./gameState.js";
import * as THREE from "three";
import { MOVEMENT_CONFIG } from "./config.js";
import { initGame } from "./miniGame.js";
import {
  setupCharacters,
  animateCharacter,
  getCharacters,
} from "./characters.js";

// Camera transition variables
let originalCameraPosition = null;
let originalCameraRotation = null;
let isInTransition = false;
let transitionStartTime = 0;
let charactersSetup = false;
const CAMERA_TRANSITION_DURATION = 1500; // 1.5 seconds

/**
 * Start the game with camera transition to table
 */
export function startGame(camera, table) {
  if (window.playPrompt) {
    window.playPrompt.style.display = "none";
  }

  if (!camera || !table) {
    startMiniGame();
    return;
  }

  // Setup characters if not already done
  if (!charactersSetup && table && table.userData && table.userData.collision) {
    // Check if characters already exist before creating new ones
    const existingCharacters = getCharacters();
    if (!existingCharacters.enemyModel) {
      setupCharacters(camera.parent, table.userData.collision);
    }
    charactersSetup = true;
  }

  // Store original camera position and rotation
  originalCameraPosition = camera.position.clone();
  originalCameraRotation = camera.quaternion.clone();

  // Calculate table position for sitting
  if (table.userData && table.userData.collision) {
    const tableData = table.userData.collision;
    const tableCenter = new THREE.Vector3(
      (tableData.minX + tableData.maxX) / 2,
      MOVEMENT_CONFIG.playerHeight - 0.5, // Slightly lower for sitting
      (tableData.minZ + tableData.maxZ) / 2
    );

    // Calculate position on the right side of the table
    const sittingPosition = new THREE.Vector3(
      tableData.maxX + 2.0,
      tableCenter.y,
      tableCenter.z
    );

    // Setup transition data
    camera.userData = camera.userData || {};
    camera.userData.transition = {
      startPosition: camera.position.clone(),
      startRotation: camera.quaternion.clone(),
      targetPosition: sittingPosition,
      lookAtPoint: tableCenter,
    };

    // Start transition
    isInTransition = true;
    transitionStartTime = Date.now();
    playerState.inGame = true; // Lock player movement during transition

    return;
  }

  // Fallback if no table data
  startMiniGame();
}

/**
 * Update camera transition animation
 */
export function updateCameraTransition(camera) {
  if (!isInTransition || !camera || !camera.userData?.transition) return false;

  const elapsed = Date.now() - transitionStartTime;
  const progress = Math.min(elapsed / CAMERA_TRANSITION_DURATION, 1.0);

  // Smooth easing
  const easedProgress =
    progress < 0.5
      ? 2 * progress * progress
      : 1 - Math.pow(-2 * progress + 2, 2) / 2;

  const transition = camera.userData.transition;

  // Interpolate position
  camera.position.lerpVectors(
    transition.startPosition,
    transition.targetPosition,
    easedProgress
  );

  // Calculate rotation to look at table
  const lookDirection = new THREE.Vector3()
    .subVectors(transition.lookAtPoint, camera.position)
    .normalize();

  const rotationMatrix = new THREE.Matrix4().lookAt(
    camera.position,
    transition.lookAtPoint,
    new THREE.Vector3(0, 1, 0)
  );

  const targetRotation = new THREE.Quaternion().setFromRotationMatrix(
    rotationMatrix
  );

  // Interpolate rotation
  camera.quaternion.slerpQuaternions(
    transition.startRotation,
    targetRotation,
    easedProgress
  );

  // Transition complete
  if (progress >= 1.0) {
    isInTransition = false;
    startMiniGame();
    return false;
  }

  return true;
}

/**
 * Start the mini-game after camera transition completes
 */
function startMiniGame() {
  // Disable pointer lock to free the mouse for the UI
  document.exitPointerLock();

  // Lock player movement
  playerState.inGame = true;

  if (charactersSetup) {
    animateCharacter("enemy", "idle");
  }

  // Initialize the mini-game
  initGame();
}

/**
 * Exit the game
 */
function exitGame() {
  // Remove game UI
  const gameUI = document.getElementById("game-ui");
  if (gameUI) {
    document.body.removeChild(gameUI);
  }

  // Reset game state flags
  playerState.inGame = false;

  // Reset table interaction state
  tableInteraction.canPlay = false;

  // Reset camera position if we stored the original
  if (originalCameraPosition && originalCameraRotation && window.gameCamera) {
    // Teleport back to original position instead of animating
    window.gameCamera.position.copy(originalCameraPosition);
    window.gameCamera.quaternion.copy(originalCameraRotation);
  }

  // Re-enable interaction after a short delay
  setTimeout(() => {
    document.getElementById("instructions").style.display = "block";
  }, 500);
}

export { exitGame };
