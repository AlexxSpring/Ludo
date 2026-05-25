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
    
    initTokens(); // Phase 3: Initialize token DOM elements
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

function attemptDiceRoll() {
    if (gameState.currentPlayer !== 'red') return; // Human can't roll for bot
    executeDiceRoll();
}

function executeDiceRoll() {
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
        
        // Phase 3/4: Highlight valid moves or trigger bot
        setTimeout(() => {
            console.log(`${gameState.currentPlayer} rolled a ${gameState.diceValue}`);
            highlightValidMoves();
        }, gameState.animationDelayMs);
        
    }, gameState.animationDelayMs);
}

diceElement.addEventListener('click', attemptDiceRoll);

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
    
    // Phase 4: Trigger AI Bot if it's not the human's turn
    if (gameState.currentPlayer !== 'red') {
        setTimeout(playComputerTurn, gameState.animationDelayMs);
    }
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

// ==========================================================================
// PHASE 3: PATHFINDING, MOVEMENT PHYSICS & RENDERING
// ==========================================================================

// 1D Path mapped precisely to [col, row] on the 15x15 CSS Grid
const pathCoordinates = [
    [2, 7], [3, 7], [4, 7], [5, 7], [6, 7], // Red path
    [7, 6], [7, 5], [7, 4], [7, 3], [7, 2], [7, 1], // Top left
    [8, 1], [9, 1], // Top turn
    [9, 2], [9, 3], [9, 4], [9, 5], [9, 6], // Top right (Green start at idx 13)
    [10, 7], [11, 7], [12, 7], [13, 7], [14, 7], [15, 7], // Right top
    [15, 8], [15, 9], // Right turn
    [14, 9], [13, 9], [12, 9], [11, 9], [10, 9], // Right bottom (Yellow start at idx 26)
    [9, 10], [9, 11], [9, 12], [9, 13], [9, 14], [9, 15], // Bottom right
    [8, 15], [7, 15], // Bottom turn
    [7, 14], [7, 13], [7, 12], [7, 11], [7, 10], // Bottom left (Blue start at idx 39)
    [6, 9], [5, 9], [4, 9], [3, 9], [2, 9], [1, 9], // Left bottom
    [1, 8], [1, 7] // Left turn
];

// 5-square Home Stretch for each color
const homePaths = {
    red:    [[2, 8], [3, 8], [4, 8], [5, 8], [6, 8]],
    green:  [[8, 2], [8, 3], [8, 4], [8, 5], [8, 6]],
    yellow: [[14, 8], [13, 8], [12, 8], [11, 8], [10, 8]],
    blue:   [[8, 14], [8, 13], [8, 12], [8, 11], [8, 10]]
};

const safeZones = [0, 8, 13, 21, 26, 34, 39, 47]; // Indices of stars on main path
const tokenElements = {};

// Initialize DOM elements for tokens
function initTokens() {
    const board = document.getElementById('ludo-board');
    gameState.players.forEach(player => {
        tokenElements[player] = [];
        for(let i = 0; i < 4; i++) {
            const token = document.createElement('div');
            token.className = `token token-${player}`;
            // Phase 4: Touch interactions (Humans can only click red)
            token.addEventListener('click', () => {
                if (gameState.currentPlayer === 'red' && player === 'red') {
                    handleTokenClick(player, i);
                }
            });
            tokenElements[player].push(token);
        }
    });
    renderTokens();
}

// Master rendering function mapping State to DOM
function renderTokens() {
    const board = document.getElementById('ludo-board');
    const cellOccupancy = {}; // Track overlapping tokens for physics offset
    
    gameState.players.forEach(player => {
        for(let i = 0; i < 4; i++) {
            const state = gameState.tokens[player][i];
            const tokenEl = tokenElements[player][i];
            
            // Clean up old classes
            tokenEl.className = `token token-${player}`;
            tokenEl.style.display = 'block';
            
            if (state === 0) {
                // In Base
                const spot = document.querySelector(`.token-spot[data-base="${player}"][data-spot="${i+1}"]`);
                if (spot && tokenEl.parentElement !== spot) {
                    spot.innerHTML = '';
                    spot.appendChild(tokenEl);
                }
                tokenEl.style.gridArea = 'auto'; 
            } else if (state <= 52) {
                // On the 1D Array Loop
                if (tokenEl.parentElement !== board) board.appendChild(tokenEl);
                
                // Calculate absolute index offset for this specific color
                const playerOffsets = { 'red': 0, 'green': 13, 'yellow': 26, 'blue': 39 };
                let absoluteIndex = (state - 1 + playerOffsets[player]) % 52;
                let [col, row] = pathCoordinates[absoluteIndex];
                
                tokenEl.style.gridColumn = col;
                tokenEl.style.gridRow = row;
                
                // Register occupancy
                const key = `${col},${row}`;
                if (!cellOccupancy[key]) cellOccupancy[key] = [];
                cellOccupancy[key].push(tokenEl);
                
            } else if (state <= 57) {
                // Moving up the Home Stretch
                if (tokenEl.parentElement !== board) board.appendChild(tokenEl);
                let homeIndex = state - 53;
                
                if (homeIndex < 5) {
                    let [col, row] = homePaths[player][homeIndex];
                    tokenEl.style.gridColumn = col;
                    tokenEl.style.gridRow = row;
                } else {
                    tokenEl.style.display = 'none'; // Token reached the center
                }
            }
        }
    });
    
    // Physics: Apply micro-offsets to overlapping tokens (Accessibility: so they don't hide each other)
    for (const key in cellOccupancy) {
        const tokensOnCell = cellOccupancy[key];
        if (tokensOnCell.length > 1) {
            tokensOnCell.forEach((tEl, idx) => {
                tEl.classList.add(`offset-${(idx % 4) + 1}`);
            });
        }
    }
}

// Cognitive Assistance: Find valid moves and highlight them
function highlightValidMoves() {
    const validMoves = getValidMoves();
    
    if (validMoves.length === 0) {
        // No moves possible, skip turn
        setTimeout(switchTurn, gameState.animationDelayMs);
        return;
    }
    
    if (gameState.currentPlayer === 'red') {
        // Human player visual cues
        validMoves.forEach(index => {
            tokenElements[gameState.currentPlayer][index].classList.add('pulsing');
        });
    } else {
        // Phase 4: Bot decision time
        setTimeout(() => makeBotDecision(validMoves), gameState.animationDelayMs);
    }
}

function getValidMoves() {
    const validMoves = [];
    const player = gameState.currentPlayer;
    const dice = gameState.diceValue;
    
    for (let i = 0; i < 4; i++) {
        const pos = gameState.tokens[player][i];
        if (pos === 0) {
            if (dice === 6) validMoves.push(i); // Need 6 to exit
        } else if (pos + dice <= 57) {
            validMoves.push(i); // Must not overshoot home
        }
    }
    return validMoves;
}

function handleTokenClick(player, index) {
    if (player !== gameState.currentPlayer || !gameState.diceRolled) return;
    
    const validMoves = getValidMoves();
    if (!validMoves.includes(index)) return; // Invalid interaction
    
    // Clear pulsing classes immediately
    validMoves.forEach(i => tokenElements[player][i].classList.remove('pulsing'));
    
    // Update State
    const currentPos = gameState.tokens[player][index];
    if (currentPos === 0) {
        gameState.tokens[player][index] = 1;
    } else {
        gameState.tokens[player][index] += gameState.diceValue;
    }
    
    // Phase 4: Capture Logic
    const captured = checkCaptures(player, index);
    
    renderTokens();
    gameState.diceRolled = false;
    
    // Bonus turn if 6 or capture
    if (gameState.diceValue === 6 || captured) {
        updateTurnUI(); 
        if (player !== 'red') {
            setTimeout(playComputerTurn, gameState.animationDelayMs);
        }
    } else {
        setTimeout(switchTurn, gameState.animationDelayMs);
    }
}

// ==========================================================================
// PHASE 4: CAPTURE LOGIC & "FRIENDLY AI" BOT
// ==========================================================================
function getAbsolutePosition(player, state) {
    if (state <= 0 || state > 52) return -1;
    const playerOffsets = { 'red': 0, 'green': 13, 'yellow': 26, 'blue': 39 };
    return (state - 1 + playerOffsets[player]) % 52;
}

function checkCaptures(player, tokenIndex) {
    const state = gameState.tokens[player][tokenIndex];
    if (state <= 0 || state > 52) return false;
    
    const absPos = getAbsolutePosition(player, state);
    if (safeZones.includes(absPos)) return false; // Cannot capture on stars
    
    let captured = false;
    gameState.players.forEach(opponent => {
        if (opponent === player) return;
        for (let i = 0; i < 4; i++) {
            const oppState = gameState.tokens[opponent][i];
            if (oppState > 0 && oppState <= 52 && getAbsolutePosition(opponent, oppState) === absPos) {
                gameState.tokens[opponent][i] = 0; // Send back to base
                captured = true;
            }
        }
    });
    return captured;
}

function playComputerTurn() {
    if (gameState.isGameOver || gameState.currentPlayer === 'red') return;
    executeDiceRoll(); // AI triggers the dice roll automatically
}

function makeBotDecision(validMoves) {
    const player = gameState.currentPlayer;
    const dice = gameState.diceValue;
    let chosenIndex = validMoves[0]; 
    
    // 20% Randomness Factor: Forgiving Bot makes sub-optimal moves occasionally
    if (Math.random() < 0.20) {
        chosenIndex = validMoves[Math.floor(Math.random() * validMoves.length)];
    } else {
        let bestScore = -1;
        validMoves.forEach(index => {
            let score = 0;
            const currentPos = gameState.tokens[player][index];
            const nextPos = currentPos === 0 ? 1 : currentPos + dice;
            
            if (currentPos === 0) {
                score += 50; // Priority: Get out of base
            } else {
                // Check for potential captures
                if (nextPos <= 52) {
                    const absPos = getAbsolutePosition(player, nextPos);
                    if (!safeZones.includes(absPos)) {
                        gameState.players.forEach(opp => {
                            if (opp !== player) {
                                for(let i=0; i<4; i++) {
                                    const oppPos = gameState.tokens[opp][i];
                                    if (oppPos > 0 && oppPos <= 52 && getAbsolutePosition(opp, oppPos) === absPos) {
                                        score += 100; // Top Priority: Capture opponent
                                    }
                                }
                            }
                        });
                    }
                }
                
                if (nextPos > 52 && currentPos <= 52) score += 80; // High Priority: Enter home stretch
                if (nextPos === 57) score += 90; // High Priority: Finish token
                if (currentPos > 0) score += currentPos; // Low Priority: Advance the furthest token
            }
            
            if (score > bestScore) {
                bestScore = score;
                chosenIndex = index;
            }
        });
    }
    
    // Execute the best (or randomly chosen) move
    handleTokenClick(player, chosenIndex);
}
