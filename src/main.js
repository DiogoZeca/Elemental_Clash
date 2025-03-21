import * as THREE from 'three';
import Stats from 'three/examples/jsm/libs/stats.module.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
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
  wallHeight: 12,      // Wall height
  floorLevel: -3,      // Floor level
  wallOffset: -13,     // Back wall position
  roomWidth: 25,       // Width of the room (X-axis)
  roomDepth: 17        // Depth of the room (Z-axis)
};

const MOVEMENT_CONFIG = {
  walkSpeed: 0.15,
  runSpeed: 0.3,
  playerHeight: 2     // Height of player camera from ground
};

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
  insideRoom: false
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

// Camera controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.enableZoom = false;
controls.enablePan = false;
controls.enableRotate = true;
controls.minPolarAngle = 0.1;
controls.maxPolarAngle = Math.PI - 0.1;
controls.target.copy(doorPosition);
controls.update();

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
  
  // Get camera direction vectors
  const direction = new THREE.Vector3();
  camera.getWorldDirection(direction);
  
  // Make direction vector horizontal (no flying up/down)
  direction.y = 0;
  direction.normalize();
  
  // Calculate the right vector (perpendicular to forward direction)
  const right = new THREE.Vector3();
  right.crossVectors(new THREE.Vector3(0, 1, 0), direction).normalize();
  
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
  controls.update();
  
  // Animate clouds 
  if (sceneClouds) {
    animateClouds(sceneClouds);
  }
  
  renderer.render(scene, camera);
  stats.update();
}

// ---- INITIALIZE ----
async function init() {
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