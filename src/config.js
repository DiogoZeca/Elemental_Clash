export const SCENE_CONFIG = {
    wallHeight: 12,
    floorLevel: -3,
    wallOffset: -13,
    roomWidth: 35,
    roomDepth: 25
};
  
  export const MOVEMENT_CONFIG = {
    walkSpeed: 0.15,
    runSpeed: 0.3,
    playerHeight: 2,
    mouseSensitivity: 0.002
  };
  
  // Calculate door position
  export const doorZ = SCENE_CONFIG.wallOffset + SCENE_CONFIG.roomDepth;
  
  // Ground size
  export const GROUND_SIZE = 100;
  
  // Outer boundary configuration
  export const BOUNDARY_CONFIG = {
    minX: -GROUND_SIZE/2,
    maxX: GROUND_SIZE/2,
    minZ: -GROUND_SIZE/2,
    maxZ: GROUND_SIZE/2  
};
  
  // Wall boundary configuration
  export const WALL_CONFIG = {
    // Room wall boundaries
    backWall: {
      minX: -SCENE_CONFIG.roomWidth/2,
      maxX: SCENE_CONFIG.roomWidth/2,
      minZ: SCENE_CONFIG.wallOffset - 0.2,
      maxZ: SCENE_CONFIG.wallOffset + 0.2
    },
    leftWall: {
      minX: -SCENE_CONFIG.roomWidth/2 - 0.2,
      maxX: -SCENE_CONFIG.roomWidth/2 + 0.2,
      minZ: SCENE_CONFIG.wallOffset,
      maxZ: doorZ
    },
    rightWall: {
      minX: SCENE_CONFIG.roomWidth/2 - 0.2,
      maxX: SCENE_CONFIG.roomWidth/2 + 0.2,
      minZ: SCENE_CONFIG.wallOffset,
      maxZ: doorZ
    },
    frontWall: {
      minX: -SCENE_CONFIG.roomWidth/2,
      maxX: SCENE_CONFIG.roomWidth/2,
      minZ: doorZ - 0.2,
      maxZ: doorZ + 0.2
    },
    doorway: {
      minX: -2,
      maxX: 2,
      minZ: doorZ - 0.5,
      maxZ: doorZ + 0.5
    }
  };