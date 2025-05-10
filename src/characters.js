import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

// Character state
const characterState = {
  enemyModel: null,
  playerModel: null,
  enemyAnimations: {},
  playerAnimations: {},
  modelLoaded: false,
};

// Create a loader for the GLTF model
const gltfLoader = new GLTFLoader();


/**
 * Load the Among Us 3D model
 * @param {string} type - 'enemy' or 'player'
 * @returns {Promise<THREE.Group>} - A promise that resolves to the loaded model
 */
function loadAmongUsModel(type) {
  return new Promise((resolve, reject) => {
    const modelPath = './models/character/among_us_3d_model/scene.gltf';
    
    gltfLoader.load(
      modelPath,
      (gltf) => {
        const model = gltf.scene;
        
        // Scale the model appropriately
        model.scale.set(0.02, 0.02, 0.02);
        
        // Apply colors based on type
        const color = type === "player" ? new THREE.Color(0x00ccff) : new THREE.Color(0xff4400);
        
        // Apply material to all meshes
        model.traverse((node) => {
          if (node.isMesh) {
            // Create a new material that matches our color scheme
            node.material = new THREE.MeshStandardMaterial({
              color: color,
              roughness: 0.7,
              metalness: 0.3,
              emissive: type === "enemy" ? color : new THREE.Color(0x000000),
              emissiveIntensity: type === "enemy" ? 0.5 : 0.3,
            });
            
            // Enable shadows
            node.castShadow = true;
            node.receiveShadow = true;
          }
        });
        
        resolve(model);
      },
      undefined,
      (error) => {
        console.error('Error loading Among Us model:', error);
        reject(error);
      }
    );
  });
}


/**
 * Create a simple geometric character as fallback
 * @param {string} type - 'enemy' or 'player'
 * @returns {THREE.Group} - The character model
 */
function createSimpleCharacter(type) {
  const character = new THREE.Group();
  
  // Character color based on type
  const color = type === "player" ? new THREE.Color(0x00ccff) : new THREE.Color(0xff4400);
  
  // Create materials
  const bodyMaterial = new THREE.MeshStandardMaterial({
    color: color,
    roughness: 0.7,
    metalness: 0.3,
    emissive: type === "enemy" ? color : new THREE.Color(0x000000),
    emissiveIntensity: type === "enemy" ? 0.5 : 0.3,
  });
  
  // Create body
  const bodyGeom = new THREE.CapsuleGeometry(0.5, 1, 4, 8);
  const body = new THREE.Mesh(bodyGeom, bodyMaterial);
  body.position.y = 0.6;
  body.castShadow = true;
  character.add(body);
  
  // Create head
  const headGeom = new THREE.SphereGeometry(0.3, 16, 16);
  const head = new THREE.Mesh(headGeom, bodyMaterial);
  head.position.y = 1.4;
  head.castShadow = true;
  character.add(head);
  
  // Create arms
  const armGeom = new THREE.CapsuleGeometry(0.15, 0.7, 4, 8);
  
  // Left arm
  const leftArm = new THREE.Mesh(armGeom, bodyMaterial);
  leftArm.position.set(-0.5, 0.7, 0);
  leftArm.rotation.z = Math.PI / 4;
  leftArm.castShadow = true;
  character.add(leftArm);
  
  // Right arm
  const rightArm = new THREE.Mesh(armGeom, bodyMaterial);
  rightArm.position.set(0.5, 0.7, 0);
  rightArm.rotation.z = -Math.PI / 4;
  rightArm.castShadow = true;
  character.add(rightArm);
  
  // Store reference for animation
  character.userData = {
    bodyParts: {
      body: body,
      head: head,
      leftArm: leftArm,
      rightArm: rightArm,
    },
    animationState: {
      isIdle: true,
      isPlaying: false,
      lastAction: "idle",
    },
  };
  
  // Add lights to enemy for better visibility
  if (type === "enemy") {
    const enemyLight = new THREE.PointLight(0xff6600, 1.5, 15);
    enemyLight.position.set(0, 1.5, 0);
    character.add(enemyLight);
    
    const accentLight = new THREE.PointLight(0xff9900, 0.8, 8);
    accentLight.position.set(0, -1.0, 0);
    character.add(accentLight);
  }
  
  return character;
}



/**
 * Create a character model using the Among Us 3D model
 * @param {string} type - 'enemy' or 'player'
 * @returns {THREE.Group} - The character model
 */
async function createCharacter(type) {
  // Create a group to hold the model and any additions
  const character = new THREE.Group();
  
  try {
    // Load the Among Us model
    const amongUsModel = await loadAmongUsModel(type);
    
    // Add the model to the character group
    character.add(amongUsModel);
    amongUsModel.position.y = 0; 
    
    // Add lights to enemy for better visibility
    if (type === "enemy") {
      const enemyLight = new THREE.PointLight(0xff6600, 1.5, 15);
      enemyLight.position.set(0, 1.5, 0);
      character.add(enemyLight);
      
      const accentLight = new THREE.PointLight(0xff9900, 0.8, 8);
      accentLight.position.set(0, -1.0, 0);
      character.add(accentLight);
    }
    
    // Store reference for animation
    character.userData = {
      bodyParts: {
        body: amongUsModel,
        head: amongUsModel,
        leftArm: amongUsModel,
        rightArm: amongUsModel,
      },
      animationState: {
        isIdle: true,
        isPlaying: false,
        lastAction: "idle",
      },
      amongUsModel: amongUsModel
    };
    
  } catch (error) {
    console.error("Failed to load Among Us model, falling back to simple character");
    // Fall back to simple character if model fails to load
    return createSimpleCharacter(type);
  }
  
  return character;
}

/**
 * Position the character at the table
 * @param {THREE.Group} character - The character model
 * @param {string} position - 'player' or 'enemy'
 * @param {Object} tableData - Table collision data
 */
function positionCharacterAtTable(character, position, tableData) {
  if (!character || !tableData) return;

  console.log("Positioning character at table:", position);
  console.log("Table data:", tableData);

  const tableCenter = new THREE.Vector3(
    (tableData.minX + tableData.maxX) / 2,
    0,
    (tableData.minZ + tableData.maxZ) / 2
  );

  if (position === "player") {
    // Position player at the bottom side of table (closer to camera)
    character.position.set(
      tableCenter.x,
      -3.0, 
      tableData.maxZ + 1.4
    );
    // Face toward the table/enemy
    character.rotation.y = Math.PI;
  } else {
    // Position enemy at the top side of table (farther from camera)
    character.position.set(
      tableCenter.x,
      -3.0, 
      tableData.minZ - 1.4 
    );
    // Face toward the table/player
    character.rotation.y = 0;

    const enemyLight = new THREE.PointLight(0xff6600, 1.5, 15);
    enemyLight.position.set(0, 1.5, 0);
    character.add(enemyLight);
    const accentLight = new THREE.PointLight(0xff9900, 0.8, 8);
    accentLight.position.set(0, -1.0, 0);
    character.add(accentLight);

    console.log("Enemy positioned at:", character.position);
  }
}

/**
 * Create and setup both player and enemy characters
 * @param {THREE.Scene} scene - The scene to add characters to
 * @param {Object} tableData - Table collision data
 */
export async function setupCharacters(scene, tableData) {
  if (!scene || !tableData) {
    console.error("Cannot setup characters: missing scene or table data");
    return;
  }

  try {
    // Create enemy character with Among Us model
    const enemy = await createCharacter("enemy");
    positionCharacterAtTable(enemy, "enemy", tableData);
    scene.add(enemy);
    characterState.enemyModel = enemy;

    // Create player character with Among Us model
    const player = await createCharacter("player");
    positionCharacterAtTable(player, "player", tableData);
    scene.add(player);
    characterState.playerModel = player;
    
    characterState.modelLoaded = true;
    console.log("Characters with Among Us models set up successfully");
    
  } catch (error) {
    console.error("Error setting up characters:", error);
  }
  
  return characterState;
}

/**
 * Animate the Among Us character model
 * @param {THREE.Group} model - The character model
 * @param {string} action - The animation action
 */
function animateAmongUsModel(model, action, character) {
  if (!model || !model.userData || !model.userData.amongUsModel) return;
  
  const amongUsModel = model.userData.amongUsModel;
  
  switch(action) {
    case "idle":
      // Bobbing animation
      const bobHeight = Math.sin(Date.now() * 0.001) * 0.05;
      amongUsModel.position.y = bobHeight;
      amongUsModel.rotation.y = Math.sin(Date.now() * 0.002) * 0.1;
      break;
      
    case "thinking":
      // Tilt the model to simulate thinking
      amongUsModel.rotation.z = 0.2;
      break;
      
    case "playCard":
      // Move forward slightly
      amongUsModel.position.z = 0.2;
      setTimeout(() => {
        amongUsModel.position.z = 0;
      }, 1000);
      break;
      
    case "win":
      // Jump up and spin for winning
      amongUsModel.position.y = 0.3;
      amongUsModel.rotation.y += 0.1;
      break;
      
    case "lose":
      // Slump down for losing
      amongUsModel.position.y = -0.1;
      amongUsModel.rotation.x = 0.2;
      break;
  }
}



/**
 * Animate character based on game state
 * @param {string} character - 'enemy' or 'player'
 * @param {string} action - Animation to play: 'idle', 'thinking', 'playCard', 'win', 'lose'
 */
export function animateCharacter(character, action) {
    const model =
      character === "player"
        ? characterState.playerModel
        : characterState.enemyModel;
  
    if (!model || !model.userData) return;

    // Set animation state
    model.userData.animationState.isPlaying = true;
    model.userData.animationState.lastAction = action;
    
    // Check if we're using the Among Us model
    if (model.userData.amongUsModel) {
      animateAmongUsModel(model, action, character);
      return;
    }
  
    const { body, head, leftArm, rightArm } = model.userData.bodyParts;
    const { animationState } = model.userData;
  
    // Reset any ongoing animations
    if (animationState.isPlaying && animationState.lastAction !== action) {
      resetCharacterPose(model);
    }
  
    // Set animation state
    animationState.isPlaying = true;
    animationState.lastAction = action;
  
    // Basic animation framerate
    const fps = 60;
    const duration = 1000; // 1 second for complete animation
  
    switch (action) {
      case "idle":
        // More exaggerated idle animation
        if (character === "enemy") {
          // ENHANCED MOVEMENT: Increased animation range
          animateBodyPart(
            body,
            { rotationX: Math.sin(Date.now() * 0.003) * 0.15 }, // Increased from 0.1
            fps
          );
          animateBodyPart(
            head,
            { rotationY: Math.sin(Date.now() * 0.002) * 0.25 }, // Increased from 0.15
            fps
          );
          // Higher bobbing
          const bobHeight = Math.sin(Date.now() * 0.001) * 0.08; // Increased from 0.05
          body.position.y = 0.6 + bobHeight;
          head.position.y = 1.4 + bobHeight;
        } else {
          // Regular player idle - also enhanced
          animateBodyPart(
            body,
            { rotationX: Math.sin(Date.now() * 0.003) * 0.08 }, // Increased from 0.05
            fps
          );
          animateBodyPart(
            head,
            { rotationY: Math.sin(Date.now() * 0.002) * 0.15 }, // Increased from 0.1
            fps
          );
        }
        break;
  
      case "thinking":
        // More exaggerated thinking pose
        animateBodyPart(head, { rotationZ: 0.35 }, fps); // Increased from 0.2
        animateBodyPart(
          rightArm,
          { rotationZ: -Math.PI / 2, positionY: 1.3 }, // More dramatic pose
          fps
        );
        setTimeout(() => {
          animationState.isPlaying = false;
        }, duration);
        break;
  
      case "playCard":
        // Extend arm to play a card
        animateBodyPart(
          leftArm,
          {
            rotationZ: 0,
            rotationX: -Math.PI / 6,
            positionZ: 0.8,
            positionY: 0.5,
          },
          fps
        );
        setTimeout(() => {
          // Return arm after playing
          animateBodyPart(
            leftArm,
            {
              rotationZ: Math.PI / 4,
              rotationX: 0,
              positionZ: 0,
              positionY: 0.7,
            },
            fps
          );
          animationState.isPlaying = false;
        }, duration);
        break;
  
      case "win":
        // Victory animation with particles and effects
        // Create victory particles
        const victoryParticles = new THREE.Group();
        const particleCount = 30;
        
        // Add celebratory particle burst
        for (let i = 0; i < particleCount; i++) {
          const particleSize = Math.random() * 0.2 + 0.1;
          const particleGeom = new THREE.SphereGeometry(particleSize, 8, 8);
          
          // Create glowing particle material with character's color
          const particleMat = new THREE.MeshBasicMaterial({
            color: character === "player" ? 0x00ccff : 0xff6600,
            transparent: true,
            opacity: 0.8
          });
          
          const particle = new THREE.Mesh(particleGeom, particleMat);
          
          // Random starting position near the head
          particle.position.set(
            (Math.random() - 0.5) * 0.5,
            1.5 + Math.random() * 0.5,
            (Math.random() - 0.5) * 0.5
          );
          
          // Store random trajectory for animation
          particle.userData = {
            velocity: new THREE.Vector3(
              (Math.random() - 0.5) * 0.05,
              Math.random() * 0.08,
              (Math.random() - 0.5) * 0.05
            ),
            rotationSpeed: Math.random() * 0.2 - 0.1,
            fadeRate: 0.01 + Math.random() * 0.02
          };
          
          victoryParticles.add(particle);
        }
        model.add(victoryParticles);
        
        // Add victory glow effect around character
        const glowGeom = new THREE.SphereGeometry(2, 16, 16);
        const glowMat = new THREE.MeshBasicMaterial({
          color: character === "player" ? 0x00ccff : 0xff6600,
          transparent: true,
          opacity: 0.0,
          side: THREE.BackSide
        });
        const glowEffect = new THREE.Mesh(glowGeom, glowMat);
        model.add(glowEffect);
        
        // Create victory light
        const victoryLight = new THREE.PointLight(
          character === "player" ? 0x00ccff : 0xff6600,
          0, // Start with intensity 0
          5
        );
        victoryLight.position.set(0, 1.2, 0);
        model.add(victoryLight);
        
        // Dramatic victory pose with raised arms and head looking up
        animateBodyPart(body, { rotationX: -0.2 }, fps);
        animateBodyPart(head, { rotationX: -0.3, positionY: 1.6 }, fps);
        animateBodyPart(leftArm, { rotationZ: Math.PI / 2.2, rotationY: -0.3, positionY: 1.2 }, fps);
        animateBodyPart(rightArm, { rotationZ: -Math.PI / 2.2, rotationY: 0.3, positionY: 1.2 }, fps);
        
        // Animate particles and effects over time
        let victoryStep = 0;
        const victoryInterval = setInterval(() => {
          victoryStep++;
          
          // Update glow effect
          if (victoryStep < 10) {
            glowMat.opacity += 0.04; // Fade in
            victoryLight.intensity += 0.2; // Increase light intensity
          } else if (victoryStep > 30) {
            glowMat.opacity -= 0.03; // Fade out
            victoryLight.intensity -= 0.15; // Decrease light
          }
          
          // Update particles
          victoryParticles.children.forEach(particle => {
            // Move particle along its trajectory
            particle.position.add(particle.userData.velocity);
            
            // Add gravity effect
            particle.userData.velocity.y -= 0.002;
            
            // Rotate particle
            particle.rotation.x += particle.userData.rotationSpeed;
            particle.rotation.z += particle.userData.rotationSpeed;
            
            // Fade out particle
            if (particle.material.opacity > 0) {
              particle.material.opacity -= particle.userData.fadeRate;
            }
          });
          
          // End animation and clean up
          if (victoryStep >= 45) {
            clearInterval(victoryInterval);
            model.remove(victoryParticles);
            model.remove(glowEffect);
            model.remove(victoryLight);
            resetCharacterPose(model);
            animationState.isPlaying = false;
          }
        }, 1000 / 30);
        break;
  
      case "lose":
        // Defeat animation with slumping and sad effects
        // Create sad particles
        const defeatParticles = new THREE.Group();
        const sadCount = 15;
        
        // Add sad blue particle effect
        for (let i = 0; i < sadCount; i++) {
          const particleSize = Math.random() * 0.1 + 0.05;
          const particleGeom = new THREE.SphereGeometry(particleSize, 6, 6);
          
          // Create blue teardrops
          const particleMat = new THREE.MeshBasicMaterial({
            color: 0x6688aa,
            transparent: true,
            opacity: 0.7
          });
          
          const particle = new THREE.Mesh(particleGeom, particleMat);
          
          // Position around head
          particle.position.set(
            (Math.random() - 0.5) * 0.4,
            1.4 - Math.random() * 0.1,
            (Math.random() - 0.5) * 0.4
          );
          
          // Store trajectory for falling tears
          particle.userData = {
            velocity: new THREE.Vector3(
              (Math.random() - 0.5) * 0.01,
              -0.03 - Math.random() * 0.02,
              (Math.random() - 0.5) * 0.01
            ),
            fadeRate: 0.01 + Math.random() * 0.01,
            delay: Math.floor(Math.random() * 20) // Staggered start
          };
          
          defeatParticles.add(particle);
        }
        model.add(defeatParticles);
        
        // Create dark cloud above character
        const cloudGroup = new THREE.Group();
        const cloudSize = 1.2;
        const cloudMaterial = new THREE.MeshBasicMaterial({
          color: 0x222233,
          transparent: true,
          opacity: 0
        });
        
        for (let i = 0; i < 5; i++) {
          const size = (0.4 + Math.random() * 0.3) * cloudSize;
          const cloudSphere = new THREE.SphereGeometry(size, 8, 8);
          const cloudPart = new THREE.Mesh(cloudSphere, cloudMaterial);
          
          cloudPart.position.set(
            (Math.random() - 0.5) * cloudSize,
            2.2 + (Math.random() - 0.5) * 0.3,
            (Math.random() - 0.5) * cloudSize
          );
          
          cloudGroup.add(cloudPart);
        }
        model.add(cloudGroup);
        
        // Dramatic defeat pose - slumped with head down
        animateBodyPart(body, { rotationX: 0.3 }, fps);
        animateBodyPart(head, { positionY: 1.2, rotationX: 0.5 }, fps);
        animateBodyPart(leftArm, { rotationZ: Math.PI / 8, rotationX: 0.2, positionY: 0.6 }, fps);
        animateBodyPart(rightArm, { rotationZ: -Math.PI / 8, rotationX: 0.2, positionY: 0.6 }, fps);
        
        // Animate defeat effects
        let defeatStep = 0;
        const defeatInterval = setInterval(() => {
          defeatStep++;
          
          // Fade in cloud
          if (defeatStep < 10) {
            cloudMaterial.opacity += 0.05;
          }
          
          // Update tear particles
          defeatParticles.children.forEach(particle => {
            // Only start moving after delay
            if (defeatStep > particle.userData.delay) {
              // Move particle down
              particle.position.add(particle.userData.velocity);
              
              // Fade out when too low
              if (particle.position.y < 0.2) {
                particle.material.opacity -= particle.userData.fadeRate * 2;
              }
            }
          });
          
          // Occasional cloud "rain" - spawn new tears
          if (defeatStep % 10 === 0 && defeatStep < 30) {
            const newTear = defeatParticles.children[0].clone();
            newTear.position.set(
              (Math.random() - 0.5) * 0.8,
              1.8,
              (Math.random() - 0.5) * 0.8
            );
            newTear.material = newTear.material.clone();
            newTear.material.opacity = 0.7;
            newTear.userData.delay = 0;
            defeatParticles.add(newTear);
          }
          
          // End animation and clean up
          if (defeatStep >= 45) {
            clearInterval(defeatInterval);
            model.remove(defeatParticles);
            model.remove(cloudGroup);
            resetCharacterPose(model);
            animationState.isPlaying = false;
          }
        }, 1000 / 30);
        break;
    }
  }

/**
 * Reset character to default pose
 * @param {THREE.Group} model - The character model
 */
function resetCharacterPose(model) {
  if (!model || !model.userData || !model.userData.bodyParts) return;

  const { body, head, leftArm, rightArm } = model.userData.bodyParts;

  // Reset body parts to original positions
  animateBodyPart(
    body,
    {
      rotationX: 0,
      rotationY: 0,
      rotationZ: 0,
      positionY: 0.6,
    },
    30
  );

  animateBodyPart(
    head,
    {
      rotationX: 0,
      rotationY: 0,
      rotationZ: 0,
      positionY: 1.4,
    },
    30
  );

  animateBodyPart(
    leftArm,
    {
      rotationX: 0,
      rotationZ: Math.PI / 4,
      positionX: -0.5,
      positionY: 0.7,
      positionZ: 0,
    },
    30
  );

  animateBodyPart(
    rightArm,
    {
      rotationX: 0,
      rotationZ: -Math.PI / 4,
      positionX: 0.5,
      positionY: 0.7,
      positionZ: 0,
    },
    30
  );
}

/**
 * Animate a body part to a new position/rotation
 * @param {THREE.Object3D} part - The body part to animate
 * @param {Object} target - Target position and rotation
 * @param {number} fps - Animation frame rate
 */
function animateBodyPart(part, target, fps) {
  if (!part) return;

  // Create a map of current values
  const current = {
    positionX: part.position.x,
    positionY: part.position.y,
    positionZ: part.position.z,
    rotationX: part.rotation.x,
    rotationY: part.rotation.y,
    rotationZ: part.rotation.z,
  };

  // Fill in missing target values with current values
  Object.keys(current).forEach((key) => {
    if (target[key] === undefined) {
      target[key] = current[key];
    }
  });

  // Animate over multiple frames
  const steps = 15;
  let step = 0;

  const interval = setInterval(() => {
    step++;
    const t = step / steps;

    // Update position
    part.position.x = lerp(current.positionX, target.positionX, t);
    part.position.y = lerp(current.positionY, target.positionY, t);
    part.position.z = lerp(current.positionZ, target.positionZ, t);

    // Update rotation
    part.rotation.x = lerp(current.rotationX, target.rotationX, t);
    part.rotation.y = lerp(current.rotationY, target.rotationY, t);
    part.rotation.z = lerp(current.rotationZ, target.rotationZ, t);

    if (step >= steps) {
      clearInterval(interval);
    }
  }, 1000 / fps);
}

/**
 * Linear interpolation helper
 */
function lerp(a, b, t) {
  return a + (b - a) * t;
}

/**
 * Update character animations
 * Called in the animation loop
 */
export function updateCharacterAnimations() {
  // Keep idle animations running
  if (
    characterState.enemyModel &&
    characterState.enemyModel.userData &&
    characterState.enemyModel.userData.animationState.lastAction === "idle"
  ) {
    animateCharacter("enemy", "idle");
  }

  if (
    characterState.playerModel &&
    characterState.playerModel.userData &&
    characterState.playerModel.userData.animationState.lastAction === "idle"
  ) {
    animateCharacter("player", "idle");
  }
}

/**
 * Get reference to character models
 */
export function getCharacters() {
  return characterState;
}
