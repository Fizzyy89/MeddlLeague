import { GRID_X, GRID_Y, ELEMENTS, BLOCK_SIZE, GAP, GRID_PADDING, GAME_PADDING } from './config.js';
import { audioManager } from './audio.js';
import { AIPlayer } from './ai-player.js';

class VersusGame {
    constructor() {
        console.log("Initializing Versus game");
        
        // Game canvas elements
        this.bgCanvas = document.getElementById('bgCanvas');
        this.playerCanvas = document.getElementById('playerCanvas');
        this.aiCanvas = document.getElementById('aiCanvas');
        
        // Get contexts
        this.bgCtx = this.bgCanvas.getContext('2d');
        this.playerCtx = this.playerCanvas.getContext('2d');
        this.aiCtx = this.aiCanvas.getContext('2d');
        
        // Enable crisp pixel rendering
        this.playerCtx.imageSmoothingEnabled = false;
        this.aiCtx.imageSmoothingEnabled = false;
        
        // Score display
        this.playerScoreDisplay = document.getElementById('playerScoreValue');
        this.aiScoreDisplay = document.getElementById('aiScoreValue');
        
        // Speed display
        this.speedDisplay = document.getElementById('currentSpeed');
        
        // Difficulty display
        this.difficultyDisplay = document.getElementById('currentDifficulty');
        
        // AI Difficulty display
        this.aiDifficultyDisplay = document.getElementById('currentAiDifficulty');
        
        // Timer display
        this.timerDisplay = document.getElementById('gameTimer');
        
        // Game over elements
        this.gameOverModal = document.getElementById('gameOverModal');
        this.gameOverTitle = document.getElementById('gameOverTitle');
        this.gameOverMessage = document.getElementById('gameOverMessage');
        this.finalPlayerScoreDisplay = document.getElementById('finalPlayerScore');
        this.finalAiScoreDisplay = document.getElementById('finalAiScore');
        this.finalDifficultyDisplay = document.getElementById('finalDifficulty');
        
        // Try again button
        this.tryAgainBtn = document.getElementById('tryAgainBtn');
        
        // Audio manager
        this.bgMusic = document.getElementById('bgMusic');
        this.initAudio();
        
        // Initialize theme properties (will be set properly in updateTheme)
        this.blockSymbols = {}; // For backward compatibility
        this.blockColors = {};  // For backward compatibility
        this.playerBlockSymbols = {};
        this.playerBlockColors = {};
        this.aiBlockSymbols = {};
        this.aiBlockColors = {};
        
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
        const savedDifficulty = localStorage.getItem('gameDifficulty') || 'easy';
        const savedAiDifficulty = parseInt(localStorage.getItem('aiDifficulty')) || 2;
        
        // Initialize scale and resize
        this.playerScale = 1;
        this.aiScale = 1;
        this.resize();
        
        // Game state initialization for player
        this.playerState = {
            grid: [],
            cursorX: 3,
            cursorY: 5,
            score: 0,
            isSwapping: false,
            gameOver: false,
            elements: ['fire', 'water', 'earth', 'air', 'heart'],
            fallingBlocks: new Set(),
            chainCounter: 0,
            chainTimer: null,
            floatingScores: [],
            matchCountPopups: [],
            fallingFromChain: false,
            garbageBlocks: [],      // Array to store active garbage blocks
            pendingGarbage: [],     // Queue of garbage blocks waiting to be dropped
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
            cursorX: 3,
            cursorY: 5,
            score: 0,
            isSwapping: false,
            gameOver: false,
            elements: ['fire', 'water', 'earth', 'air', 'heart'],
            fallingBlocks: new Set(),
            chainCounter: 0,
            chainTimer: null,
            floatingScores: [],
            matchCountPopups: [],
            fallingFromChain: false,
            garbageBlocks: [],      // Array to store active garbage blocks
            pendingGarbage: [],     // Queue of garbage blocks waiting to be dropped
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
        
        // Initialize AI player with specified difficulty
        this.ai = new AIPlayer(this.aiState);
        this.ai.setDifficulty(savedAiDifficulty);
        
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
            ? Math.min(500, totalAvailableWidth / 2) // Side by side - limit each canvas width
            : Math.min(500, totalAvailableWidth - 40); // Stacked - allow more width for single column
        
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
        
        // Check if cursor is over a garbage block
        let isOverGarbage = false;
        for (const garbage of gameState.garbageBlocks) {
            // Skip garbage blocks that are in clearing state
            if (garbage.state === 'clearing') continue;
            
            // Check if cursor is within garbage block bounds
            if (y >= garbage.y && y < garbage.y + garbage.height &&
                ((x1 >= garbage.x && x1 < garbage.x + garbage.width) || 
                 (x2 >= garbage.x && x2 < garbage.x + garbage.width))) {
                isOverGarbage = true;
                break;
            }
        }
        
        // Don't allow swapping if either block is locked, if any blocks are falling, or if cursor is over garbage
        if (isBlock1Locked || isBlock2Locked || gameState.fallingBlocks.size > 0 || isOverGarbage) {
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
        const baseScore = matchSize * 100;
        const chainMultiplier = chainLevel > 0 ? chainLevel * 1.5 : 1;
        return Math.floor(baseScore * chainMultiplier);
    }
    
    generateGarbageBlock(comboSize, chainLevel) {
        // Default garbage block properties
        let width = 0;
        let height = 1;
        let blocks = [];
        
        // Generate garbage based on combo size
        if (comboSize >= 4) {
            if (comboSize === 4) {
                // 3-panel wide block for 4-combo
                width = 3;
                blocks.push({ width, height });
            } else if (comboSize === 5) {
                // 4-panel wide block for 5-combo
                width = 4;
                blocks.push({ width, height });
            } else if (comboSize === 6) {
                // 5-panel wide block for 6-combo
                width = 5;
                blocks.push({ width, height });
            } else if (comboSize === 7) {
                // 6-panel wide block for 7-combo
                width = 6;
                blocks.push({ width, height });
            } else if (comboSize === 8) {
                // Two blocks (3-wide and 4-wide) for 8-combo
                blocks.push({ width: 3, height: 1 });
                blocks.push({ width: 4, height: 1 });
            } else if (comboSize >= 9) {
                // Two 4-panel wide blocks for 9+ combo
                blocks.push({ width: 4, height: 1 });
                blocks.push({ width: 4, height: 1 });
            }
        }
        
        // Generate garbage based on chain level
        if (chainLevel >= 2) {
            if (chainLevel === 2) {
                // 6-panel wide block for 2-chain
                width = 6;
                blocks.push({ width, height });
            } else if (chainLevel === 3) {
                // 2-panel tall block for 3-chain
                width = 6;
                height = 2;
                blocks.push({ width, height });
            } else if (chainLevel >= 4) {
                // 3-panel tall block for 4+ chain
                width = 6;
                height = 3;
                blocks.push({ width, height });
            }
        }
        
        // Add properties to each garbage block
        return blocks.map(block => {
            return {
                ...block,
                x: 0, // Will be set when actually placed
                y: 0, // Will be set when actually placed
                state: 'pending',
                color: null, // Will be set when placed
                clearProgress: 0
            };
        });
    }
    
    placeGarbageBlocks(gameState) {
        // If no pending garbage, do nothing
        if (gameState.pendingGarbage.length === 0) return;
        
        // Get the first garbage block from the queue
        const garbageBlock = gameState.pendingGarbage.shift();
        
        // Find a valid position for the garbage block
        let validPosition = false;
        let x = 0;
        let attempts = 0;
        const maxAttempts = 10;
        
        while (!validPosition && attempts < maxAttempts) {
            // Determine random x position (ensuring it fits within grid)
            const maxX = GRID_X - garbageBlock.width;
            x = Math.floor(Math.random() * (maxX + 1));
            
            // Check if this position overlaps with any existing blocks or garbage blocks
            validPosition = true;
            
            // Check for overlap with existing blocks in the top rows
            for (let dy = 0; dy < Math.min(3, garbageBlock.height); dy++) {
                for (let dx = 0; dx < garbageBlock.width; dx++) {
                    if (gameState.grid[dy][x + dx]) {
                        validPosition = false;
                        break;
                    }
                }
                if (!validPosition) break;
            }
            
            // Check for overlap with other garbage blocks
            if (validPosition) {
                for (const garbage of gameState.garbageBlocks) {
                    // Skip garbage blocks that are being cleared
                    if (garbage.state === 'clearing') continue;
                    
                    // Check for overlap
                    if (x < garbage.x + garbage.width && 
                        x + garbageBlock.width > garbage.x && 
                        0 < garbage.y + garbage.height && 
                        garbageBlock.height > garbage.y) {
                        validPosition = false;
                        break;
                    }
                }
            }
            
            attempts++;
        }
        
        // If we couldn't find a valid position after max attempts, place it anyway
        // at a random position (the game will handle overlaps gracefully)
        if (!validPosition) {
            const maxX = GRID_X - garbageBlock.width;
            x = Math.floor(Math.random() * (maxX + 1));
        }
        
        // Place at the top of the grid
        const y = 0;
        const startY = -garbageBlock.height; // Start above the grid for a smooth entrance
        
        // Assign a random color from the theme
        const isAiBlock = gameState === this.aiState;
        const elements = isAiBlock ? this.aiState.elements : this.playerState.elements;
        const randomElement = elements[Math.floor(Math.random() * elements.length)];
        
        // Create the garbage block with position and color
        const placedGarbage = {
            ...garbageBlock,
            x,
            y,
            startY,
            currentY: startY, // Start from above the grid
            state: 'falling',
            color: randomElement,
            fallStart: performance.now()
        };
        
        // Add to active garbage blocks
        gameState.garbageBlocks.push(placedGarbage);
    }
    
    updateGarbageBlocks(gameState, currentTime) {
        // Process each garbage block
        for (let i = gameState.garbageBlocks.length - 1; i >= 0; i--) {
            const garbage = gameState.garbageBlocks[i];
            
            // Handle falling garbage
            if (garbage.state === 'falling') {
                // Use the same fall duration as regular blocks
                const fallDuration = 150; // Match the regular block fall duration
                
                // Calculate fall progress
                const progress = Math.min((currentTime - garbage.fallStart) / fallDuration, 1);
                
                if (progress >= 1) {
                    // Falling animation complete
                    garbage.currentY = garbage.y;
                    
                    // Check if it can continue falling
                    let canFall = true;
                    const targetY = garbage.y + 1;
                    
                    // Check if it would go off the bottom of the grid
                    if (targetY + garbage.height > GRID_Y) {
                        canFall = false;
                    } else {
                        // Check if there are any regular blocks in the way
                        for (let dx = 0; dx < garbage.width; dx++) {
                            const checkX = garbage.x + dx;
                            if (checkX >= 0 && checkX < GRID_X && gameState.grid[targetY][checkX]) {
                                canFall = false;
                                break;
                            }
                        }
                        
                        // Check if there are any other garbage blocks in the way
                        if (canFall) {
                            for (let j = 0; j < gameState.garbageBlocks.length; j++) {
                                if (i === j) continue; // Skip self
                                
                                const otherGarbage = gameState.garbageBlocks[j];
                                if (otherGarbage.state === 'clearing') continue; // Skip clearing garbage
                                
                                // Check for collision with other garbage block
                                if (garbage.x < otherGarbage.x + otherGarbage.width &&
                                    garbage.x + garbage.width > otherGarbage.x &&
                                    targetY < otherGarbage.y + otherGarbage.height &&
                                    targetY + garbage.height > otherGarbage.y) {
                                    canFall = false;
                                    break;
                                }
                            }
                        }
                    }
                    
                    // If it can fall, update its position and start a new fall
                    if (canFall) {
                        garbage.startY = garbage.y;
                        garbage.y = targetY;
                        garbage.fallStart = currentTime;
                    } else {
                        // If it can't fall, change state to landed
                        garbage.state = 'landed';
                    }
                } else {
                    // Update visual position during falling animation with smooth interpolation
                    garbage.currentY = garbage.startY + (garbage.y - garbage.startY) * progress;
                }
            } 
            // Check if landed garbage blocks can fall again
            else if (garbage.state === 'landed') {
                // Check if there's space below the garbage block
                let canFall = true;
                const targetY = garbage.y + 1;
                
                // Check if it would go off the bottom of the grid
                if (targetY + garbage.height > GRID_Y) {
                    canFall = false;
                } else {
                    // Check if there are any regular blocks in the way
                    for (let dx = 0; dx < garbage.width; dx++) {
                        const checkX = garbage.x + dx;
                        if (checkX >= 0 && checkX < GRID_X && gameState.grid[targetY][checkX]) {
                            canFall = false;
                            break;
                        }
                    }
                    
                    // Check if there are any other garbage blocks in the way
                    if (canFall) {
                        for (let j = 0; j < gameState.garbageBlocks.length; j++) {
                            if (i === j) continue; // Skip self
                            
                            const otherGarbage = gameState.garbageBlocks[j];
                            if (otherGarbage.state === 'clearing') continue; // Skip clearing garbage
                            
                            // Check for collision with other garbage block
                            if (garbage.x < otherGarbage.x + otherGarbage.width &&
                                garbage.x + garbage.width > otherGarbage.x &&
                                targetY < otherGarbage.y + otherGarbage.height &&
                                targetY + garbage.height > otherGarbage.y) {
                                canFall = false;
                                break;
                            }
                        }
                    }
                }
                
                // If it can fall, change state back to falling
                if (canFall) {
                    garbage.state = 'falling';
                    garbage.startY = garbage.y;
                    garbage.y = targetY;
                    garbage.fallStart = currentTime;
                    garbage.currentY = garbage.startY; // Start from current position
                }
            }
            
            // Handle clearing garbage (when adjacent to matches)
            if (garbage.state === 'clearing') {
                // Increment clear progress
                garbage.clearProgress++;
                
                // If fully cleared, remove the garbage block
                if (garbage.clearProgress >= garbage.width) {
                    gameState.garbageBlocks.splice(i, 1);
                }
            }
            
            // Ensure currentY is always updated to match y for landed blocks
            if (garbage.state === 'landed') {
                garbage.currentY = garbage.y;
            }
        }
    }
    
    checkGarbageBlockMatches(gameState, matches) {
        // If no matches or no garbage blocks, return
        if (matches.length === 0 || gameState.garbageBlocks.length === 0) return;
        
        // Convert matches to a set for faster lookup
        const matchSet = new Set(matches.map(match => `${match.x},${match.y}`));
        
        // Check each garbage block
        for (const garbage of gameState.garbageBlocks) {
            // Skip garbage blocks that are already clearing or falling
            if (garbage.state !== 'landed') continue;
            
            // Check if any match is adjacent to the garbage block
            let isAdjacent = false;
            
            // Check cells horizontally adjacent to the garbage block (left and right sides)
            // Left side
            for (let dy = 0; dy < garbage.height; dy++) {
                const checkX = garbage.x - 1;
                const checkY = garbage.y + dy;
                
                if (checkX >= 0 && checkY >= 0 && checkY < GRID_Y) {
                    if (matchSet.has(`${checkX},${checkY}`)) {
                        isAdjacent = true;
                        break;
                    }
                }
            }
            
            // Right side
            if (!isAdjacent) {
                for (let dy = 0; dy < garbage.height; dy++) {
                    const checkX = garbage.x + garbage.width;
                    const checkY = garbage.y + dy;
                    
                    if (checkX < GRID_X && checkY >= 0 && checkY < GRID_Y) {
                        if (matchSet.has(`${checkX},${checkY}`)) {
                            isAdjacent = true;
                            break;
                        }
                    }
                }
            }
            
            // Check cells vertically adjacent to the garbage block (top and bottom)
            // Top
            if (!isAdjacent) {
                for (let dx = 0; dx < garbage.width; dx++) {
                    const checkX = garbage.x + dx;
                    const checkY = garbage.y - 1;
                    
                    if (checkX >= 0 && checkX < GRID_X && checkY >= 0) {
                        if (matchSet.has(`${checkX},${checkY}`)) {
                            isAdjacent = true;
                            break;
                        }
                    }
                }
            }
            
            // Bottom
            if (!isAdjacent) {
                for (let dx = 0; dx < garbage.width; dx++) {
                    const checkX = garbage.x + dx;
                    const checkY = garbage.y + garbage.height;
                    
                    if (checkX >= 0 && checkX < GRID_X && checkY < GRID_Y) {
                        if (matchSet.has(`${checkX},${checkY}`)) {
                            isAdjacent = true;
                            break;
                        }
                    }
                }
            }
            
            // If adjacent to a match, start clearing the garbage block
            if (isAdjacent) {
                garbage.state = 'clearing';
                garbage.clearProgress = 0;
                
                // Convert the bottom row of the garbage block to regular blocks
                this.convertGarbageToBlocks(gameState, garbage);
            }
        }
    }
    
    convertGarbageToBlocks(gameState, garbage) {
        // Only convert the bottom row of the garbage block
        const y = garbage.y + garbage.height - 1;
        
        // Make sure we're within grid bounds
        if (y >= 0 && y < GRID_Y) {
            // Convert each cell in the bottom row to a regular block
            for (let dx = 0; dx < garbage.width; dx++) {
                const x = garbage.x + dx;
                
                // Make sure we're within grid bounds
                if (x >= 0 && x < GRID_X) {
                    // Create a new regular block with the same color as the garbage
                    gameState.grid[y][x] = garbage.color;
                }
            }
        }
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

    addMatchCountPopup(gameState, x, y, matchCount) {
        // Only show for matches of 4 or more
        if (matchCount < 4) return;
        
        // Calculate screen position (center of the matched blocks)
        const screenX = GRID_PADDING + (x * (BLOCK_SIZE + GAP)) + BLOCK_SIZE/2;
        const screenY = GRID_PADDING + (y * (BLOCK_SIZE + GAP)) + BLOCK_SIZE/2;
        
        // Add to the appropriate game state's matchCountPopups array
        if (!gameState.matchCountPopups) {
            gameState.matchCountPopups = [];
        }
        
        gameState.matchCountPopups.push({
            count: matchCount,
            x: screenX,
            y: screenY,
            startTime: performance.now(),
            duration: 1500, // Longer duration for the full animation
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

        // Determine if this is an AI match
        const isAiMatch = gameState === this.aiState;

        // Play match size sound effect
        audioManager.playMatchSound(matches.length, isAiMatch);

        // Increment chain counter if this is part of a chain
        if (isChain) {
            gameState.chainCounter++;
            
            // Play chain sound based on chain level
            if (gameState.chainCounter >= 1) {
                audioManager.playChainSound(gameState.chainCounter, isAiMatch);
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
        
        // Add match count popup for matches of 4 or more
        if (matches.length >= 4) {
            this.addMatchCountPopup(gameState, centerMatch.x, centerMatch.y, matches.length);
        }
        
        // Update score
        gameState.score += matchScore;
        
        // Update score display
        if (gameState === this.playerState) {
            document.getElementById('playerScoreValue').textContent = gameState.score;
        } else {
            document.getElementById('aiScoreValue').textContent = gameState.score;
        }

        // Generate garbage blocks for the opponent based on match size or chain level
        const opponentState = gameState === this.playerState ? this.aiState : this.playerState;
        
        // Only generate garbage for matches of 4+ or chains of 2+
        if (matches.length >= 4 || gameState.chainCounter >= 2) {
            const garbageBlocks = this.generateGarbageBlock(matches.length, gameState.chainCounter);
            
            // Add garbage blocks to opponent's pending queue
            if (garbageBlocks.length > 0) {
                opponentState.pendingGarbage.push(...garbageBlocks);
            }
        }

        // Check if any matches are adjacent to garbage blocks
        this.checkGarbageBlockMatches(gameState, matches);

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
                        // Determine if this is an AI pop
                        const isAiPop = gameState === this.aiState;
                        audioManager.playPopSound(isAiPop);
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
                if (gameState.grid[y][x]) {
                    // Check if there's a block or garbage block below
                    let canFall = !gameState.grid[y + 1][x];
                    
                    // If there's no regular block below, check for garbage blocks
                    if (canFall) {
                        for (const garbage of gameState.garbageBlocks) {
                            // Skip garbage blocks that are in clearing or falling state
                            if (garbage.state === 'clearing' || garbage.state === 'falling') continue;
                            
                            // Check if the position below is inside a garbage block
                            if (x >= garbage.x && x < garbage.x + garbage.width &&
                                y + 1 >= garbage.y && y + 1 < garbage.y + garbage.height) {
                                canFall = false;
                                break;
                            }
                        }
                    }
                    
                    if (canFall) {
                        // Found a block that can fall
                        let fallDistance = 1;
                        let targetY = y + 1;
                        
                        // Find how far it can fall
                        while (targetY + 1 < GRID_Y && !gameState.grid[targetY + 1][x]) {
                            // Check if there's a garbage block at this position
                            let garbageBlockInTheWay = false;
                            
                            for (const garbage of gameState.garbageBlocks) {
                                // Skip garbage blocks that are in clearing or falling state
                                if (garbage.state === 'clearing' || garbage.state === 'falling') continue;
                                
                                // Check if this position is inside a garbage block
                                if (x >= garbage.x && x < garbage.x + garbage.width &&
                                    targetY + 1 >= garbage.y && targetY + 1 < garbage.y + garbage.height) {
                                    garbageBlockInTheWay = true;
                                    break;
                                }
                            }
                            
                            // If there's a garbage block in the way, stop falling
                            if (garbageBlockInTheWay) break;
                            
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
        
        // Determine whether to use player or AI theme based on the gameState
        const isAiBlock = gameState === this.aiState;
        
        // Choose the appropriate color based on whether it's an AI block or player block
        ctx.fillStyle = this.getBlockColor(blockType, isAiBlock);
        
        if (blockState === 'matching') {
            const progress = (currentTime - block.animationStart) / 300;
            
            // Gentle glow effect
            ctx.shadowColor = this.getBlockColor(blockType, isAiBlock);
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
            ctx.shadowColor = this.getBlockColor(blockType, isAiBlock);
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
        
        // Choose the appropriate symbol based on whether it's an AI block or player block
        const symbol = this.getBlockSymbol(blockType, isAiBlock);
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
    
    drawGarbageBlocks(ctx, gameState, currentTime) {
        // Draw each garbage block
        for (const garbage of gameState.garbageBlocks) {
            // Calculate position with rising offset
            let drawY;
            
            // For all blocks, use the currentY property for smooth animation
            // and apply the rising offset
            drawY = garbage.currentY - gameState.risingState.offset;
            
            // Skip drawing if the block is completely above the visible area
            if (drawY + garbage.height <= 0) continue;
            
            // Calculate pixel positions
            const xPos = GRID_PADDING + (garbage.x * (BLOCK_SIZE + GAP));
            const yPos = GRID_PADDING + (drawY * (BLOCK_SIZE + GAP));
            
            // Calculate width and height in pixels
            const width = (garbage.width * BLOCK_SIZE) + ((garbage.width - 1) * GAP);
            const height = (garbage.height * BLOCK_SIZE) + ((garbage.height - 1) * GAP);
            
            // Save context state
            ctx.save();
            
            // Determine whether to use player or AI theme
            const isAiBlock = gameState === this.aiState;
            
            // Get the color for the garbage block
            const color = this.getBlockColor(garbage.color, isAiBlock);
            
            // Apply different styles based on garbage state
            if (garbage.state === 'clearing') {
                // Pulsing effect for clearing garbage
                const pulseFrequency = 5;
                const pulseAmplitude = 0.2;
                const pulse = 0.8 + Math.sin(currentTime / 100 * pulseFrequency) * pulseAmplitude;
                
                // Brighter color for clearing garbage
                ctx.fillStyle = color;
                ctx.globalAlpha = pulse;
                
                // Add glow effect
                ctx.shadowColor = color;
                ctx.shadowBlur = 15;
            } else {
                // Normal garbage block appearance
                ctx.fillStyle = color;
                
                // Add subtle shadow
                ctx.shadowColor = 'rgba(0,0,0,0.5)';
                ctx.shadowBlur = 10;
                ctx.shadowOffsetX = 2;
                ctx.shadowOffsetY = 2;
            }
            
            // Draw the garbage block with rounded corners
            ctx.beginPath();
            ctx.roundRect(xPos, yPos, width, height, 8);
            ctx.fill();
            
            // Add a grid pattern to distinguish garbage blocks
            ctx.strokeStyle = 'rgba(255,255,255,0.2)';
            ctx.lineWidth = 2;
            
            // Draw horizontal grid lines
            for (let i = 1; i < garbage.height; i++) {
                const lineY = yPos + i * (BLOCK_SIZE + GAP);
                ctx.beginPath();
                ctx.moveTo(xPos, lineY);
                ctx.lineTo(xPos + width, lineY);
                ctx.stroke();
            }
            
            // Draw vertical grid lines
            for (let i = 1; i < garbage.width; i++) {
                const lineX = xPos + i * (BLOCK_SIZE + GAP);
                ctx.beginPath();
                ctx.moveTo(lineX, yPos);
                ctx.lineTo(lineX, yPos + height);
                ctx.stroke();
            }
            
            // Add a symbol to the center of the garbage block
            const symbol = this.getBlockSymbol(garbage.color, isAiBlock);
            if (symbol) {
                const centerX = xPos + width / 2;
                const centerY = yPos + height / 2;
                
                ctx.font = '40px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillStyle = 'rgba(255,255,255,0.7)';
                ctx.fillText(symbol, centerX, centerY);
            }
            
            // Restore context state
            ctx.restore();
        }
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
    
    getBlockColor(element, isAiBlock) {
        // Use the correct theme colors based on whether it's an AI block or player block
        const blockColors = isAiBlock ? this.aiBlockColors : this.playerBlockColors;
        return blockColors[element] || '#ffffff';
    }
    
    getBlockSymbol(element, isAiBlock) {
        // Use the correct theme symbols based on whether it's an AI block or player block
        const blockSymbols = isAiBlock ? this.aiBlockSymbols : this.playerBlockSymbols;
        return blockSymbols[element] || element;
    }
    
    drawPreviewRow(ctx, gameState) {
        if (!gameState.risingState.previewRow) return;
        
        const previewRow = [...gameState.risingState.previewRow];
        const isAiBlock = gameState === this.aiState;
        
        // Calculate rising offset
        const offsetY = GRID_Y - gameState.risingState.offset;
        
        for (let x = 0; x < GRID_X; x++) {
            if (x < previewRow.length) {
                const blockType = previewRow[x];
                
                // Calculate precise pixel positions
                const xPos = GRID_PADDING + (x * (BLOCK_SIZE + GAP));
                const yPos = GRID_PADDING + (offsetY * (BLOCK_SIZE + GAP));
                const centerX = xPos + (BLOCK_SIZE/2);
                const centerY = yPos + (BLOCK_SIZE/2);
                
                // Draw block with reduced opacity
                ctx.globalAlpha = 0.3;
                ctx.fillStyle = this.getBlockColor(blockType, isAiBlock);
                ctx.beginPath();
                ctx.roundRect(xPos, yPos, BLOCK_SIZE, BLOCK_SIZE, 8);
                ctx.fill();
                
                // Draw symbol
                const symbol = this.getBlockSymbol(blockType, isAiBlock);
                if (symbol) {
                    ctx.font = '30px Arial';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
                    ctx.shadowColor = 'rgba(0,0,0,0.2)';
                    ctx.shadowBlur = 4;
                    ctx.shadowOffsetX = 1;
                    ctx.shadowOffsetY = 1;
                    
                    ctx.fillText(symbol, centerX, centerY);
                }
                ctx.globalAlpha = 1;
            }
        }
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

    drawMatchCountPopups(ctx, gameState, currentTime) {
        if (!gameState.matchCountPopups) return;
        
        gameState.matchCountPopups = gameState.matchCountPopups.filter(popup => {
            const progress = (currentTime - popup.startTime) / popup.duration;
            if (progress >= 1) return false;
            
            ctx.save();
            
            // Animation phases:
            // 1. Appear and grow (0-20%)
            // 2. Spin around once (20-60%)
            // 3. Evaporate/dissolve (60-100%)
            
            // Calculate scale based on phase
            let scale;
            if (progress < 0.2) {
                // Phase 1: Grow from 0.5 to 1.2 (slight overshoot)
                scale = 0.5 + (progress / 0.2) * 0.7;
            } else if (progress < 0.6) {
                // Phase 2: Maintain slightly larger scale during spin
                scale = 1.2;
            } else {
                // Phase 3: Grow larger while fading out
                scale = 1.2 + ((progress - 0.6) / 0.4) * 0.8;
            }
            
            // Calculate rotation based on phase
            let rotation = 0;
            if (progress >= 0.2 && progress < 0.6) {
                // Complete one full rotation during phase 2
                rotation = ((progress - 0.2) / 0.4) * Math.PI * 2;
            }
            
            // Calculate opacity based on phase
            let opacity;
            if (progress < 0.2) {
                // Phase 1: Fade in
                opacity = progress / 0.2;
            } else if (progress < 0.6) {
                // Phase 2: Full opacity
                opacity = 1;
            } else {
                // Phase 3: Fade out
                opacity = 1 - ((progress - 0.6) / 0.4);
            }
            
            // Apply transformations
            ctx.translate(popup.x, popup.y);
            ctx.rotate(rotation);
            ctx.scale(scale, scale);
            
            // Determine color based on match count
            let color;
            if (popup.count >= 6) {
                color = `rgba(255,50,50,${opacity})`; // Red for 6+
            } else if (popup.count >= 5) {
                color = `rgba(255,165,0,${opacity})`; // Orange for 5
            } else {
                color = `rgba(50,50,255,${opacity})`; // Blue for 4
            }
            
            // Draw box background
            const boxWidth = 40;
            const boxHeight = 40;
            
            // Add glow effect
            ctx.shadowColor = color;
            ctx.shadowBlur = 10;
            
            // Draw rounded rectangle box
            ctx.fillStyle = `rgba(0,0,0,${opacity * 0.7})`;
            ctx.beginPath();
            ctx.roundRect(-boxWidth/2, -boxHeight/2, boxWidth, boxHeight, 8);
            ctx.fill();
            
            // Add border
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.stroke();
            
            // Draw number
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.font = 'bold 24px "Press Start 2P"';
            
            // Draw text
            ctx.fillStyle = color;
            ctx.fillText(`${popup.count}`, 0, 0);
            
            // Phase 3: Add particles for evaporation effect
            if (progress >= 0.6) {
                const particleCount = 8;
                const evaporateProgress = (progress - 0.6) / 0.4;
                const particleDistance = evaporateProgress * 30;
                
                for (let i = 0; i < particleCount; i++) {
                    const angle = (i / particleCount) * Math.PI * 2;
                    const particleX = Math.cos(angle) * particleDistance;
                    const particleY = Math.sin(angle) * particleDistance;
                    const particleSize = 4 * (1 - evaporateProgress);
                    const particleOpacity = opacity * (1 - evaporateProgress);
                    
                    ctx.fillStyle = `rgba(255,255,255,${particleOpacity})`;
                    ctx.beginPath();
                    ctx.arc(particleX, particleY, particleSize, 0, Math.PI * 2);
                    ctx.fill();
                }
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
        
        // Shift all garbage blocks up
        for (const garbage of gameState.garbageBlocks) {
            // For all garbage blocks, shift them up
            garbage.y--;
            
            // Also update related properties
            if (garbage.state === 'falling') {
                garbage.startY--;
                
                // Update currentY while maintaining relative position in the fall
                const fallProgress = (performance.now() - garbage.fallStart) / 150;
                if (fallProgress < 1) {
                    garbage.currentY = garbage.startY + (garbage.y - garbage.startY) * fallProgress;
                } else {
                    garbage.currentY = garbage.y;
                }
            } else {
                garbage.currentY = garbage.y;
            }
            
            // If garbage block is pushed off the top, remove it
            if (garbage.y + garbage.height <= 0) {
                garbage.state = 'clearing';
                garbage.clearProgress = garbage.width; // Mark for removal
            }
        }
        
        // Remove any garbage blocks that were pushed off the top
        gameState.garbageBlocks = gameState.garbageBlocks.filter(
            garbage => !(garbage.state === 'clearing' && garbage.clearProgress >= garbage.width)
        );
        
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

        // Check top row for regular blocks, excluding falling blocks
        const hasRegularBlocksAtTop = gameState.grid[0].some(block => {
            // Ignore null blocks
            if (block === null) return false;
            
            // Ignore blocks that are currently falling
            if (typeof block === 'object' && block.state === 'falling') return false;
            
            // Count all other blocks
            return true;
        });
        
        // Check if any garbage blocks are at the top row (y=0), excluding newly placed or falling ones
        const hasGarbageBlocksAtTop = gameState.garbageBlocks.some(garbage => {
            // Only count garbage blocks at the top row
            if (garbage.y !== 0) return false;
            
            // Ignore garbage blocks that are clearing
            if (garbage.state === 'clearing') return false;
            
            // Ignore garbage blocks that are falling
            if (garbage.state === 'falling') return false;
            
            // Ignore garbage blocks that were recently placed (within the last 500ms)
            const recentlyPlaced = garbage.fallStart && (performance.now() - garbage.fallStart < 500);
            if (recentlyPlaced) return false;
            
            // Count all other garbage blocks at the top
            return true;
        });
        
        // Game is in danger if either regular blocks or garbage blocks are at the top
        const hasBlocksAtTop = hasRegularBlocksAtTop || hasGarbageBlocksAtTop;
        
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
            
            // Sort garbage blocks by y-position (bottom to top) before updating
            // This ensures blocks at the bottom are processed first
            this.playerState.garbageBlocks.sort((a, b) => b.y - a.y);
            
            // Update garbage blocks
            this.updateGarbageBlocks(this.playerState, currentTime);
            
            // Place pending garbage blocks if there are no falling blocks
            if (this.playerState.fallingBlocks.size === 0 && this.playerState.pendingGarbage.length > 0) {
                this.placeGarbageBlocks(this.playerState);
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
            
            // Sort garbage blocks by y-position (bottom to top) before updating
            // This ensures blocks at the bottom are processed first
            this.aiState.garbageBlocks.sort((a, b) => b.y - a.y);
            
            // Update garbage blocks
            this.updateGarbageBlocks(this.aiState, currentTime);
            
            // Place pending garbage blocks if there are no falling blocks
            if (this.aiState.fallingBlocks.size === 0 && this.aiState.pendingGarbage.length > 0) {
                this.placeGarbageBlocks(this.aiState);
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
        
        // Draw player garbage blocks
        this.drawGarbageBlocks(this.playerCtx, this.playerState, currentTime);
        
        this.drawPreviewRow(this.playerCtx, this.playerState);
        this.drawFloatingScores(this.playerCtx, this.playerState, currentTime);
        this.drawMatchCountPopups(this.playerCtx, this.playerState, currentTime);
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
        
        // Draw AI garbage blocks
        this.drawGarbageBlocks(this.aiCtx, this.aiState, currentTime);
        
        this.drawPreviewRow(this.aiCtx, this.aiState);
        this.drawFloatingScores(this.aiCtx, this.aiState, currentTime);
        this.drawMatchCountPopups(this.aiCtx, this.aiState, currentTime);
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
        this.gameOverTitle.textContent = winner === 'player' ? 'YOU WIN!' : winner === 'ai' ? 'YOU LOSE!' : 'DRAW!';
        this.gameOverTitle.style.color = winner === 'player' ? '#4a90e2' : winner === 'ai' ? '#e24a4a' : '#ffd93d';
        this.gameOverMessage.textContent = winner === 'player' ? 'The AI couldn\'t keep up with your skills!' : winner === 'ai' ? 'The AI has defeated you this time!' : 'Both you and the AI reached the top at the same time!';
        
        this.finalPlayerScoreDisplay.textContent = this.playerState.score;
        this.finalAiScoreDisplay.textContent = this.aiState.score;
        this.finalDifficultyDisplay.textContent = this.speedState.difficulty.toUpperCase();
        
        // Show the modal
        this.gameOverModal.style.display = 'block';
    }
    
    resetGame() {
        // Hide the modal
        this.gameOverModal.style.display = 'none';
        
        // Get current saved speed setting
        const savedSpeed = parseInt(localStorage.getItem('gameSpeed')) || 3;
        const savedDifficulty = localStorage.getItem('gameDifficulty') || 'easy';
        const savedAiDifficulty = parseInt(localStorage.getItem('aiDifficulty')) || 2;
        
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
            matchCountPopups: [],
            fallingFromChain: false,
            garbageBlocks: [],      // Array to store active garbage blocks
            pendingGarbage: [],     // Queue of garbage blocks waiting to be dropped
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
            matchCountPopups: [],
            fallingFromChain: false,
            garbageBlocks: [],      // Array to store active garbage blocks
            pendingGarbage: [],     // Queue of garbage blocks waiting to be dropped
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
        this.ai.setDifficulty(savedAiDifficulty);
        
        // Reset grids and preview rows
        this.initGrids();
        this.generatePreviewRows();
        
        // Reset UI
        this.playerScoreDisplay.textContent = '0';
        this.aiScoreDisplay.textContent = '0';
        
        // Reset timer
        this.timerState = {
            startTime: performance.now(),
            currentTime: 0,
            isRunning: true
        };
        this.timerDisplay.textContent = '00:00';
        
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
        this.speedDisplay.textContent = this.speedState.currentSpeed;
        this.difficultyDisplay.textContent = this.speedState.difficulty.toUpperCase();
        
        // Update AI difficulty display
        const aiDifficultyLabels = {
            1: 'VERY EASY',
            2: 'EASY',
            3: 'NORMAL',
            4: 'HARD',
            5: 'VERY HARD'
        };
        
        if (this.ai && this.aiDifficultyDisplay) {
            this.aiDifficultyDisplay.textContent = aiDifficultyLabels[this.ai.difficultyLevel] || 'NORMAL';
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
        this.timerDisplay.textContent = formattedTime;
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

        // Special AI theme with robot/tech emojis
        this.aiThemeSymbols = {
            'fire': '🤖', 'water': '💻', 'earth': '🔋',
            'air': '📱', 'heart': '⚙️'
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
        
        // Special AI theme colors with tech-inspired colors
        this.aiThemeColors = {
            'fire': '#FF0055', 'water': '#00DDFF', 'earth': '#00FF66',
            'air': '#FFDD00', 'heart': '#BB00FF'
        };
    }
    
    updateTheme(theme) {
        // For player blocks, use the selected theme
        this.playerBlockSymbols = this.themeSymbols[theme];
        this.playerBlockColors = this.themeColors[theme];
        
        // For AI blocks, always use the AI theme
        this.aiBlockSymbols = this.aiThemeSymbols;
        this.aiBlockColors = this.aiThemeColors;
        
        // Update the body class for background styling
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