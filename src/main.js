import * as THREE from 'three';
import Stats from 'three/examples/jsm/libs/stats.module.js';
import { 
  createWallEnvironment,
  createMetalCeiling,
  createTilesFloor
} from './sceneLoader.js';
import {
  createOutsideScenery,
  addClouds,
  animateClouds,
  createPathToEntrance
} from './outsidescenery.js';

// ---- CONSTANTS & CONFIGURATION ----
const SCENE_CONFIG = {
  wallHeight: 12,
  floorLevel: -3,
  wallOffset: -13,
  roomWidth: 25,
  roomDepth: 17
};

const MOVEMENT_CONFIG = {
  walkSpeed: 0.15,
  runSpeed: 0.3,
  playerHeight: 2,
  mouseSensitivity: 0.002 // Add mouse sensitivity setting
};

let cameraPitch = 0;
let cameraYaw = 0;

// ---- SCENE SETUP ----
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111111);

// ---- OBJECT REFERENCES ----
let sceneClouds = null;
let outsideElements = null;

// ---- PLAYER STATE ----
const moveState = {
  forward: false,
  backward: false,
  left: false,
  right: false,
  running: false
};


const playerState = {
  insideRoom: false,
  pointerLocked: false // Track if pointer is locked
};

// Camera setup
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);

// Calculate the door position from scene configuration
const doorZ = SCENE_CONFIG.wallOffset + SCENE_CONFIG.roomDepth;
const doorPosition = new THREE.Vector3(0, MOVEMENT_CONFIG.playerHeight, doorZ);

// Position player OUTSIDE the room, facing TOWARD the door
camera.position.set(0, MOVEMENT_CONFIG.playerHeight, doorZ + 25);
camera.lookAt(doorPosition);

// Renderer setup
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

// Remove OrbitControls setup and add instructions
const instructions = document.createElement('div');
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

// ---- FIRST PERSON CONTROLS ----
// Set up pointer lock API
const element = document.body;

// Initial pointer lock request
renderer.domElement.addEventListener('click', () => {
  if (!playerState.pointerLocked) {
    element.requestPointerLock = element.requestPointerLock || 
                                element.mozRequestPointerLock ||
                                element.webkitRequestPointerLock;
    element.requestPointerLock();
  }
});

// Pointer lock change event listener
document.addEventListener('pointerlockchange', pointerLockChange, false);
document.addEventListener('mozpointerlockchange', pointerLockChange, false);
document.addEventListener('webkitpointerlockchange', pointerLockChange, false);

function pointerLockChange() {
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

// Mouse movement handler for first-person camera
function onMouseMove(event) {
  if (!playerState.pointerLocked) return;
  
  const movementX = event.movementX || event.mozMovementX || event.webkitMovementX || 0;
  const movementY = event.movementY || event.mozMovementY || event.webkitMovementY || 0;
  
  // Update yaw (left/right rotation)
  cameraYaw -= movementX * MOVEMENT_CONFIG.mouseSensitivity;
  
  // Update pitch (up/down rotation)
  cameraPitch -= movementY * MOVEMENT_CONFIG.mouseSensitivity;
  
  // Limit the pitch rotation to avoid flipping
  cameraPitch = Math.max(-Math.PI/2, Math.min(Math.PI/2, cameraPitch));
  
  // Apply rotation to camera using quaternions with proper order
  const euler = new THREE.Euler(cameraPitch, cameraYaw, 0, 'YXZ');
  camera.quaternion.setFromEuler(euler);
}


// Performance stats
const stats = new Stats();
document.body.appendChild(stats.dom);

// ---- LIGHTING ----
// Ambient light (soft overall illumination for night scene)
const ambientLight = new THREE.AmbientLight(0x202040, 0.2);
scene.add(ambientLight);

// Point light for indoor highlights
const pointLight = new THREE.PointLight(0xffffcc, 0.4);
pointLight.position.set(0, 2, -1);
pointLight.castShadow = true;
pointLight.shadow.mapSize.width = 1024;
pointLight.shadow.mapSize.height = 1024;
scene.add(pointLight);

// ---- PLAYER MOVEMENT FUNCTIONS ----
function handleKeyDown(event) {
  switch(event.code) {
    case 'KeyW': moveState.forward = true; break;
    case 'KeyS': moveState.backward = true; break;
    case 'KeyA': moveState.left = true; break;
    case 'KeyD': moveState.right = true; break;
    case 'ShiftLeft': moveState.running = true; break;
  }
}

function handleKeyUp(event) {
  switch(event.code) {
    case 'KeyW': moveState.forward = false; break;
    case 'KeyS': moveState.backward = false; break;
    case 'KeyA': moveState.left = false; break;
    case 'KeyD': moveState.right = false; break;
    case 'ShiftLeft': moveState.running = false; break;
  }
}

function updateMovement() {
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
  
  // Apply the combined movement
  camera.position.add(movement);
  
  // Keep player at correct height
  camera.position.y = MOVEMENT_CONFIG.playerHeight;
  
  // Check if player has entered the room
  checkRoomEntry();
}

// ---- GAME STATE FUNCTIONS ----
function checkRoomEntry() {
  // Room entrance is around door position with some tolerance
  if (!playerState.insideRoom && 
      Math.abs(camera.position.x) < 2 &&      // Centered horizontally on door
      camera.position.z < doorZ + 2 &&        // Close to door on Z-axis
      camera.position.z > doorZ - 2) {        // Not too far inside
    playerState.insideRoom = true;
    startGame();
  }
}

function startGame() {
  console.log("Game started!");
  
  // Change indoor light color to indicate game has started
  pointLight.color.set(0x00ffff);
  pointLight.intensity = 1.2;
  
  // More game initialization can be added here
}

// ---- ANIMATION & RENDERING ----
function animate() {
  requestAnimationFrame(animate);
  
  updateMovement();
  
  // Animate clouds 
  if (sceneClouds) {
    animateClouds(sceneClouds);
  }
  
  renderer.render(scene, camera);
  stats.update();
}

// ---- INITIALIZE ----
async function init() {

  // Initialize camera angles based on initial look direction
  const initialDirection = new THREE.Vector3().subVectors(doorPosition, camera.position).normalize();
  cameraYaw = Math.atan2(-initialDirection.x, -initialDirection.z);
  cameraPitch = Math.asin(initialDirection.y);

  // Apply initial rotation
  const euler = new THREE.Euler(cameraPitch, cameraYaw, 0, 'YXZ');
  camera.quaternion.setFromEuler(euler);

  // Create path to room entrance
  const entrancePath = createPathToEntrance(scene, {
    startPosition: new THREE.Vector3(0, -3.1, doorZ + 25),
    endPosition: new THREE.Vector3(0, -3.1, doorZ),
    width: 3.5
  });

  try {
    // Load environment elements in parallel
    const [walls, floor, ceiling, outside] = await Promise.all([
      // Use concrete walls
      createWallEnvironment(scene, {
        wallHeight: SCENE_CONFIG.wallHeight,  
        floorLevel: SCENE_CONFIG.floorLevel,
        wallOffset: SCENE_CONFIG.wallOffset,
        backWallWidth: SCENE_CONFIG.roomWidth,
        sideWallLength: SCENE_CONFIG.roomDepth,
        useConcrete: true,
        includeFrontWall: true
      }),
      
      // Create tiles floor
      createTilesFloor(scene, {
        width: SCENE_CONFIG.roomWidth,
        depth: SCENE_CONFIG.roomDepth,
        floorLevel: SCENE_CONFIG.floorLevel,
        wallOffset: SCENE_CONFIG.wallOffset
      }),
      
      // Metal ceiling
      createMetalCeiling(scene, {
        width: SCENE_CONFIG.roomWidth,
        depth: SCENE_CONFIG.roomDepth,
        ceilingHeight: SCENE_CONFIG.wallHeight,
        floorLevel: SCENE_CONFIG.floorLevel,
        wallOffset: SCENE_CONFIG.wallOffset,
        useNewMetal: true
      }),
      
      // Outside scenery with moon as main light source
      createOutsideScenery(scene, {
        groundSize: 150,
        skyboxSize: 600,
        mountainsEnabled: false,
        moonEnabled: true,
        starsEnabled: true
      })
    ]);

    // Store references to outside elements (including moon)
    outsideElements = outside;
    
    // Add clouds
    sceneClouds = addClouds(scene, {
      count: 15,
      minHeight: 25,
      maxHeight: 45
    });

    // Setup shadows
    setupShadows(walls, floor, ceiling);
    
  } catch (error) {
    console.error("Error loading assets:", error);
  }
  
  // Start animation loop
  animate();
}

// Setup shadows for key scene elements
function setupShadows(walls, floor, ceiling) {
  if (walls) {
    // Make walls receive and cast shadows
    if (walls.frontWall) walls.frontWall.receiveShadow = walls.frontWall.castShadow = true;
    if (walls.backWall) walls.backWall.receiveShadow = walls.backWall.castShadow = true;
    if (walls.leftWall) walls.leftWall.receiveShadow = walls.leftWall.castShadow = true;
    if (walls.rightWall) walls.rightWall.receiveShadow = walls.rightWall.castShadow = true;
  }
  
  if (floor) floor.receiveShadow = true;
  if (ceiling) ceiling.receiveShadow = true;
  
  // Configure moon light shadows
  if (outsideElements?.moon?.moonLight) {
    const moonLight = outsideElements.moon.moonLight;
    moonLight.castShadow = true;
    moonLight.shadow.mapSize.width = 2048;
    moonLight.shadow.mapSize.height = 2048;
    moonLight.shadow.camera.near = 10;
    moonLight.shadow.camera.far = 200;
    moonLight.shadow.camera.left = -50;
    moonLight.shadow.camera.right = 50;
    moonLight.shadow.camera.top = 50;
    moonLight.shadow.camera.bottom = -50;
    moonLight.shadow.bias = -0.0005;
  }
}

// ---- EVENT HANDLERS ----
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
window.addEventListener('keydown', handleKeyDown);
window.addEventListener('keyup', handleKeyUp);

// Start the application
init();