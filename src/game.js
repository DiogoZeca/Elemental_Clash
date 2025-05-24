import { playerState, tableInteraction } from "./gameState.js";
import * as THREE from "three";
import { MOVEMENT_CONFIG } from "./config.js";
import { 
    setupCharacters, 
    animateCharacter, 
    getCharacters 
} from "./characters.js";
import { registerExitGame, startMiniGame as managerStartMiniGame } from './gameManager.js';

// Camera transition variables
let originalCameraPosition = null;
let originalCameraRotation = null;
let isInTransition = false;
let transitionStartTime = 0;
let charactersSetup = false;
const CAMERA_TRANSITION_DURATION = 1500; // 1.5 seconds

// Register exit game function with the manager
registerExitGame(function(useTransition = false) {
  console.log(`Exit game implementation called (transition: ${useTransition})`);
  
  // Remove game UI if it exists
  const gameUI = document.getElementById('game-ui');
  if (gameUI && gameUI.parentNode) {
    document.body.removeChild(gameUI);
  }
  
  // Reset table interaction state
  tableInteraction.canPlay = false;
  
  if (useTransition && originalCameraPosition && originalCameraRotation && window.gameCamera) {
    console.log('Starting exit transition...');
    // Setup reverse transition
    window.gameCamera.userData = window.gameCamera.userData || {};
    window.gameCamera.userData.transition = {
      startPosition: window.gameCamera.position.clone(),
      startRotation: window.gameCamera.quaternion.clone(),
      targetPosition: originalCameraPosition.clone(),
      targetRotation: originalCameraRotation.clone()
    };
    
    // Start transition
    isInTransition = true;
    transitionStartTime = Date.now();
    
    // Reset game state after transition completes in updateCameraTransition
  } else {
    console.log('Immediate exit without transition');
    // Reset game state immediately
    playerState.inGame = false;
    
    // Reset camera immediately
    if (originalCameraPosition && originalCameraRotation && window.gameCamera) {
      window.gameCamera.position.copy(originalCameraPosition);
      window.gameCamera.quaternion.copy(originalCameraRotation);
    }
    
    // Show instructions
    setTimeout(() => {
      if (document.getElementById("instructions")) {
        document.getElementById("instructions").style.display = "block";
      }
    }, 500);
  }
});

/**
 * Start the game with camera transition to table
 */
export function startGame(camera, table) {
  if (window.playPrompt) {
    window.playPrompt.style.display = "none";
  }
  
  // Set camera reference for other modules to use
  window.gameCamera = camera;

  if (!camera || !table) {
    startMiniGame();
    return;
  }

  // Setup characters if not already done
  if (!charactersSetup && table && table.userData && table.userData.collision) {
    // Check if characters already exist before creating new ones
    const existingCharacters = getCharacters();
    if (!existingCharacters || !existingCharacters.enemyModel) {
      console.log("Setting up characters at table");
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

  // If we have a target rotation, use it
  if (transition.targetRotation) {
    // Interpolate rotation directly
    camera.quaternion.slerpQuaternions(
      transition.startRotation,
      transition.targetRotation,
      easedProgress
    );
  } else {
    // Calculate rotation to look at table
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
  }

  // Transition complete
  if (progress >= 1.0) {
    isInTransition = false;

    // Check if this is a victory transition
    if (transition.isVictoryTransition) {
      console.log("Victory transition complete - camera now looking at sky!");
      
      // TEMPORARILY DISABLE FIREWORKS TO FIX THE ERROR
      // Instead, just add a simple console message
      console.log("🎆 Victory fireworks would appear here! 🎆");
      
      // You can add a simple DOM-based celebration effect instead
      createSimpleVictoryCelebration();
      
      return false;
    }


    
    if (transition.targetPosition === originalCameraPosition || 
        (transition.targetPosition && originalCameraPosition && 
        transition.targetPosition.distanceTo(originalCameraPosition) < 0.1)) {
      console.log("Exit transition complete");
      playerState.inGame = false;
      
      setTimeout(() => {
        if (document.getElementById("instructions")) {
          document.getElementById("instructions").style.display = "block";
        }
      }, 200);
      
      return false;
    }
    
    // If we're entering, start the mini-game
    console.log("Entry transition complete, starting mini-game");
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
    console.log("Setting enemy to idle animation");
    animateCharacter("enemy", "idle");
  }

  // Initialize the mini-game via the manager
  console.log("Calling mini-game initialization through manager");
  managerStartMiniGame();
}


/**
 * Start victory camera transition to outside and look at sky
 */
export function startVictoryTransition() {
    const camera = window.gameCamera;
    if (!camera) {
        console.error('Camera not found for victory transition');
        return false;
    }
    
    console.log('Starting victory camera transition...');
    
    // Calculate outdoor position (outside the room, looking up at sky)
    const outdoorPosition = new THREE.Vector3(0, 5, 35);
    const skyLookTarget = new THREE.Vector3(0, 20, 25);
    
    // Store original camera state
    const originalPosition = camera.position.clone();
    const originalQuaternion = camera.quaternion.clone();
    
    // Calculate target rotation to look up at the sky
    const targetQuaternion = new THREE.Quaternion();
    const targetMatrix = new THREE.Matrix4().lookAt(
        outdoorPosition,
        skyLookTarget,
        new THREE.Vector3(0, 1, 0)
    );
    targetQuaternion.setFromRotationMatrix(targetMatrix);
    
    // Setup transition data
    camera.userData = camera.userData || {};
    camera.userData.transition = {
        startPosition: originalPosition,
        startRotation: originalQuaternion,
        targetPosition: outdoorPosition,
        targetRotation: targetQuaternion,
        isVictoryTransition: true
    };
    
    // Start transition
    isInTransition = true;
    transitionStartTime = Date.now();
    
    console.log('Victory transition started from:', originalPosition, 'to:', outdoorPosition);
    
    return true;
}















/**
 * Create a simple DOM-based victory celebration instead of 3D fireworks
 */
function createSimpleVictoryCelebration() {
  console.log("Creating simple victory celebration effects");
  
  // Create celebration particles in the DOM (not Three.js)
  const celebration = document.createElement('div');
  celebration.id = 'victory-celebration';
  celebration.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 200;
    overflow: hidden;
    background: radial-gradient(circle at center, rgba(255,215,0,0.1) 0%, rgba(255,165,0,0.05) 50%, transparent 100%);
  `;
  
  // Create animated celebration elements
  const colors = ['#00ccff', '#ff6600', '#aaddff', '#ffcc00', '#ffffff'];
  const symbols = ['✨', '🎆', '⭐', '💥', '🌟', '🎉', '⚡', '💫', '🔥', '❄️'];
  
  // Create multiple waves of particles
  for (let wave = 0; wave < 3; wave++) {
    setTimeout(() => {
      createParticleWave(celebration, colors, symbols, wave);
    }, wave * 800);
  }
  
  // Add enhanced CSS animations
  const style = document.createElement('style');
  style.textContent = `
    @keyframes celebrate {
      0% {
        transform: scale(0) rotate(0deg) translateY(50px);
        opacity: 0;
        filter: blur(5px);
      }
      25% {
        opacity: 1;
        filter: blur(0px);
      }
      50% {
        transform: scale(1.8) rotate(180deg) translateY(-20px);
        opacity: 1;
      }
      75% {
        transform: scale(1.2) rotate(270deg) translateY(-40px);
        opacity: 0.8;
      }
      100% {
        transform: scale(0.3) rotate(360deg) translateY(-100px);
        opacity: 0;
        filter: blur(3px);
      }
    }
    
    @keyframes fireworks {
      0% {
        transform: scale(0) rotate(0deg);
        opacity: 0;
        filter: brightness(2) blur(2px);
      }
      15% {
        transform: scale(0.5) rotate(45deg);
        opacity: 1;
        filter: brightness(3) blur(0px);
      }
      30% {
        transform: scale(1.5) rotate(90deg);
        opacity: 1;
        filter: brightness(2.5) blur(0px);
      }
      60% {
        transform: scale(2.2) rotate(270deg);
        opacity: 0.7;
        filter: brightness(1.5) blur(1px);
      }
      100% {
        transform: scale(0.8) rotate(360deg);
        opacity: 0;
        filter: brightness(1) blur(4px);
      }
    }
    
    @keyframes sparkle {
      0%, 100% {
        transform: scale(0) rotate(0deg);
        opacity: 0;
      }
      20% {
        transform: scale(1.2) rotate(72deg);
        opacity: 1;
        filter: brightness(3);
      }
      40% {
        transform: scale(0.8) rotate(144deg);
        opacity: 0.8;
      }
      60% {
        transform: scale(1.5) rotate(216deg);
        opacity: 1;
        filter: brightness(2.5);
      }
      80% {
        transform: scale(1) rotate(288deg);
        opacity: 0.6;
      }
    }
    
    @keyframes pulse-glow {
      0%, 100% {
        box-shadow: 0 0 20px currentColor, 0 0 40px currentColor;
        transform: scale(1);
      }
      50% {
        box-shadow: 0 0 40px currentColor, 0 0 80px currentColor, 0 0 120px currentColor;
        transform: scale(1.1);
      }
    }
  `;
  document.head.appendChild(style);
  
  document.body.appendChild(celebration);
  
  // Add screen flash effect
  createScreenFlash();
  
  // Add floating victory text
  createFloatingVictoryText(celebration);
  
  // Remove celebration after animation
  setTimeout(() => {
    if (celebration.parentNode) {
      document.body.removeChild(celebration);
    }
    if (style.parentNode) {
      document.head.removeChild(style);
    }
  }, 8000);
}

function createParticleWave(container, colors, symbols, waveIndex) {
  const particleCount = 15;
  const animations = ['celebrate', 'fireworks', 'sparkle'];
  
  for (let i = 0; i < particleCount; i++) {
    const particle = document.createElement('div');
    const symbol = symbols[Math.floor(Math.random() * symbols.length)];
    const color = colors[Math.floor(Math.random() * colors.length)];
    const animation = animations[Math.floor(Math.random() * animations.length)];
    
    particle.textContent = symbol;
    particle.style.cssText = `
      position: absolute;
      font-size: ${Math.random() * 40 + 25}px;
      color: ${color};
      left: ${Math.random() * 100}%;
      top: ${Math.random() * 100}%;
      animation: ${animation} ${Math.random() * 2 + 2.5}s ease-out forwards;
      text-shadow: 
        0 0 10px ${color},
        0 0 20px ${color},
        0 0 30px ${color};
      z-index: ${201 + waveIndex};
    `;
    
    container.appendChild(particle);
    
    // Remove particle after animation
    setTimeout(() => {
      if (particle.parentNode) {
        particle.parentNode.removeChild(particle);
      }
    }, 4000);
  }
}

function createScreenFlash() {
  const flash = document.createElement('div');
  flash.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: radial-gradient(circle, rgba(255,255,255,0.3) 0%, rgba(255,215,0,0.2) 30%, transparent 70%);
    pointer-events: none;
    z-index: 199;
    animation: flash 0.8s ease-out;
  `;
  
  const flashStyle = document.createElement('style');
  flashStyle.textContent = `
    @keyframes flash {
      0% { opacity: 0; }
      20% { opacity: 1; }
      100% { opacity: 0; }
    }
  `;
  document.head.appendChild(flashStyle);
  document.body.appendChild(flash);
  
  setTimeout(() => {
    if (flash.parentNode) document.body.removeChild(flash);
    if (flashStyle.parentNode) document.head.removeChild(flashStyle);
  }, 800);
}

function createFloatingVictoryText(container) {
  const victoryText = document.createElement('div');
  victoryText.textContent = '🏆 ELEMENTAL CHAMPION! 🏆';
  victoryText.style.cssText = `
    position: absolute;
    top: 20%;
    left: 50%;
    transform: translateX(-50%);
    font-size: 48px;
    font-weight: bold;
    color: #FFD700;
    text-shadow: 
      0 0 20px #FFD700,
      0 0 40px #FFA500,
      0 0 60px #FF6600,
      3px 3px 0px #B8860B;
    animation: pulse-glow 1.5s infinite ease-in-out;
    z-index: 210;
    text-align: center;
    white-space: nowrap;
  `;
  
  container.appendChild(victoryText);
  
  // Add floating elements around the text
  const elements = ['🔥', '💧', '❄️', '⚡', '🌟'];
  elements.forEach((element, index) => {
    const floater = document.createElement('div');
    floater.textContent = element;
    floater.style.cssText = `
      position: absolute;
      top: ${15 + Math.random() * 10}%;
      left: ${20 + index * 15}%;
      font-size: 32px;
      animation: sparkle ${2 + Math.random()}s infinite ease-in-out;
      animation-delay: ${index * 0.3}s;
      text-shadow: 0 0 15px currentColor;
    `;
    container.appendChild(floater);
  });
}