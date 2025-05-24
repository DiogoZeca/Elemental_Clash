import { registerMiniGame, exitGame } from './gameManager.js';
import { animateCharacter } from './characters.js';
import { updateFloatingTextToVictory } from './scene.js';

// Register this module's initialization function
registerMiniGame(initGame);

// Game state
const gameState = {
    playerScore: 0,
    aiScore: 0,
    round: 0,
    maxWins: 3,
    playerChoice: null,
    aiChoice: null,
    result: null,
    isAnimating: false
};

// Element relationships (what beats what)
const elements = {
    ice: { beats: 'water', losesTo: 'fire', color: '#aaddff', icon: '❄️', description: 'Ice freezes Water', key: 'I' },
    water: { beats: 'fire', losesTo: 'ice', color: '#00ccff', icon: '💧', description: 'Water extinguishes Fire', key: 'W' },
    fire: { beats: 'ice', losesTo: 'water', color: '#ff6600', icon: '🔥', description: 'Fire melts Ice', key: 'F' }
};

// Store a reference to our timer IDs so we can clean them up properly
const timers = {
    animations: [],
    transitions: [],
    pointerLock: null,
    countdown: null
};

// Track keyboard event listener to remove it when done
let keyboardListener = null;

/**
 * Handle keyboard presses for element selection
 */
function handleKeyPress(event) {
    if (gameState.isAnimating) return;
    
    const key = event.key.toUpperCase();
    
    switch (key) {
        case 'I':
            makeChoice('ice');
            break;
        case 'W':
            makeChoice('water');
            break;
        case 'F':
            makeChoice('fire');
            break;
        case 'ESCAPE':
            cleanupAndExitWithTransition();
            break;
    }
}

/**
 * Reset the round for the next battle
 */
function resetRound() {
    // Only exit pointer lock once instead of multiple times
    if (document.pointerLockElement) {
        document.exitPointerLock();
    }
    
    // Use cached DOM elements to reduce lookups
    const resultDisplay = document.getElementById('result-display');
    const playerCard = document.getElementById('player-card');
    const aiCard = document.getElementById('ai-card');
    
    // Batch style updates to minimize reflows
    if (resultDisplay) resultDisplay.style.opacity = '0';
    if (playerCard) playerCard.style.transform = 'scale(0)';
    if (aiCard) aiCard.style.transform = 'scale(0)';
    
    if (!gameState.isAnimating) {
        timers.animations.push(setTimeout(() => {
            animateCharacter('enemy', 'thinking');
            timers.animations.push(setTimeout(() => {
                animateCharacter('player', 'thinking');
            }, 50));
        }, 50));
    }
    
    // Allow new selections
    gameState.isAnimating = false;
}

/**
 * Properly clean up and exit the game
 */
function cleanupAndExit() {
    cleanupTimers();
    if (keyboardListener) {
        window.removeEventListener('keydown', keyboardListener);
        keyboardListener = null;
    }
    const finalOverlay = document.getElementById('final-overlay');
    if (finalOverlay && finalOverlay.parentNode) {
        document.body.removeChild(finalOverlay);
    }
    exitGame(false); 
}

/**
 * Clean up all timers to prevent memory leaks
 */
function cleanupTimers() {
    timers.animations.forEach(timer => clearTimeout(timer));
    timers.transitions.forEach(timer => clearTimeout(timer));
    if (timers.pointerLock) clearTimeout(timers.pointerLock);
    if (timers.countdown) clearInterval(timers.countdown);
    timers.animations = [];
    timers.transitions = [];
    timers.pointerLock = null;
    timers.countdown = null;
}

/**
 * More efficient update card function
 */
function updateCard(cardId, element) {
    const card = document.getElementById(cardId);
    if (!card) return;
    
    // Update all styles in one batch to reduce reflows
    const elementInfo = elements[element];
    const style = card.style;
    
    style.borderColor = elementInfo.color;
    style.boxShadow = `0 0 20px ${elementInfo.color}66, inset 0 0 10px ${elementInfo.color}33`;
    
    // Update icon and name directly
    const icon = card.querySelector('.card-icon');
    const name = card.querySelector('.card-name');
    
    if (icon) icon.textContent = elementInfo.icon;
    if (name) {
        name.textContent = element.charAt(0).toUpperCase() + element.slice(1);
        name.style.color = elementInfo.color;
    }
}

/**
 * Make a choice and trigger the battle - optimized for performance
 */
function makeChoice(playerElement) {
    if (gameState.playerScore >= gameState.maxWins || 
        gameState.aiScore >= gameState.maxWins || 
        gameState.isAnimating) return;
    
    // Only exit pointer lock once if needed
    if (document.pointerLockElement) {
        document.exitPointerLock();
    }
    
    gameState.isAnimating = true;
    gameState.playerChoice = playerElement;
    
    // Precompute the AI element once, avoiding re-computation
    let aiElement = getRandomElement();
    while (aiElement === playerElement) {
        aiElement = getRandomElement();
    }
    gameState.aiChoice = aiElement;
    
    // Update cards - this is faster than recreating elements
    updateCard('player-card', playerElement);
    updateCard('ai-card', aiElement);

    // Start animations only once other operations are complete
    animateCharacter('player', 'playCard');
    
    // Use fewer timeouts with a consistent delay pattern
    // Show first card
    timers.transitions.push(setTimeout(() => {
        const playerCard = document.getElementById('player-card');
        if (playerCard) playerCard.style.transform = 'scale(1)';
        
        // Show second card after a delay
        timers.transitions.push(setTimeout(() => {
            const aiCard = document.getElementById('ai-card');
            if (aiCard) aiCard.style.transform = 'scale(1)';
            
            // Show results after both cards are visible
            timers.transitions.push(setTimeout(() => {
                const resultDisplay = document.getElementById('result-display');
                
                // Calculate result and update UI in one operation
                processResults(playerElement, aiElement, resultDisplay);
            }, 400));
        }, 300));
    }, 300));
}

/**
 * Process battle results - separated for better performance
 */
function processResults(playerElement, aiElement, resultDisplay) {
    // Calculate winner once
    const result = determineWinner(playerElement, aiElement);
    gameState.result = result;
    
    if (!resultDisplay) return;
    
    // Show result
    resultDisplay.style.opacity = '1';
    
    // Update score and animations based on result
    if (result === 'win') {
        gameState.playerScore++;
        resultDisplay.textContent = `You Win! ${elements[playerElement].description}`;
        resultDisplay.style.color = elements[playerElement].color;
        
        // Spread out character animations to reduce simultaneous load
        timers.animations.push(setTimeout(() => {
            animateCharacter('enemy', 'win', playerElement);
            timers.animations.push(setTimeout(() => {
                animateCharacter('player', 'lose');
            }, 100));
        }, 100));
    } else {
        gameState.aiScore++;
        resultDisplay.textContent = `Enemy Wins! ${elements[aiElement].description}`;
        resultDisplay.style.color = elements[aiElement].color;
        
        timers.animations.push(setTimeout(() => {
            animateCharacter('player', 'win', aiElement);
            timers.animations.push(setTimeout(() => {
                animateCharacter('enemy', 'lose');
            }, 100));
        }, 100));
    }
    
    // Update scoreboard - use direct text content update
    const playerScoreElement = document.getElementById('player-score');
    const aiScoreElement = document.getElementById('ai-score');
    if (playerScoreElement) playerScoreElement.textContent = gameState.playerScore.toString();
    if (aiScoreElement) aiScoreElement.textContent = gameState.aiScore.toString();
    
    // Increment round counter
    gameState.round++;
    
    // Check if game is over
    if (gameState.playerScore >= gameState.maxWins || 
        gameState.aiScore >= gameState.maxWins) {
        timers.transitions.push(setTimeout(showFinalResult, 1500));
    } else {
        timers.animations.push(setTimeout(() => {
            gameState.isAnimating = false;
            animateCharacter('enemy', 'thinking');
            setTimeout(() => {
                animateCharacter('player', 'thinking');
            }, 50);
        }, 2500)); 
        timers.transitions.push(setTimeout(resetRound, 1500));
    }
}

/**
 * Show the final result of the game with auto-exit countdown
 * Optimization: Create all HTML content once instead of manipulating DOM repeatedly
 */
function showFinalResult() {
    if (document.getElementById('final-overlay')) return;
    
    // Only exit pointer lock once if needed
    if (document.pointerLockElement) {
        document.exitPointerLock();
    }

    // Determine if player won
    const isPlayerWinner = gameState.playerScore > gameState.aiScore;

    // Calculate result information once
    if (isPlayerWinner) {
        // Store victory in localStorage
        localStorage.setItem('elementalClashWon', 'true');
        
        // Update floating text
        updateFloatingTextToVictory();
        
        console.log('Player won! Updating rewards...');

        startVictorySequence();
        return;
    }
    
    // If we reach here, player lost - show defeat overlay
    showDefeatOverlay();
}

/**
 * Start the victory sequence with camera movement and fireworks
 */
function startVictorySequence() {
    console.log('Starting victory sequence...');
    
    // Remove game UI immediately
    const gameUI = document.getElementById('game-ui');
    if (gameUI && gameUI.parentNode) {
        gameUI.style.opacity = '0';
        setTimeout(() => {
            if (gameUI.parentNode) {
                document.body.removeChild(gameUI);
            }
        }, 500);
    }
    
    // Get camera reference - with fallback for rendering issues
    const camera = window.gameCamera;
    if (!camera) {
        console.error('Camera not found, using simple victory display');
        createSimpleVictoryDisplay();
        return;
    }
    
    try {
        // Calculate outdoor position (outside the room, looking up at sky)
        const outdoorPosition = new THREE.Vector3(0, 2, 30); // Outside the building
        const lookUpDirection = new THREE.Vector3(0, 1, -0.3).normalize(); // Looking up at sky
        
        // Store original camera state
        const originalPosition = camera.position.clone();
        const originalQuaternion = camera.quaternion.clone();
        
        // Calculate target rotation (looking up at sky)
        const targetQuaternion = new THREE.Quaternion();
        const targetMatrix = new THREE.Matrix4().lookAt(
            outdoorPosition,
            new THREE.Vector3().addVectors(outdoorPosition, lookUpDirection),
            new THREE.Vector3(0, 1, 0)
        );
        targetQuaternion.setFromRotationMatrix(targetMatrix);
        
        // Start camera transition
        let transitionProgress = 0;
        const transitionDuration = 2000; // 2 seconds
        const startTime = Date.now();
        
        const animateTransition = () => {
            try {
                const elapsed = Date.now() - startTime;
                transitionProgress = Math.min(elapsed / transitionDuration, 1);
                
                // Smooth easing function
                const easedProgress = transitionProgress < 0.5
                    ? 2 * transitionProgress * transitionProgress
                    : 1 - Math.pow(-2 * transitionProgress + 2, 2) / 2;
                
                // Interpolate camera position and rotation
                camera.position.lerpVectors(originalPosition, outdoorPosition, easedProgress);
                camera.quaternion.slerpQuaternions(originalQuaternion, targetQuaternion, easedProgress);
                
                if (transitionProgress < 1) {
                    requestAnimationFrame(animateTransition);
                } else {
                    // Transition complete, show simple victory UI
                    showSimpleVictoryUI(camera, originalPosition, originalQuaternion);
                }
            } catch (error) {
                console.error('Error during camera transition, falling back to simple victory:', error);
                createSimpleVictoryDisplay();
            }
        };
        
        animateTransition();
    } catch (error) {
        console.error('Error setting up victory sequence, using simple display:', error);
        createSimpleVictoryDisplay();
    }
}

/**
 * Show simple victory UI after camera transition (no 3D objects)
 */
function showSimpleVictoryUI(camera, originalPosition, originalQuaternion) {
    console.log('Showing simple victory UI...');
    
    // Create victory overlay with countdown
    createVictoryOverlayWithCountdown();
    
    // No cleanup function needed - the game will restart automatically
}

/**
 * Create a simple victory display without any Three.js interactions
 */
function createSimpleVictoryDisplay() {
    console.log('Creating simple victory display...');
    
    // Create victory UI overlay with countdown
    createVictoryOverlayWithCountdown();
    
    // No cleanup function needed - the game will restart automatically
}

/**
 * Create victory UI overlay with automatic game restart countdown
 */
function createVictoryOverlayWithCountdown() {
    const victoryOverlay = document.createElement('div');
    victoryOverlay.id = 'victory-overlay';
    
    Object.assign(victoryOverlay.style, {
        position: 'fixed',
        top: '0',
        left: '0',
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: '400',
        pointerEvents: 'none',
        background: 'linear-gradient(135deg, rgba(255,215,0,0.1) 0%, rgba(255,165,0,0.1) 50%, rgba(255,69,0,0.1) 100%)'
    });
    
    victoryOverlay.innerHTML = `
        <div style="
            font-size: 120px; 
            font-weight: bold; 
            color: #FFD700; 
            text-shadow: 
                0 0 30px #FFD700,
                0 0 60px #FFA500,
                0 0 90px #FF6600,
                3px 3px 0px #B8860B;
            margin-bottom: 30px;
            animation: victoryPulse 3s infinite ease-in-out;
            text-align: center;
            line-height: 1.1;
        ">
            🏆<br>
            VICTORY!
        </div>
        <div style="
            font-size: 48px; 
            font-weight: bold;
            color: #FFD700; 
            text-shadow: 
                0 0 20px #FFD700,
                2px 2px 0px #B8860B;
            margin-bottom: 20px;
            animation: titleShine 2s infinite ease-in-out;
            text-align: center;
        ">
            You are the Elemental Clash King!
        </div>
        <div style="
            font-size: 28px; 
            color: #ffffff; 
            text-shadow: 0 0 15px #000000;
            background-color: rgba(0, 0, 0, 0.7);
            padding: 20px 40px;
            border-radius: 15px;
            margin-top: 40px;
            border: 2px solid #FFD700;
            box-shadow: 0 0 20px rgba(255, 215, 0, 0.5);
        ">
            🎉 Congratulations! 🎉<br>
            <span style="font-size: 20px; margin-top: 15px; display: block;">
                Game will restart in <span id="victory-countdown" style="color: #FFD700; font-weight: bold;">5</span> seconds...
            </span>
        </div>
    `;
    
    // Add enhanced CSS animations
    const style = document.createElement('style');
    style.textContent = `
        @keyframes victoryPulse {
            0%, 100% { 
                transform: scale(1) rotateY(0deg); 
                text-shadow: 0 0 30px #FFD700, 0 0 60px #FFA500, 0 0 90px #FF6600, 3px 3px 0px #B8860B;
            }
            50% { 
                transform: scale(1.05) rotateY(5deg); 
                text-shadow: 0 0 40px #FFD700, 0 0 80px #FFA500, 0 0 120px #FF6600, 3px 3px 0px #B8860B;
            }
        }
        
        @keyframes titleShine {
            0%, 100% { 
                color: #FFD700;
                text-shadow: 0 0 20px #FFD700, 2px 2px 0px #B8860B;
            }
            50% { 
                color: #FFF8DC;
                text-shadow: 0 0 30px #FFD700, 0 0 40px #FFA500, 2px 2px 0px #B8860B;
            }
        }
    `;
    document.head.appendChild(style);
    
    document.body.appendChild(victoryOverlay);
    
    // Start countdown for game restart
    let countdown = 5;
    const countdownElement = document.getElementById('victory-countdown');
    
    const countdownTimer = setInterval(() => {
        countdown--;
        if (countdownElement) {
            countdownElement.textContent = countdown.toString();
        }
        
        if (countdown <= 0) {
            clearInterval(countdownTimer);
            // Restart the entire game (like F5)
            window.location.reload();
        }
    }, 1000);
    
    // Store timer for cleanup if needed
    timers.countdown = countdownTimer;
}

/**
 * Create victory UI overlay
 */
function createVictoryOverlay() {
    // This function is now replaced by createVictoryOverlayWithCountdown
    // Keeping it for compatibility but redirecting to the new function
    createVictoryOverlayWithCountdown();
}

/**
 * Show regular defeat overlay for when player loses
 */
function showDefeatOverlay() {
    if (document.getElementById('final-overlay')) return;

    const finalOverlay = document.createElement('div');
    finalOverlay.id = 'final-overlay';
    
    Object.assign(finalOverlay.style, {
        position: 'absolute',
        top: '0',
        left: '0',
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: '300'
    });
    
    finalOverlay.innerHTML = `
        <div style="font-size: 64px; font-weight: bold; color: #ff6600; text-shadow: 0 0 20px #ff6600; margin-bottom: 30px;">
            Enemy Wins!
        </div>
        <div style="font-size: 36px; margin-bottom: 20px; color: #ddd;">
            Best of 5
        </div>
        <div style="font-size: 48px; margin-bottom: 40px;">
            <span style="color: #00ccff; font-weight: bold;">${gameState.playerScore}</span>
            <span style="color: #aaa; margin: 0 15px;">:</span>
            <span style="color: #ff6600; font-weight: bold;">${gameState.aiScore}</span>
        </div>
        <div style="font-size: 24px; color: #aaa; margin-top: 20px; margin-bottom: 30px;">
            Returning to game in <span id="countdown">3</span> seconds...
        </div>
        <div style="display: flex; gap: 20px;">
            <button id="play-again-btn" style="padding: 15px 30px; font-size: 20px; background-color: #ff5555; color: white; border: none; border-radius: 8px; cursor: pointer;">
                Play Again
            </button>
            <button id="exit-final-btn" style="padding: 10px 20px; font-size: 16px; background-color: transparent; color: #aaa; border: 1px solid #aaa; border-radius: 5px; cursor: pointer;">
                Exit Now
            </button>
        </div>
    `;
    
    document.body.appendChild(finalOverlay);
    
    // Setup countdown and button handlers
    let countdown = 3;
    const countdownElement = document.getElementById('countdown');

    if (timers.countdown) {
        clearInterval(timers.countdown);
    }
    
    timers.countdown = setInterval(() => {
        countdown--;
        if (countdownElement) {
            countdownElement.textContent = countdown.toString();
        }
        
        if (countdown <= 0) {
            clearInterval(timers.countdown);
            cleanupAndExitWithTransition();
        }
    }, 1000);
    
    // Add button handlers
    document.getElementById('play-again-btn')?.addEventListener('click', event => {
        event.stopPropagation();
        if (timers.countdown) {
            clearInterval(timers.countdown);
            timers.countdown = null;
        }
        if (finalOverlay.parentNode) {
            document.body.removeChild(finalOverlay);
        }
        resetGame();
        createOptimizedUI();
    });
    
    document.getElementById('exit-final-btn')?.addEventListener('click', event => {
        event.stopPropagation();
        
        // Clear countdown
        if (timers.countdown) {
            clearInterval(timers.countdown);
            timers.countdown = null;
        }
        
        // Exit immediately
        cleanupAndExitWithTransition();
    });
}

/**
 * Optimized function to create element cards - create once and cache
 */
function createOptimizedUI() {
    console.log('Creating optimized mini-game UI...');
    
    // Clean up existing UI first
    cleanupTimers();
    
    // Remove existing UI if present
    const existingUI = document.getElementById('game-ui');
    if (existingUI) {
        document.body.removeChild(existingUI);
    }
    
    // Release pointer lock once at the beginning
    if (document.pointerLockElement) {
        document.exitPointerLock();
    }
    
    // Create game UI container - use a document fragment for better performance
    const fragment = document.createDocumentFragment();
    const gameUI = document.createElement('div');
    gameUI.id = 'game-ui';
    
    // Set all styles at once to reduce reflow
    Object.assign(gameUI.style, {
        position: 'absolute',
        top: '0',
        left: '0',
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(0,0,0,0.35)',
        zIndex: '200',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '20px',
        color: '#ffffff',
        fontFamily: '"Trebuchet MS", Arial, sans-serif',
        boxSizing: 'border-box',
        overflow: 'auto'
    });
    
    // Create header with title and scoreboard
    const header = createHeader();
    gameUI.appendChild(header);
    
    // Create battle area
    const battleArea = createBattleArea();
    gameUI.appendChild(battleArea);
    
    // Create element selection area
    const selectionArea = createSelectionArea();
    gameUI.appendChild(selectionArea);
    
    // Create footer with exit button
    const footer = createFooter();
    gameUI.appendChild(footer);
    
    // Add click handler to prevent pointer lock on UI
    gameUI.addEventListener('click', function(event) {
        event.stopPropagation();
        // Ensure pointer lock remains disabled with a debounced approach
        if (timers.pointerLock) clearTimeout(timers.pointerLock);
        timers.pointerLock = setTimeout(() => {
            if (document.pointerLockElement) {
                document.exitPointerLock();
            }
        }, 10);
    });
    
    // Append to fragment first, then to document in one operation
    fragment.appendChild(gameUI);
    document.body.appendChild(fragment);
    
    // Reset game state
    resetGame();
    
    // Setup character animations with a delay to avoid jank
    timers.animations.push(setTimeout(() => {
        animateCharacter('enemy', 'thinking');
        timers.animations.push(setTimeout(() => {
            animateCharacter('player', 'thinking');
        }, 100));
    }, 100));
    
    // Setup keyboard listener
    if (keyboardListener) {
        window.removeEventListener('keydown', keyboardListener);
    }
    keyboardListener = handleKeyPress;
    window.addEventListener('keydown', keyboardListener);
    
    // Final pointer lock check - throttled to improve performance
    timers.pointerLock = setTimeout(() => {
        if (document.pointerLockElement) {
            document.exitPointerLock();
        }
    }, 100);
}

/**
 * Initialize the mini-game UI and elements with optimized rendering
 */
export function initGame() {
    createOptimizedUI();
}

// Export the reset function
export { resetGame };

/**
 * Reset the game state with optimized cleanups
 */
function resetGame() {
    // Ensure we clean up all timers first
    cleanupTimers();
    
    // Release pointer lock
    if (document.pointerLockElement) {
        document.exitPointerLock();
    }
    
    // Reset game state variables in one operation
    Object.assign(gameState, {
        playerScore: 0,
        aiScore: 0,
        round: 0,
        playerChoice: null,
        aiChoice: null,
        result: null,
        isAnimating: false
    });
    
    // Cache DOM elements to avoid repeated lookups
    const playerScoreEl = document.getElementById('player-score');
    const aiScoreEl = document.getElementById('ai-score');
    const playerCard = document.getElementById('player-card');
    const aiCard = document.getElementById('ai-card');
    const resultDisplay = document.getElementById('result-display');
    
    // Update UI in batches
    if (playerScoreEl) playerScoreEl.textContent = '0';
    if (aiScoreEl) aiScoreEl.textContent = '0';
    
    // Hide cards and results in one batch
    if (playerCard) playerCard.style.transform = 'scale(0)';
    if (aiCard) aiCard.style.transform = 'scale(0)';
    if (resultDisplay) resultDisplay.style.opacity = '0';
}

/**
 * Clean up and exit with a smooth transition
 */
function cleanupAndExitWithTransition() {
    console.log('Cleaning up and exiting with optimized transition...');
    
    // Ensure we clean up all timers first
    cleanupTimers();
    
    // Release pointer lock once
    if (document.pointerLockElement) {
        document.exitPointerLock();
    }
    
    // Remove keyboard listener
    if (keyboardListener) {
        window.removeEventListener('keydown', keyboardListener);
        keyboardListener = null;
    }
    
    // Remove overlays
    const finalOverlay = document.getElementById('final-overlay');
    if (finalOverlay && finalOverlay.parentNode) {
        document.body.removeChild(finalOverlay);
    }

    const victoryOverlay = document.getElementById('victory-overlay');
    if (victoryOverlay && victoryOverlay.parentNode) {
        document.body.removeChild(victoryOverlay);
    }
    
    // Fade out the game UI with minimal DOM operations
    const gameUI = document.getElementById('game-ui');
    if (gameUI && gameUI.parentNode) {
        gameUI.style.transition = 'opacity 0.5s';
        gameUI.style.opacity = '0';
        
        // Only do the DOM removal after animation completes
        timers.transitions.push(setTimeout(() => {
            if (gameUI.parentNode) {
                document.body.removeChild(gameUI);
            }
            exitGame(true);
        }, 500));
    } else {
        exitGame(true);
    }
}

/**
 * Get a random element (fire, water, or ice)
 */
function getRandomElement() {
  const elementNames = Object.keys(elements);
  return elementNames[Math.floor(Math.random() * elementNames.length)];
}

/**
 * Determine winner between player and AI elements
 * @param {string} playerElement - Player's chosen element
 * @param {string} aiElement - AI's chosen element
 * @returns {string} 'win' for player win, 'lose' for AI win
 */
function determineWinner(playerElement, aiElement) {
  // If player's element beats AI's element, player wins
  if (elements[playerElement].beats === aiElement) {
    return 'win';
  }
  // Otherwise (if AI's element beats player's element), AI wins
  return 'lose';
}

/**
 * Create header with title and scoreboard - optimized for performance
 */
function createHeader() {
  const header = document.createElement('div');
  
  Object.assign(header.style, {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    marginBottom: '20px',
    width: '100%'
  });
  
  // Create title using innerHTML once instead of multiple DOM operations
  header.innerHTML = `
    <h1 style="font-size: 3.5rem; margin: 5px 0; color: #ffcc00; text-shadow: 0 0 15px rgba(255, 204, 0, 0.5);">
      Elemental Clash
    </h1>
    <div style="display: flex; justify-content: center; margin-top: 10px; font-size: 1.8rem;">
      <div style="display: flex; align-items: center; margin-right: 20px;">
        <span style="color: #00ccff; margin-right: 10px; font-weight: bold;">You</span>
        <span id="player-score" style="background: rgba(0, 0, 0, 0.3); padding: 5px 15px; border-radius: 5px; min-width: 30px; text-align: center;">0</span>
      </div>
      <div style="display: flex; align-items: center; margin-left: 20px;">
        <span id="ai-score" style="background: rgba(0, 0, 0, 0.3); padding: 5px 15px; border-radius: 5px; min-width: 30px; text-align: center;">0</span>
        <span style="color: #ff6600; margin-left: 10px; font-weight: bold;">Enemy</span>
      </div>
    </div>
  `;
  
  return header;
}

/**
 * Create battle area with player and AI cards - optimized for performance
 */
function createBattleArea() {
  const battleArea = document.createElement('div');
  
  Object.assign(battleArea.style, {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    marginBottom: '20px',
    position: 'relative'
  });
  
  // Create all elements in one operation using innerHTML
  battleArea.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; width: 80%; max-width: 900px; position: relative;">
      <!-- Player Card -->
      <div id="player-card" style="
        width: 180px; 
        height: 250px; 
        background-color: rgba(0, 0, 0, 0.7);
        border: 3px solid #00ccff;
        border-radius: 15px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        box-shadow: 0 0 20px rgba(0, 204, 255, 0.4), inset 0 0 10px rgba(0, 204, 255, 0.2);
        transform: scale(0);
        transition: transform 0.3s ease-out;
        z-index: 1;
      ">
        <div class="card-icon" style="font-size: 60px; margin-bottom: 15px;">❄️</div>
        <div class="card-name" style="font-size: 24px; font-weight: bold; color: #00ccff;">Ice</div>
      </div>
      
      <!-- Result Display -->
      <div id="result-display" style="
        font-size: 32px;
        font-weight: bold;
        color: #ffffff;
        text-shadow: 0 0 10px rgba(255, 255, 255, 0.5);
        opacity: 0;
        transition: opacity 0.3s ease;
        position: absolute;
        text-align: center;
        left: 50%;
        top: 50%;
        transform: translate(-50%, -50%);
        width: 40%;
        min-width: 300px;
        padding: 10px;
        background-color: rgba(0, 0, 0, 0.6);
        border-radius: 8px;
        z-index: 10;
      "></div>
      
      <!-- AI Card -->
      <div id="ai-card" style="
        width: 180px; 
        height: 250px; 
        background-color: rgba(0, 0, 0, 0.7);
        border: 3px solid #ff6600;
        border-radius: 15px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        box-shadow: 0 0 20px rgba(255, 102, 0, 0.4), inset 0 0 10px rgba(255, 102, 0, 0.2);
        transform: scale(0);
        transition: transform 0.3s ease-out;
        z-index: 1;
      ">
        <div class="card-icon" style="font-size: 60px; margin-bottom: 15px;">🔥</div>
        <div class="card-name" style="font-size: 24px; font-weight: bold; color: #ff6600;">Fire</div>
      </div>
    </div>
  `;
  
  return battleArea;
}

/**
 * Create element selection area with buttons - optimized for performance
 */
function createSelectionArea() {
  const selectionArea = document.createElement('div');
  
  Object.assign(selectionArea.style, {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    marginBottom: '30px',
    width: '100%'
  });
  
  // Create instruction text
  const instructions = document.createElement('div');
  instructions.textContent = 'Choose your element:';
  Object.assign(instructions.style, {
    fontSize: '24px',
    marginBottom: '20px',
    color: '#ffffff'
  });
  
  // Create element buttons container
  const buttonsContainer = document.createElement('div');
  Object.assign(buttonsContainer.style, {
    display: 'flex',
    justifyContent: 'center',
    gap: '30px'
  });
  
  // Add all element buttons at once for better performance
  const elementTypes = Object.entries(elements);
  elementTypes.forEach(([element, info]) => {
    const button = document.createElement('button');
    
    // Set button attributes and styles in one batch
    Object.assign(button.style, {
      width: '120px',
      height: '120px',
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      border: `3px solid ${info.color}`,
      borderRadius: '15px',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      cursor: 'pointer',
      transition: 'transform 0.2s, box-shadow 0.2s',
      boxShadow: `0 0 15px ${info.color}66`
    });
    
    // Set button content in one operation
    button.innerHTML = `
      <div style="font-size: 40px; margin-bottom: 5px;">${info.icon}</div>
      <div style="font-size: 18px; font-weight: bold; color: ${info.color};">${element.charAt(0).toUpperCase() + element.slice(1)}</div>
      <div style="font-size: 12px; color: #aaa; margin-top: 5px;">(${info.key})</div>
    `;
    
    // Add hover effect
    button.onmouseover = () => {
      button.style.transform = 'scale(1.1)';
      button.style.boxShadow = `0 0 25px ${info.color}`;
    };
    
    button.onmouseout = () => {
      button.style.transform = 'scale(1)';
      button.style.boxShadow = `0 0 15px ${info.color}66`;
    };
    
    // Add click event with optimized event handling
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      if (!gameState.isAnimating) {
        makeChoice(element);
      }
    });
    
    // Add to container
    buttonsContainer.appendChild(button);
  });
  
  // Append all elements to the selection area
  selectionArea.appendChild(instructions);
  selectionArea.appendChild(buttonsContainer);
  
  return selectionArea;
}

/**
 * Create footer with exit button - optimized for performance
 */
function createFooter() {
  const footer = document.createElement('div');
  
  Object.assign(footer.style, {
    marginTop: '20px',
    marginBottom: '10px'
  });
  
  // Create exit button
  const exitButton = document.createElement('button');
  exitButton.textContent = 'Exit Game';
  
  Object.assign(exitButton.style, {
    padding: '12px 25px',
    fontSize: '18px',
    backgroundColor: 'rgba(255, 50, 50, 0.7)',
    border: 'none',
    borderRadius: '8px',
    color: 'white',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  });
  
  exitButton.onmouseover = () => {
    exitButton.style.backgroundColor = 'rgba(255, 50, 50, 0.9)';
  };
  
  exitButton.onmouseout = () => {
    exitButton.style.backgroundColor = 'rgba(255, 50, 50, 0.7)';
  };
  
  // Add optimized click handler
  exitButton.addEventListener('click', (event) => {
    event.stopPropagation();
    cleanupAndExitWithTransition();
  });
  
  footer.appendChild(exitButton);
  return footer;
}