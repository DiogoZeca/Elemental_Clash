import { playerState, tableInteraction } from './gameState.js';
import * as THREE from 'three';
import { MOVEMENT_CONFIG } from './config.js';

// Add these variables for camera transition
let originalCameraPosition = null;
let originalCameraRotation = null;
let isInTransition = false;
let transitionStartTime = 0;
const CAMERA_TRANSITION_DURATION = 1500; // 1.5 seconds

/**
 * Start the game with camera transition to table
 */
export function startGame(camera, table) {
  // Hide play prompt
  if (window.playPrompt) {
    window.playPrompt.style.display = 'none';
  }
  
  // Skip transition if camera or table not provided
  if (!camera || !table) {
    showGameUI();
    return;
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
    
    // Calculate position in front of the table (near side)
    const sittingPosition = new THREE.Vector3(
        tableData.maxX + 2.0, // 2 units to the right of the table edge
        tableCenter.y,        // Same Y height (sitting)
        tableCenter.z         // Centered on Z axis
      );
    
    // Setup transition data
    camera.userData = camera.userData || {};
    camera.userData.transition = {
      startPosition: camera.position.clone(),
      startRotation: camera.quaternion.clone(),
      targetPosition: sittingPosition,
      lookAtPoint: tableCenter
    };
    
    // Start transition
    isInTransition = true;
    transitionStartTime = Date.now();
    playerState.inGame = true; // Lock player movement during transition
    
    return;
  }
  
  // Fallback if no table data
  showGameUI();
}

/**
 * Update camera transition animation
 */
export function updateCameraTransition(camera) {
  if (!isInTransition || !camera || !camera.userData?.transition) return false;
  
  const elapsed = Date.now() - transitionStartTime;
  const progress = Math.min(elapsed / CAMERA_TRANSITION_DURATION, 1.0);
  
  // Smooth easing
  const easedProgress = progress < 0.5 
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
  const lookDirection = new THREE.Vector3().subVectors(
    transition.lookAtPoint, 
    camera.position
  ).normalize();
  
  const rotationMatrix = new THREE.Matrix4().lookAt(
    camera.position,
    transition.lookAtPoint,
    new THREE.Vector3(0, 1, 0)
  );
  
  const targetRotation = new THREE.Quaternion().setFromRotationMatrix(rotationMatrix);
  
  // Interpolate rotation
  camera.quaternion.slerpQuaternions(
    transition.startRotation,
    targetRotation,
    easedProgress
  );
  
  // Transition complete
  if (progress >= 1.0) {
    isInTransition = false;
    showGameUI();
    return false;
  }
  
  return true;
}

/**
 * Show the game UI
 */
function showGameUI() {
  // Create game UI
  const gameUI = document.createElement('div');
  gameUI.id = 'game-ui';
  gameUI.style.position = 'absolute';
  gameUI.style.top = '0';
  gameUI.style.left = '0';
  gameUI.style.width = '100%';
  gameUI.style.height = '100%';
  gameUI.style.backgroundColor = 'rgba(0,0,0,0.7)';
  gameUI.style.zIndex = '200';
  gameUI.style.display = 'flex';
  gameUI.style.flexDirection = 'column';
  gameUI.style.justifyContent = 'center';
  gameUI.style.alignItems = 'center';
  gameUI.style.color = '#ffffff';
  gameUI.style.fontFamily = 'Arial, sans-serif';
  
  // Add game title
  const title = document.createElement('h1');
  title.textContent = 'Elemental Clash';
  title.style.color = '#ff5555';
  title.style.marginBottom = '20px';
  gameUI.appendChild(title);
  
  // Add game message
  const message = document.createElement('p');
  message.textContent = 'Card game interface goes here...';
  message.style.marginBottom = '30px';
  gameUI.appendChild(message);
  
  // Add exit button
  const exitButton = document.createElement('button');
  exitButton.textContent = 'Exit Game';
  exitButton.style.padding = '10px 20px';
  exitButton.style.backgroundColor = '#ff5555';
  exitButton.style.border = 'none';
  exitButton.style.borderRadius = '5px';
  exitButton.style.cursor = 'pointer';
  exitButton.onclick = exitGame;
  gameUI.appendChild(exitButton);
  
  // Add to document
  document.body.appendChild(gameUI);
  
  // Disable pointer lock to free the mouse for the UI
  document.exitPointerLock();
  
  // Lock player movement
  playerState.inGame = true;
}

/**
 * Exit the game
 */
function exitGame() {
    // Remove game UI
    const gameUI = document.getElementById('game-ui');
    if (gameUI) {
        document.body.removeChild(gameUI);
    }

    // Reset game state flags
    playerState.inGame = false;

    // Reset table interaction state - ADD THIS LINE
    tableInteraction.canPlay = false;

    // Reset camera position if we stored the original
    if (originalCameraPosition && originalCameraRotation && window.gameCamera) {
        // Teleport back to original position instead of animating
        window.gameCamera.position.copy(originalCameraPosition);
        window.gameCamera.quaternion.copy(originalCameraRotation);
    }

    // Re-enable interaction after a short delay
    setTimeout(() => {
        document.getElementById('instructions').style.display = 'block';
    }, 500);
}

export { exitGame };