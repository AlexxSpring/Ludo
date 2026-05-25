// ==========================================================================
// NANI JI'S LUDO - PHASE 2: CENTRALIZED STATE ENGINE & DICE
// ==========================================================================

/* 
  DATA STRUCTURE: gameState
  This centralized object is the single source of truth for the game.
  We strictly separate logic from the DOM (No DOM-scraping to check positions).
*/
const gameState = {
    // Current active player: 'red', 'green', 'yellow', 'blue'
    currentPlayer: 'red',
    
    // Standard Ludo turn order (clockwise)
    players: ['red', 'green', 'yellow', 'blue'],
    
    // Dice state
    diceValue: 1,
    diceRolled: false,
    
    // Tokens for each player. 
    // 0 = In Base. 1-56 = On the unified path. 57 = Finished/Home.
    tokens: {
        red: [0, 0, 0, 0],
        green: [0, 0, 0, 0],
        yellow: [0, 0, 0, 0],
        blue: [0, 0, 0, 0]
    },
    
    // Game status
    isGameOver: false,
    winner: null,
    
    // Accessibility: Slower animation delays so the user can follow along
    animationDelayMs: 600
};

// ==========================================================================
// DOM ELEMENTS
// ==========================================================================
const diceElement = document.getElementById('main-dice');
const turnTextElement = document.getElementById('player-turn-text');
const btnPlayComputer = document.getElementById('btn-play-computer');
const splashScreen = document.getElementById('splash-screen');
const gameScreen = document.getElementById('game-screen');
const indicator = document.querySelector('.active-player-indicator');

// ==========================================================================
// GAME INITIALIZATION
// ==========================================================================
function initGame() {
    // Hide splash screen, show game screen
    splashScreen.classList.remove('active');
    splashScreen.classList.add('hidden');
    gameScreen.classList.remove('hidden');
    gameScreen.classList.add('active');
    
    // Reset state for a fresh game
    gameState.currentPlayer = 'red';
    gameState.diceRolled = false;
    
    updateTurnUI();
}

btnPlayComputer.addEventListener('click', initGame);

// ==========================================================================
// DICE LOGIC & ANIMATIONS
// ==========================================================================
// Unicode dice faces for accessibility and scalable high-contrast rendering
const diceFaces = {
    1: '⚀', 2: '⚁', 3: '⚂', 4: '⚃', 5: '⚄', 6: '⚅'
};

function rollDiceNumber() {
    return Math.floor(Math.random() * 6) + 1;
}

function rollDice() {
    // Prevent rolling if the dice was already rolled this turn
    if (gameState.diceRolled) return; 
    
    // Start visual rolling animation (accessibility: clear feedback)
    diceElement.style.transform = 'scale(0.8) rotate(360deg)';
    diceElement.style.transition = `transform ${gameState.animationDelayMs}ms ease-in-out`;
    diceElement.style.opacity = '0.5';
    
    // Rapidly change the dice face to simulate rolling
    let rollInterval = setInterval(() => {
        diceElement.textContent = diceFaces[rollDiceNumber()];
    }, 100);
    
    // Resolve the roll after the animation delay
    setTimeout(() => {
        clearInterval(rollInterval);
        
        // Update Game State
        gameState.diceValue = rollDiceNumber();
        gameState.diceRolled = true;
        
        // Update UI
        diceElement.textContent = diceFaces[gameState.diceValue];
        diceElement.style.transform = 'scale(1) rotate(0deg)';
        diceElement.style.opacity = '1';
        
        // For Phase 2 ONLY: Automatically switch turns after a delay to test the engine.
        // In Phase 3 & 4, this will happen AFTER token movement logic.
        setTimeout(() => {
            console.log(`${gameState.currentPlayer} rolled a ${gameState.diceValue}`);
            // If they didn't roll a 6, switch turns. (6 gives another turn)
            if (gameState.diceValue !== 6) {
                switchTurn();
            } else {
                gameState.diceRolled = false; // Reset to allow rolling again
            }
        }, gameState.animationDelayMs * 2);
        
    }, gameState.animationDelayMs);
}

diceElement.addEventListener('click', rollDice);

// ==========================================================================
// TURN MANAGEMENT
// ==========================================================================
function switchTurn() {
    // Find next player in the array
    let currentIndex = gameState.players.indexOf(gameState.currentPlayer);
    currentIndex = (currentIndex + 1) % gameState.players.length;
    gameState.currentPlayer = gameState.players[currentIndex];
    
    gameState.diceRolled = false; // Next player can now roll
    updateTurnUI();
}

function updateTurnUI() {
    // Map players to CSS color variables
    const colors = {
        'red': 'var(--pure-red)',
        'green': 'var(--forest-green)',
        'yellow': 'var(--bright-yellow)',
        'blue': 'var(--deep-blue)'
    };
    
    // Update the top indicator
    indicator.style.backgroundColor = colors[gameState.currentPlayer];
    
    // Format name (e.g. "red" -> "Red's Turn")
    const playerCapitalized = gameState.currentPlayer.charAt(0).toUpperCase() + gameState.currentPlayer.slice(1);
    turnTextElement.textContent = `${playerCapitalized}'s Turn`;
    
    // Reset Dice face to generic cube
    diceElement.textContent = '🎲';
}
