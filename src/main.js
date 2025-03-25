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
import { playerState, sceneObjects, updateGameLighting } from './gameState.js';
import { animateClouds, animateMoon } from './outsidescenery.js';

// Setup core elements
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111111);

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
init().then(sceneElements => {
  // Remove loading indicator
  document.body.removeChild(loadingStatus);
  scene.remove(loadingCube);
  
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
    
    // Update player & camera
    updateMovement(camera);
    updateCameraRotation(camera);
    
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
    // Don't stop the animation loop, just log the error
  }
}

// Initialize scene and start game
async function init() {
  console.log('Starting scene initialization...');
  
  // Initialize camera angles based on initial look direction
  const initialDirection = new THREE.Vector3().subVectors(doorPosition, camera.position).normalize();
  const initialYaw = Math.atan2(-initialDirection.x, -initialDirection.z);
  const initialPitch = Math.asin(initialDirection.y);

  setCameraAngles(initialYaw, initialPitch);
  updateCameraRotation(camera);

  try {
    console.log('Setting up scene...');
    // Setup scene using the modular approach
    const sceneElements = await setupScene(scene);
    
    if (!sceneElements) {
      throw new Error('Scene setup failed - no scene elements returned');
    }
    
    console.log('Scene elements loaded:', sceneElements);
    
    // Setup shadows with error handling
    try {
      setupShadows(sceneElements.walls, sceneElements.floor, sceneElements.ceiling);
    } catch (shadowError) {
      console.error('Error setting up shadows:', shadowError);
      // Continue anyway - shadows are not critical
    }
    
    console.log('Scene initialization complete');
    return sceneElements;
  } catch (error) {
    console.error('Error initializing scene:', error);
    throw error; // Re-throw to be handled by the Promise.catch()
  }
}

// Setup UI elements
function setupUI() {
  // Instructions UI
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