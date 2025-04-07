import { exitGame } from './game.js';
import { animateCharacter } from './characters.js';

// Game state
const gameState = {
    playerScore: 0,
    aiScore: 0,
    round: 0,
    maxWins: 3, // First to 3 wins (Best of 5)
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

// Track keyboard event listener to remove it when done
let keyboardListener = null;

/**
 * Initialize the mini-game UI and elements
 */
export function initGame() {
    // Ensure pointer lock is disabled at start
    document.exitPointerLock();
    
    // Create game UI container
    const gameUI = document.createElement('div');
    gameUI.id = 'game-ui';
    gameUI.style.position = 'absolute';
    gameUI.style.top = '0';
    gameUI.style.left = '0';
    gameUI.style.width = '100%';
    gameUI.style.height = '100%';
    gameUI.style.backgroundColor = 'rgba(0,0,0,0.85)';
    gameUI.style.zIndex = '200';
    gameUI.style.display = 'flex';
    gameUI.style.flexDirection = 'column';
    gameUI.style.justifyContent = 'space-between';
    gameUI.style.alignItems = 'center';
    gameUI.style.padding = '20px';
    gameUI.style.color = '#ffffff';
    gameUI.style.fontFamily = '"Trebuchet MS", Arial, sans-serif';
    gameUI.style.boxSizing = 'border-box'; 
    gameUI.style.overflow = 'auto';
    
    // Add click handler to prevent pointer lock on UI
    gameUI.addEventListener('click', function(event) {
        // Stop event propagation to prevent pointer lock
        event.stopPropagation();
        // Ensure pointer lock remains disabled
        setTimeout(() => document.exitPointerLock(), 10);
    });
    
    // Create header section
    const header = document.createElement('div');
    header.style.display = 'flex';
    header.style.flexWrap = 'wrap';
    header.style.justifyContent = 'space-between';
    header.style.width = '100%';
    header.style.padding = '10px';
    header.style.boxSizing = 'border-box';
    
    // Create title
    const title = document.createElement('h1');
    title.textContent = 'Elemental Clash';
    title.style.color = '#ff5555';
    title.style.margin = '0';
    title.style.fontSize = 'min(32px, 5vw)';
    title.style.textShadow = '0 0 10px rgba(255,85,85,0.5)';
    title.style.whiteSpace = 'nowrap'; 
    header.appendChild(title);
    
    // Create scoreboard
    const scoreboard = document.createElement('div');
    scoreboard.id = 'scoreboard';
    scoreboard.style.display = 'flex';
    scoreboard.style.alignItems = 'center';
    scoreboard.style.gap = '10px';
    scoreboard.style.fontSize = 'min(24px, 4vw)'; 
    scoreboard.style.flexWrap = 'nowrap';
    scoreboard.innerHTML = `
        <div style="text-align: center">
            <div style="font-weight: bold; color: #00ccff">You</div>
            <div id="player-score">0</div>
        </div>
        <div style="color: #aaa; font-size: min(30px, 5vw)">:</div>
        <div style="text-align: center">
            <div style="font-weight: bold; color: #ff6600">Enemy</div>
            <div id="ai-score">0</div>
        </div>
        <div style="margin-left: 10px; padding: 5px 10px; background: rgba(255,255,255,0.1); border-radius: 15px; white-space: nowrap;">
            First to <span id="max-wins">${gameState.maxWins}</span> wins
        </div>
    `;
    header.appendChild(scoreboard);
    gameUI.appendChild(header);
    
    // Create battle area
    const battleArea = document.createElement('div');
    battleArea.id = 'battle-area';
    battleArea.style.display = 'flex';
    battleArea.style.flexDirection = 'column';
    battleArea.style.alignItems = 'center';
    battleArea.style.justifyContent = 'center';
    battleArea.style.width = '100%';
    battleArea.style.flex = '1';
    battleArea.style.margin = '20px 0';
    
    // Result display
    const resultDisplay = document.createElement('div');
    resultDisplay.id = 'result-display';
    resultDisplay.style.fontSize = '36px';
    resultDisplay.style.fontWeight = 'bold';
    resultDisplay.style.textAlign = 'center';
    resultDisplay.style.height = '60px';
    resultDisplay.style.marginBottom = '40px';
    resultDisplay.style.opacity = '0';
    resultDisplay.style.transition = 'opacity 0.5s';
    battleArea.appendChild(resultDisplay);
    
    // Battle cards
    const battleCards = document.createElement('div');
    battleCards.style.display = 'flex';
    battleCards.style.flexWrap = 'wrap'; 
    battleCards.style.justifyContent = 'center';
    battleCards.style.width = '100%';
    battleCards.style.maxWidth = '800px';
    battleCards.style.gap = '20px'; 
    battleCards.style.marginBottom = '20px';
    
    // Player's card
    const playerCard = createCard('player-card', 'Your Element');
    playerCard.style.transform = 'scale(0)';
    playerCard.style.transition = 'transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)';
    battleCards.appendChild(playerCard);
    
    // VS display
    const vsDisplay = document.createElement('div');
    vsDisplay.style.display = 'flex';
    vsDisplay.style.flexDirection = 'column';
    vsDisplay.style.justifyContent = 'center';
    vsDisplay.style.alignItems = 'center';
    vsDisplay.style.padding = '0 20px';
    vsDisplay.innerHTML = `
        <div style="font-size: 40px; font-weight: bold; color: #aaa;">VS</div>
    `;
    battleCards.appendChild(vsDisplay);
    
    // AI's card
    const aiCard = createCard('ai-card', 'Enemy Element');
    aiCard.style.transform = 'scale(0)';
    aiCard.style.transition = 'transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)';
    battleCards.appendChild(aiCard);
    
    battleArea.appendChild(battleCards);
    gameUI.appendChild(battleArea);
    
    // Create element selection display with keyboard instructions
    const selectionArea = document.createElement('div');
    selectionArea.style.display = 'flex';
    selectionArea.style.flexDirection = 'column';
    selectionArea.style.alignItems = 'center';
    selectionArea.style.gap = '10px'; 
    selectionArea.style.padding = '10px';
    selectionArea.style.marginBottom = '10px'; 
    selectionArea.style.width = '100%';
    selectionArea.style.boxSizing = 'border-box';

    // Instructions heading
    const instructionsHeading = document.createElement('div');
    instructionsHeading.style.fontSize = 'min(24px, 4vw)'; 
    instructionsHeading.style.marginBottom = '10px'; 
    instructionsHeading.textContent = 'Choose your element:';
    selectionArea.appendChild(instructionsHeading);
    
    // Element options with keyboard keys
    const elementOptions = document.createElement('div');
    elementOptions.style.display = 'flex';
    elementOptions.style.flexWrap = 'wrap'; 
    elementOptions.style.justifyContent = 'center';
    elementOptions.style.gap = '20px';
    elementOptions.style.width = '100%';
    elementOptions.style.maxWidth = '800px';

    Object.entries(elements).forEach(([element, info]) => {
        const elementOption = document.createElement('div');
        elementOption.style.display = 'flex';
        elementOption.style.flexDirection = 'column';
        elementOption.style.alignItems = 'center';
        elementOption.style.padding = '15px 25px';
        elementOption.style.borderRadius = '10px';
        elementOption.style.backgroundColor = info.color + '33'; // Semi-transparent
        elementOption.style.border = `2px solid ${info.color}`;
        elementOption.style.cursor = 'pointer';
        elementOption.style.transition = 'all 0.2s ease';
        
        elementOption.innerHTML = `
            <div style="font-size: 40px; margin-bottom: 5px;">${info.icon}</div>
            <div style="font-weight: bold; color: ${info.color}; text-shadow: 0 0 5px rgba(0,0,0,0.5); font-size: 18px;">
                ${element.charAt(0).toUpperCase() + element.slice(1)}
            </div>
            <div style="margin-top: 8px; background: rgba(255,255,255,0.2); padding: 3px 10px; border-radius: 5px; font-weight: bold;">
                Press <span style="color: ${info.color}">${info.key}</span>
            </div>
        `;

        // Add hover effects
        elementOption.addEventListener('mouseover', () => {
            elementOption.style.backgroundColor = info.color + '66'; // More opaque on hover
            elementOption.style.transform = 'translateY(-5px)'; // Slight raise effect
            elementOption.style.boxShadow = `0 5px 15px rgba(0,0,0,0.3), 0 0 10px ${info.color}66`; // Glow effect
        });
        
        elementOption.addEventListener('mouseout', () => {
            elementOption.style.backgroundColor = info.color + '33';
            elementOption.style.transform = 'translateY(0)';
            elementOption.style.boxShadow = 'none';
        });
        
        // Add click handler for element selection
        elementOption.addEventListener('click', (event) => {
            event.stopPropagation(); // Prevent event bubbling
            document.exitPointerLock(); // Ensure pointer remains free
            
            if (!gameState.isAnimating) {
                makeChoice(element);
            }
        });

        
        elementOptions.appendChild(elementOption);
    });
    
    selectionArea.appendChild(elementOptions);
    gameUI.appendChild(selectionArea);
    
    // Add instruction that explains both input methods
    const dualInputInstructions = document.createElement('div');
    dualInputInstructions.style.fontSize = '16px';
    dualInputInstructions.style.color = '#dddddd';
    dualInputInstructions.style.marginTop = '15px';
    dualInputInstructions.style.textAlign = 'center';
    dualInputInstructions.innerHTML = 'Choose by <b>clicking</b> the cards or using <b>keyboard keys</b>';
    selectionArea.appendChild(dualInputInstructions);
    
    // Add instructions for ESC key to exit
    const escInstructions = document.createElement('div');
    escInstructions.style.fontSize = '16px';
    escInstructions.style.color = '#aaaaaa';
    escInstructions.style.marginTop = '10px';
    escInstructions.textContent = 'Press ESC to exit the game';
    selectionArea.appendChild(escInstructions);
    
    // Create footer with exit button
    const footer = document.createElement('div');
    footer.style.display = 'flex';
    footer.style.justifyContent = 'center';
    footer.style.marginBottom = '20px';
    
    const exitButton = document.createElement('button');
    exitButton.textContent = 'Exit Game';
    exitButton.style.padding = '10px 25px';
    exitButton.style.backgroundColor = '#ff5555';
    exitButton.style.border = 'none';
    exitButton.style.borderRadius = '5px';
    exitButton.style.fontSize = '16px';
    exitButton.style.fontWeight = 'bold';
    exitButton.style.cursor = 'pointer';
    exitButton.style.transition = 'background-color 0.2s';
    exitButton.addEventListener('mouseover', () => {
        exitButton.style.backgroundColor = '#ff7777';
    });
    exitButton.addEventListener('mouseout', () => {
        exitButton.style.backgroundColor = '#ff5555';
    });
    exitButton.onclick = (event) => {
        event.stopPropagation();
        document.exitPointerLock();
        cleanupAndExit();
    };
    
    footer.appendChild(exitButton);
    gameUI.appendChild(footer);
    
    // Add to document
    document.body.appendChild(gameUI);
    
    // Reset game state
    resetGame();
    
    // Setup keyboard listener for element selection
    keyboardListener = handleKeyPress;
    window.addEventListener('keydown', keyboardListener);
    
    // Final pointer lock check - ensure it's released after everything is set up
    setTimeout(() => document.exitPointerLock(), 100);
}

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
            cleanupAndExit();
            break;
    }
}

/**
 * Properly clean up and exit the game
 */
function cleanupAndExit() {
    // Ensure pointer lock is disabled before exiting
    document.exitPointerLock();
    
    // Remove keyboard listener
    if (keyboardListener) {
        window.removeEventListener('keydown', keyboardListener);
        keyboardListener = null;
    }
    
    // Remove final overlay if it exists
    const finalOverlay = document.getElementById('final-overlay');
    if (finalOverlay) {
        document.body.removeChild(finalOverlay);
    }
    
    // Exit game
    exitGame();
}

/**
 * Create an element card for the battle area
 */
function createCard(id, title) {
    const card = document.createElement('div');
    card.id = id;
    card.className = 'element-card';
    card.style.width = 'min(200px, 40vw)'; 
    card.style.height = 'min(300px, 60vw)'; 
    card.style.minWidth = '150px'; 
    card.style.minHeight = '225px'; 
    card.style.borderRadius = '15px';
    card.style.padding = '20px';
    card.style.display = 'flex';
    card.style.flexDirection = 'column';
    card.style.alignItems = 'center';
    card.style.justifyContent = 'center';
    card.style.backgroundColor = 'rgba(50, 50, 50, 0.7)';
    card.style.border = '2px solid rgba(255, 255, 255, 0.3)';
    card.style.boxShadow = '0 10px 20px rgba(0, 0, 0, 0.3)';
    card.style.boxSizing = 'border-box';
    
    const cardTitle = document.createElement('div');
    cardTitle.style.fontSize = 'min(18px, 3.5vw)'; 
    cardTitle.style.marginBottom = '15px';
    cardTitle.style.color = '#ddd';
    cardTitle.textContent = title;
    card.appendChild(cardTitle);
    
    const cardIcon = document.createElement('div');
    cardIcon.className = 'card-icon';
    cardIcon.style.fontSize = 'min(80px, 16vw)'; 
    cardIcon.style.margin = '20px 0';
    card.appendChild(cardIcon);
    
    const cardName = document.createElement('div');
    cardName.className = 'card-name';
    cardName.style.fontSize = 'min(24px, 4.5vw)'; 
    cardName.style.fontWeight = 'bold';
    cardName.style.marginTop = '15px';
    card.appendChild(cardName);
    
    return card;
}

/**
 * Make a choice and trigger the battle
 */
function makeChoice(playerElement) {
    if (gameState.playerScore >= gameState.maxWins || 
        gameState.aiScore >= gameState.maxWins || 
        gameState.isAnimating) return;
    
    // Ensure pointer lock stays disabled during selection
    document.exitPointerLock();
    
    gameState.isAnimating = true;
    gameState.playerChoice = playerElement;
    
    // "AI" makes a random choice - but avoid draws by rerolling if needed
    let aiElement = getRandomElement();
    
    // If it would be a draw, reroll the AI's choice until it's different
    while (aiElement === playerElement) {
        aiElement = getRandomElement();
    }
    
    gameState.aiChoice = aiElement;
    
    // Update cards
    updateCard('player-card', playerElement);
    updateCard('ai-card', aiElement);

    // Player plays a card
    animateCharacter('player', 'playCard');

    // Enemy thinks before making a choice
    animateCharacter('enemy', 'thinking');
    
    // Animate cards appearing
    setTimeout(() => {
        document.getElementById('player-card').style.transform = 'scale(1)';
    }, 300);
    
    setTimeout(() => {
        document.getElementById('ai-card').style.transform = 'scale(1)';
    }, 600);
    
    // Determine winner
    setTimeout(() => {
        // Ensure pointer lock stays disabled during results
        document.exitPointerLock();
        
        const result = determineWinner(playerElement, aiElement);
        gameState.result = result;
        
        // Update result display
        const resultDisplay = document.getElementById('result-display');
        resultDisplay.style.opacity = '1';
        
        if (result === 'win') {
            gameState.playerScore++;
            resultDisplay.textContent = `You Win! ${elements[playerElement].description}`;
            resultDisplay.style.color = elements[playerElement].color;
            
            // Add character animations
            animateCharacter('player', 'win');
            animateCharacter('enemy', 'lose');

        } else if (result === 'lose') {
            gameState.aiScore++;
            resultDisplay.textContent = `Enemy Wins! ${elements[aiElement].description}`;
            resultDisplay.style.color = elements[aiElement].color;

                // Add character animations
                animateCharacter('player', 'lose');
                animateCharacter('enemy', 'win');
        }
        
        // Update scoreboard
        document.getElementById('player-score').textContent = gameState.playerScore;
        document.getElementById('ai-score').textContent = gameState.aiScore;
        
        // Increment round counter (for tracking only)
        gameState.round++;
        
        // Check if game is over (Best-of-5 rule: first to 3 wins)
        if (gameState.playerScore >= gameState.maxWins || 
            gameState.aiScore >= gameState.maxWins) {
            setTimeout(showFinalResult, 1500);
        } else {
            // Reset for next round
            setTimeout(resetRound, 1500);
        }
    }, 1000);
}

/**
 * Update a card with element information
 */
function updateCard(cardId, element) {
    const card = document.getElementById(cardId);
    if (!card) return;
    
    card.style.borderColor = elements[element].color;
    card.style.boxShadow = `0 0 20px ${elements[element].color}66, inset 0 0 10px ${elements[element].color}33`;
    
    const icon = card.querySelector('.card-icon');
    icon.textContent = elements[element].icon;
    
    const name = card.querySelector('.card-name');
    name.textContent = element.charAt(0).toUpperCase() + element.slice(1);
    name.style.color = elements[element].color;
}

/**
 * Reset the round for the next battle
 */
function resetRound() {
    // Ensure pointer lock remains disabled between rounds
    document.exitPointerLock();
    
    // Hide results
    const resultDisplay = document.getElementById('result-display');
    resultDisplay.style.opacity = '0';
    
    // Hide cards with animation
    document.getElementById('player-card').style.transform = 'scale(0)';
    document.getElementById('ai-card').style.transform = 'scale(0)';
    
    // Allow new selections
    gameState.isAnimating = false;
}

/**
 * Show the final result of the game
 */
function showFinalResult() {
    // Ensure pointer lock is disabled for final screen
    document.exitPointerLock();
    
    // Create overlay for final result
    const finalOverlay = document.createElement('div');
    finalOverlay.id = 'final-overlay';
    finalOverlay.style.position = 'absolute';
    finalOverlay.style.top = '0';
    finalOverlay.style.left = '0';
    finalOverlay.style.width = '100%';
    finalOverlay.style.height = '100%';
    finalOverlay.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    finalOverlay.style.display = 'flex';
    finalOverlay.style.flexDirection = 'column';
    finalOverlay.style.justifyContent = 'center';
    finalOverlay.style.alignItems = 'center';
    finalOverlay.style.zIndex = '300';
    
    // Add click handler to prevent pointer lock
    finalOverlay.addEventListener('click', function(event) {
        event.stopPropagation();
        document.exitPointerLock();
    });
    
    // Determine winner
    let resultText, resultColor;
    if (gameState.playerScore > gameState.aiScore) {
        resultText = 'You Win!';
        resultColor = '#00ccff';
    } else {
        resultText = 'Enemy Wins!';
        resultColor = '#ff6600';
    }
    
    finalOverlay.innerHTML = `
        <div style="font-size: 64px; font-weight: bold; color: ${resultColor}; text-shadow: 0 0 20px ${resultColor}88; margin-bottom: 30px;">
            ${resultText}
        </div>
        <div style="font-size: 36px; margin-bottom: 20px; color: #ddd;">
            Best of 5
        </div>
        <div style="font-size: 48px; margin-bottom: 40px;">
            <span style="color: #00ccff; font-weight: bold;">${gameState.playerScore}</span>
            <span style="color: #aaa; margin: 0 15px;">:</span>
            <span style="color: #ff6600; font-weight: bold;">${gameState.aiScore}</span>
        </div>
        <button id="play-again-btn" style="padding: 15px 30px; font-size: 20px; background-color: #ff5555; color: white; border: none; border-radius: 8px; cursor: pointer; margin-bottom: 20px;">
            Play Again
        </button>
        <button id="exit-final-btn" style="padding: 10px 20px; font-size: 16px; background-color: transparent; color: #aaa; border: 1px solid #aaa; border-radius: 5px; cursor: pointer;">
            Exit Game
        </button>
    `;
    
    document.body.appendChild(finalOverlay);
    
    // Add stopPropagation() to button clicks
    document.getElementById('play-again-btn').addEventListener('click', (event) => {
        event.stopPropagation();
        document.exitPointerLock();
        document.body.removeChild(finalOverlay);
        resetGame();
    });
    
    document.getElementById('exit-final-btn').addEventListener('click', (event) => {
        event.stopPropagation();
        document.exitPointerLock();
        cleanupAndExit();
    });
}

/**
 * Determine the winner based on element choices - no draws
 */
function determineWinner(playerElement, aiElement) {
    // We've already ensured the choices are different, so there will be no draws
    if (elements[playerElement].beats === aiElement) return 'win';
    return 'lose';
}

/**
 * Get a random element
 */
function getRandomElement() {
    const elementTypes = Object.keys(elements);
    return elementTypes[Math.floor(Math.random() * elementTypes.length)];
}

/**
 * Reset the game state
 */
function resetGame() {
    // Ensure pointer lock is disabled when resetting
    document.exitPointerLock();
    
    gameState.playerScore = 0;
    gameState.aiScore = 0;
    gameState.round = 0;
    gameState.playerChoice = null;
    gameState.aiChoice = null;
    gameState.result = null;
    gameState.isAnimating = false;
    
    // Update UI
    document.getElementById('player-score').textContent = '0';
    document.getElementById('ai-score').textContent = '0';
    
    // Hide cards and results
    const playerCard = document.getElementById('player-card');
    const aiCard = document.getElementById('ai-card');
    const resultDisplay = document.getElementById('result-display');
    
    if (playerCard) playerCard.style.transform = 'scale(0)';
    if (aiCard) aiCard.style.transform = 'scale(0)';
    if (resultDisplay) resultDisplay.style.opacity = '0';
    
    // Final pointer lock check
    setTimeout(() => document.exitPointerLock(), 100);
}

// Export the reset function
export { resetGame };