import * as THREE from 'three';
import Stats from 'three/examples/jsm/libs/stats.module.js';
import { 
  loadMetalPlateModel, 
  setupModel, 
  createMetalPlateMaterial, 
  createWallEnvironment,
  createMetalMaterial,
  createMetalFloor,
  createMetalCeiling,
  createConcreteMaterial
} from './sceneLoader.js';

// ---- SCENE SETUP ----
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111111);

// Camera setup
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(0, 2, 5);

// Renderer setup
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

// Optional: Performance stats
const stats = new Stats();
document.body.appendChild(stats.dom);

// ---- LIGHTING ----
// Ambient light (soft overall illumination)
const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambientLight);

// Directional light (simulates sunlight)
const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(2, 2, 5);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.width = 1024;
directionalLight.shadow.mapSize.height = 1024;
scene.add(directionalLight);

// Point light (for highlights)
const pointLight = new THREE.PointLight(0xffffcc, 0.8);
pointLight.position.set(0, 2, -1);
scene.add(pointLight);

// ---- ANIMATION & RENDERING ----
function animate() {
  requestAnimationFrame(animate);
  
  // Update any animations here
  
  // Render scene
  renderer.render(scene, camera);
  
  // Update stats
  stats.update();
}

// ---- INITIALIZE ----
async function init() {
  console.log("Initializing...");
  
  // IMMEDIATE VISUAL - Create a simple cube to verify rendering
  const simpleGeometry = new THREE.BoxGeometry(1, 1, 1);
  const simpleMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 });
  const simpleCube = new THREE.Mesh(simpleGeometry, simpleMaterial);
  simpleCube.position.set(0, 0, -3);
  scene.add(simpleCube);
  
  console.log("Simple cube added to scene");
  
  // Render the scene immediately to see if basic rendering works
  renderer.render(scene, camera);

    // Define shared configuration for consistent dimensions
    const sharedConfig = {
      wallHeight: 15,      // Wall height
      floorLevel: -3,      // Floor level
      wallOffset: -10,     // Back wall position
      roomWidth: 20,       // Width of the room (X-axis)
      roomDepth: 15        // Depth of the room (Z-axis)
    };
  
    try {
      // Load environment elements in parallel
      console.log("Starting to load assets...");
      await Promise.all([
        // Use concrete walls
        createWallEnvironment(scene, {
          wallHeight: sharedConfig.wallHeight,  
          floorLevel: sharedConfig.floorLevel,
          wallOffset: sharedConfig.wallOffset,
          backWallWidth: sharedConfig.roomWidth,
          sideWallLength: sharedConfig.roomDepth,
          useConcrete: true    // Use concrete texture
        }),
        
        // Create metal floor
        createMetalFloor(scene, {
          width: sharedConfig.roomWidth,
          depth: sharedConfig.roomDepth,
          floorLevel: sharedConfig.floorLevel,
          wallOffset: sharedConfig.wallOffset,
          useNewMetal: true    // Use new Metal023 texture
        }),
        
        // Add metal ceiling
        createMetalCeiling(scene, {
          width: sharedConfig.roomWidth,
          depth: sharedConfig.roomDepth,
          ceilingHeight: sharedConfig.wallHeight, // Match wall height
          floorLevel: sharedConfig.floorLevel,
          wallOffset: sharedConfig.wallOffset,
          useNewMetal: true    // Use new Metal023 texture
        })
      ]);
    
    // Remove the simple cube once everything is loaded
    scene.remove(simpleCube);
    
    console.log("All assets loaded successfully");
  } catch (error) {
    console.error("Error loading assets:", error);
  }
  
  // Start animation loop
  animate();
}

// ---- EVENT HANDLERS ----
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Start the application
init();