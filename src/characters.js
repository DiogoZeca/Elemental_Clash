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
    const modelPath = "./models/character/among_us_3d_model/scene.gltf";

    gltfLoader.load(
      modelPath,
      (gltf) => {
        const model = gltf.scene;

        // Scale the model appropriately
        model.scale.set(0.02, 0.02, 0.02);

        // Apply colors based on type
        const color =
          type === "player"
            ? new THREE.Color(0x00ccff)
            : new THREE.Color(0xff4400);

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
        console.error("Error loading Among Us model:", error);
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
  const color =
    type === "player" ? new THREE.Color(0x00ccff) : new THREE.Color(0xff4400);

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
      amongUsModel: amongUsModel,
    };
  } catch (error) {
    console.error(
      "Failed to load Among Us model, falling back to simple character"
    );
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
    character.position.set(tableCenter.x, -3.0, tableData.maxZ + 1.4);
    // Face toward the table/enemy
    character.rotation.y = Math.PI;
  } else {
    // Position enemy at the top side of table (farther from camera)
    character.position.set(tableCenter.x, -3.0, tableData.minZ - 1.4);
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
 * @param {string} character - The character type ('player' or 'enemy')
 * @param {string} element - Optional element type ('fire', 'ice', 'water')
 */
function animateAmongUsModel(model, action, character, element = null) {
  if (!model || !model.userData || !model.userData.amongUsModel) return;

  const amongUsModel = model.userData.amongUsModel;

  switch (action) {
    case "idle":
      // Bobbing animation
      amongUsModel.position.y = Math.sin(Date.now() * 0.002) * 0.1;
      break;

    case "thinking":
      // Tilt the model to simulate thinking
      amongUsModel.rotation.z = Math.sin(Date.now() * 0.005) * 0.1;
      break;

    case "playCard":
      // Move forward slightly
      amongUsModel.position.z = -0.2; 
      setTimeout(() => {
        amongUsModel.position.z = 0;
      }, 300);
      break;

      
    // In the animateAmongUsModel function, update the "win" case:
    case "win":
      // Jump up and spin for winning
      amongUsModel.rotation.y += 0.5;
      
      // Add element effects if element parameter is provided
      if (element) {
        const elementConfig = getElementConfig(element);
        const color = getElementColor(element);
        
      // Create a particle group
      const particles = new THREE.Group();
      particles.position.y = 2.5; // Position particles higher above the model
      model.add(particles);
        
      // Add initial particles
      for (let i = 0; i < 25; i++) {
        const particle = createElementParticle(elementConfig);
        particles.add(particle);
      }
      
      // Add light with element color
      const light = new THREE.PointLight(color, 2.0, 15);
      light.position.set(0, 1.5, 0); 
      model.add(light);
      
      // Animate particles
      let step = 0;
      const particleInterval = setInterval(() => {
        step++;
        
        // Update existing particles
        particles.children.forEach((particle) => {
          if (particle.userData) {
            elementConfig.updateParticle(particle, step);
            particle.userData.age++;
            
            if (particle.userData.age > particle.userData.maxAge) {
              particle.material.opacity -= particle.userData.fadeRate;
              if (particle.material.opacity <= 0) {
                particles.remove(particle);
              }
            }
          }
        });
          
        // Add new particles occasionally
        if (step % 3 === 0 && step < 30) {
          const newParticle = createElementParticle(elementConfig);
          particles.add(newParticle);
        }
        
        if (step >= 60) {
          clearInterval(particleInterval);
        }
      }, 1000/30);
      
      // Remove after animation
      setTimeout(() => {
        model.remove(light);
        model.remove(particles);
        if (particleInterval) clearInterval(particleInterval);
      }, 2500);
      }
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
 * @param {string} element - The element used: 'fire', 'ice', 'water' (for win/lose animations)
 */
export function animateCharacter(character, action, element = null) {
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
    animateAmongUsModel(model, action, character, element);
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
      // Gentle bobbing animation for idle
      animateBodyPart(
        body,
        { positionY: 0.6 + Math.sin(Date.now() * 0.001) * 0.05 },
        fps
      );
      animateBodyPart(
        head,
        { rotationZ: Math.sin(Date.now() * 0.0005) * 0.05 },
        fps
      );
      break;

    case "thinking":
      // Thinking animation - head tilt and arm movement
      animateBodyPart(head, { rotationZ: 0.2 }, fps);
      animateBodyPart(rightArm, { rotationZ: -Math.PI / 2.5, positionY: 1.3 }, fps);
      break;

    case "playCard":
      // Play card animation - extend arm forward
      animateBodyPart(body, { rotationX: 0.1 }, fps);
      animateBodyPart(rightArm, { 
        rotationZ: -Math.PI / 3,
        rotationX: -0.5,
        positionY: 0.9,
        positionZ: 0.5
      }, fps);
      break;

    case "win":
      // Element-specific celebration animation
      const elementColor = element ? getElementColor(element) : 0xffffff;
      const elementConfig = element ? getElementConfig(element) : getElementConfig('fire');
      
      // Create particle system for element
      const particles = new THREE.Group();
      particles.position.y = 3.0; 
      model.add(particles);
      
      // Victory pose with raised arms
      animateBodyPart(body, { rotationX: -0.2 }, fps);
      animateBodyPart(head, { rotationX: -0.3, positionY: 1.6 }, fps);
      animateBodyPart(leftArm, { 
        rotationZ: Math.PI / 2.2, 
        rotationY: -0.3, 
        positionY: 1.2 
      }, fps);
      animateBodyPart(rightArm, { 
        rotationZ: -Math.PI / 2.2, 
        rotationY: 0.3, 
        positionY: 1.2 
      }, fps);
      
      // Add a simple light for the element effect
      const victoryLight = new THREE.PointLight(elementColor, 2.0, 12);
      victoryLight.position.set(0, 1.5, 0);
      model.add(victoryLight);
      
      // Add initial particles
      const particleCount = 35;
      for (let i = 0; i < particleCount; i++) {
        const particle = createElementParticle(elementConfig);
        particles.add(particle);
      }
      
      // Animate particles
      let step = 0;
      const particleAnimation = setInterval(() => {
        step++;
        
        // Update existing particles
        particles.children.forEach((particle, index) => {
          if (particle.userData) {
            // Apply element-specific update
            elementConfig.updateParticle(particle, step);
            
            // Increase age
            particle.userData.age++;
            
            // Fade out old particles
            if (particle.userData.age > particle.userData.maxAge) {
              particle.material.opacity -= particle.userData.fadeRate;
              if (particle.material.opacity <= 0) {
                particles.remove(particle);
              }
            }
          }
        });
        
        // Add new particles occasionally for sustained effect
        if (step % 2 === 0 && step < 40) {
          const newParticle = createElementParticle(elementConfig);
          particles.add(newParticle);
        }
        
        // End animation eventually
        if (step >= 70) {
          clearInterval(particleAnimation);
          model.remove(particles);
        }
      }, 1000/30); // 30 fps for particles
      
      // Remove light and reset after animation
      setTimeout(() => {
        model.remove(victoryLight);
        resetCharacterPose(model);
        animationState.isPlaying = false;
        if (particleAnimation) clearInterval(particleAnimation);
      }, 2500);
      break;

    case "lose":
      // Sad pose for losing
      animateBodyPart(body, { rotationX: 0.2 }, fps);
      animateBodyPart(head, { rotationX: 0.4, positionY: 1.3 }, fps);
      animateBodyPart(leftArm, { rotationZ: Math.PI / 6, positionY: 0.5 }, fps);
      animateBodyPart(rightArm, { rotationZ: -Math.PI / 6, positionY: 0.5 }, fps);
      
      // Create a small "defeat" visual effect - gray particles falling down
      const defeatParticles = new THREE.Group();
      model.add(defeatParticles);
      
      // Add some falling dust particles
      for (let i = 0; i < 10; i++) {
        const size = Math.random() * 0.1 + 0.05;
        const geometry = new THREE.SphereGeometry(size, 6, 6);
        const material = new THREE.MeshBasicMaterial({
          color: 0x888888,
          transparent: true,
          opacity: 0.6
        });
        
        const particle = new THREE.Mesh(geometry, material);
        particle.position.set(
          (Math.random() - 0.5) * 0.8,
          1.0 + Math.random() * 0.5,
          (Math.random() - 0.5) * 0.8
        );
        
        particle.userData = {
          velocity: new THREE.Vector3(
            (Math.random() - 0.5) * 0.02,
            -0.03 - Math.random() * 0.03,
            (Math.random() - 0.5) * 0.02
          ),
          age: 0,
          maxAge: 25 + Math.floor(Math.random() * 15)
        };
        
        defeatParticles.add(particle);
      }
      
      // Animate the falling dust
      let defeatStep = 0;
      const defeatAnimation = setInterval(() => {
        defeatStep++;
        
        defeatParticles.children.forEach((particle) => {
          // Move particle downward
          if (particle.userData) {
            particle.position.add(particle.userData.velocity);
            particle.userData.age++;
            
            // Fade out
            if (particle.userData.age > particle.userData.maxAge) {
              particle.material.opacity -= 0.05;
              if (particle.material.opacity <= 0) {
                defeatParticles.remove(particle);
              }
            }
          }
        });
        
        // End animation
        if (defeatStep >= 40) {
          clearInterval(defeatAnimation);
          model.remove(defeatParticles);
        }
      }, 1000/30);
      
      setTimeout(() => {
        resetCharacterPose(model);
        animationState.isPlaying = false;
        if (defeatAnimation) clearInterval(defeatAnimation);
      }, 2000);
      break;
  }
}

/**
 * Get color based on element type
 * @param {string} element - The element type
 * @return {number} The color as a hex integer
 */
function getElementColor(element) {
  switch(element) {
    case 'fire':
      return 0xff6600;
    case 'ice':
      return 0xaaddff;
    case 'water':
      return 0x00ccff;
    default:
      return 0xffffff;
  }
}


/**
 * Get element-specific configuration for animations
 * @param {string} elementType - 'fire', 'ice', or 'water'
 * @return {Object} Configuration for the element
 */
function getElementConfig(elementType) {
  switch(elementType) {
    case 'fire':
      return {
        color: 0xff3300,
        particleGeometry: (size) => {
          // Mix of shapes for fire effect with larger size
          return Math.random() > 0.6 ? 
            new THREE.TetrahedronGeometry(size * 1.5) : 
            new THREE.SphereGeometry(size, 8, 8);
        },
        positionParticle: (particle) => {
          // Position around character
          particle.position.set(
            (Math.random() - 0.5) * 2.0, 
            1.5 + Math.random() * 2.5,  
            (Math.random() - 0.5) * 2.0  
          );
        },
        createVelocity: () => {
          // Upward flame-like movement
          return new THREE.Vector3(
            (Math.random() - 0.5) * 0.08,
            0.05 + Math.random() * 0.12, 
            (Math.random() - 0.5) * 0.08
          );
        },
        updateParticle: (particle, step) => {
          // Move particle along its trajectory
          particle.position.add(particle.userData.velocity);
          
          // Fire flickers and rises
          particle.userData.velocity.y -= 0.001; // Less gravity for fire
          particle.position.x += (Math.random() - 0.5) * 0.03; // Flickering
          
          // Rotate for flicker effect
          particle.rotation.x += particle.userData.rotationSpeed * 2;
          particle.rotation.z += particle.userData.rotationSpeed * 2;
          
          // Pulsing size for fire effect
          const scale = 1.0 + Math.sin(step * 0.2 + particle.position.x) * 0.2;
          particle.scale.set(scale, scale, scale);
        }
      };
      
    case 'ice':
      return {
        color: 0xaaddff,
        particleGeometry: (size) => {
          // Crystal-like shapes for ice - larger
          return Math.random() > 0.5 ? 
            new THREE.OctahedronGeometry(size * 1.3) : 
            new THREE.IcosahedronGeometry(size * 1.2);
        },
        positionParticle: (particle) => {
          // Around character
          particle.position.set(
            (Math.random() - 0.5) * 2.5, 
            1.5 + Math.random() * 2.0,   
            (Math.random() - 0.5) * 2.5  
          );
        },
        createVelocity: () => {
          // Gentle floating/falling movement
          return new THREE.Vector3(
            (Math.random() - 0.5) * 0.04,
            -0.01 + Math.random() * 0.05, // Some rise, some fall
            (Math.random() - 0.5) * 0.04
          );
        },
        updateParticle: (particle, step) => {
          // Move particle along its trajectory
          particle.position.add(particle.userData.velocity);
          
          // Ice particles twinkle and have slight drift
          if (Math.random() > 0.95) {
            // Occasional twinkle effect
            particle.material.opacity = 0.7 + Math.random() * 0.3;
          }
          
          // Gentle rotation for ice crystals
          particle.rotation.x += particle.userData.rotationSpeed * 0.5;
          particle.rotation.z += particle.userData.rotationSpeed * 0.5;
          
          // Slow, swaying movement
          particle.position.x += Math.sin(step * 0.05 + particle.position.y * 2) * 0.01;
        }
      };
      
    case 'water':
      default:
        return {
          color: 0x0088ff,
          particleGeometry: (size) => {
            // Larger water droplets
            return new THREE.SphereGeometry(size * 1.2, 8, 8);
          },
          positionParticle: (particle) => {
            // Position in waves around character
            particle.position.set(
              (Math.random() - 0.5) * 2.2, 
              1.0 + Math.random() * 2.5, 
              (Math.random() - 0.5) * 2.2   
            );
          },
        createVelocity: () => {
          // Wave-like movement pattern
          return new THREE.Vector3(
            (Math.random() - 0.5) * 0.05,
            0.02 + Math.random() * 0.04, // Mostly rising
            (Math.random() - 0.5) * 0.05
          );
        },
        updateParticle: (particle, step) => {
          // Move particle along its trajectory
          particle.position.add(particle.userData.velocity);
          
          // Water has more gravity and wave-like movement
          particle.userData.velocity.y -= 0.003;
          
          // Wave-like horizontal motion
          particle.position.x += Math.sin(step * 0.1 + particle.position.z * 3) * 0.015;
          
          // Gentle rotations for water droplets
          particle.rotation.x += particle.userData.rotationSpeed * 0.7;
          particle.rotation.z += particle.userData.rotationSpeed * 0.7;
          
          // Occasional drip effect
          if (particle.position.y < 0.5 && Math.random() > 0.96) {
            particle.userData.velocity.y = 0.08 * Math.random(); // Small bounce
          }
        }
      };
  }
}


/**
 * Create a new element-themed particle
 */
function createElementParticle(elementConfig) {
  // Much larger particles
  const particleSize = Math.random() * 0.6 + 0.3; 
  const particleGeom = elementConfig.particleGeometry(particleSize);
  
  // Create even more visible material with stronger glow
  const particleMat = new THREE.MeshPhongMaterial({
    color: elementConfig.color,
    emissive: elementConfig.color,
    emissiveIntensity: 1.0, // Increased intensity
    transparent: true,
    opacity: 0.95, // Higher opacity
    shininess: 100
  });
  
  const particle = new THREE.Mesh(particleGeom, particleMat);
  elementConfig.positionParticle(particle);
  
  particle.userData = {
    velocity: elementConfig.createVelocity(),
    rotationSpeed: Math.random() * 0.2 - 0.1,
    fadeRate: 0.01 + Math.random() * 0.02,
    age: 0,
    maxAge: 20 + Math.floor(Math.random() * 15)
  };
  
  return particle;
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
