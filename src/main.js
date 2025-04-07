import * as THREE from 'three';
import Stats from 'three/examples/jsm/libs/stats.module.js';

// Import configurations
import { SCENE_CONFIG, MOVEMENT_CONFIG, doorZ } from './config.js';

// Import core modules
import { setupBaseLighting } from './lighting.js';
import { setupScene, setupShadows } from './scene.js';
import { 
  initControls, 
  updateCameraRotation, 
  updateMovement,
  setCameraAngles // Add this import
} from './controls.js';
import { playerState, sceneObjects, updateGameLighting, checkTableProximity, tableInteraction } from './gameState.js';
import { animateClouds, animateMoon, createRocks } from './outsidescenery.js';
import { startGame } from './game.js';

// Setup core elements
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111111);

let sceneElements = null;

// Add a simple visual reference while loading
const loadingGeometry = new THREE.BoxGeometry(5, 5, 5);
const loadingMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
const loadingCube = new THREE.Mesh(loadingGeometry, loadingMaterial);
loadingCube.position.set(0, 0, -10);
scene.add(loadingCube);

const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);

const doorPosition = new THREE.Vector3(0, MOVEMENT_CONFIG.playerHeight, doorZ);
camera.position.set(0, MOVEMENT_CONFIG.playerHeight, doorZ + 25);
camera.lookAt(doorPosition);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

// Setup UI
setupUI();

// Initialize controls
initControls(camera, document.body, instructions);

// Performance monitor
const stats = new Stats();
document.body.appendChild(stats.dom);

// Setup lighting
const { ambientLight, pointLight } = setupBaseLighting(scene);

// Add foggy environment
scene.fog = new THREE.FogExp2(0x221122, 0.008);
scene.background = new THREE.Color(0x111111);

// Show loading status
const loadingStatus = document.createElement('div');
loadingStatus.style.position = 'absolute';
loadingStatus.style.top = '50%';
loadingStatus.style.left = '50%';
loadingStatus.style.transform = 'translate(-50%, -50%)';
loadingStatus.style.color = '#ffffff';
loadingStatus.style.fontFamily = 'Arial, sans-serif';
loadingStatus.style.fontSize = '24px';
loadingStatus.style.textAlign = 'center';
loadingStatus.innerHTML = 'Loading...';
document.body.appendChild(loadingStatus);

// Simple animation loop to show something while loading
function loadingAnimation() {
  if (document.querySelector('#loading-status')) {
    requestAnimationFrame(loadingAnimation);
    loadingCube.rotation.x += 0.01;
    loadingCube.rotation.y += 0.01;
    renderer.render(scene, camera);
    stats.update();
  }
}
loadingAnimation();

// Initialize the scene and start animation loop with proper error handling
init().then(elements => {
  document.body.removeChild(loadingStatus);
  scene.remove(loadingCube);
  
  sceneElements = elements; 

  console.log('Scene initialization successful:', sceneElements);
  // Start the main animation loop
  animate();
}).catch(error => {
  console.error('Failed to initialize scene:', error);
  loadingStatus.innerHTML = `Error: ${error.message}<br>Check console for details`;
  loadingStatus.style.color = 'red';
});

// Animation loop with error handling
function animate() {
  requestAnimationFrame(animate);
  
  try {
    const time = Date.now();
    
    // Skip movement updates if in card game
    if (!playerState.inGame) {
      // Update player & camera
      updateMovement(camera);
      updateCameraRotation(camera);
      
      // Check table proximity if the game is active
      if (playerState.insideRoom && sceneElements && sceneElements.table) {
        checkTableProximity(camera.position, sceneElements.table);
      }
    }
    
    if (pointLight) {
      updateGameLighting(pointLight);
    }
    
    // Animate scene elements with proper checks
    if (sceneObjects) {
      if (sceneObjects.clouds) {
        animateClouds(sceneObjects.clouds);
      }
      
      if (sceneObjects.outsideElements?.moon) {
        animateMoon(sceneObjects.outsideElements.moon, time);
      }
    }
    
    renderer.render(scene, camera);
    stats.update();
  } catch (error) {
    console.error('Error in animation loop:', error);
  }
}

// Initialize scene and start game
async function init() {
  // Initialize camera angles based on initial look direction
  const initialDirection = new THREE.Vector3().subVectors(doorPosition, camera.position).normalize();
  const initialYaw = Math.atan2(-initialDirection.x, -initialDirection.z);
  const initialPitch = Math.asin(initialDirection.y);

  setCameraAngles(initialYaw, initialPitch);
  updateCameraRotation(camera);

  try {
    // Setup scene using the modular approach
    const sceneElements = await setupScene(scene);
    
    if (!sceneElements) {
      throw new Error('Scene setup failed - no scene elements returned');
    }
    
    // Setup shadows with error handling
    try {
      setupShadows(sceneElements.walls, sceneElements.floor, sceneElements.ceiling);
    } catch (shadowError) {
      // Continue anyway - shadows are not critical
    }
    
    return sceneElements;
  } catch (error) {
    throw error; // Re-throw to be handled by the Promise.catch()
  }
}

// Setup UI elements
function setupUI() {
  // Instructions UI (existing code remains the same)
  window.instructions = document.createElement('div');
  instructions.id = 'instructions';
  instructions.style.position = 'absolute';
  instructions.style.top = '10px';
  instructions.style.width = '100%';
  instructions.style.textAlign = 'center';
  instructions.style.color = '#ffffff';
  instructions.style.fontFamily = 'Arial, sans-serif';
  instructions.style.fontSize = '14px';
  instructions.style.padding = '10px';
  instructions.style.backgroundColor = 'rgba(0,0,0,0.5)';
  instructions.style.zIndex = '100';
  instructions.innerHTML = 'Click to start<br>WASD = Move, SHIFT = Run, Mouse = Look';
  document.body.appendChild(instructions);
  
  // Enhanced Play Game UI (initially hidden)
  window.playPrompt = document.createElement('div');
  playPrompt.id = 'play-prompt';
  playPrompt.style.position = 'absolute';
  playPrompt.style.top = '50%';
  playPrompt.style.left = '50%';
  playPrompt.style.transform = 'translate(-50%, -50%)';
  playPrompt.style.fontFamily = '"Trebuchet MS", Arial, sans-serif';
  playPrompt.style.padding = '35px 50px';
  playPrompt.style.borderRadius = '15px';
  playPrompt.style.zIndex = '100';
  playPrompt.style.display = 'none';
  
  // Elemental themed background with tri-color gradient
  playPrompt.style.background = 'linear-gradient(135deg, rgba(0,102,204,0.85) 0%, rgba(138,43,226,0.85) 50%, rgba(204,51,0,0.85) 100%)';
  playPrompt.style.boxShadow = `
    0 0 30px rgba(0, 102, 204, 0.6),
    0 0 60px rgba(204, 51, 0, 0.4),
    inset 0 0 20px rgba(255, 255, 255, 0.15)
  `;
  playPrompt.style.border = '2px solid rgba(255,255,255,0.3)';
  
  // Add animation
  playPrompt.style.animation = 'elementalPulse 3s infinite ease-in-out';
  
  // Create a style element for the animation
  const style = document.createElement('style');
  style.textContent = `
    @keyframes elementalPulse {
      0% { 
        transform: translate(-50%, -50%) scale(1); 
        box-shadow: 0 0 30px rgba(0, 102, 204, 0.6), 0 0 60px rgba(204, 51, 0, 0.4); 
      }
      33% { 
        transform: translate(-50%, -50%) scale(1.03); 
        box-shadow: 0 0 40px rgba(0, 102, 204, 0.7), 0 0 20px rgba(204, 51, 0, 0.3); 
      }
      66% { 
        transform: translate(-50%, -50%) scale(1.05); 
        box-shadow: 0 0 30px rgba(138, 43, 226, 0.6), 0 0 50px rgba(0, 102, 204, 0.4); 
      }
      100% { 
        transform: translate(-50%, -50%) scale(1); 
        box-shadow: 0 0 30px rgba(0, 102, 204, 0.6), 0 0 60px rgba(204, 51, 0, 0.4); 
      }
    }
    
    .elemental-icon {
      font-size: 28px;
      position: relative;
      display: inline-block;
      animation-duration: 2s;
      animation-iteration-count: infinite;
      animation-timing-function: ease-in-out;
    }
    
    .fire-icon {
      color: #ff6600;
      text-shadow: 0 0 10px #ff3300;
      animation-name: fireFlicker;
    }
    
    .water-icon {
      color: #00ccff;
      text-shadow: 0 0 10px #0088ff;
      animation-name: waterFlow;
    }
    
    .ice-icon {
      color: #aaddff;
      text-shadow: 0 0 10px #88ccff;
      animation-name: iceShimmer;
    }
    
    @keyframes fireFlicker {
      0%, 100% { transform: scale(1); text-shadow: 0 0 10px #ff3300; }
      50% { transform: scale(1.1); text-shadow: 0 0 15px #ff3300, 0 0 20px #ff6600; }
    }
    
    @keyframes waterFlow {
      0%, 100% { transform: translateY(0px); }
      50% { transform: translateY(-3px); }
    }
    
    @keyframes iceShimmer {
      0%, 100% { opacity: 0.8; }
      50% { opacity: 1; text-shadow: 0 0 15px #88ccff, 0 0 20px white; }
    }
  `;
  document.head.appendChild(style);
  
  // Enhanced content with elemental icons and themed text
  playPrompt.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: center;">
      <div class="elemental-icon ice-icon" style="margin-right: 12px;">❄️</div>
      <div class="elemental-icon water-icon" style="margin-right: 12px;">💧</div>
      <div>
        <div style="font-size: 30px; font-weight: bold; margin-bottom: 10px; text-shadow: 0 2px 5px rgba(0,0,0,0.5); text-align: center;">
          <span style="color: #aaddff;">Ele</span><span style="color: #00ccff;">men</span><span style="color: #ff6600;">tal</span>
          <span style="color: #ffffff;">Clash</span>
        </div>
        <div style="font-size: 20px; color: #ffffff; text-shadow: 0 1px 3px rgba(0,0,0,0.5); text-align: center;">
          Press <span style="color:#ffffff; font-weight:bold; background: linear-gradient(90deg, rgba(0,102,204,0.7), rgba(204,51,0,0.7)); padding: 3px 12px; border-radius: 4px; box-shadow: 0 0 5px rgba(255,255,255,0.3);">E</span> to Play
        </div>
      </div>
      <div class="elemental-icon fire-icon" style="margin-left: 12px;">🔥</div>
    </div>
    
    <!-- Add decorative elemental border -->
    <div style="position: absolute; top: -2px; left: -2px; right: -2px; bottom: -2px; border-radius: 15px; pointer-events: none; 
         background: linear-gradient(45deg, #00ccff, transparent, #ff6600), 
                    linear-gradient(135deg, #aaddff, transparent, #ff3300);
         opacity: 0.3; z-index: -1;"></div>
  `;
  
  document.body.appendChild(playPrompt);
}

// Handle window resize events
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Global error handler
window.addEventListener('error', event => {
  console.error('Global error:', event.error);
});