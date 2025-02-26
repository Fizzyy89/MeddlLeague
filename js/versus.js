import { GRID_X, GRID_Y, ELEMENTS, BLOCK_SIZE, GAP, GRID_PADDING, GAME_PADDING } from './config.js';
import { audioManager } from './audio.js';
import { AIPlayer } from './ai-player.js';

class VersusGame {
    constructor() {
        // Canvas setup for player
        this.playerCanvas = document.getElementById('playerCanvas');
        this.playerCtx = this.playerCanvas.getContext('2d');
        
        // Canvas setup for AI
        this.aiCanvas = document.getElementById('aiCanvas');
        this.aiCtx = this.aiCanvas.getContext('2d');
        
        // Background canvas setup
        this.bgCanvas = document.getElementById('bgCanvas');
        this.bgCtx = this.bgCanvas.getContext('2d');
        
        // Add timing and interpolation properties
        this.frameCount = 0;
        this.frameTimes = new Array(60).fill(0); // For FPS smoothing
        this.rafId = null;
        this.lastFrameTime = performance.now();
        
        // Initialize background effect arrays
        this.backgroundEmojis = [];
        this.particles = [];
        
        // Base dimensions (logical size)
        this.baseWidth = (GRID_X * BLOCK_SIZE) + ((GRID_X - 1) * GAP) + (GRID_PADDING * 2);
        this.baseHeight = (GRID_Y * BLOCK_SIZE) + ((GRID_Y - 1) * GAP) + (GRID_PADDING * 2);
        
        // Get saved settings
        const savedSpeed = parseInt(localStorage.getItem('gameSpeed')) || 3;
        const savedDifficulty = localStorage.getItem('gameDifficulty') || 'normal';
        
        // Initialize scale and resize
        this.playerScale = 1;
        this.aiScale = 1;
        this.resize();
        
        // Game state initialization for player
        this.playerState = {
            grid: [],
            cursorX: 0,
            cursorY: 0,
            score: 0,
            isSwapping: false,
            gameOver: false,
            elements: ['fire', 'water', 'earth', 'air', 'heart'],
            fallingBlocks: new Set(),
            chainCounter: 0,
            chainTimer: null,
            floatingScores: [],
            fallingFromChain: false,
            chainDisplay: {
                active: false,
                startTime: 0,
                duration: 1000,
                value: 0
            },
            dangerState: {
                active: false,
                startTime: 0,
                warningDuration: 3000
            },
            manualRising: false,
            manualRisingSpeed: 1,
            swapState: {
                isAnimating: false,
                startTime: 0,
                duration: 200,
                x1: 0,
                x2: 0,
                y: 0,
                block1: null,
                block2: null
            },
            risingState: {
                offset: 0,
                startTime: performance.now(),
                speed: this.calculateRisingSpeed(savedSpeed),
                nextRow: [],
                previewRow: []
            }
        };
        
        // Game state initialization for AI
        this.aiState = {
            grid: [],
            cursorX: 0,
            cursorY: 0,
            score: 0,
            isSwapping: false,
            gameOver: false,
            elements: ['fire', 'water', 'earth', 'air', 'heart'],
            fallingBlocks: new Set(),
            chainCounter: 0,
            chainTimer: null,
            floatingScores: [],
            fallingFromChain: false,
            chainDisplay: {
                active: false,
                startTime: 0,
                duration: 1000,
                value: 0
            },
            dangerState: {
                active: false,
                startTime: 0,
                warningDuration: 3000
            },
            swapState: {
                isAnimating: false,
                startTime: 0,
                duration: 200,
                x1: 0,
                x2: 0,
                y: 0,
                block1: null,
                block2: null
            },
            risingState: {
                offset: 0,
                startTime: performance.now(),
                speed: this.calculateRisingSpeed(savedSpeed),
                nextRow: [],
                previewRow: []
            }
        };
        
        // Cache commonly used symbol mappings and colors
        this.blockSymbols = {
            'fire': '🔥', 'water': '💧', 'earth': '🍀',
            'air': '⚡', 'heart': '🌀'
        };
        
        this.blockColors = {
            'fire': '#FF4D00',
            'water': '#00B4D8',
            'earth': '#00CC6A',
            'air': '#FFD700',
            'heart': '#6D28D9',
            '🔥': '#FF4D00',
            '💧': '#00B4D8',
            '🍀': '#00CC6A',
            '⚡': '#FFD700',
            '🌀': '#6D28D9'
        };
        
        // Initialize game components in order
        this.initGrids();               // First create the grids
        this.generatePreviewRows();     // Then generate preview rows
        
        // Initialize AI player
        this.ai = new AIPlayer(this.aiState);
        
        // Timer state
        this.timerState = {
            startTime: performance.now(),
            currentTime: 0,
            isRunning: false
        };

        // Difficulty multipliers for speed increase
        this.difficultyMultipliers = {
            'very-easy': 0.3,   // Speed increases 30% slower than normal
            'easy': 0.6,        // Speed increases 60% slower than normal
            'normal': 1.0,      // Normal speed increase
            'hard': 1.5,        // Speed increases 50% faster than normal
            'very-hard': 2.0    // Speed increases twice as fast
        };

        // Speed progression tracking
        this.speedState = {
            initialSpeed: savedSpeed,
            currentSpeed: savedSpeed,
            difficulty: savedDifficulty,
            lastSpeedIncrease: performance.now(),
            baseIncreaseInterval: 30000,
            baseSpeedIncrease: 1
        };
        
        // Setup themes
        this.themeSelect = document.getElementById('themeSelect');
        this.setupThemes();
        
        // Load saved theme
        const savedTheme = localStorage.getItem('selectedTheme') || 'theme-elements';
        this.themeSelect.value = savedTheme;
        this.updateTheme(savedTheme);
        
        // Initialize background effects
        this.initBackgroundEffects();
        
        // Update displays
        this.updateSpeedDisplay();
        this.updateTimer(performance.now());
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Initialize audio
        this.initAudio();
        
        // Try to start background music immediately, with click fallback
        audioManager.bgMusic.play().catch(() => {
            // If autoplay fails, set up click listener as fallback
            document.addEventListener('click', () => {
                if (audioManager.bgMusic.paused) {
                    audioManager.bgMusic.play().catch(console.error);
                }
            }, { once: true });
        });
        
        // Start game loop
        this.timerState.startTime = performance.now();
        this.timerState.isRunning = true;
        
        // Start initial game loop after a short delay to ensure everything is ready
        setTimeout(() => {
            this.lastFrameTime = performance.now();
            this.rafId = requestAnimationFrame(this.gameLoop.bind(this));
        }, 100);
    }
    
    resize() {
        // Check if we're in side-by-side or stacked mode
        const isWideScreen = window.innerWidth > 960;
        
        // Calculate available width for each canvas
        const totalAvailableWidth = window.innerWidth - 120; // Subtract margin and gap
        const maxWidthPerCanvas = isWideScreen 
            ? Math.min(480, totalAvailableWidth / 2) // Side by side - limit each canvas width
            : Math.min(480, totalAvailableWidth - 40); // Stacked - allow more width for single column
        
        // Calculate available height (accounting for UI elements)
        const availableHeight = isWideScreen
            ? window.innerHeight - 200 // Normal height reduction for side-by-side
            : (window.innerHeight - 300) / 2; // More height reduction for stacked layout
        
        // Calculate maximum scale that fits for player canvas
        const maxScaleX = maxWidthPerCanvas / this.baseWidth;
        const maxScaleY = availableHeight / this.baseHeight;
        
        // Set minimum and maximum scales
        const minScale = 0.4;   // Allow smaller scale for versus mode
        const maxScale = 1.2;   // Limit max scale
        
        // Calculate optimal scale
        this.playerScale = Math.min(maxScaleX, maxScaleY, maxScale);
        this.playerScale = Math.max(this.playerScale, minScale);
        
        // Use same scale for AI canvas
        this.aiScale = this.playerScale;
        
        // Set canvas sizes
        this.playerCanvas.width = this.baseWidth * this.playerScale;
        this.playerCanvas.height = this.baseHeight * this.playerScale;
        this.aiCanvas.width = this.baseWidth * this.aiScale;
        this.aiCanvas.height = this.baseHeight * this.aiScale;
        
        // Enable smooth scaling
        this.playerCtx.imageSmoothingEnabled = true;
        this.aiCtx.imageSmoothingEnabled = true;
        
        // Also resize background canvas
        this.bgCanvas.width = window.innerWidth;
        this.bgCanvas.height = window.innerHeight;
        this.bgCtx.imageSmoothingEnabled = true;
    }
    
    initGrids() {
        // Initialize player grid
        this.playerState.grid = new Array(GRID_Y);
        for (let y = 0; y < GRID_Y; y++) {
            this.playerState.grid[y] = new Array(GRID_X);
            for (let x = 0; x < GRID_X; x++) {
                if (y >= GRID_Y / 2) {
                    let attempts = 0, color;
                    do {
                        color = this.playerState.elements[Math.floor(Math.random() * this.playerState.elements.length)];
                        attempts++;
                        if (attempts > 10) break;
                    } while (
                        (x >= 2 && color === this.getBlockType(this.playerState.grid[y][x-1]) && color === this.getBlockType(this.playerState.grid[y][x-2])) ||
                        (y >= 2 && color === this.getBlockType(this.playerState.grid[y-1][x]) && color === this.getBlockType(this.playerState.grid[y-2][x]))
                    );
                    this.playerState.grid[y][x] = color;
                } else {
                    this.playerState.grid[y][x] = null;
                }
            }
        }
        
        // Initialize AI grid with the same pattern but different random blocks
        this.aiState.grid = new Array(GRID_Y);
        for (let y = 0; y < GRID_Y; y++) {
            this.aiState.grid[y] = new Array(GRID_X);
            for (let x = 0; x < GRID_X; x++) {
                if (y >= GRID_Y / 2) {
                    let attempts = 0, color;
                    do {
                        color = this.aiState.elements[Math.floor(Math.random() * this.aiState.elements.length)];
                        attempts++;
                        if (attempts > 10) break;
                    } while (
                        (x >= 2 && color === this.getBlockType(this.aiState.grid[y][x-1]) && color === this.getBlockType(this.aiState.grid[y][x-2])) ||
                        (y >= 2 && color === this.getBlockType(this.aiState.grid[y-1][x]) && color === this.getBlockType(this.aiState.grid[y-2][x]))
                    );
                    this.aiState.grid[y][x] = color;
                } else {
                    this.aiState.grid[y][x] = null;
                }
            }
        }
    }
    
    generatePreviewRows() {
        // Generate preview row for player
        this.generatePreviewRow(this.playerState);
        
        // Generate preview row for AI
        this.generatePreviewRow(this.aiState);
    }
    
    generatePreviewRow(gameState) {
        gameState.risingState.previewRow = [];
        for (let x = 0; x < GRID_X; x++) {
            let attempts = 0, color;
            do {
                color = gameState.elements[Math.floor(Math.random() * gameState.elements.length)];
                attempts++;
                if (attempts > 10) break;
            } while (
                // Check horizontal matches within preview row
                (x >= 2 && color === gameState.risingState.previewRow[x-1] && 
                 color === gameState.risingState.previewRow[x-2]) ||
                // Check vertical matches with existing grid
                (gameState.grid[GRID_Y-1] && gameState.grid[GRID_Y-2] && 
                 color === this.getBlockType(gameState.grid[GRID_Y-1][x]) &&
                 color === this.getBlockType(gameState.grid[GRID_Y-2][x]))
            );
            gameState.risingState.previewRow[x] = color;
        }
    }
    
    // Helper method to safely get block type regardless of block format
    getBlockType(block) {
        if (!block) return null;
        return typeof block === 'object' ? block.type : block;
    }

    setupEventListeners() {
        // Keyboard controls for player
        document.addEventListener('keydown', (e) => {
            if (this.playerState.isSwapping || this.playerState.gameOver || this.aiState.gameOver) {
                if (e.code === 'Space' && (this.playerState.gameOver || this.aiState.gameOver)) {
                    this.resetGame();
                }
                return;
            }
            
            switch(e.key) {
                case 'ArrowLeft':
                    if (this.playerState.cursorX > 0) this.playerState.cursorX--;
                    break;
                case 'ArrowRight':
                    if (this.playerState.cursorX < GRID_X - 2) this.playerState.cursorX++;
                    break;
                case 'ArrowUp':
                    if (this.playerState.cursorY > 0) this.playerState.cursorY--;
                    break;
                case 'ArrowDown':
                    if (this.playerState.cursorY < GRID_Y - 1) this.playerState.cursorY++;
                    break;
                case ' ':
                    this.swapBlocks(this.playerState);
                    break;
                case 'Shift':
                    // Start manual rising when Shift is pressed
                    this.playerState.manualRising = true;
                    break;
            }
        });
        
        // Add key up handler for Shift
        document.addEventListener('keyup', (e) => {
            if (e.key === 'Shift') {
                this.playerState.manualRising = false;
            }
        });

        // Prevent context menu on right click
        this.playerCanvas.addEventListener('contextmenu', (e) => {
            e.preventDefault();
        });

        // Handle right mouse button down
        this.playerCanvas.addEventListener('mousedown', (e) => {
            if (e.button === 2) { // Right mouse button
                this.playerState.manualRising = true;
            }
        });

        // Handle right mouse button up
        this.playerCanvas.addEventListener('mouseup', (e) => {
            if (e.button === 2) { // Right mouse button
                this.playerState.manualRising = false;
            }
        });

        // Also stop manual rising if mouse leaves the canvas
        this.playerCanvas.addEventListener('mouseleave', () => {
            if (this.playerState.manualRising) {
                this.playerState.manualRising = false;
            }
        });
        
        // Updated mouse controls with scaling and rising offset for player
        this.playerCanvas.addEventListener('mousemove', (e) => {
            if (this.playerState.gameOver || this.aiState.gameOver) return;
            const rect = this.playerCanvas.getBoundingClientRect();
            const x = (e.clientX - rect.left) / this.playerScale - GRID_PADDING;
            const y = (e.clientY - rect.top) / this.playerScale - GRID_PADDING;
            
            // Add the rising offset when converting mouse position to grid coordinates
            const gridX = Math.floor(x / (BLOCK_SIZE + GAP));
            const gridY = Math.floor((y / (BLOCK_SIZE + GAP)) + this.playerState.risingState.offset);
            
            if (gridX >= 0 && gridX < GRID_X - 1 && gridY >= 0 && gridY < GRID_Y) {
                this.playerState.cursorX = gridX;
                this.playerState.cursorY = gridY;
            }
        });
        
        this.playerCanvas.addEventListener('click', () => {
            if (!this.playerState.isSwapping && !this.playerState.gameOver && !this.aiState.gameOver) {
                this.swapBlocks(this.playerState);
            }
        });

        // Try Again button click handler
        document.getElementById('tryAgainBtn').addEventListener('click', () => {
            this.resetGame();
        });

        // Add info box toggle functionality
        const infoBox = document.querySelector('.info-box');
        const toggleButton = document.querySelector('.info-box-toggle');
        if (toggleButton && infoBox) {
            toggleButton.addEventListener('click', () => {
                infoBox.classList.toggle('hidden');
                // Update button text based on info box state
                toggleButton.textContent = infoBox.classList.contains('hidden') ? '?' : '×';
            });
            // Set initial text based on initial state
            toggleButton.textContent = infoBox.classList.contains('hidden') ? '?' : '×';
        }
        
        // Theme change listener
        this.themeSelect.addEventListener('change', (e) => {
            const newTheme = e.target.value;
            this.updateTheme(newTheme);
            localStorage.setItem('selectedTheme', newTheme);
            audioManager.updateThemeMusic(newTheme);
        });
        
        // Window resize handler
        window.addEventListener('resize', () => this.resize());
    }
    
    swapBlocks(gameState) {
        const x1 = gameState.cursorX;
        const x2 = gameState.cursorX + 1;
        const y = gameState.cursorY;
        
        // Get blocks at swap positions
        const block1 = gameState.grid[y][x1];
        const block2 = gameState.grid[y][x2];
        
        // Check if either block is in matching, popping, or falling state
        const isBlock1Locked = block1 && typeof block1 === 'object' && 
            (block1.state === 'matching' || block1.state === 'popping' || block1.state === 'falling');
        const isBlock2Locked = block2 && typeof block2 === 'object' && 
            (block2.state === 'matching' || block2.state === 'popping' || block2.state === 'falling');
        
        // Don't allow swapping if either block is locked or if any blocks are falling
        if (isBlock1Locked || isBlock2Locked || gameState.fallingBlocks.size > 0) {
            return;
        }
        
        // Set up swap animation
        gameState.swapState = {
            isAnimating: true,
            startTime: performance.now(),
            duration: 150,
            x1, x2, y,
            block1: block1 ? {
                type: typeof block1 === 'object' ? block1.type : block1,
                startX: x1,
                currentX: x1
            } : null,
            block2: block2 ? {
                type: typeof block2 === 'object' ? block2.type : block2,
                startX: x2,
                currentX: x2
            } : null
        };
        
        // Actually swap the blocks in the grid
        [gameState.grid[y][x1], gameState.grid[y][x2]] = [gameState.grid[y][x2], gameState.grid[y][x1]];
        
        // Check for matches after animation completes
        setTimeout(() => {
            gameState.swapState.isAnimating = false;
            
            // If either position is now empty, start dropping blocks
            if (!gameState.grid[y][x1] || !gameState.grid[y][x2]) {
                this.dropBlocks(gameState);
            } else {
                this.checkMatches(gameState);
            }
        }, gameState.swapState.duration);
    }
    
    findMatches(gameState) {
        const matches = new Set();
        
        // Horizontal matches
        for (let y = 0; y < GRID_Y; y++) {
            let count = 1;
            for (let x = 1; x < GRID_X; x++) {
                if (gameState.grid[y][x] && 
                    gameState.grid[y][x] === gameState.grid[y][x-1]) {
                    count++;
                } else {
                    if (count >= 3) {
                        for (let i = x - count; i < x; i++) {
                            matches.add(`${i},${y}`);
                        }
                    }
                    count = 1;
                }
            }
            // Check end of row
            if (count >= 3) {
                for (let i = GRID_X - count; i < GRID_X; i++) {
                    matches.add(`${i},${y}`);
                }
            }
        }
        
        // Vertical matches
        for (let x = 0; x < GRID_X; x++) {
            let count = 1;
            for (let y = 1; y < GRID_Y; y++) {
                if (gameState.grid[y][x] && 
                    gameState.grid[y][x] === gameState.grid[y-1][x]) {
                    count++;
                } else {
                    if (count >= 3) {
                        for (let i = y - count; i < y; i++) {
                            matches.add(`${x},${i}`);
                        }
                    }
                    count = 1;
                }
            }
            // Check end of column
            if (count >= 3) {
                for (let i = GRID_Y - count; i < GRID_Y; i++) {
                    matches.add(`${x},${i}`);
                }
            }
        }
        
        return Array.from(matches).map(pos => {
            const [x, y] = pos.split(',').map(Number);
            return {x, y};
        });
    }
    
    calculateMatchScore(matchSize, chainLevel) {
        // Base score based on match size
        let baseScore;
        if (matchSize === 3) baseScore = 30;
        else if (matchSize === 4) baseScore = 50;
        else if (matchSize === 5) baseScore = 70;
        else baseScore = 90; // 6 or more

        // Chain multiplier (2^chainLevel: 1, 2, 4, 8, 16, etc.)
        const multiplier = chainLevel > 0 ? Math.pow(2, chainLevel) : 1;
        
        return baseScore * multiplier;
    }

    addFloatingScore(gameState, x, y, baseScore, chainLevel) {
        const multiplier = chainLevel > 0 ? Math.pow(2, chainLevel) : 1;
        const totalScore = baseScore * multiplier;
        
        // Calculate screen position
        const screenX = GRID_PADDING + (x * (BLOCK_SIZE + GAP)) + BLOCK_SIZE/2;
        const screenY = GRID_PADDING + (y * (BLOCK_SIZE + GAP));
        
        gameState.floatingScores.push({
            baseScore,
            multiplier,
            totalScore,
            x: screenX,
            y: screenY,
            startTime: performance.now(),
            duration: 1000, // 1 second animation
            opacity: 1
        });
    }

    checkMatches(gameState) {
        const matches = this.findMatches(gameState);
        if (matches.length > 0) {
            this.removeMatches(gameState, matches);
        } else {
            gameState.isSwapping = false;
        }
    }
    
    removeMatches(gameState, matches, isChain = false) {
        if (matches.length === 0) {
            gameState.isSwapping = false;
            // Reset chain counter if no new matches
            if (!isChain) {
                gameState.chainCounter = 0;
            }
            return;
        }

        // Clear existing chain timer if it exists
        if (gameState.chainTimer) {
            clearTimeout(gameState.chainTimer);
        }

        // Play match size sound effect
        audioManager.playMatchSound(matches.length);

        // Increment chain counter if this is part of a chain
        if (isChain) {
            gameState.chainCounter++;
            
            // Play chain sound based on chain level
            if (gameState.chainCounter === 1) {
                audioManager.playSound('chain1');
            } else if (gameState.chainCounter === 2) {
                audioManager.playSound('chain2');
            } else if (gameState.chainCounter >= 3) {
                audioManager.playSound('chain3');
            }
            
            // Activate chain display
            gameState.chainDisplay = {
                active: true,
                startTime: performance.now(),
                duration: 1000,
                value: gameState.chainCounter
            };
        } else {
            gameState.chainCounter = 0;
        }

        // Calculate score and add floating score display
        const matchScore = this.calculateMatchScore(matches.length, gameState.chainCounter);
        const baseScore = this.calculateMatchScore(matches.length, 0); // Score without chain multiplier
        
        // Add floating score at the center of the match
        const centerMatch = matches[Math.floor(matches.length / 2)];
        this.addFloatingScore(gameState, centerMatch.x, centerMatch.y, baseScore, gameState.chainCounter);
        
        // Update score
        gameState.score += matchScore;
        
        // Update score display
        if (gameState === this.playerState) {
            document.getElementById('playerScoreValue').textContent = gameState.score;
        } else {
            document.getElementById('aiScoreValue').textContent = gameState.score;
        }

        // First phase: Flash the blocks (800ms)
        matches.forEach(({x, y}) => {
            if (gameState.grid[y][x]) {
                gameState.grid[y][x] = {
                    type: gameState.grid[y][x],
                    state: 'matching',
                    animationStart: performance.now()
                };
            }
        });

        // Second phase: Pop blocks one by one
        setTimeout(() => {
            const sortedMatches = matches.sort((a, b) => a.y - b.y);
            
            sortedMatches.forEach(({x, y}, index) => {
                setTimeout(() => {
                    if (gameState.grid[y][x]) {
                        gameState.grid[y][x] = {
                            type: gameState.grid[y][x].type,
                            state: 'popping',
                            animationStart: performance.now()
                        };
                        audioManager.playPopSound();
                    }
                }, index * 200);
                
                setTimeout(() => {
                    if (gameState.grid[y][x]) {
                        gameState.grid[y][x] = null;
                    }
                    
                    if (index === matches.length - 1) {
                        // After last block is removed, start dropping and check for chains
                        this.dropBlocks(gameState, true); // Pass true to indicate checking for chains
                    }
                }, index * 200 + 200);
            });
        }, 600);

        // Set chain timer to reset counter if no new matches occur
        gameState.chainTimer = setTimeout(() => {
            gameState.chainCounter = 0;
        }, 2000); // Reset chain if no new matches within 2 seconds
    }
    
    dropBlocks(gameState, checkForChains = false) {
        // Set falling from chain flag
        gameState.fallingFromChain = checkForChains;
        
        let blocksFell = false;
        
        // Check each column from bottom to top
        for (let x = 0; x < GRID_X; x++) {
            for (let y = GRID_Y - 2; y >= 0; y--) {
                if (gameState.grid[y][x] && !gameState.grid[y + 1][x]) {
                    // Found a block that can fall
                    let fallDistance = 1;
                    let targetY = y + 1;
                    
                    // Find how far it can fall
                    while (targetY + 1 < GRID_Y && !gameState.grid[targetY + 1][x]) {
                        fallDistance++;
                        targetY++;
                    }
                    
                    // Create falling block object
                    const block = {
                        type: typeof gameState.grid[y][x] === 'object' ? gameState.grid[y][x].type : gameState.grid[y][x],
                        state: 'falling',
                        startY: y,
                        targetY: targetY,
                        currentY: y,
                        fallStart: performance.now()
                    };
                    
                    // Update grid
                    gameState.grid[targetY][x] = block;
                    gameState.grid[y][x] = null;
                    gameState.fallingBlocks.add(`${x},${targetY}`);
                    blocksFell = true;
                }
            }
        }
        
        if (!blocksFell) {
            // If no blocks fell, check for matches
            const newMatches = this.findMatches(gameState);
            if (newMatches.length > 0) {
                // Only count as chain if we're checking for chains AND there was a previous match
                const isChainMatch = checkForChains && gameState.chainCounter > 0;
                this.removeMatches(gameState, newMatches, isChainMatch);
            } else {
                gameState.chainCounter = 0;
                gameState.isSwapping = false;
            }
        }
    }
    
    updateFallingBlocks(gameState, currentTime) {
        if (gameState.fallingBlocks.size === 0) return;
        
        let allBlocksLanded = true;
        const fallDuration = 150; // Duration of fall animation in ms
        
        gameState.fallingBlocks.forEach(key => {
            const [x, targetY] = key.split(',').map(Number);
            const block = gameState.grid[targetY][x];
            
            if (!block || block.state !== 'falling') {
                gameState.fallingBlocks.delete(key);
                return;
            }
            
            const progress = Math.min((currentTime - block.fallStart) / fallDuration, 1);
            
            if (progress >= 1) {
                // Block has finished falling
                gameState.grid[targetY][x] = block.type;
                gameState.fallingBlocks.delete(key);
            } else {
                // Update block position with clamping
                const newY = block.startY + (block.targetY - block.startY) * progress;
                block.currentY = Math.min(newY, block.targetY);
                allBlocksLanded = false;
            }
        });
        
        // Check for new matches after ALL blocks have landed
        if (allBlocksLanded && gameState.fallingBlocks.size === 0) {
            const newMatches = this.findMatches(gameState);
            if (newMatches.length > 0) {
                // Only count as chain if blocks were falling from a previous match
                this.removeMatches(gameState, newMatches, gameState.fallingFromChain);
            } else {
                gameState.chainCounter = 0;
                gameState.isSwapping = false;
            }
            // Reset the chain flag
            gameState.fallingFromChain = false;
        }
    }

    drawBlock(ctx, x, y, block, gameState) {
        if (!block) return;
        
        // Save the current transform state
        ctx.save();
        
        let drawX = x;
        let drawY = y;
        const blockType = typeof block === 'object' ? block.type : block;
        const blockState = typeof block === 'object' ? block.state : null;
        
        // Apply rising offset
        drawY -= gameState.risingState.offset;
        
        // Use requestAnimationFrame timestamp for smoother animations
        const currentTime = performance.now();
        
        if (blockState === 'falling') {
            // For falling blocks, use the currentY relative to grid position
            drawY = block.currentY - gameState.risingState.offset;
        }
        
        if (gameState.swapState.isAnimating && y === gameState.swapState.y) {
            const progress = (currentTime - gameState.swapState.startTime) / gameState.swapState.duration;
            const easedProgress = 0.5 - Math.cos(progress * Math.PI) / 2;
            
            if (x === gameState.swapState.x1 && gameState.swapState.block1) {
                drawX = x + easedProgress;
            } else if (x === gameState.swapState.x2 && gameState.swapState.block2) {
                drawX = x - easedProgress;
            }
        }
        
        // Calculate precise pixel positions once
        const xPos = Math.round(GRID_PADDING + (drawX * (BLOCK_SIZE + GAP)));
        const yPos = Math.round(GRID_PADDING + (drawY * (BLOCK_SIZE + GAP)));
        const centerX = Math.round(xPos + (BLOCK_SIZE/2));
        const centerY = Math.round(yPos + (BLOCK_SIZE/2));
        
        // Add danger animation for ALL blocks when in final warning
        if (gameState.dangerState.active && gameState.dangerState.isFinalWarning) {
            const dangerProgress = (currentTime - gameState.dangerState.startTime) / 300; // 300ms per pulse
            const dangerPulse = Math.sin(dangerProgress * Math.PI * 2) * 0.3 + 0.7;
            
            ctx.shadowColor = 'red';
            ctx.shadowBlur = 20;
            ctx.globalAlpha *= dangerPulse;
        } else if (y < 3 && gameState.dangerState.active) {
            // Normal danger state for top 3 rows
            const dangerProgress = (currentTime - gameState.dangerState.startTime) / 300;
            const dangerPulse = Math.sin(dangerProgress * Math.PI * 2) * 0.3 + 0.7;
            
            ctx.shadowColor = 'red';
            ctx.shadowBlur = 20;
            ctx.globalAlpha *= dangerPulse;
        }
        
        // Draw block background with animation effects
        ctx.fillStyle = this.getBlockColor(blockType);
        
        if (blockState === 'matching') {
            const progress = (currentTime - block.animationStart) / 300;
            
            // Gentle glow effect
            ctx.shadowColor = this.getBlockColor(blockType);
            ctx.shadowBlur = 10;
            
            // Subtle pulse that doesn't go too transparent
            const alpha = 0.8 + Math.sin(progress * Math.PI * 4) * 0.2;
            ctx.globalAlpha = alpha;
            
            // Very subtle scale pulse
            const scale = 1 + Math.sin(progress * Math.PI * 4) * 0.05;
            ctx.translate(centerX, centerY);
            ctx.scale(scale, scale);
            ctx.translate(-centerX, -centerY);
        } else if (blockState === 'popping') {
            const progress = (currentTime - block.animationStart) / 300;
            
            // Create a more interesting scale effect
            const scaleBase = 1 - progress;
            const scaleX = scaleBase * (1 + Math.sin(progress * Math.PI * 3) * 0.3);
            const scaleY = scaleBase * (1 + Math.cos(progress * Math.PI * 2) * 0.3);
            
            // Add a slight rotation for more dynamic feel
            const rotation = progress * Math.PI * 0.5; // quarter turn
            
            // Add vibrant glow effect that intensifies during pop
            const glowIntensity = Math.sin(progress * Math.PI) * 15;
            ctx.shadowColor = this.getBlockColor(blockType);
            ctx.shadowBlur = glowIntensity;
            
            // Fade out with a non-linear curve for more visual interest
            const alpha = Math.cos(progress * Math.PI/2);
            
            // Apply transformations
            ctx.translate(centerX, centerY);
            ctx.rotate(rotation);
            ctx.scale(scaleX, scaleY);
            ctx.translate(-centerX, -centerY);
            ctx.globalAlpha = alpha;
            
            // Draw sparkle effect around the popping block
            if (progress < 0.7) {
                const sparkleCount = 6;
                const sparkleRadius = BLOCK_SIZE * 0.7 * (0.3 + progress);
                const sparkleOpacity = (1 - progress) * 0.8;
                
                for (let i = 0; i < sparkleCount; i++) {
                    const angle = (i / sparkleCount) * Math.PI * 2 + progress * Math.PI;
                    const sparkleX = centerX + Math.cos(angle) * sparkleRadius;
                    const sparkleY = centerY + Math.sin(angle) * sparkleRadius;
                    const sparkleSize = 4 * (1 - progress);
                    
                    ctx.beginPath();
                    ctx.fillStyle = `rgba(255, 255, 255, ${sparkleOpacity})`;
                    ctx.arc(sparkleX, sparkleY, sparkleSize, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        }
        
        ctx.beginPath();
        ctx.roundRect(xPos, yPos, BLOCK_SIZE, BLOCK_SIZE, 8);
        ctx.fill();
        
        // Draw symbol with gentler animation
        const symbol = this.blockSymbols[blockType];
        if (symbol) {
            ctx.font = '30px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            if (blockState === 'matching') {
                const progress = (currentTime - block.animationStart) / 300;
                
                // Gentle floating motion
                const floatY = Math.sin(progress * Math.PI * 4) * 2;
                
                // Add soft white glow to the symbol
                ctx.shadowColor = 'white';
                ctx.shadowBlur = 8;
                ctx.fillStyle = 'white';
                ctx.fillText(symbol, centerX, centerY + floatY);
            } else if (blockState === 'popping') {
                const progress = (currentTime - block.animationStart) / 300;
                
                // Enhanced symbol animation for popping
                const symbolScale = 1.2 - progress * 0.5;
                const symbolOpacity = 1 - progress * 1.5; // Fade out faster than block
                
                if (symbolOpacity > 0) {
                    // Add vibrant glow to the symbol
                    ctx.shadowColor = 'white';
                    ctx.shadowBlur = 12 * (1 - progress);
                    ctx.fillStyle = `rgba(255, 255, 255, ${symbolOpacity})`;
                    
                    // Scale and drift the symbol upward slightly
                    const driftY = -progress * 10;
                    
                    ctx.font = `${30 * symbolScale}px Arial`;
                    ctx.fillText(symbol, centerX, centerY + driftY);
                }
            } else {
                // Normal emoji rendering
                ctx.shadowColor = 'rgba(0,0,0,0.8)';
                ctx.shadowBlur = 4;
                ctx.shadowOffsetX = 2;
                ctx.shadowOffsetY = 2;
                ctx.fillStyle = 'white';
                ctx.fillText(symbol, centerX, centerY);
            }
        }
        
        // Restore the context to its original state
        ctx.restore();
    }
    
    drawCursor(ctx, gameState) {
        ctx.save();
        
        const xPos = GRID_PADDING + (gameState.cursorX * (BLOCK_SIZE + GAP));
        const yPos = GRID_PADDING + ((gameState.cursorY - gameState.risingState.offset) * (BLOCK_SIZE + GAP));
        
        // Draw cursor
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.roundRect(xPos - 3, yPos - 3, (BLOCK_SIZE * 2) + GAP + 6, BLOCK_SIZE + 6, 8);
        ctx.stroke();
        
        // Draw cursor glow
        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(xPos - 5, yPos - 5, (BLOCK_SIZE * 2) + GAP + 10, BLOCK_SIZE + 10, 10);
        ctx.stroke();
        
        ctx.restore();
    }
    
    getBlockColor(element) {
        // Use cached colors
        return this.blockColors[element] || '#ffffff';
    }
    
    drawPreviewRow(ctx, gameState) {
        ctx.save();
        
        for (let x = 0; x < GRID_X; x++) {
            const blockType = gameState.risingState.previewRow[x];
            
            // Calculate precise pixel positions once
            const xPos = Math.round(GRID_PADDING + (x * (BLOCK_SIZE + GAP)));
            const yPos = Math.round(GRID_PADDING + ((GRID_Y - gameState.risingState.offset) * (BLOCK_SIZE + GAP)));
            const centerX = Math.round(xPos + (BLOCK_SIZE/2));
            const centerY = Math.round(yPos + (BLOCK_SIZE/2));
            
            // Draw block with reduced opacity
            ctx.globalAlpha = 0.3;
            ctx.fillStyle = this.getBlockColor(blockType);
            ctx.beginPath();
            ctx.roundRect(xPos, yPos, BLOCK_SIZE, BLOCK_SIZE, 8);
            ctx.fill();
            
            // Draw symbol
            const symbol = this.blockSymbols[blockType];
            if (symbol) {
                ctx.font = '30px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                
                // Add strong black shadow
                ctx.shadowColor = 'rgba(0,0,0,0.8)';
                ctx.shadowBlur = 4;
                ctx.shadowOffsetX = 2;
                ctx.shadowOffsetY = 2;
                
                ctx.fillStyle = 'white';
                ctx.fillText(symbol, centerX, centerY);
            }
        }
        
        ctx.restore();
    }
    
    drawFloatingScores(ctx, gameState, currentTime) {
        gameState.floatingScores = gameState.floatingScores.filter(score => {
            const progress = (currentTime - score.startTime) / score.duration;
            if (progress >= 1) return false;
            
            ctx.save();
            
            const y = score.y - (progress * 50); // Float upward
            const opacity = 1 - progress;
            
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            if (score.multiplier > 1) {
                // Draw total score first (centered)
                ctx.font = 'bold 32px "Press Start 2P"';
                ctx.fillStyle = `rgba(255,180,0,${opacity})`;
                ctx.fillText(`${score.totalScore}`, score.x, y);
                
                // Draw chain multiplier to the right and slightly up
                ctx.font = 'bold 28px "Press Start 2P"';
                ctx.fillStyle = `rgba(255,220,0,${opacity})`;
                ctx.fillText(`×${score.multiplier}`, score.x + 80, y - 10);
            } else {
                // Just draw the score for non-chain matches
                ctx.font = 'bold 24px "Press Start 2P"';
                ctx.fillStyle = `rgba(255,255,255,${opacity})`;
                ctx.fillText(`${score.baseScore}`, score.x, y);
            }
            
            ctx.restore();
            return true;
        });
    }

    drawChainIndicator(ctx, gameState, currentTime) {
        if (!gameState.chainDisplay.active) return;
        
        const progress = (currentTime - gameState.chainDisplay.startTime) / gameState.chainDisplay.duration;
        if (progress >= 1) {
            gameState.chainDisplay.active = false;
            return;
        }

        ctx.save();
        
        // Scale up quickly then slowly fade out
        const scale = progress < 0.3 
            ? 1 + (progress * 3.33) // Scale up in first 30%
            : 2 - (progress * 0.5); // Slowly scale down
            
        const opacity = progress < 0.3 
            ? 1 
            : 1 - ((progress - 0.3) / 0.7); // Fade out after peak
        
        // Center of the game area
        const centerX = this.baseWidth / 2;
        const centerY = this.baseHeight / 2;
        
        ctx.translate(centerX, centerY);
        ctx.scale(scale, scale);
        
        // Draw chain number
        ctx.font = 'bold 48px "Press Start 2P"';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Glow effect
        ctx.shadowColor = 'rgba(255, 220, 0, 0.8)';
        ctx.shadowBlur = 20;
        
        // Main text
        ctx.fillStyle = `rgba(255, 220, 0, ${opacity})`;
        ctx.fillText(`CHAIN`, 0, -30);
        ctx.fillText(`×${Math.pow(2, gameState.chainDisplay.value)}`, 0, 30);
        
        // Outline
        ctx.lineWidth = 3;
        ctx.strokeStyle = `rgba(255, 255, 255, ${opacity})`;
        ctx.strokeText(`CHAIN`, 0, -30);
        ctx.strokeText(`×${Math.pow(2, gameState.chainDisplay.value)}`, 0, 30);
        
        ctx.restore();
    }
    
    updateRising(gameState, currentTime) {
        // Don't rise if blocks are falling or if there are active matches
        if (gameState.fallingBlocks.size > 0) return;
        
        // Check for any blocks in matching or popping state
        const hasActiveMatches = gameState.grid.some(row => 
            row.some(block => 
                block && 
                typeof block === 'object' && 
                (block.state === 'matching' || block.state === 'popping')
            )
        );
        
        if (hasActiveMatches) return;
        
        // Calculate elapsed time since last frame in seconds
        const deltaTime = (currentTime - this.lastFrameTime) / 1000;
        
        // Only allow manual rising for player if not in danger state
        const canManualRise = gameState === this.playerState && 
                              gameState.manualRising && 
                              !gameState.dangerState.active;
        
        // Use whichever speed is faster: manual or natural
        const currentSpeed = canManualRise ? 
            Math.max(gameState.manualRisingSpeed, gameState.risingState.speed) : 
            gameState.risingState.speed;
        
        // Calculate new offset based on speed
        gameState.risingState.offset += currentSpeed * deltaTime;
        
        // When offset reaches or exceeds 1, shift the grid up
        if (gameState.risingState.offset >= 1) {
            this.shiftGridUp(gameState);
            gameState.risingState.offset = 0;
            gameState.risingState.startTime = currentTime;
        }
    }
    
    shiftGridUp(gameState) {
        // Shift all rows up
        for (let y = 0; y < GRID_Y - 1; y++) {
            gameState.grid[y] = [...gameState.grid[y + 1]];
        }
        
        // Add new row at bottom from preview
        gameState.grid[GRID_Y - 1] = [...gameState.risingState.previewRow];
        
        // Generate new preview row
        this.generatePreviewRow(gameState);
        
        // Move cursor up to follow blocks (unless at top)
        if (gameState.cursorY > 0) {
            gameState.cursorY--;
        }
        
        // Check for matches after shifting
        this.checkMatches(gameState);
    }
    
    checkDangerState(gameState) {
        // Base warning duration in milliseconds (2000ms = 2 seconds)
        const baseWarningDuration = 2000;
        
        // Difficulty-based duration multipliers
        const durationMultipliers = {
            'very-easy': 2.0,    // 4 seconds
            'easy': 1.5,         // 3 seconds
            'normal': 1.0,       // 2 seconds
            'hard': 0.75,        // 1.5 seconds
            'very-hard': 0.5     // 1 second
        };

        // Check top row for blocks
        const hasBlocksAtTop = gameState.grid[0].some(block => block !== null);
        
        if (hasBlocksAtTop && !gameState.dangerState.active) {
            // Store the current rising speed before stopping
            const currentSpeed = gameState.risingState.speed;
            
            // Stop rising and enter final danger state
            gameState.risingState.speed = 0;
            gameState.dangerState = {
                active: true,
                startTime: performance.now(),
                warningDuration: baseWarningDuration * durationMultipliers[this.speedState.difficulty],
                isFinalWarning: true,
                previousSpeed: currentSpeed // Store the speed to resume at
            };
        } else if (hasBlocksAtTop && gameState.dangerState.active && gameState.dangerState.isFinalWarning) {
            // Check if time's up during final warning
            const timeInDanger = performance.now() - gameState.dangerState.startTime;
            if (timeInDanger >= gameState.dangerState.warningDuration) {
                gameState.gameOver = true;
                
                // If player is game over, AI wins
                if (gameState === this.playerState && !this.aiState.gameOver) {
                    this.showGameOver('ai');
                } 
                // If AI is game over, player wins
                else if (gameState === this.aiState && !this.playerState.gameOver) {
                    this.showGameOver('player');
                }
                // If both are game over at the same time (rare), it's a draw
                else if (this.playerState.gameOver && this.aiState.gameOver) {
                    this.showGameOver('draw');
                }
            }
        } else if (!hasBlocksAtTop && gameState.dangerState.active && gameState.dangerState.isFinalWarning) {
            // Player cleared the top row in time
            gameState.dangerState.active = false;
            // Resume at the previous speed instead of fixed value
            gameState.risingState.speed = gameState.dangerState.previousSpeed;
        }
    }

    gameLoop() {
        const currentTime = performance.now();
        
        // Update speed based on elapsed time and difficulty
        this.updateGameSpeed(currentTime);
        
        // Update and draw background effects
        this.updateBackgroundEffects(currentTime);
        this.drawBackgroundEffects();
        
        // Calculate and smooth FPS
        const deltaTime = currentTime - this.lastFrameTime;
        this.frameTimes[this.frameCount % 60] = deltaTime;
        this.frameCount++;
        
        // Update player state
        if (!this.playerState.gameOver && !this.aiState.gameOver) {
            // Update falling blocks
            this.updateFallingBlocks(this.playerState, currentTime);
            
            // Only update rising if no blocks are falling
            if (this.playerState.fallingBlocks.size === 0) {
                this.updateRising(this.playerState, currentTime);
            }
            
            // Check danger state
            this.checkDangerState(this.playerState);
        }
        
        // Update AI state
        if (!this.playerState.gameOver && !this.aiState.gameOver) {
            // Update falling blocks
            this.updateFallingBlocks(this.aiState, currentTime);
            
            // Only update rising if no blocks are falling
            if (this.aiState.fallingBlocks.size === 0) {
                this.updateRising(this.aiState, currentTime);
            }
            
            // Check danger state
            this.checkDangerState(this.aiState);
            
            // Let AI make a move if it's not busy
            if (!this.aiState.isSwapping && this.aiState.fallingBlocks.size === 0) {
                // Get the AI thinking indicator
                const aiThinkingElement = document.getElementById('aiThinking');
                
                // If AI is actively moving the cursor, show the thinking indicator
                if (this.ai.isMoving) {
                    if (aiThinkingElement) aiThinkingElement.classList.add('visible');
                } else {
                    if (aiThinkingElement) aiThinkingElement.classList.remove('visible');
                }
                
                this.ai.makeMove(this);
            } else {
                // Hide thinking indicator when AI is not actively making a move
                const aiThinkingElement = document.getElementById('aiThinking');
                if (aiThinkingElement) aiThinkingElement.classList.remove('visible');
            }
        }
        
        // Update timer
        this.updateTimer(currentTime);
        
        // Draw player board
        this.playerCtx.clearRect(0, 0, this.playerCanvas.width, this.playerCanvas.height);
        this.playerCtx.save();
        this.playerCtx.scale(this.playerScale, this.playerScale);
        
        this.playerCtx.fillStyle = 'rgba(0,0,0,0.3)';
        this.playerCtx.fillRect(0, 0, this.baseWidth, this.baseHeight);
        
        // Draw player blocks
        for (let y = 0; y < GRID_Y; y++) {
            for (let x = 0; x < GRID_X; x++) {
                if (this.playerState.grid[y][x]) {
                    this.drawBlock(this.playerCtx, x, y, this.playerState.grid[y][x], this.playerState);
                }
            }
        }
        
        this.drawPreviewRow(this.playerCtx, this.playerState);
        this.drawFloatingScores(this.playerCtx, this.playerState, currentTime);
        this.drawChainIndicator(this.playerCtx, this.playerState, currentTime);
        this.drawCursor(this.playerCtx, this.playerState);
        
        this.playerCtx.restore();
        
        // Draw AI board
        this.aiCtx.clearRect(0, 0, this.aiCanvas.width, this.aiCanvas.height);
        this.aiCtx.save();
        this.aiCtx.scale(this.aiScale, this.aiScale);
        
        this.aiCtx.fillStyle = 'rgba(0,0,0,0.3)';
        this.aiCtx.fillRect(0, 0, this.baseWidth, this.baseHeight);
        
        // Draw AI blocks
        for (let y = 0; y < GRID_Y; y++) {
            for (let x = 0; x < GRID_X; x++) {
                if (this.aiState.grid[y][x]) {
                    this.drawBlock(this.aiCtx, x, y, this.aiState.grid[y][x], this.aiState);
                }
            }
        }
        
        this.drawPreviewRow(this.aiCtx, this.aiState);
        this.drawFloatingScores(this.aiCtx, this.aiState, currentTime);
        this.drawChainIndicator(this.aiCtx, this.aiState, currentTime);
        this.drawCursor(this.aiCtx, this.aiState);
        
        this.aiCtx.restore();
        
        this.lastFrameTime = currentTime;
        this.rafId = requestAnimationFrame(() => this.gameLoop());
    }
    
    showGameOver(winner) {
        // Stop the timer
        this.timerState.isRunning = false;
        
        // Update modal content
        const gameOverTitle = document.getElementById('gameOverTitle');
        const gameOverMessage = document.getElementById('gameOverMessage');
        
        if (winner === 'player') {
            gameOverTitle.textContent = 'YOU WIN!';
            gameOverTitle.style.color = '#4a90e2';
            gameOverMessage.textContent = 'The AI couldn\'t keep up with your skills!';
        } else if (winner === 'ai') {
            gameOverTitle.textContent = 'YOU LOSE!';
            gameOverTitle.style.color = '#e24a4a';
            gameOverMessage.textContent = 'The AI has defeated you this time!';
        } else {
            gameOverTitle.textContent = 'DRAW!';
            gameOverTitle.style.color = '#ffd93d';
            gameOverMessage.textContent = 'Both you and the AI reached the top at the same time!';
        }
        
        document.getElementById('finalPlayerScore').textContent = this.playerState.score;
        document.getElementById('finalAiScore').textContent = this.aiState.score;
        document.getElementById('finalDifficulty').textContent = this.speedState.difficulty.toUpperCase();
        
        // Show the modal
        const modal = document.getElementById('gameOverModal');
        modal.style.display = 'block';
    }
    
    resetGame() {
        // Hide the modal
        document.getElementById('gameOverModal').style.display = 'none';
        
        // Get current saved speed setting
        const savedSpeed = parseInt(localStorage.getItem('gameSpeed')) || 3;
        const savedDifficulty = localStorage.getItem('gameDifficulty') || 'normal';
        
        // Update speed state with saved values
        this.speedState = {
            initialSpeed: savedSpeed,
            currentSpeed: savedSpeed,
            difficulty: savedDifficulty,
            lastSpeedIncrease: performance.now(),
            baseIncreaseInterval: 30000,
            baseSpeedIncrease: 1
        };
        
        // Reset player state
        this.playerState = {
            grid: [],
            cursorX: 0,
            cursorY: 0,
            score: 0,
            isSwapping: false,
            gameOver: false,
            elements: ['fire', 'water', 'earth', 'air', 'heart'],
            fallingBlocks: new Set(),
            chainCounter: 0,
            chainTimer: null,
            floatingScores: [],
            fallingFromChain: false,
            chainDisplay: {
                active: false,
                startTime: 0,
                duration: 1000,
                value: 0
            },
            dangerState: {
                active: false,
                startTime: 0,
                warningDuration: 3000
            },
            manualRising: false,
            manualRisingSpeed: 1,
            swapState: {
                isAnimating: false,
                startTime: 0,
                duration: 200,
                x1: 0,
                x2: 0,
                y: 0,
                block1: null,
                block2: null
            },
            risingState: {
                offset: 0,
                startTime: performance.now(),
                speed: this.calculateRisingSpeed(savedSpeed),
                nextRow: [],
                previewRow: []
            }
        };
        
        // Reset AI state
        this.aiState = {
            grid: [],
            cursorX: 0,
            cursorY: 0,
            score: 0,
            isSwapping: false,
            gameOver: false,
            elements: ['fire', 'water', 'earth', 'air', 'heart'],
            fallingBlocks: new Set(),
            chainCounter: 0,
            chainTimer: null,
            floatingScores: [],
            fallingFromChain: false,
            chainDisplay: {
                active: false,
                startTime: 0,
                duration: 1000,
                value: 0
            },
            dangerState: {
                active: false,
                startTime: 0,
                warningDuration: 3000
            },
            swapState: {
                isAnimating: false,
                startTime: 0,
                duration: 200,
                x1: 0,
                x2: 0,
                y: 0,
                block1: null,
                block2: null
            },
            risingState: {
                offset: 0,
                startTime: performance.now(),
                speed: this.calculateRisingSpeed(savedSpeed),
                nextRow: [],
                previewRow: []
            }
        };
        
        // Reinitialize AI
        this.ai = new AIPlayer(this.aiState);
        
        // Reset grids and preview rows
        this.initGrids();
        this.generatePreviewRows();
        
        // Reset UI
        document.getElementById('playerScoreValue').textContent = '0';
        document.getElementById('aiScoreValue').textContent = '0';
        
        // Reset timer
        this.timerState = {
            startTime: performance.now(),
            currentTime: 0,
            isRunning: true
        };
        document.getElementById('gameTimer').textContent = '00:00';
        
        // Update the speed display
        this.updateSpeedDisplay();
        
        // Clear any existing animation frame and restart the game loop
        if (this.rafId) {
            cancelAnimationFrame(this.rafId);
        }
        this.rafId = requestAnimationFrame(() => this.gameLoop());
    }
    
    calculateRisingSpeed(speedSetting) {
        // Convert speed setting (1-50) to rows per second
        // Speed 1: ~5 rows per minute (0.083 rows per second)
        // Speed 25: ~25 rows per minute (0.417 rows per second)
        // Speed 50: ~50 rows per minute (0.833 rows per second)
        
        const minSpeed = 0.083; // Speed 1
        const maxSpeed = 0.833; // Speed 50
        
        // Linear interpolation between min and max speed
        const speedFactor = (speedSetting - 1) / (50 - 1);
        const rowsPerSecond = minSpeed + (maxSpeed - minSpeed) * speedFactor;
        
        return rowsPerSecond;
    }
    
    updateGameSpeed(currentTime) {
        const multiplier = this.difficultyMultipliers[this.speedState.difficulty];
        const interval = this.speedState.baseIncreaseInterval / multiplier;
        
        if (currentTime - this.speedState.lastSpeedIncrease >= interval) {
            // Increase speed if not at max
            if (this.speedState.currentSpeed < 50) {
                this.speedState.currentSpeed += this.speedState.baseSpeedIncrease;
                
                // Update both player and AI rising speeds
                this.playerState.risingState.speed = this.calculateRisingSpeed(this.speedState.currentSpeed);
                this.aiState.risingState.speed = this.calculateRisingSpeed(this.speedState.currentSpeed);
                
                this.updateSpeedDisplay();
            }
            this.speedState.lastSpeedIncrease = currentTime;
        }
    }
    
    updateSpeedDisplay() {
        // Update the display in the info box
        const currentDifficulty = document.getElementById('currentDifficulty');
        const currentSpeed = document.getElementById('currentSpeed');
        if (currentDifficulty && currentSpeed) {
            currentDifficulty.textContent = this.speedState.difficulty.toUpperCase();
            currentSpeed.textContent = this.speedState.currentSpeed;
        }
    }
    
    updateTimer(currentTime) {
        if (!this.timerState.isRunning) return;
        
        // Calculate elapsed time in seconds
        const elapsedSeconds = Math.floor((currentTime - this.timerState.startTime) / 1000);
        this.timerState.currentTime = elapsedSeconds;
        
        // Format time as MM:SS
        const minutes = Math.floor(elapsedSeconds / 60);
        const seconds = elapsedSeconds % 60;
        const formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        // Update display
        const timerDisplay = document.getElementById('gameTimer');
        if (timerDisplay) {
            timerDisplay.textContent = formattedTime;
        }
    }
    
    initAudio() {
        // Initialize audio with saved settings
        const volumeSlider = document.getElementById('volumeSlider');
        const muteBtn = document.getElementById('muteBtn');
        
        // Set initial values from AudioManager
        volumeSlider.value = audioManager.masterVolume;
        muteBtn.textContent = audioManager.masterVolume === 0 ? '🔇' : '🔊';
        
        // Set up volume control using AudioManager's methods
        volumeSlider.addEventListener('input', (e) => {
            const newVolume = parseFloat(e.target.value);
            audioManager.setMasterVolume(newVolume);
            // No need to set localStorage here as the AudioManager will handle it
            muteBtn.textContent = newVolume === 0 ? '🔇' : '🔊';
        });
        
        // Set up mute toggle using AudioManager's masterVolume
        muteBtn.addEventListener('click', () => {
            const newVolume = audioManager.masterVolume === 0 ? 0.3 : 0;
            audioManager.setMasterVolume(newVolume);
            localStorage.setItem('masterVolume', newVolume);
            muteBtn.textContent = newVolume === 0 ? '🔇' : '🔊';
            volumeSlider.value = newVolume;
        });
        
        // Try to play background music immediately
        audioManager.bgMusic.play().catch(() => {
            // If autoplay is blocked, add a click listener to start music
            document.addEventListener('click', function initMusic() {
                if (audioManager.bgMusic.paused) {
                    audioManager.bgMusic.play().catch(console.error);
                }
                document.removeEventListener('click', initMusic);
            }, { once: true });
        });
    }
    
    setupThemes() {
        // Theme mappings exactly matching themes.css
        this.themeSymbols = {
            'theme-elements': {
                'fire': '🔥', 'water': '💧', 'earth': '🍀',
                'air': '⚡', 'heart': '🌀'
            },
            'theme-animals': {
                'fire': '🐮', 'water': '🐑', 'earth': '🐷',
                'air': '🐔', 'heart': '🐴'
            },
            'theme-retro': {
                'fire': '♥', 'water': '◆', 'earth': '★',
                'air': '●', 'heart': '▲'
            },
            'theme-space': {
                'fire': '🛸', 'water': '⭐', 'earth': '👾',
                'air': '☄️', 'heart': '🪐'
            },
            'theme-food': {
                'fire': '🍓', 'water': '🫐', 'earth': '🥑',
                'air': '🍌', 'heart': '🍇'
            },
            'theme-weather': {
                'fire': '🌅', 'water': '🌈', 'earth': '🌱',
                'air': '☀️', 'heart': '⚡'
            }
        };

        this.themeColors = {
            'theme-elements': {
                'fire': '#FF4D00', 'water': '#00B4D8', 'earth': '#00CC6A',
                'air': '#FFD700', 'heart': '#6D28D9'
            },
            'theme-animals': {
                'fire': '#D35D47', 'water': '#88B5D3', 'earth': '#A4C3A2',
                'air': '#ECD279', 'heart': '#B784A7'
            },
            'theme-retro': {
                'fire': '#E74858', 'water': '#209CEE', 'earth': '#92CC41',
                'air': '#F7D51D', 'heart': '#A374C6'
            },
            'theme-space': {
                'fire': '#FF1E39', 'water': '#00DDFF', 'earth': '#00FFA3',
                'air': '#FFB700', 'heart': '#B026FF'
            },
            'theme-food': {
                'fire': '#FF6B6B', 'water': '#73C2FB', 'earth': '#98FF98',
                'air': '#FFD700', 'heart': '#E0B0FF'
            },
            'theme-weather': {
                'fire': '#FF7E67', 'water': '#4FB4FF', 'earth': '#7ED957',
                'air': '#FFD93D', 'heart': '#9D4EDD'
            }
        };
    }
    
    updateTheme(theme) {
        this.blockSymbols = this.themeSymbols[theme];
        this.blockColors = this.themeColors[theme];
        document.body.className = theme;
        
        // Update background emojis with new theme
        const themeEmojis = Object.values(this.themeSymbols[theme]);
        this.backgroundEmojis.forEach((emoji, i) => {
            emoji.symbol = themeEmojis[i % themeEmojis.length];
        });
        
        // Update music when theme changes
        audioManager.updateThemeMusic(theme);
    }
    
    initBackgroundEffects() {
        // Use window dimensions instead of game dimensions
        this.bgCanvas.width = window.innerWidth;
        this.bgCanvas.height = window.innerHeight;
        
        const currentTheme = localStorage.getItem('selectedTheme') || 'theme-elements';
        const themeEmojis = Object.values(this.themeSymbols[currentTheme]);
        
        // Clear any existing background elements
        this.backgroundEmojis = [];
        this.particles = [];
        
        // Create floating emojis with pong-like movement
        for (let i = 0; i < 5; i++) {
            this.backgroundEmojis.push({
                symbol: themeEmojis[i % themeEmojis.length],
                x: Math.random() * window.innerWidth,
                y: Math.random() * window.innerHeight,
                speedX: (Math.random() - 0.5) * 2,  // Random direction
                speedY: (Math.random() - 0.5) * 2,
                size: 60 + Math.random() * 40
            });
        }

        // Create more particles for fullscreen
        for (let i = 0; i < 20; i++) {
            this.particles.push({
                x: Math.random() * window.innerWidth,
                y: Math.random() * window.innerHeight,
                speed: 0.5 + Math.random() * 0.5,
                size: 3 + Math.random() * 3
            });
        }
    }
    
    updateBackgroundEffects(currentTime) {
        // Update floating emojis with bounce
        for (let emoji of this.backgroundEmojis) {
            emoji.x += emoji.speedX;
            emoji.y += emoji.speedY;
            
            // Bounce off edges
            if (emoji.x < 0 || emoji.x > window.innerWidth) {
                emoji.speedX *= -1;
                emoji.x = Math.max(0, Math.min(emoji.x, window.innerWidth));
            }
            if (emoji.y < 0 || emoji.y > window.innerHeight) {
                emoji.speedY *= -1;
                emoji.y = Math.max(0, Math.min(emoji.y, window.innerHeight));
            }
        }

        // Update particles
        for (let particle of this.particles) {
            particle.y += particle.speed;
            
            // Wrap around
            if (particle.y > window.innerHeight) {
                particle.y = -10;
                particle.x = Math.random() * window.innerWidth;
            }
        }
    }
    
    drawBackgroundEffects() {
        this.bgCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);
        
        // Save context state
        this.bgCtx.save();
        
        // Draw particles
        for (let particle of this.particles) {
            this.bgCtx.beginPath();
            this.bgCtx.fillStyle = 'rgba(255,255,255,0.2)';
            this.bgCtx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            this.bgCtx.fill();
        }
        
        // Draw floating emojis
        for (let emoji of this.backgroundEmojis) {
            this.bgCtx.font = `${emoji.size}px Arial`;
            this.bgCtx.textAlign = 'center';
            this.bgCtx.textBaseline = 'middle';
            this.bgCtx.fillStyle = 'rgba(255,255,255,0.15)';
            this.bgCtx.fillText(emoji.symbol, emoji.x, emoji.y);
        }
        
        // Restore context state
        this.bgCtx.restore();
    }
}

// Start game when page loads
window.addEventListener('load', () => {
    new VersusGame();
}); 