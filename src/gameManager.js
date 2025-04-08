/**
 * Game Manager - Central communication hub between game modules
 * Solves circular dependency issues
 */

// Storage for registered functions
const registry = {
    miniGameInit: null,
    exitGame: null
};

/**
 * Register the mini-game initialization function
 * @param {Function} initFunction - The function to initialize the mini-game
 */
export function registerMiniGame(initFunction) {
    registry.miniGameInit = initFunction;
    console.log('Mini-game registered successfully');
}

/**
 * Register the exit game function
 * @param {Function} exitFunction - The function to exit the game
 */
export function registerExitGame(exitFunction) {
    registry.exitGame = exitFunction;
    console.log('Exit game function registered successfully');
}

/**
 * Start the mini-game
 */
export function startMiniGame() {
    if (registry.miniGameInit) {
        console.log('Starting mini-game through manager...');
        registry.miniGameInit();
    } else {
        console.error('ERROR: Mini-game not registered!');
    }
}

/**
 * Exit the game with optional transition
 * @param {boolean} useTransition - Whether to use smooth transition
 */
export function exitGame(useTransition = false) {
    if (registry.exitGame) {
        console.log(`Exiting game through manager (transition: ${useTransition})...`);
        registry.exitGame(useTransition);
    } else {
        console.error('ERROR: Exit game function not registered!');
    }
}