import { Scene, Color, BoxGeometry, MeshBasicMaterial, Mesh, PerspectiveCamera, Vector3, WebGLRenderer, PCFSoftShadowMap, FogExp2 } from "three";
import Stats from "three/examples/jsm/libs/stats.module.js";
import { updateCharacterAnimations } from "./characters.js";

// Import configurations
import { SCENE_CONFIG, MOVEMENT_CONFIG, doorZ } from "./config.js";
import "./miniGame.js";

// Import core modules
import { setupBaseLighting } from "./lighting.js";
import { setupScene, setupShadows, updateFloatingText, updateFloatingTextToVictory } from "./scene.js";
import {
  initControls,
  updateCameraRotation,
  updateMovement,
  setCameraAngles,
} from "./controls.js";
import {
  playerState,
  sceneObjects,
  updateGameLighting,
  checkTableProximity,
  tableInteraction,
} from "./gameState.js";
import { animateClouds, createRocks, updateMoonBillboard } from "./outsidescenery.js";
import { startGame, updateCameraTransition } from "./game.js";
import { updateTorchLights } from "./lighting.js";

const scene = new Scene();
scene.background = new Color(0x111111);
const loadingGeometry = new BoxGeometry(5, 5, 5);
const loadingMaterial = new MeshBasicMaterial({ color: 0x00ff00 });
const loadingCube = new Mesh(loadingGeometry, loadingMaterial);
loadingCube.position.set(0, 0, -10);
scene.add(loadingCube);

const camera = new PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);

const doorPosition = new Vector3(0, MOVEMENT_CONFIG.playerHeight, doorZ);
camera.position.set(0, MOVEMENT_CONFIG.playerHeight, doorZ + 25);
camera.lookAt(doorPosition);

let sceneElements = null;
window.gameCamera = camera;
window.gameTable = null;

const renderer = new WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

setupUI();
initControls(camera, document.body, instructions);
// Performance monitor
const stats = new Stats();
document.body.appendChild(stats.dom);
const { ambientLight, pointLight } = setupBaseLighting(scene);

scene.fog = new FogExp2(0x221122, 0.0008);
scene.background = new Color(0x111111);

// Show loading status
const loadingStatus = document.createElement("div");
loadingStatus.id = "loading-status";
loadingStatus.style.position = "absolute";
loadingStatus.style.top = "50%";
loadingStatus.style.left = "50%";
loadingStatus.style.transform = "translate(-50%, -50%)";
loadingStatus.style.color = "#ffffff";
loadingStatus.style.fontFamily = "Arial, sans-serif";
loadingStatus.style.fontSize = "24px";
loadingStatus.style.textAlign = "center";
loadingStatus.innerHTML = "Loading...";
document.body.appendChild(loadingStatus);

function loadingAnimation() {
  if (document.querySelector("#loading-status")) {
    requestAnimationFrame(loadingAnimation);
    loadingCube.rotation.x += 0.01;
    loadingCube.rotation.y += 0.01;
    renderer.render(scene, camera);
    stats.update();
  }
}
loadingAnimation();
init()
  .then((elements) => {
    document.body.removeChild(loadingStatus);
    scene.remove(loadingCube);
    sceneElements = elements;
    window.gameTable = elements.table;
    console.log("Scene initialization successful:", sceneElements);
    createStartOverlay();
    animate();
  })
  .catch((error) => {
    console.error("Failed to initialize scene:", error);
    loadingStatus.innerHTML = `Error: ${error.message}<br>Check console for details`;
    loadingStatus.style.color = "red";
  });

function animate() {
  requestAnimationFrame(animate);
  try {
    const time = Date.now();
    const isTransitioning = updateCameraTransition(camera);
    if (!playerState.inGame && !isTransitioning) {
      updateMovement(camera);
      updateCameraRotation(camera);
      if (playerState.insideRoom && sceneElements && sceneElements.table) {
        checkTableProximity(camera.position, sceneElements.table);
      }
    }

    updateCharacterAnimations();

    if (pointLight) {
      updateGameLighting(pointLight);
    }
    if (sceneObjects) {
      if (sceneObjects.clouds) {
        animateClouds(sceneObjects.clouds);
      }
      if (sceneObjects.outsideElements?.moon?.moon) {
        updateMoonBillboard(sceneObjects.outsideElements.moon.moon, camera);
      }
      if (sceneObjects.floatingText && sceneObjects.floatingText.material) {
        updateFloatingText(sceneObjects.floatingText, camera);
      }
      if (sceneObjects.torches) {
        updateTorchLights(sceneObjects.torches);
      }
    }

    try {
      renderer.render(scene, camera);
    } catch (renderError) {
      console.error("Render error:", renderError);
    }
    stats.update();
  } catch (error) {
    console.error("Error in animation loop:", error);
  }
}

async function init() {
  const initialDirection = new Vector3()
    .subVectors(doorPosition, camera.position)
    .normalize();
  const initialYaw = Math.atan2(-initialDirection.x, -initialDirection.z);
  const initialPitch = Math.asin(initialDirection.y);
  setCameraAngles(initialYaw, initialPitch);
  updateCameraRotation(camera);
  try {
    const sceneElements = await setupScene(scene);
    if (!sceneElements) {
      throw new Error("Scene setup failed - no scene elements returned");
    }
      setupShadows(
        sceneElements.walls,
        sceneElements.floor,
        sceneElements.ceiling,
        sceneElements.table
      );

    if (
      sceneElements.table &&
      sceneElements.table.userData &&
      sceneElements.table.userData.collision
    ) {
      const { setupCharacters, animateCharacter } = await import(
        "./characters.js"
      );
      const characterState = setupCharacters(
        scene,
        sceneElements.table.userData.collision
      );
      if (characterState && characterState.enemyModel) {
        animateCharacter("enemy", "idle");
        console.log("Enemy character initialized and set to idle");
      }
    }

    return sceneElements;
  } catch (error) {
    throw error; 
  }
}

// Setup UI elements
function setupUI() {

  window.instructions = document.createElement("div");
  instructions.id = "instructions";
  instructions.style.display = "none"; 
  document.body.appendChild(instructions);

  // Play Game UI 
  window.playPrompt = document.createElement("div");
  playPrompt.id = "play-prompt";
  playPrompt.style.position = "absolute";
  playPrompt.style.top = "50%";
  playPrompt.style.left = "50%";
  playPrompt.style.transform = "translate(-50%, -50%)";
  playPrompt.style.fontFamily = '"Trebuchet MS", Arial, sans-serif';
  playPrompt.style.padding = "35px 50px";
  playPrompt.style.borderRadius = "15px";
  playPrompt.style.zIndex = "100";
  playPrompt.style.display = "none";

  // Elemental themed background with tri-color gradient
  playPrompt.style.background =
    "linear-gradient(135deg, rgba(0,102,204,0.85) 0%, rgba(138,43,226,0.85) 50%, rgba(204,51,0,0.85) 100%)";
  playPrompt.style.boxShadow = `
    0 0 30px rgba(0, 102, 204, 0.6),
    0 0 60px rgba(204, 51, 0, 0.4),
    inset 0 0 20px rgba(255, 255, 255, 0.15)
  `;
  playPrompt.style.border = "2px solid rgba(255,255,255,0.3)";
  playPrompt.style.animation = "elementalPulse 3s infinite ease-in-out";
  const style = document.createElement("style");
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
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Global error handler
window.addEventListener("error", (event) => {
  console.error("Global error:", event.error);
});
function createStartOverlay(isPause) {
  const overlay = document.createElement("div");
  overlay.id = "start-overlay";
  overlay.style.position = "absolute";
  overlay.style.top = "0";
  overlay.style.left = "0";
  overlay.style.width = "100%";
  overlay.style.height = "100%";
  overlay.style.backgroundColor = "rgba(0, 0, 0, 0.8)";
  overlay.style.zIndex = "1000";
  overlay.style.display = "flex";
  overlay.style.flexDirection = "column";
  overlay.style.justifyContent = "center";
  overlay.style.alignItems = "center";
  overlay.style.fontFamily = '"Trebuchet MS", Arial, sans-serif';

  // Create content container
  const content = document.createElement("div");
  content.style.backgroundColor = "rgba(20, 20, 30, 0.9)";
  content.style.padding = "40px";
  content.style.borderRadius = "15px";
  content.style.maxWidth = "600px";
  content.style.width = "80%";
  content.style.boxShadow =
    "0 0 30px rgba(0, 102, 204, 0.7), 0 0 60px rgba(204, 51, 0, 0.5)";
  content.style.border = "2px solid rgba(255, 255, 255, 0.2)";

  // Game title
  const title = document.createElement("div");
  title.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: center; margin-bottom: 30px;">
      <div class="elemental-icon ice-icon" style="margin-right: 12px;">❄️</div>
      <div style="font-size: 42px; font-weight: bold; text-shadow: 0 2px 5px rgba(0,0,0,0.8);">
        <span style="color: #aaddff;">Ele</span><span style="color: #00ccff;">men</span><span style="color: #ff6600;">tal</span>
        <span style="color: #ffffff;">Clash</span>
      </div>
      <div class="elemental-icon fire-icon" style="margin-left: 12px;">🔥</div>
    </div>
  `;
  content.appendChild(title);

  // Game description
  const description = document.createElement("div");
  description.style.color = "#cccccc";
  description.style.fontSize = "18px";
  description.style.textAlign = "center";
  description.style.marginBottom = "30px";
  description.style.lineHeight = "1.5";
  if (isPause) {
    description.innerHTML = `
      <p>Game Paused</p>
      <p>Press ESC again or click the button below to resume</p>
    `;
  } else {
    description.innerHTML = `
      <p>Welcome to Elemental Clash, a strategic card battle game!</p>
      <p>Defeat your opponent using the elements: Fire, Water and Ice.</p>
    `;
  }
  content.appendChild(description);

  // Instructions
  if (!isPause) {
    const instructions = document.createElement("div");
    instructions.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
    instructions.style.padding = "20px";
    instructions.style.borderRadius = "10px";
    instructions.style.marginBottom = "30px";
    instructions.style.color = "#ffffff";
    instructions.style.fontSize = "16px";
    instructions.innerHTML = `
      <h3 style="color: #00ccff; text-align: center; margin-top: 0;">How to Play</h3>
      <ul style="list-style-type: none; padding: 0;">
        <li style="margin-bottom: 8px;">🎮 <b>WASD</b> to move around</li>
        <li style="margin-bottom: 8px;">⬆️ Press <b>Spacebar</b> to jump</li>
        <li style="margin-bottom: 8px;">🔍 <b>Mouse</b> to look around</li>
        <li style="margin-bottom: 8px;">🏃 Hold <b>Shift</b> to run</li>
        <li style="margin-bottom: 8px;">🎲 Find the table to start the card game</li>
        <li style="margin-bottom: 8px;">🎮 Press <b>E</b> to interact with the table</li>
        <li>🔄 Press <b>ESC</b> to pause the game</li>
      </ul>
    `;
    content.appendChild(instructions);
  }

  const buttonContainer = document.createElement("div");
  buttonContainer.style.display = "flex";
  buttonContainer.style.justifyContent = "space-between";
  buttonContainer.style.width = "100%";
  buttonContainer.style.marginTop = "20px";

  // Play/Pause button
  const playButton = document.createElement("button");
  playButton.textContent = isPause ? "RESUME GAME" : "PLAY NOW";
  playButton.style.backgroundColor = "rgba(0, 153, 255, 0.8)";
  playButton.style.border = "none";
  playButton.style.borderRadius = "8px";
  playButton.style.color = "#ffffff";
  playButton.style.fontSize = "24px";
  playButton.style.fontWeight = "bold";
  playButton.style.padding = "15px 40px";
  playButton.style.cursor = "pointer";
  playButton.style.boxShadow = "0 0 15px rgba(0, 153, 255, 0.5)";
  playButton.style.transition = "all 0.2s ease";

  playButton.onmouseover = function () {
    this.style.backgroundColor = "rgba(0, 180, 255, 0.9)";
    this.style.boxShadow = "0 0 25px rgba(0, 153, 255, 0.8)";
    this.style.transform = "translateY(-2px)";
  };

  playButton.onmouseout = function () {
    this.style.backgroundColor = "rgba(0, 153, 255, 0.8)";
    this.style.boxShadow = "0 0 15px rgba(0, 153, 255, 0.5)";
    this.style.transform = "translateY(0px)";
  };

  playButton.onclick = function () {
    document.body.removeChild(overlay);
  };
  buttonContainer.appendChild(playButton);

  if (isPause) {
    const exitButton = document.createElement("button");
    exitButton.textContent = "RESTART GAME";
    exitButton.style.backgroundColor = "rgba(255, 85, 85, 0.8)";
    exitButton.style.border = "none";
    exitButton.style.borderRadius = "8px";
    exitButton.style.color = "#ffffff";
    exitButton.style.fontSize = "24px";
    exitButton.style.fontWeight = "bold";
    exitButton.style.padding = "15px 40px"; 
    exitButton.style.cursor = "pointer";
    exitButton.style.boxShadow = "0 0 15px rgba(255, 85, 85, 0.5)";
    exitButton.style.transition = "all 0.2s ease";

    exitButton.onmouseover = function () {
      this.style.backgroundColor = "rgba(255, 105, 105, 0.9)";
      this.style.boxShadow = "0 0 25px rgba(255, 85, 85, 0.8)";
      this.style.transform = "translateY(-2px)";
    };

    exitButton.onmouseout = function () {
      this.style.backgroundColor = "rgba(255, 85, 85, 0.8)";
      this.style.boxShadow = "0 0 15px rgba(255, 85, 85, 0.5)";
      this.style.transform = "translateY(0px)";
    };

    exitButton.onclick = function () {
      window.location.reload();
    };
    buttonContainer.appendChild(exitButton);
  } else {
    buttonContainer.style.justifyContent = "center";
  }
  content.appendChild(buttonContainer);
  overlay.appendChild(content);
  document.body.appendChild(overlay);
  createOverlayParticles(overlay);
}
function createOverlayParticles(overlay) {
  const particlesContainer = document.createElement("div");
  particlesContainer.style.position = "absolute";
  particlesContainer.style.top = "0";
  particlesContainer.style.left = "0";
  particlesContainer.style.width = "100%";
  particlesContainer.style.height = "100%";
  particlesContainer.style.overflow = "hidden";
  particlesContainer.style.pointerEvents = "none";
  particlesContainer.style.zIndex = "-1";
  const particleCount = 30;
  const elements = ["❄️", "💧", "🔥"];
  const colors = ["#aaddff", "#00ccff", "#ff6600"];
  for (let i = 0; i < particleCount; i++) {
    const idx = Math.floor(Math.random() * 3);
    const particle = document.createElement("div");

    particle.style.position = "absolute";
    particle.style.color = colors[idx];
    particle.style.opacity = "0.5";
    particle.textContent = elements[idx];
    particle.style.fontSize = `${Math.random() * 20 + 10}px`;
    particle.style.left = `${Math.random() * 100}%`;
    particle.style.top = `${Math.random() * 100}%`;
    particle.style.animation = `float ${
      Math.random() * 10 + 10
    }s infinite ease-in-out`;

    particlesContainer.appendChild(particle);
  }

  // Add animation keyframe
  const style = document.createElement("style");
  style.textContent = `
    @keyframes float {
      0%, 100% { transform: translate(0, 0) rotate(0deg); }
      25% { transform: translate(${Math.random() * 100 - 50}px, ${
    Math.random() * 100 - 50
  }px) rotate(${Math.random() * 90 - 45}deg); }
      50% { transform: translate(${Math.random() * 200 - 100}px, ${
    Math.random() * 200 - 100
  }px) rotate(${Math.random() * 180 - 90}deg); }
      75% { transform: translate(${Math.random() * 100 - 50}px, ${
    Math.random() * 100 - 50
  }px) rotate(${Math.random() * 90 - 45}deg); }
    }
  `;
  document.head.appendChild(style);

  overlay.appendChild(particlesContainer);
}

function toggleOverlayMenu() {
  if (playerState.inGame) {
    return;
  }
  const existingOverlay = document.getElementById("start-overlay");

  if (existingOverlay) {
    document.body.removeChild(existingOverlay);
    playerState.pointerLocked = false; 
  } else {
    createStartOverlay(true); 
  }
}

// Track if ESC was pressed to show pause menu
let escPressedForPause = false;

document.addEventListener('pointerlockchange', function() {
  // If ESC was pressed and pointer is now unlocked
  if (escPressedForPause && document.pointerLockElement === null) {
    escPressedForPause = false; 
    if (!playerState.inGame && !document.getElementById("start-overlay")) {
      createStartOverlay(true);
    }
  }
});
window.addEventListener("keydown", (event) => {
  if (event.key === "Escape" || event.code === "Escape") {
    if (!playerState.inGame) {
      const pointerLocked = document.pointerLockElement !== null;
      
      if (!pointerLocked) {
        toggleOverlayMenu();
      } else {
        escPressedForPause = true;
      }
    }
  }
});
