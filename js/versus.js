import { GRID_X, GRID_Y, ELEMENTS, BLOCK_SIZE, GAP, GRID_PADDING, GAME_PADDING } from './config.js';
import { audioManager } from './audio.js';
import { AIPlayer } from './ai-player.js';

class VersusGame {
    constructor() {
        console.log("Initializing Versus game");
        
        // Default theme
        this.currentTheme = 'theme-elements';
        
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
            },
            // Garbage block tracking
            garbageBlocks: [],
            pendingGarbage: []
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
            },
            // Garbage block tracking
            garbageBlocks: [],
            pendingGarbage: []
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
    
    // Generate garbage blocks based on combo size or chain level
    generateGarbage(matchSize, chainLevel) {
        let garbageConfigs = [];
        
        // Generate garbage based on combo size (match size)
        if (matchSize >= 4 && chainLevel === 0) {
            // Rules for combos
            switch(matchSize) {
                case 4: // 3-wide block
                    garbageConfigs.push({ width: 3, height: 1 });
                    break;
                case 5: // 4-wide block
                    garbageConfigs.push({ width: 4, height: 1 });
                    break;
                case 6: // 5-wide block
                    garbageConfigs.push({ width: 5, height: 1 });
                    break;
                case 7: // 6-wide block (same as 2x chain)
                    garbageConfigs.push({ width: 6, height: 1 });
                    break;
                case 8: // Two blocks, 3-wide and 4-wide
                    garbageConfigs.push({ width: 3, height: 1 });
                    garbageConfigs.push({ width: 4, height: 1 });
                    break;
                case 9: // Two 4-wide blocks
                    garbageConfigs.push({ width: 4, height: 1 });
                    garbageConfigs.push({ width: 4, height: 1 });
                    break;
                default: // 10+ combos, two 6-wide blocks
                    if (matchSize >= 10) {
                        garbageConfigs.push({ width: 6, height: 1 });
                        garbageConfigs.push({ width: 6, height: 1 });
                    }
                    break;
            }
        } 
        // Generate garbage based on chain level
        else if (chainLevel > 0) {
            // Rules for chains
            switch(chainLevel) {
                case 1: // 1x chain - now generates a 2-wide × 2-tall block
                    garbageConfigs.push({ width: 2, height: 2 });
                    break;
                case 2: // 2x chain - 6-wide block
                    garbageConfigs.push({ width: 6, height: 1 });
                    break;
                case 3: // 3x chain - 2-tall block
                    garbageConfigs.push({ width: GRID_X, height: 2 });
                    break;
                case 4: // 4x chain - 3-tall block
                    garbageConfigs.push({ width: GRID_X, height: 3 });
                    break;
                default: // 5+ chain - 4-tall block
                    if (chainLevel >= 5) {
                        garbageConfigs.push({ width: GRID_X, height: 4 });
                    }
                    break;
            }
        }
        
        return garbageConfigs;
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
        
        // Check if either position is inside a garbage block
        const isPos1Garbage = this.isPositionInsideGarbage(gameState, x1, y);
        const isPos2Garbage = this.isPositionInsideGarbage(gameState, x2, y);
        
        // Don't allow swapping if either block is locked, any blocks are falling, or positions overlap with garbage
        if (isBlock1Locked || isBlock2Locked || isPos1Garbage || isPos2Garbage || gameState.fallingBlocks.size > 0) {
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
            // First check if any of these matches should clear garbage blocks
            if (gameState.garbageBlocks.length > 0) {
                this.checkGarbageClearing(gameState, matches);
            }
            
            // Then remove the matches normally
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

        // Check if any matches are adjacent to garbage blocks
        if (gameState.garbageBlocks.length > 0) {
            this.checkGarbageClearing(gameState, matches);
        }

        // Generate garbage blocks and send to opponent
        // Generate garbage blocks and send to opponent
        if (matches.length >= 4 || (isChain && gameState.chainCounter >= 1)) {
            // Get the opponent's state
            const opponentState = gameState === this.playerState ? this.aiState : this.playerState;
            
            // Generate garbage based on match size or chain level
            const garbageConfigs = this.generateGarbage(matches.length, isChain ? gameState.chainCounter : 0);
            
            // Add garbage to opponent's pending queue if there are valid configs
            if (garbageConfigs.length > 0) {
                // Add garbage indicator effect
                this.showGarbageIndicator(opponentState, garbageConfigs);
                
                // Add to opponent's pending garbage with a slight delay
                setTimeout(() => {
                    garbageConfigs.forEach(config => {
                        opponentState.pendingGarbage.push({
                            ...config,
                            state: 'pending',
                            createdAt: performance.now()
                        });
                    });
                }, 1000); // Delay before garbage appears
            }
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
                const currentBlock = gameState.grid[y][x];
                
                // Skip angry blocks - they should stay fixed in position
                if (currentBlock && typeof currentBlock === 'object' && currentBlock.state === 'angry') {
                    continue;
                }
                
                if (currentBlock && !gameState.grid[y + 1][x]) {
                    // Found a block that can fall
                    let fallDistance = 1;
                    let targetY = y + 1;
                    
                    // Check initial position - if there's a garbage block here already, this block can't fall
                    let positionBlockedByGarbage = this.isPositionInsideGarbage(gameState, x, targetY);
                    if (positionBlockedByGarbage) {
                        continue; // Can't fall
                    }
                    
                    // Find how far it can fall, stopping at angry blocks
                    while (targetY + 1 < GRID_Y && !gameState.grid[targetY + 1][x]) {
                        // Before increasing the fall distance, check if there's a garbage block in the way
                        if (this.isPositionInsideGarbage(gameState, x, targetY + 1)) {
                            break; // Stop at this position, can't fall further
                        }
                        
                        // Check if there's an angry block below
                        const blockBelow = gameState.grid[targetY + 1][x];
                        if (blockBelow && typeof blockBelow === 'object' && blockBelow.state === 'angry') {
                            break; // Stop at this position, can't fall through an angry block
                        }
                        
                        fallDistance++;
                        targetY++;
                    }
                    
                    // Create falling block object
                    const block = {
                        type: typeof currentBlock === 'object' ? currentBlock.type : currentBlock,
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
        
        // Check if garbage blocks should fall too
        const garbageFell = this.dropGarbageBlocks(gameState);
        blocksFell = blocksFell || garbageFell;
        
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
        // Process all falling blocks regardless of angry blocks elsewhere        
        if (gameState.fallingBlocks.size === 0) return;
        
        let allBlocksLanded = true;
        const fallDuration = 300; // Duration of fall animation in ms (matching garbage blocks)
        
        gameState.fallingBlocks.forEach(key => {
            const [x, targetY] = key.split(',').map(Number);
            const block = gameState.grid[targetY][x];
            
            // Skip if the block doesn't exist or isn't in a falling state
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
                // Use easing for smoother acceleration (matching garbage blocks)
                const easedProgress = this.easeInOutQuad(progress);
                
                // Update block position with easing (matching garbage style)
                const newY = block.startY + easedProgress * (block.targetY - block.startY);
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
        
        // Handle falling blocks
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
        } else if (blockState === 'angry') {
            const progress = (currentTime - block.animationStart) / 300;
            
            // Add subtle shaking animation
            const shakeIntensity = 2;
            const shakeX = Math.sin(progress * Math.PI * 6) * shakeIntensity;
            const shakeY = Math.cos(progress * Math.PI * 5) * shakeIntensity;
            
            // Apply the shake
            ctx.translate(shakeX, shakeY);
            
            // Add glow effect
            ctx.shadowColor = 'rgba(255, 0, 0, 0.8)';
            ctx.shadowBlur = 8;
            
            // If the block has an angriness value, apply it
            if (block.angriness !== undefined) {
                // Darker fill for angry blocks
                const color = this.getBlockColor(blockType, isAiBlock);
                ctx.fillStyle = this.adjustColorBrightness(color, -20); // Make color darker
            }
        }
        
        ctx.beginPath();
        ctx.roundRect(xPos, yPos, BLOCK_SIZE, BLOCK_SIZE, 8);
        ctx.fill();
        
        // Draw the appropriate symbol based on the block type and state
        if (blockState === 'angry') {
            // For angry blocks, draw an angry face emoji
            ctx.font = '30px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = 'white';
            
            // Apply subtle shake to the emoji too
            const progress = (currentTime - block.animationStart) / 300;
            const shakeIntensity = 1;
            const shakeX = Math.sin(progress * Math.PI * 6) * shakeIntensity;
            const shakeY = Math.cos(progress * Math.PI * 5) * shakeIntensity;
            
            // Draw angry face
            ctx.fillText('😠', centerX + shakeX, centerY + shakeY);
        } else {
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
                    
                    // Fade and float up
                    const floatY = -progress * 8;
                    ctx.fillStyle = `rgba(255, 255, 255, ${1 - progress})`;
                    ctx.fillText(symbol, centerX, centerY + floatY);
                } else {
                    // Normal symbol with shadow
                    ctx.fillStyle = 'white';
                    // Add shadow for normal symbols (matching game.js style)
                    ctx.shadowColor = 'rgba(0,0,0,0.8)';
                    ctx.shadowBlur = 4;
                    ctx.shadowOffsetX = 2;
                    ctx.shadowOffsetY = 2;
                    ctx.fillText(symbol, centerX, centerY);
                }
            }
        }
        
        // Restore the context to avoid affecting other drawing operations
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
        
        // Move all garbage blocks up
        for (const garbage of gameState.garbageBlocks) {
            // Only move non-falling garbage blocks
            if (garbage.state !== 'falling') {
                garbage.y--;
                
                // If a garbage block moves into a negative position, it's game over
                if (garbage.y < 0) {
                    // Check if this will cause blocks to go above the top of the grid
                    this.checkDangerState(gameState);
                }
            }
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
        
        // Check for garbage blocks at the top row, but ONLY include settled ones (not falling)
        const hasGarbageAtTop = gameState.garbageBlocks.some(garbage => 
            garbage.y <= 0 && garbage.state !== 'falling'
        );
        
        // Player is in danger if either blocks or settled garbage are at the top
        const inDanger = hasBlocksAtTop || hasGarbageAtTop;
        
        if (inDanger && !gameState.dangerState.active) {
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
        } else if (inDanger && gameState.dangerState.active && gameState.dangerState.isFinalWarning) {
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
        } else if (!inDanger && gameState.dangerState.active && gameState.dangerState.isFinalWarning) {
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
            
            // Update falling garbage blocks
            this.updateFallingGarbage(this.playerState, currentTime);
            
            // Process pending garbage for player
            this.processGarbage(this.playerState, currentTime);
            
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
            
            // Update falling garbage blocks
            this.updateFallingGarbage(this.aiState, currentTime);
            
            // Process pending garbage for AI
            this.processGarbage(this.aiState, currentTime);
            
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
        
        // Draw player garbage blocks
        for (const garbageBlock of this.playerState.garbageBlocks) {
            this.drawGarbageBlock(this.playerCtx, garbageBlock, this.playerState);
        }
        
        this.drawPreviewRow(this.playerCtx, this.playerState);
        this.drawFloatingScores(this.playerCtx, this.playerState, currentTime);
        this.drawMatchCountPopups(this.playerCtx, this.playerState, currentTime);
        this.drawChainIndicator(this.playerCtx, this.playerState, currentTime);
        this.drawGarbageIndicator(this.playerCtx, this.playerState);
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
        for (const garbageBlock of this.aiState.garbageBlocks) {
            this.drawGarbageBlock(this.aiCtx, garbageBlock, this.aiState);
        }
        
        this.drawPreviewRow(this.aiCtx, this.aiState);
        this.drawFloatingScores(this.aiCtx, this.aiState, currentTime);
        this.drawMatchCountPopups(this.aiCtx, this.aiState, currentTime);
        this.drawChainIndicator(this.aiCtx, this.aiState, currentTime);
        this.drawGarbageIndicator(this.aiCtx, this.aiState);
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
            },
            // Garbage block tracking
            garbageBlocks: [],
            pendingGarbage: []
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
            },
            // Garbage block tracking
            garbageBlocks: [],
            pendingGarbage: []
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
        // Store the current theme name
        this.currentTheme = theme;
        
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

    // Show visual indicator that garbage is coming for a player
    showGarbageIndicator(targetState, garbageConfigs) {
        // Calculate total width and height of incoming garbage
        let totalWidth = 0;
        let totalHeight = 0;
        
        garbageConfigs.forEach(config => {
            totalWidth += config.width;
            totalHeight += config.height;
        });
        
        // Create garbage indicator
        targetState.garbageIndicator = {
            active: true,
            startTime: performance.now(),
            duration: 1000, // 1 second indicator
            configs: garbageConfigs,
            totalWidth,
            totalHeight
        };
    }

    drawGarbageIndicator(ctx, gameState) {
        if (!gameState.garbageIndicator || !gameState.garbageIndicator.active) return;
        
        const currentTime = performance.now();
        const progress = (currentTime - gameState.garbageIndicator.startTime) / gameState.garbageIndicator.duration;
        
        if (progress >= 1) {
            gameState.garbageIndicator.active = false;
            return;
        }
        
        // Design: Red warning at the top of the play area indicating incoming garbage
        ctx.save();
        
        // Flashing animation
        const opacity = 0.5 + Math.sin(progress * Math.PI * 6) * 0.4;
        
        // Draw red warning band at top
        ctx.fillStyle = `rgba(255, 0, 0, ${opacity})`;
        ctx.fillRect(0, 0, this.baseWidth, 20);
        
        // Draw info about incoming garbage
        const totalConfigs = gameState.garbageIndicator.configs.length;
        const totalWidthText = gameState.garbageIndicator.totalWidth;
        const totalHeightText = gameState.garbageIndicator.totalHeight;
        
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = 'bold 12px Arial';
        ctx.fillStyle = 'white';
        
        // Text warning
        if (totalHeightText > 1) {
            // For taller blocks
            ctx.fillText(`⚠️ ${totalHeightText} ROW GARBAGE! ⚠️`, this.baseWidth / 2, 10);
        } else {
            // For wider blocks
            const blockText = totalConfigs > 1 ? `${totalConfigs} BLOCKS` : `${totalWidthText}-WIDE`;
            ctx.fillText(`⚠️ ${blockText} ⚠️`, this.baseWidth / 2, 10);
        }
        
        ctx.restore();
    }
    
    // Process and drop pending garbage blocks onto the grid
    processGarbage(gameState, currentTime) {
        // Return if no pending garbage
        if (gameState.pendingGarbage.length === 0) return;
        
        // Don't drop garbage if blocks are falling or if there are active matches
        if (gameState.fallingBlocks.size > 0) return;
        
        // Don't drop garbage if another garbage block is already falling
        const hasFallingGarbage = gameState.garbageBlocks.some(garbage => garbage.state === 'falling');
        if (hasFallingGarbage) return;
        
        // Check for any blocks in matching or popping state
        const hasActiveMatches = gameState.grid.some(row => 
            row.some(block => 
                block && 
                typeof block === 'object' && 
                (block.state === 'matching' || block.state === 'popping')
            )
        );
        
        if (hasActiveMatches) return;
        
        // Get the first garbage block from the queue
        const garbageBlock = gameState.pendingGarbage.shift();
        
        // Try different starting positions to avoid overlapping with existing garbage blocks
        const possibleStartPositions = [];
        
        if (garbageBlock.width < GRID_X) {
            // Calculate all possible starting positions
            const maxStart = GRID_X - garbageBlock.width;
            for (let startX = 0; startX <= maxStart; startX++) {
                // Check if this position would overlap with any existing garbage block
                let overlapsExisting = false;
                
                // Check each existing garbage block
                for (const existingGarbage of gameState.garbageBlocks) {
                    // Check for horizontal overlap
                    const horizontalOverlap = !(
                        startX + garbageBlock.width <= existingGarbage.x ||
                        startX >= existingGarbage.x + existingGarbage.width
                    );
                    
                    if (horizontalOverlap) {
                        overlapsExisting = true;
                        break;
                    }
                }
                
                if (!overlapsExisting) {
                    possibleStartPositions.push(startX);
                }
            }
        }
        
        // Choose a starting position
        let startX = 0;
        if (possibleStartPositions.length > 0) {
            // If we have non-overlapping positions, choose one randomly
            const randomIndex = Math.floor(Math.random() * possibleStartPositions.length);
            startX = possibleStartPositions[randomIndex];
        } else if (garbageBlock.width < GRID_X) {
            // If all positions overlap, just choose a random position
            const maxStart = GRID_X - garbageBlock.width;
            startX = Math.floor(Math.random() * (maxStart + 1));
        }
        
        // Find the target Y position (where the garbage will land)
        let targetY = GRID_Y - garbageBlock.height; // Default to bottom
        
        // First check for collision with existing blocks in the grid
        let foundCollision = false;
        let collisionY = GRID_Y;
        
        // Check for collisions with grid blocks
        for (let y = 0; y < GRID_Y; y++) {
            let rowHasBlock = false;
            for (let x = startX; x < startX + garbageBlock.width; x++) {
                if (gameState.grid[y][x]) {
                    rowHasBlock = true;
                    foundCollision = true;
                    collisionY = Math.min(collisionY, y);
                    break;
                }
            }
            if (rowHasBlock) break;
        }
        
        // Also check for collisions with other garbage blocks
        for (const otherGarbage of gameState.garbageBlocks) {
            if (otherGarbage.state === 'falling') continue; // Skip other falling garbage
            
            // Check if horizontal positions overlap
            const horizontalOverlap = !(
                startX + garbageBlock.width <= otherGarbage.x || 
                startX >= otherGarbage.x + otherGarbage.width
            );
            
            if (horizontalOverlap) {
                // Calculate the top position of this garbage block
                const otherGarbageTop = otherGarbage.y;
                
                if (otherGarbageTop < collisionY) {
                    collisionY = otherGarbageTop;
                    foundCollision = true;
                }
            }
        }
        
        // Set the target Y based on collision detection
        if (foundCollision) {
            targetY = Math.max(0, collisionY - garbageBlock.height);
        }
        
        // Create the garbage block
        const newGarbage = {
            ...garbageBlock,
            x: startX,
            y: 0, // Start at the top
            state: 'falling',
            fallStart: currentTime,
            targetY: targetY, // Where it will land
            currentY: 0,
            clearProgress: 0,
            // Store the element type index instead of a fixed color
            colorIndex: Math.floor(Math.random() * 5) // 5 = number of elements in each theme
        };
        
        // Add the garbage block to the game state
        gameState.garbageBlocks.push(newGarbage);
        
        // Play garbage sound effect
        if (audioManager) {
            audioManager.playSound('garbageDrop');
        }
        
        console.log("Garbage block added to", gameState === this.aiState ? "AI" : "Player");
    }
    
    // Shift the grid up to make room for garbage
    shiftGridUpForGarbage(gameState, garbageHeight) {
        // Move everything up by garbage height
        for (let y = garbageHeight; y < GRID_Y; y++) {
            for (let x = 0; x < GRID_X; x++) {
                // Move blocks up
                gameState.grid[y - garbageHeight][x] = gameState.grid[y][x];
            }
        }
        
        // Clear the bottom rows where garbage will be placed
        for (let y = GRID_Y - garbageHeight; y < GRID_Y; y++) {
            for (let x = 0; x < GRID_X; x++) {
                gameState.grid[y][x] = null;
            }
        }
        
        // Move cursor up by garbage height (with bounds checking)
        gameState.cursorY = Math.max(0, gameState.cursorY - garbageHeight);
        
        // Check danger state immediately after shifting
        this.checkDangerState(gameState);
    }
    
    // Draw a garbage block on the grid
    drawGarbageBlock(ctx, garbageBlock, gameState) {
        try {
            ctx.save();
            
            // Calculate position
            const xPos = GRID_PADDING + (garbageBlock.x * (BLOCK_SIZE + GAP));
            
            // Use currentY for animation if the block is falling
            let yPosition = garbageBlock.y;
            if (garbageBlock.state === 'falling' && typeof garbageBlock.currentY !== 'undefined') {
                yPosition = garbageBlock.currentY;
            }
            
            const yPos = GRID_PADDING + ((yPosition - gameState.risingState.offset) * (BLOCK_SIZE + GAP));
            
            // Calculate garbage size
            const width = (garbageBlock.width * BLOCK_SIZE) + ((garbageBlock.width - 1) * GAP);
            const height = (garbageBlock.height * BLOCK_SIZE) + ((garbageBlock.height - 1) * GAP);
            
            // Check for danger state animation
            const currentTime = performance.now();
            
            // Only apply danger state if the garbage is settled (not falling)
            // AND if it's in the danger zone (top 3 rows) or if there's a final warning
            if (gameState.dangerState.active && garbageBlock.state !== 'falling') {
                if (gameState.dangerState.isFinalWarning) {
                    // Final warning - affect ALL blocks with pulsing effect
                    const dangerProgress = (currentTime - gameState.dangerState.startTime) / 300; // 300ms per pulse
                    const dangerPulse = Math.sin(dangerProgress * Math.PI * 2) * 0.3 + 0.7;
                    
                    ctx.shadowColor = 'red';
                    ctx.shadowBlur = 20;
                    ctx.globalAlpha *= dangerPulse;
                } else if (yPosition < 3) {
                    // Normal danger state for top 3 rows
                    const dangerProgress = (currentTime - gameState.dangerState.startTime) / 300;
                    const dangerPulse = Math.sin(dangerProgress * Math.PI * 2) * 0.3 + 0.7;
                    
                    ctx.shadowColor = 'red';
                    ctx.shadowBlur = 20;
                    ctx.globalAlpha *= dangerPulse;
                }
            }
            
            // Get the color from the current theme using colorIndex
            let fillColor = 'rgba(150, 150, 150, 0.9)'; // Default fallback
            
            if (typeof garbageBlock.colorIndex === 'number') {
                // Get the colors from the current theme
                const isAiBlock = gameState === this.aiState;
                const themeColors = isAiBlock ? this.aiThemeColors : this.themeColors[this.currentTheme];
                
                if (themeColors) {
                    // Get all color values from the theme
                    const colorValues = Object.values(themeColors);
                    
                    // Use the colorIndex to select a specific color (with modulo for safety)
                    if (colorValues.length > 0) {
                        const index = garbageBlock.colorIndex % colorValues.length;
                        fillColor = colorValues[index];
                    }
                }
            } else if (garbageBlock.color) {
                // For backwards compatibility with existing garbage blocks
                fillColor = garbageBlock.color;
            }
            
            // Draw the garbage block
            ctx.fillStyle = fillColor;
            ctx.beginPath();
            ctx.roundRect(xPos, yPos, width, height, 4);
            ctx.fill();
            
            // Add a border - use default color for safety
            ctx.strokeStyle = 'rgba(100, 100, 100, 0.8)';
            ctx.lineWidth = 2;
            ctx.stroke();
            
            // Add a simple grid pattern
            ctx.strokeStyle = 'rgba(80, 80, 80, 0.5)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            
            // Draw vertical grid lines
            for (let x = 1; x < garbageBlock.width; x++) {
                const lineX = xPos + (x * (BLOCK_SIZE + GAP));
                ctx.moveTo(lineX, yPos);
                ctx.lineTo(lineX, yPos + height);
            }
            
            // Draw horizontal grid lines
            for (let y = 1; y < garbageBlock.height; y++) {
                const lineY = yPos + (y * (BLOCK_SIZE + GAP));
                ctx.moveTo(xPos, lineY);
                ctx.lineTo(xPos + width, lineY);
            }
            ctx.stroke();
            
            ctx.restore();
        } catch (error) {
            console.error("Error drawing garbage block:", error);
            // Restore the context to prevent state issues
            try { ctx.restore(); } catch {}
        }
    }
    
    // Helper method to adjust the brightness of a hex color
    adjustColorBrightness(hex, percent) {
        try {
            // Check if the hex string is valid
            if (!hex || typeof hex !== 'string' || !hex.startsWith('#') || hex.length !== 7) {
                return 'rgba(100, 100, 100, 0.8)'; // Return default if invalid
            }
            
            // Convert hex to RGB
            let r = parseInt(hex.slice(1, 3), 16);
            let g = parseInt(hex.slice(3, 5), 16);
            let b = parseInt(hex.slice(5, 7), 16);
            
            // Check if values are valid
            if (isNaN(r) || isNaN(g) || isNaN(b)) {
                return 'rgba(100, 100, 100, 0.8)'; // Return default if parse failed
            }

            // Adjust brightness
            r = Math.max(0, Math.min(255, r + percent));
            g = Math.max(0, Math.min(255, g + percent));
            b = Math.max(0, Math.min(255, b + percent));

            // Convert back to hex with proper formatting
            const rHex = Math.round(r).toString(16).padStart(2, '0');
            const gHex = Math.round(g).toString(16).padStart(2, '0');
            const bHex = Math.round(b).toString(16).padStart(2, '0');
            
            return `#${rHex}${gHex}${bHex}`;
        } catch (error) {
            console.error("Error adjusting color brightness:", error);
            return 'rgba(100, 100, 100, 0.8)'; // Return default if any error occurs
        }
    }
    
    // Returns a random color from the current theme
    getRandomThemeColor(isAiBlock) {
        try {
            // Default theme if none is set
            if (!this.currentTheme) {
                this.currentTheme = 'theme-elements';
            }
            
            // Determine which theme colors to use based on if it's an AI block
            const colors = isAiBlock ? this.aiThemeColors : this.themeColors[this.currentTheme];
            
            // Make sure we have valid colors
            if (!colors) {
                // Return a default color if theme colors are not available
                return 'rgba(150, 150, 150, 0.9)';
            }
            
            // Get all color values from the theme
            const colorValues = Object.values(colors);
            
            if (colorValues.length === 0) {
                return 'rgba(150, 150, 150, 0.9)';
            }
            
            // Return a random color from the available colors
            return colorValues[Math.floor(Math.random() * colorValues.length)];
        } catch (error) {
            console.error("Error getting random theme color:", error);
            return 'rgba(150, 150, 150, 0.9)';
        }
    }
    
    // Handle garbage block clearing when matches occur adjacent to it
    checkGarbageClearing(gameState, matches) {
        if (gameState.garbageBlocks.length === 0 || matches.length === 0) return;
        
        // Track which garbage blocks have been affected
        const affectedGarbage = new Set();
        
        // Check each match against each garbage block
        for (const match of matches) {
            for (let i = 0; i < gameState.garbageBlocks.length; i++) {
                const garbage = gameState.garbageBlocks[i];
                
                // Check if match is adjacent to garbage
                const isAdjacent = this.isMatchAdjacentToGarbage(match, garbage);
                
                if (isAdjacent) {
                    affectedGarbage.add(i);
                }
            }
        }
        
        // Process affected garbage (in reverse order to avoid index issues when removing)
        const affectedIndices = Array.from(affectedGarbage).sort((a, b) => b - a);
        
        for (const index of affectedIndices) {
            // Always clear the entire garbage block, regardless of height
            this.clearGarbageBlock(gameState, index);
        }
    }
    
    // Check if a match position is adjacent to a garbage block
    isMatchAdjacentToGarbage(match, garbage) {
        const { x, y } = match;
        
        // Check if match is directly adjacent (left, right, top, bottom) to the garbage
        const isAdjacentLeft = x === garbage.x - 1 && y >= garbage.y && y < garbage.y + garbage.height;
        const isAdjacentRight = x === garbage.x + garbage.width && y >= garbage.y && y < garbage.y + garbage.height;
        const isAdjacentTop = y === garbage.y - 1 && x >= garbage.x && x < garbage.x + garbage.width;
        const isAdjacentBottom = y === garbage.y + garbage.height && x >= garbage.x && x < garbage.x + garbage.width;
        
        return isAdjacentLeft || isAdjacentRight || isAdjacentTop || isAdjacentBottom;
    }
    
    /**
     * Helper method to ensure blocks near garbage are updated properly when the state changes
     * For example, when a garbage block is cleared and a floating block is above it,
     * this ensures the block starts falling to the new free position.
     */
    updateBlocksNearGarbage(gameState, garbageX, garbageY, garbageWidth, garbageHeight) {
        // Check blocks directly above the garbage
        for (let x = garbageX; x < garbageX + garbageWidth; x++) {
            // Start from the row just above the garbage
            const topRow = Math.max(0, garbageY - 1);
            if (topRow >= 0 && gameState.grid[topRow][x]) {
                // There's a block right above the garbage, queue it for falling check
                setTimeout(() => {
                    this.dropBlocks(gameState, false);
                }, 50);
                return; // Only need to trigger once
            }
        }
    }
    
    // Clear an entire garbage block and replace with normal blocks
    clearGarbageBlock(gameState, garbageIndex) {
        const garbage = gameState.garbageBlocks[garbageIndex];
        const garbageX = garbage.x;
        const garbageY = garbage.y;
        const garbageWidth = garbage.width;
        const garbageHeight = garbage.height;
        
        // Step 1: Transform garbage into angry blocks
        // Save original colorIndex for use in angry blocks
        const originalColorIndex = garbage.colorIndex;
        
        // Create angry blocks in place of the garbage
        for (let dy = 0; dy < garbage.height; dy++) {
            for (let dx = 0; dx < garbage.width; dx++) {
                const gridX = garbage.x + dx;
                const gridY = garbage.y + dy;
                
                // Make sure we're within grid bounds
                if (gridX >= 0 && gridX < GRID_X && gridY >= 0 && gridY < GRID_Y) {
                    // Create an angry block with the same color as the garbage
                    gameState.grid[gridY][gridX] = {
                        type: garbage.colorIndex, // Store the color index
                        state: 'angry',           // Special state for angry blocks
                        animationStart: performance.now(), // For animation timing
                        angriness: 1.0           // Will decrease as block transforms
                    };
                }
            }
        }
        
        // Remove the garbage block from the array
        gameState.garbageBlocks.splice(garbageIndex, 1);
        
        // Step 2: Schedule the conversion of angry blocks to normal blocks with delay
        let totalBlocks = garbageWidth * garbageHeight;
        let blocksConverted = 0;
        
        const convertAngryBlocks = () => {
            // Process one block at a time with visible delay
            let foundAngryBlock = false;
            
            // Scan from left to right, top to bottom instead of randomly
            for (let dy = 0; dy < garbageHeight; dy++) {
                for (let dx = 0; dx < garbageWidth; dx++) {
                    const gridX = garbageX + dx;
                    const gridY = garbageY + dy;
                    
                    // Make sure we're within grid bounds
                    if (gridX >= 0 && gridX < GRID_X && gridY >= 0 && gridY < GRID_Y) {
                        const block = gameState.grid[gridY][gridX];
                        
                        // Check if this is an angry block
                        if (block && typeof block === 'object' && block.state === 'angry') {
                            // Convert angry block to normal block
                            const randomElement = gameState.elements[Math.floor(Math.random() * gameState.elements.length)];
                            gameState.grid[gridY][gridX] = randomElement;
                            
                            // Play a conversion sound
                            audioManager.playSound('blockBreak', 0.3);
                            
                            blocksConverted++;
                            foundAngryBlock = true;
                            
                            // Break out of both loops
                            dy = garbageHeight;
                            break;
                        }
                    }
                }
            }
            
            // Schedule next conversion if there are still angry blocks to convert
            if (foundAngryBlock && blocksConverted < totalBlocks) {
                setTimeout(convertAngryBlocks, 300); // 150ms delay between conversions (was 50ms)
            } else {
                // All blocks converted, check for matches or falling blocks
                setTimeout(() => {
                    const newMatches = this.findMatches(gameState);
                    if (newMatches.length > 0) {
                        this.removeMatches(gameState, newMatches, false);
                    } else {
                        // If no matches, check if other garbage blocks should fall
                        this.dropGarbageBlocks(gameState);
                        // Also check if regular blocks should fall
                        this.dropBlocks(gameState, false);
                        // Ensure blocks above the cleared garbage begin falling
                        this.updateBlocksNearGarbage(gameState, garbageX, garbageY, garbageWidth, garbageHeight);
                    }
                }, 200); // Increased from 100ms
            }
        };
        
        // Start the conversion process after a longer delay to show angry blocks
        setTimeout(convertAngryBlocks, 400); // 400ms delay (was 200ms)
    }
    
    // Partially convert a garbage block, clearing one row from the bottom
    partiallyConvertGarbage(gameState, garbageIndex) {
        const garbage = gameState.garbageBlocks[garbageIndex];
        const originalHeight = garbage.height;
        
        // Increase clear progress (moves up one row)
        garbage.clearProgress = garbage.clearProgress || 0;
        garbage.clearProgress++;
        
        // Get the bottom row to convert
        const bottomY = garbage.y + garbage.height - garbage.clearProgress;
        
        // Step 1: Transform bottom row into angry blocks
        for (let dx = 0; dx < garbage.width; dx++) {
            const gridX = garbage.x + dx;
            
            // Make sure we're within grid bounds
            if (gridX >= 0 && gridX < GRID_X && bottomY >= 0 && bottomY < GRID_Y) {
                // Create an angry block with the same color as the garbage
                gameState.grid[bottomY][gridX] = {
                    type: garbage.colorIndex, // Store the color index
                    state: 'angry',          // Special state for angry blocks
                    animationStart: performance.now(), // For animation timing
                    angriness: 1.0          // Will decrease as block transforms
                };
            }
        }
        
        // Update the garbage block's size
        garbage.height--;
        
        // If fully cleared, remove it
        if (garbage.height <= 0) {
            const garbageX = garbage.x;
            const garbageY = garbage.y;
            const garbageWidth = garbage.width;
            gameState.garbageBlocks.splice(garbageIndex, 1);
        }
        
        // Step 2: Schedule the conversion of angry blocks to normal blocks with delay
        let totalBlocks = garbage.width;
        let blocksConverted = 0;
        
        const convertAngryBlocks = () => {
            // Process one block at a time with visible delay
            let foundAngryBlock = false;
            
            // Scan from left to right instead of randomly
            for (let dx = 0; dx < garbage.width; dx++) {
                const gridX = garbage.x + dx;
                
                // Make sure we're within grid bounds
                if (gridX >= 0 && gridX < GRID_X && bottomY >= 0 && bottomY < GRID_Y) {
                    const block = gameState.grid[bottomY][gridX];
                    
                    // Check if this is an angry block
                    if (block && typeof block === 'object' && block.state === 'angry') {
                        // Convert angry block to normal block
                        const randomElement = gameState.elements[Math.floor(Math.random() * gameState.elements.length)];
                        gameState.grid[bottomY][gridX] = randomElement;
                        
                        // Play a conversion sound
                        audioManager.playSound('blockBreak', 0.3);
                        
                        blocksConverted++;
                        foundAngryBlock = true;
                        break;
                    }
                }
            }
            
            // Schedule next conversion if there are still angry blocks to convert
            if (foundAngryBlock && blocksConverted < totalBlocks) {
                setTimeout(convertAngryBlocks, 150); // 150ms delay between conversions (was 50ms)
            } else {
                // All blocks converted, check for matches or falling blocks
                setTimeout(() => {
                    const newMatches = this.findMatches(gameState);
                    if (newMatches.length > 0) {
                        this.removeMatches(gameState, newMatches, false);
                    } else {
                        // If no matches, check if other garbage blocks should fall
                        this.dropGarbageBlocks(gameState);
                        // Also check if regular blocks should fall
                        this.dropBlocks(gameState, false);
                        
                        // Check if blocks above the garbage need to fall
                        if (originalHeight > garbage.height) {
                            this.updateBlocksNearGarbage(gameState, garbage.x, garbage.y, garbage.width, originalHeight);
                        }
                    }
                }, 200); // Increased from 100ms
            }
        };
        
        // Start the conversion process after a longer delay to show angry blocks
        setTimeout(convertAngryBlocks, 400); // 400ms delay (was 200ms)
    }

    updateFallingGarbage(gameState, currentTime) {
        // Process falling garbage blocks even if there are angry blocks elsewhere
        if (gameState.garbageBlocks.length === 0) return;
        
        const fallDuration = 300; // Duration of fall animation in ms (faster now)
        
        for (let i = 0; i < gameState.garbageBlocks.length; i++) {
            const garbage = gameState.garbageBlocks[i];
            
            if (garbage.state !== 'falling') continue;
            
            const progress = Math.min((currentTime - garbage.fallStart) / fallDuration, 1);
            
            if (progress >= 1) {
                // Garbage has finished falling
                garbage.y = garbage.targetY;
                garbage.currentY = garbage.targetY;
                garbage.state = 'active';
                
                // Play landing sound
                if (audioManager) {
                    audioManager.playSound('blockLand');
                }
                
                // Check if landing triggered other garbage to fall
                if (progress === 1) { // Only do this once when progress first hits 1
                    setTimeout(() => {
                        this.dropGarbageBlocks(gameState);
                        this.dropBlocks(gameState, false);
                    }, 50);
                }
            } else {
                // Use easing for smoother acceleration
                const easedProgress = this.easeInOutQuad(progress);
                
                // Calculate smooth position for falling, accounting for startY
                garbage.currentY = garbage.y + easedProgress * (garbage.targetY - garbage.y);
            }
        }
    }
    
    // Quadratic easing function for smoother animations
    easeInOutQuad(t) {
        return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    }

    dropGarbageBlocks(gameState) {
        let garbageFell = false;
        
        // First, identify stacks of garbage blocks
        const stacks = this.identifyGarbageStacks(gameState);
        
        // Process each stack
        for (const stackIndices of stacks) {
            // Sort by Y-position within the stack (bottom-most first)
            stackIndices.sort((a, b) => {
                const garbageA = gameState.garbageBlocks[a];
                const garbageB = gameState.garbageBlocks[b];
                return (garbageB.y + garbageB.height) - (garbageA.y + garbageA.height);
            });
            
            // Skip if any garbage in the stack is already falling
            if (stackIndices.some(i => gameState.garbageBlocks[i].state === 'falling')) {
                continue;
            }
            
            // Check if there's space below this stack
            let hasSpaceBelow = false;
            let maxFallDistance = Infinity; // Start with maximum possible distance
            
            // Check for each garbage block in the stack
            for (const garbageIndex of stackIndices) {
                const garbage = gameState.garbageBlocks[garbageIndex];
                
                // Check each column of this garbage block
                for (let x = garbage.x; x < garbage.x + garbage.width; x++) {
                    let fallDistance = 0;
                    
                    // Check how far this column can fall
                    const bottomY = garbage.y + garbage.height - 1;
                    let blocked = false;
                    
                    for (let y = bottomY + 1; y < GRID_Y; y++) {
                        // Stop if we hit a regular block or an angry block
                        const blockBelow = gameState.grid[y][x];
                        if (blockBelow) {
                            // Specifically check for angry blocks
                            if (typeof blockBelow === 'object' && blockBelow.state === 'angry') {
                                blocked = true;
                                break;
                            }
                            // Or any other block type
                            blocked = true;
                            break;
                        }
                        
                        // Check collision with any garbage block not in this stack
                        let collidesWithOtherGarbage = false;
                        for (let g = 0; g < gameState.garbageBlocks.length; g++) {
                            // Skip garbage blocks that are part of this stack
                            if (stackIndices.includes(g)) continue;
                            
                            const otherGarbage = gameState.garbageBlocks[g];
                            
                            // Check if this position is inside another garbage block
                            if (x >= otherGarbage.x && 
                                x < otherGarbage.x + otherGarbage.width && 
                                y >= otherGarbage.y && 
                                y < otherGarbage.y + otherGarbage.height) {
                                collidesWithOtherGarbage = true;
                                break;
                            }
                        }
                        
                        if (collidesWithOtherGarbage) {
                            blocked = true;
                            break;
                        }
                        
                        fallDistance++;
                    }
                    
                    if (blocked && fallDistance === 0) {
                        // This column can't fall at all, so the stack can't fall
                        hasSpaceBelow = false;
                        maxFallDistance = 0;
                        break;
                    }
                    
                    hasSpaceBelow = true;
                    // Track the smallest fall distance among all columns
                    if (fallDistance < maxFallDistance) {
                        maxFallDistance = fallDistance;
                    }
                }
                
                // If this garbage block can't fall, the whole stack can't fall
                if (!hasSpaceBelow || maxFallDistance === 0) {
                    break;
                }
            }
            
            // If there's space below, make the entire stack fall together
            if (hasSpaceBelow && maxFallDistance > 0) {
                const fallStart = performance.now();
                
                // Make all garbage blocks in the stack fall together
                for (const index of stackIndices) {
                    const garbage = gameState.garbageBlocks[index];
                    garbage.state = 'falling';
                    garbage.fallStart = fallStart; // Same start time for synchronized falling
                    garbage.targetY = garbage.y + maxFallDistance;
                    garbage.currentY = garbage.y;
                }
                
                garbageFell = true;
            }
        }
        
        return garbageFell;
    }
    
    // Helper function to identify stacks of garbage blocks
    identifyGarbageStacks(gameState) {
        const stacks = [];
        const processed = new Set();
        
        // For each garbage block
        for (let i = 0; i < gameState.garbageBlocks.length; i++) {
            // Skip if already processed
            if (processed.has(i)) continue;
            
            // Start a new stack with this garbage block
            const stack = [i];
            processed.add(i);
            
            // Find all other garbage blocks in this stack
            this.findGarbageInStack(gameState, i, stack, processed);
            
            // Add the complete stack
            stacks.push(stack);
        }
        
        return stacks;
    }
    
    // Recursively find garbage blocks that are part of the same stack
    findGarbageInStack(gameState, garbageIndex, stack, processed) {
        const garbage = gameState.garbageBlocks[garbageIndex];
        
        // Look at all other garbage blocks
        for (let i = 0; i < gameState.garbageBlocks.length; i++) {
            // Skip if already in a stack
            if (processed.has(i) || i === garbageIndex) continue;
            
            const otherGarbage = gameState.garbageBlocks[i];
            
            // Check if directly stacked (one on top of the other)
            // We only consider vertical stacking, not horizontal adjacency
            // This allows garbage blocks to fall independently even if they're horizontally adjacent
            const isDirectlyAbove = 
                otherGarbage.y + otherGarbage.height === garbage.y && // otherGarbage sits directly on top of garbage
                this.garbageBlocksFullyOverlap(otherGarbage, garbage);
                
            const isDirectlyBelow = 
                garbage.y + garbage.height === otherGarbage.y && // garbage sits directly on top of otherGarbage
                this.garbageBlocksFullyOverlap(garbage, otherGarbage);
            
            if (isDirectlyAbove || isDirectlyBelow) {
                // Add to stack and mark as processed
                stack.push(i);
                processed.add(i);
                
                // Recursively find more connected blocks
                this.findGarbageInStack(gameState, i, stack, processed);
            }
        }
    }
    
    // Check if two garbage blocks fully overlap horizontally (stricter than partial overlap)
    garbageBlocksFullyOverlap(garbage1, garbage2) {
        // For blocks to be considered in the same vertical stack, they must have the same width 
        // and be perfectly aligned horizontally (same x-coordinate)
        return garbage1.x === garbage2.x && garbage1.width === garbage2.width;
    }
    
    // Check if two garbage blocks overlap horizontally
    garbageBlocksOverlap(garbage1, garbage2) {
        return !(
            garbage1.x + garbage1.width <= garbage2.x || 
            garbage1.x >= garbage2.x + garbage2.width
        );
    }

    isPositionInsideGarbage(gameState, x, y) {
        for (const garbage of gameState.garbageBlocks) {
            if (x >= garbage.x && x < garbage.x + garbage.width &&
                y >= garbage.y && y < garbage.y + garbage.height) {
                return true;
            }
        }
        return false;
    }

    // Helper method to check if there are any angry blocks in the grid
    hasAngryBlocks(gameState) {
        // Check the grid for any blocks with state 'angry'
        for (let y = 0; y < GRID_Y; y++) {
            for (let x = 0; x < GRID_X; x++) {
                const block = gameState.grid[y][x];
                if (block && typeof block === 'object' && block.state === 'angry') {
                    return true;
                }
            }
        }
        return false;
    }
}

// Start game when page loads
window.addEventListener('load', () => {
    new VersusGame();
});