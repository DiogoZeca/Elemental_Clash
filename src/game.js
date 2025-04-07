import { playerState } from './gameState.js';

/**
 * Start the card game 
 */
export function startGame() {
  // Hide play prompt
  if (window.playPrompt) {
    window.playPrompt.style.display = 'none';
  }
  
  // Create game UI
  const gameUI = document.createElement('div');
  gameUI.id = 'game-ui';
  gameUI.style.position = 'absolute';
  gameUI.style.top = '0';
  gameUI.style.left = '0';
  gameUI.style.width = '100%';
  gameUI.style.height = '100%';
  gameUI.style.backgroundColor = 'rgba(0,0,0,0.7)';
  gameUI.style.zIndex = '200';
  gameUI.style.display = 'flex';
  gameUI.style.flexDirection = 'column';
  gameUI.style.justifyContent = 'center';
  gameUI.style.alignItems = 'center';
  gameUI.style.color = '#ffffff';
  gameUI.style.fontFamily = 'Arial, sans-serif';
  
  // Add game title
  const title = document.createElement('h1');
  title.textContent = 'Elemental Clash';
  title.style.color = '#ff5555';
  title.style.marginBottom = '20px';
  gameUI.appendChild(title);
  
  // Add game message
  const message = document.createElement('p');
  message.textContent = 'Card game interface goes here...';
  message.style.marginBottom = '30px';
  gameUI.appendChild(message);
  
  // Add exit button
  const exitButton = document.createElement('button');
  exitButton.textContent = 'Exit Game';
  exitButton.style.padding = '10px 20px';
  exitButton.style.backgroundColor = '#ff5555';
  exitButton.style.border = 'none';
  exitButton.style.borderRadius = '5px';
  exitButton.style.cursor = 'pointer';
  exitButton.onclick = exitGame;
  gameUI.appendChild(exitButton);
  
  // Add to document
  document.body.appendChild(gameUI);
  
  // Disable pointer lock to free the mouse for the UI
  document.exitPointerLock();
  
  // Lock player movement
  playerState.inGame = true;
}

/**
 * Exit the card game
 */
function exitGame() {
  // Remove game UI
  const gameUI = document.getElementById('game-ui');
  if (gameUI) {
    document.body.removeChild(gameUI);
  }
  
  // Reset game state
  playerState.inGame = false;
  
  // Re-enable interaction after a short delay
  setTimeout(() => {
    document.getElementById('instructions').style.display = 'block';
  }, 500);
}

export { exitGame };