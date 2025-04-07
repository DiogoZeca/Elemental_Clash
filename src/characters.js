import * as THREE from "three";

// Character state
const characterState = {
  enemyModel: null,
  playerModel: null,
  enemyAnimations: {},
  playerAnimations: {},
};

/**
 * Create a simple placeholder character model
 * @param {string} type - 'enemy' or 'player'
 * @returns {THREE.Group} - The character model
 */
function createSimpleCharacter(type) {
    const character = new THREE.Group();
  
    // Character colors - Make enemy more vibrant and noticeable
    const colors = {
      player: {
        body: 0x00ccff,
        head: 0x66ddff,
      },
      enemy: {
        body: 0xff4400,
        head: 0xff7733,
      },
    };

  const color = colors[type] || colors.enemy;

  
  // Create body - cylinder for the torso - make enemy slightly larger
  const scale = type === "enemy" ? 2.0 : 1.8;
  const bodyGeometry = new THREE.CylinderGeometry(
    0.4 * scale,
    0.3 * scale,
    1.2 * scale,
    8
  );
  const bodyMaterial = new THREE.MeshStandardMaterial({
    color: color.body,
    roughness: 0.7,
    metalness: 0.3,
    emissive: type === "enemy" ? color.body : 0x000000,
    emissiveIntensity: type === "enemy" ? 0.5 : 0.3,
  });
  const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
  body.position.y = 0.6 * scale;
  character.add(body);

  // Create head - sphere
  const headGeometry = new THREE.SphereGeometry(0.3 * scale, 24, 24);
  const headMaterial = new THREE.MeshStandardMaterial({
    color: color.head,
    roughness: 0.7,
    metalness: 0.2,
    emissive: type === "enemy" ? color.head : 0x000000,
    emissiveIntensity: type === "enemy" ? 0.5 : 0.3,
  });
  const head = new THREE.Mesh(headGeometry, headMaterial);
  head.position.y = 1.4 * scale;
  character.add(head);

  // Create arms
  const armGeometry = new THREE.CylinderGeometry(0.1, 0.1, 0.8, 8);
  const armMaterial = bodyMaterial;

  // Left arm
  const leftArm = new THREE.Mesh(armGeometry, armMaterial);
  leftArm.position.set(-0.5, 0.7, 0);
  leftArm.rotation.z = Math.PI / 4;
  character.add(leftArm);

  // Right arm
  const rightArm = new THREE.Mesh(armGeometry, armMaterial);
  rightArm.position.set(0.5, 0.7, 0);
  rightArm.rotation.z = -Math.PI / 4;
  character.add(rightArm);

  // Create simple table-sitting base (half-cylinder for legs)
  const legsGeometry = new THREE.CylinderGeometry(
    0.4,
    0.4,
    0.5,
    8,
    1,
    false,
    0,
    Math.PI
  );
  const legsMaterial = new THREE.MeshStandardMaterial({
    color: color.body,
    roughness: 0.8,
    metalness: 0.1,
  });
  const legs = new THREE.Mesh(legsGeometry, legsMaterial);
  legs.rotation.x = Math.PI / 2;
  legs.position.set(0, 0.25, 0);
  character.add(legs);

  // Add shadows to all parts
  character.traverse((obj) => {
    if (obj.isMesh) {
      obj.castShadow = true;
      obj.receiveShadow = true;
    }
  });

  // Store reference to body parts for animation
  character.userData = {
    bodyParts: {
      body,
      head,
      leftArm,
      rightArm,
    },
    animationState: {
      isIdle: true,
      isPlaying: false,
      lastAction: "idle",
    },
  };

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
      -1.0, // RAISED HIGHER: from -2.5 to -1.0 to be more visible
      tableData.maxZ + 0.6 // CLOSER TO TABLE: from +1.2 to +0.6
    );
    // Face toward the table/enemy
    character.rotation.y = Math.PI;
  } else {
    // Position enemy at the top side of table (farther from camera)
    character.position.set(
      tableCenter.x,
      0.0, // RAISED HIGHER: from -2.0 to 0.0 for maximum visibility
      tableData.minZ - 1.2 // CLOSER TO TABLE: from -2.0 to -1.2
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
export function setupCharacters(scene, tableData) {
  if (!scene || !tableData) {
    console.error("Cannot setup characters: missing scene or table data");
    return;
  }

  // Create enemy character
  const enemy = createSimpleCharacter("enemy");
  positionCharacterAtTable(enemy, "enemy", tableData);
  scene.add(enemy);
  characterState.enemyModel = enemy;

  // Create player character (optional - won't be visible from first person)
  const player = createSimpleCharacter("player");
  positionCharacterAtTable(player, "player", tableData);
  scene.add(player);
  characterState.playerModel = player;

  console.log("Characters set up successfully");
  return characterState;
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
  
    if (!model || !model.userData || !model.userData.bodyParts) return;
  
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
