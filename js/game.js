import { 
    GRID_X, GRID_Y, BLOCK_SIZE, GAP, GRID_PADDING,
    DEFAULT_SPEED, DEFAULT_DIFFICULTY,
    SPEED_SETTINGS, DIFFICULTY_MULTIPLIERS,
    BACKGROUND_SETTINGS,
    SWAP_ANIMATION_DURATION,
    MATCH_FLASH_DURATION,
    POP_ANIMATION_DURATION,
    FALL_ANIMATION_DURATION,
    FLOATING_SCORE_DURATION,
    MATCH_COUNT_POPUP_DURATION,
    CHAIN_DISPLAY_DURATION,
    CHAIN_TIMEOUT,
    FPS_SAMPLE_SIZE,
    FALL_SPEED,
    MANUAL_RISING_SPEED,
    UI_SETTINGS,
    BLOCK_CORNER_RADIUS,
    CURSOR_CORNER_RADIUS,
    CURSOR_GLOW_RADIUS,
    CURSOR_PADDING,
    CURSOR_GLOW_PADDING,
    BLOCK_SHADOW_BLUR,
    BLOCK_SHADOW_OFFSET,
    PREVIEW_ROW_OPACITY,
    BLOCK_FONT_SIZE,
    BLOCK_FONT_FAMILY,
    FLOATING_SCORE_FONT_SIZE,
    CHAIN_MULTIPLIER_FONT_SIZE,
    MATCH_COUNT_FONT_SIZE,
    CHAIN_DISPLAY_FONT_SIZE,
    DANGER_PULSE_DURATION,
    ANIMATION_EFFECTS,
    GAME_RULES,
    DANGER_WARNING_DURATIONS
} from './config.js';
import { audioManager } from './audio.js';

class CanvasGame {
    constructor() {
        // Canvas setup
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Background canvas setup
        this.bgCanvas = document.getElementById('bgCanvas');
        this.bgCtx = this.bgCanvas.getContext('2d');
        
        // Add timing and interpolation properties
        this.frameCount = 0;
        this.frameTimes = new Array(FPS_SAMPLE_SIZE).fill(0); // For FPS smoothing
        this.rafId = null;
        
        // Initialize background effect arrays
        this.backgroundEmojis = [];
        this.particles = [];
        
        // Base dimensions (logical size)
        this.baseWidth = (GRID_X * BLOCK_SIZE) + ((GRID_X - 1) * GAP) + (GRID_PADDING * 2);
        this.baseHeight = (GRID_Y * BLOCK_SIZE) + ((GRID_Y - 1) * GAP) + (GRID_PADDING * 2);
        
        // Get saved settings
        const savedSpeed = parseInt(localStorage.getItem('gameSpeed')) || DEFAULT_SPEED;
        const savedDifficulty = localStorage.getItem('gameDifficulty') || DEFAULT_DIFFICULTY;
        
        // Game state initialization
        this.grid = [];
        this.cursorX = 0;
        this.cursorY = 0;
        this.score = 0;
        this.isSwapping = false;
        this.gameOver = false;
        this.elements = ['fire', 'water', 'earth', 'air', 'heart'];
        
        // Load high score for current difficulty
        const difficultyKey = `highScore_${savedDifficulty}`;
        this.highScore = parseInt(localStorage.getItem(difficultyKey)) || 0;
        document.getElementById('highScoreValue').textContent = this.highScore;
        
        // Initialize timer state
        this.timerState = {
            startTime: performance.now(),
            currentTime: 0,
            isRunning: false
        };

        // Difficulty multipliers for speed increase
        this.difficultyMultipliers = DIFFICULTY_MULTIPLIERS;

        // Speed progression tracking
        this.speedState = {
            initialSpeed: savedSpeed,
            currentSpeed: savedSpeed,
            difficulty: savedDifficulty,
            lastSpeedIncrease: performance.now(),
            baseIncreaseInterval: SPEED_SETTINGS.BASE_INCREASE_INTERVAL,
            baseSpeedIncrease: SPEED_SETTINGS.BASE_SPEED_INCREASE
        };
        
        // Falling state tracking
        this.fallingBlocks = new Set();
        this.lastFrameTime = performance.now();
        this.fallSpeed = FALL_SPEED;
        
        // Rising state initialization
        this.risingState = {
            offset: 0,
            startTime: performance.now(),
            speed: this.calculateRisingSpeed(this.speedState.currentSpeed),
            nextRow: [],
            previewRow: []
        };
        
        // Initialize scale and resize
        this.scale = 1;
        this.resize();
        
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
        
        // Add chain tracking
        this.chainCounter = 0;
        this.chainTimer = null;
        
        // Add floating scores array
        this.floatingScores = [];
        
        // Add match count pop-ups array
        this.matchCountPopups = [];
        
        // Add flag to track if blocks are falling from a chain
        this.fallingFromChain = false;
        
        // Add chain display state
        this.chainDisplay = {
            active: false,
            startTime: 0,
            duration: 1000,
            value: 0
        };
        
        // Add danger state tracking
        this.dangerState = {
            active: false,
            startTime: 0,
            warningDuration: DANGER_WARNING_DURATIONS[savedDifficulty],
            isFinalWarning: false
        };

        // Add manual rising state
        this.manualRising = false;
        this.manualRisingSpeed = MANUAL_RISING_SPEED;
        
        // Initialize game components in order
        this.initGrid();                // First create the grid
        this.generatePreviewRow();      // Then generate preview row
        this.setupEventListeners();     // Set up input handlers
        
        // Add swap animation state
        this.swapState = {
            isAnimating: false,
            startTime: 0,
            duration: SWAP_ANIMATION_DURATION,
            x1: 0,
            x2: 0,
            y: 0,
            block1: null,
            block2: null
        };
        
        // Initialize audio
        this.initAudio();
        
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
        this.rafId = requestAnimationFrame(() => this.gameLoop());
    }
    
    resize() {
        // Calculate available width (accounting for margins and padding)
        const totalAvailableWidth = window.innerWidth - UI_SETTINGS.MARGIN_HORIZONTAL;
        
        // Limit max width while allowing it to grow with screen size
        const maxWidth = Math.min(UI_SETTINGS.MAX_GAME_WIDTH, totalAvailableWidth);
        
        // Calculate available height (accounting for UI elements)
        const availableHeight = window.innerHeight - UI_SETTINGS.MARGIN_VERTICAL;
        
        // Calculate maximum scale that fits in available space
        const maxScaleX = maxWidth / this.baseWidth;
        const maxScaleY = availableHeight / this.baseHeight;
        
        // Set minimum and maximum scales
        const minScale = UI_SETTINGS.MIN_SCALE;
        const maxScale = UI_SETTINGS.MAX_SCALE;
        
        // Calculate optimal scale
        this.scale = Math.min(maxScaleX, maxScaleY, maxScale);
        this.scale = Math.max(this.scale, minScale);
        
        // Set canvas size
        this.canvas.width = this.baseWidth * this.scale;
        this.canvas.height = this.baseHeight * this.scale;
        
        // Apply the same scaling to the background canvas
        this.bgCanvas.width = window.innerWidth;
        this.bgCanvas.height = window.innerHeight;
        
        // Enable smooth scaling
        this.ctx.imageSmoothingEnabled = true;
        this.bgCtx.imageSmoothingEnabled = true;
        
        // Set transforms for both contexts
        this.ctx.setTransform(this.scale, 0, 0, this.scale, 0, 0);
    }
    
    initGrid() {
        this.grid = new Array(GRID_Y);
        for (let y = 0; y < GRID_Y; y++) {
            this.grid[y] = new Array(GRID_X);
            for (let x = 0; x < GRID_X; x++) {
                if (y >= GRID_Y / 2) {
                    let attempts = 0, color;
                    do {
                        color = this.elements[Math.floor(Math.random() * this.elements.length)];
                        attempts++;
                        if (attempts > GAME_RULES.MAX_BLOCK_ATTEMPTS) break;
                    } while (
                        (x >= 2 && color === this.grid[y][x-1] && color === this.grid[y][x-2]) ||
                        (y >= 2 && color === this.grid[y-1][x] && color === this.grid[y-2][x])
                    );
                    this.grid[y][x] = color;
                } else {
                    this.grid[y][x] = null;
                }
            }
        }

        // Start the timer when game starts
        this.timerState.startTime = performance.now();
        this.timerState.isRunning = true;
    }
    
    setupEventListeners() {
        // Keyboard controls
        document.addEventListener('keydown', (e) => {
            if (this.isSwapping || this.gameOver) {
                if (e.code === 'Space' && this.gameOver) {
                    this.resetGame();
                }
                return;
            }
            
            switch(e.key) {
                case 'ArrowLeft':
                    if (this.cursorX > 0) this.cursorX--;
                    break;
                case 'ArrowRight':
                    if (this.cursorX < GRID_X - 2) this.cursorX++;
                    break;
                case 'ArrowUp':
                    if (this.cursorY > 0) this.cursorY--;
                    break;
                case 'ArrowDown':
                    if (this.cursorY < GRID_Y - 1) this.cursorY++;
                    break;
                case ' ':
                    this.swapBlocks();
                    break;
                case 'Shift':
                    // Start manual rising when Shift is pressed
                    this.manualRising = true;
                    break;
            }
        });
        
        // Add key up handler for Shift
        document.addEventListener('keyup', (e) => {
            if (e.key === 'Shift') {
                this.manualRising = false;
            }
        });

        // Prevent context menu on right click
        this.canvas.addEventListener('contextmenu', (e) => {
            e.preventDefault();
        });

        // Handle right mouse button down
        this.canvas.addEventListener('mousedown', (e) => {
            if (e.button === 2) { // Right mouse button
                this.manualRising = true;
            }
        });

        // Handle right mouse button up
        this.canvas.addEventListener('mouseup', (e) => {
            if (e.button === 2) { // Right mouse button
                this.manualRising = false;
            }
        });

        // Also stop manual rising if mouse leaves the canvas
        this.canvas.addEventListener('mouseleave', () => {
            if (this.manualRising) {
                this.manualRising = false;
            }
        });
        
        // Updated mouse controls with scaling and rising offset
        this.canvas.addEventListener('mousemove', (e) => {
            if (this.gameOver) return;
            const rect = this.canvas.getBoundingClientRect();
            const x = (e.clientX - rect.left) / this.scale - GRID_PADDING;
            const y = (e.clientY - rect.top) / this.scale - GRID_PADDING;
            
            // Add the rising offset when converting mouse position to grid coordinates
            const gridX = Math.floor(x / (BLOCK_SIZE + GAP));
            const gridY = Math.floor(y / (BLOCK_SIZE + GAP) + this.risingState.offset);
            
            if (gridX >= 0 && gridX < GRID_X - 1 && gridY >= 0 && gridY < GRID_Y) {
                this.cursorX = gridX;
                this.cursorY = gridY;
            }
        });
        
        this.canvas.addEventListener('click', () => {
            if (!this.isSwapping && !this.gameOver) {
                this.swapBlocks();
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
        
        // Window resize handler
        window.addEventListener('resize', () => this.resize());
    }
    
    drawBlock(x, y, block) {
        if (!block) return;
        
        let drawX = x;
        let drawY = y;
        const blockType = typeof block === 'object' ? block.type : block;
        const blockState = typeof block === 'object' ? block.state : null;
        
        // Apply rising offset
        drawY -= this.risingState.offset;
        
        // Use requestAnimationFrame timestamp for smoother animations
        const currentTime = performance.now();
        
        if (blockState === 'falling') {
            // For falling blocks, use the currentY relative to grid position
            drawY = block.currentY - this.risingState.offset;
        }
        
        if (this.swapState.isAnimating && y === this.swapState.y) {
            const progress = (currentTime - this.swapState.startTime) / this.swapState.duration;
            const easedProgress = 0.5 - Math.cos(progress * Math.PI) / 2;
            
            if (x === this.swapState.x1 && this.swapState.block1) {
                drawX = x + easedProgress;
            } else if (x === this.swapState.x2 && this.swapState.block2) {
                drawX = x - easedProgress;
            }
        }
        
        // Calculate precise pixel positions once
        const xPos = Math.round(GRID_PADDING + (drawX * (BLOCK_SIZE + GAP)));
        const yPos = Math.round(GRID_PADDING + (drawY * (BLOCK_SIZE + GAP)));
        const centerX = Math.round(xPos + (BLOCK_SIZE/2));
        const centerY = Math.round(yPos + (BLOCK_SIZE/2));
        
        // Add danger animation for ALL blocks when in final warning
        if (this.dangerState.active && this.dangerState.isFinalWarning) {
            const dangerProgress = (currentTime - this.dangerState.startTime) / DANGER_PULSE_DURATION;
            const dangerPulse = Math.sin(dangerProgress * Math.PI * 2) * 
                ((ANIMATION_EFFECTS.DANGER_PULSE_MAX - ANIMATION_EFFECTS.DANGER_PULSE_MIN) / 2) + 
                ANIMATION_EFFECTS.DANGER_PULSE_MIN;
            
            this.ctx.save();
            this.ctx.shadowColor = 'red';
            this.ctx.shadowBlur = ANIMATION_EFFECTS.DANGER_SHADOW_BLUR;
            this.ctx.globalAlpha *= dangerPulse;
        } else if (y < GAME_RULES.DANGER_TOP_ROWS && this.dangerState.active) {
            // Normal danger state for top rows
            const dangerProgress = (currentTime - this.dangerState.startTime) / DANGER_PULSE_DURATION;
            const dangerPulse = Math.sin(dangerProgress * Math.PI * 2) * 
                ((ANIMATION_EFFECTS.DANGER_PULSE_MAX - ANIMATION_EFFECTS.DANGER_PULSE_MIN) / 2) + 
                ANIMATION_EFFECTS.DANGER_PULSE_MIN;
            
            this.ctx.save();
            this.ctx.shadowColor = 'red';
            this.ctx.shadowBlur = ANIMATION_EFFECTS.DANGER_SHADOW_BLUR;
            this.ctx.globalAlpha *= dangerPulse;
        }
        
        // Draw block background with animation effects
        this.ctx.fillStyle = this.getBlockColor(blockType);
        
        if (blockState === 'matching') {
            const progress = (currentTime - block.animationStart) / POP_ANIMATION_DURATION;
            
            // Gentle glow effect
            this.ctx.shadowColor = this.getBlockColor(blockType);
            this.ctx.shadowBlur = ANIMATION_EFFECTS.MATCH_SHADOW_BLUR;
            
            // Subtle pulse that doesn't go too transparent
            const alpha = ANIMATION_EFFECTS.MATCH_ALPHA_MIN + 
                Math.sin(progress * Math.PI * 4) * 
                (ANIMATION_EFFECTS.MATCH_ALPHA_MAX - ANIMATION_EFFECTS.MATCH_ALPHA_MIN);
            this.ctx.globalAlpha = alpha;
            
            // Very subtle scale pulse
            const scale = ANIMATION_EFFECTS.MATCH_SCALE_MIN + 
                Math.sin(progress * Math.PI * 4) * 
                (ANIMATION_EFFECTS.MATCH_SCALE_MAX - ANIMATION_EFFECTS.MATCH_SCALE_MIN);
            this.ctx.translate(centerX, centerY);
            this.ctx.scale(scale, scale);
            this.ctx.translate(-centerX, -centerY);
        } else if (blockState === 'popping') {
            const progress = (currentTime - block.animationStart) / 300;
            
            // Enhanced popping animation
            this.ctx.save();
            
            // Create a more interesting scale effect
            const scaleBase = 1 - progress;
            const scaleX = scaleBase * (1 + Math.sin(progress * Math.PI * 3) * 0.3);
            const scaleY = scaleBase * (1 + Math.cos(progress * Math.PI * 2) * 0.3);
            
            // Add a slight rotation for more dynamic feel
            const rotation = progress * Math.PI * 0.5; // quarter turn
            
            // Add vibrant glow effect that intensifies during pop
            const glowIntensity = Math.sin(progress * Math.PI) * 15;
            this.ctx.shadowColor = this.getBlockColor(blockType);
            this.ctx.shadowBlur = glowIntensity;
            
            // Fade out with a non-linear curve for more visual interest
            const alpha = Math.cos(progress * Math.PI/2);
            
            // Apply transformations
            this.ctx.translate(centerX, centerY);
            this.ctx.rotate(rotation);
            this.ctx.scale(scaleX, scaleY);
            this.ctx.translate(-centerX, -centerY);
            this.ctx.globalAlpha = alpha;
            
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
                    
                    this.ctx.beginPath();
                    this.ctx.fillStyle = `rgba(255, 255, 255, ${sparkleOpacity})`;
                    this.ctx.arc(sparkleX, sparkleY, sparkleSize, 0, Math.PI * 2);
                    this.ctx.fill();
                }
            }
        }
        
        this.ctx.beginPath();
        this.ctx.roundRect(xPos, yPos, BLOCK_SIZE, BLOCK_SIZE, BLOCK_CORNER_RADIUS);
        this.ctx.fill();
        
        // Reset effects
        if (blockState === 'matching') {
            this.ctx.setTransform(this.scale, 0, 0, this.scale, 0, 0);
            this.ctx.shadowColor = 'transparent';
            this.ctx.shadowBlur = 0;
        }
        
        this.ctx.globalAlpha = 1;

        // Draw symbol with gentler animation
        const symbol = this.blockSymbols[blockType];
        if (symbol) {
            this.ctx.font = `${BLOCK_FONT_SIZE}px ${BLOCK_FONT_FAMILY}`;
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            
            if (blockState === 'matching') {
                const progress = (currentTime - block.animationStart) / 300;
                
                // Gentle floating motion
                const floatY = Math.sin(progress * Math.PI * 4) * 2;
                
                // Add soft white glow to the symbol
                this.ctx.shadowColor = 'white';
                this.ctx.shadowBlur = 8;
                this.ctx.fillStyle = 'white';
                this.ctx.fillText(symbol, centerX, centerY + floatY);
            } else if (blockState === 'popping') {
                const progress = (currentTime - block.animationStart) / 300;
                
                // Enhanced symbol animation for popping
                const symbolScale = 1.2 - progress * 0.5;
                const symbolOpacity = 1 - progress * 1.5; // Fade out faster than block
                
                if (symbolOpacity > 0) {
                    // Add vibrant glow to the symbol
                    this.ctx.shadowColor = 'white';
                    this.ctx.shadowBlur = 12 * (1 - progress);
                    this.ctx.fillStyle = `rgba(255, 255, 255, ${symbolOpacity})`;
                    
                    // Scale and drift the symbol upward slightly
                    const driftY = -progress * 10;
                    
                    this.ctx.font = `${30 * symbolScale}px Arial`;
                    this.ctx.fillText(symbol, centerX, centerY + driftY);
                }
            } else {
                // Normal emoji rendering
                this.ctx.shadowColor = 'rgba(0,0,0,0.8)';
                this.ctx.shadowBlur = BLOCK_SHADOW_BLUR;
                this.ctx.shadowOffsetX = BLOCK_SHADOW_OFFSET;
                this.ctx.shadowOffsetY = BLOCK_SHADOW_OFFSET;
                this.ctx.fillStyle = 'white';
                this.ctx.fillText(symbol, centerX, centerY);
            }
            
            // Reset shadow settings
            this.ctx.shadowColor = 'transparent';
            this.ctx.shadowBlur = 0;
            this.ctx.shadowOffsetX = 0;
            this.ctx.shadowOffsetY = 0;
        }

        // Reset transformations
        if (blockState === 'popping') {
            this.ctx.restore();
            this.ctx.setTransform(this.scale, 0, 0, this.scale, 0, 0);
        }

        if ((this.dangerState.active && this.dangerState.isFinalWarning) || 
            (y < GAME_RULES.DANGER_TOP_ROWS && this.dangerState.active)) {
            this.ctx.restore();
        }
    }
    
    drawCursor() {
        const xPos = GRID_PADDING + (this.cursorX * (BLOCK_SIZE + GAP));
        const yPos = GRID_PADDING + ((this.cursorY - this.risingState.offset) * (BLOCK_SIZE + GAP));
        
        // Draw cursor
        this.ctx.strokeStyle = 'white';
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();
        this.ctx.roundRect(xPos - CURSOR_PADDING, yPos - CURSOR_PADDING, 
            (BLOCK_SIZE * 2) + GAP + (CURSOR_PADDING * 2), 
            BLOCK_SIZE + (CURSOR_PADDING * 2), CURSOR_CORNER_RADIUS);
        this.ctx.stroke();
        
        // Draw cursor glow
        this.ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.roundRect(xPos - CURSOR_GLOW_PADDING, yPos - CURSOR_GLOW_PADDING, 
            (BLOCK_SIZE * 2) + GAP + (CURSOR_GLOW_PADDING * 2), 
            BLOCK_SIZE + (CURSOR_GLOW_PADDING * 2), CURSOR_GLOW_RADIUS);
        this.ctx.stroke();
    }
    
    getBlockColor(element) {
        // Use cached colors
        return this.blockColors[element] || '#ffffff';
    }
    
    swapBlocks() {
        const x1 = this.cursorX;
        const x2 = this.cursorX + 1;
        const y = this.cursorY;
        
        // Get blocks at swap positions
        const block1 = this.grid[y][x1];
        const block2 = this.grid[y][x2];
        
        // Check if either block is in matching, popping, or falling state
        const isBlock1Locked = block1 && typeof block1 === 'object' && 
            (block1.state === 'matching' || block1.state === 'popping' || block1.state === 'falling');
        const isBlock2Locked = block2 && typeof block2 === 'object' && 
            (block2.state === 'matching' || block2.state === 'popping' || block2.state === 'falling');
        
        // Don't allow swapping if either block is locked or if any blocks are falling
        if (isBlock1Locked || isBlock2Locked || this.fallingBlocks.size > 0) {
            return;
        }
        
        // Set up swap animation
        this.swapState = {
            isAnimating: true,
            startTime: performance.now(),
            duration: SWAP_ANIMATION_DURATION,
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
        [this.grid[y][x1], this.grid[y][x2]] = [this.grid[y][x2], this.grid[y][x1]];
        
        // Check for matches after animation completes
        setTimeout(() => {
            this.swapState.isAnimating = false;
            
            // If either position is now empty, start dropping blocks
            if (!this.grid[y][x1] || !this.grid[y][x2]) {
                this.dropBlocks();
            } else {
                this.checkMatches();
            }
        }, SWAP_ANIMATION_DURATION);
    }
    
    findMatches() {
        const matches = new Set();
        
        // Horizontal matches
        for (let y = 0; y < GRID_Y; y++) {
            let count = 1;
            for (let x = 1; x < GRID_X; x++) {
                if (this.grid[y][x] && 
                    this.grid[y][x] === this.grid[y][x-1]) {
                    count++;
                } else {
                    if (count >= GAME_RULES.MIN_MATCH_SIZE) {
                        for (let i = x - count; i < x; i++) {
                            matches.add(`${i},${y}`);
                        }
                    }
                    count = 1;
                }
            }
            // Check end of row
            if (count >= GAME_RULES.MIN_MATCH_SIZE) {
                for (let i = GRID_X - count; i < GRID_X; i++) {
                    matches.add(`${i},${y}`);
                }
            }
        }
        
        // Vertical matches
        for (let x = 0; x < GRID_X; x++) {
            let count = 1;
            for (let y = 1; y < GRID_Y; y++) {
                if (this.grid[y][x] && 
                    this.grid[y][x] === this.grid[y-1][x]) {
                    count++;
                } else {
                    if (count >= GAME_RULES.MIN_MATCH_SIZE) {
                        for (let i = y - count; i < y; i++) {
                            matches.add(`${x},${i}`);
                        }
                    }
                    count = 1;
                }
            }
            // Check end of column
            if (count >= GAME_RULES.MIN_MATCH_SIZE) {
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

    addFloatingScore(x, y, baseScore, chainLevel) {
        const multiplier = chainLevel > 0 ? Math.pow(2, chainLevel) : 1;
        const totalScore = baseScore * multiplier;
        
        // Calculate screen position
        const screenX = GRID_PADDING + (x * (BLOCK_SIZE + GAP)) + BLOCK_SIZE/2;
        const screenY = GRID_PADDING + (y * (BLOCK_SIZE + GAP)) + BLOCK_SIZE/2;
        
        this.floatingScores.push({
            baseScore,
            multiplier,
            totalScore,
            x: screenX,
            y: screenY,
            startTime: performance.now(),
            duration: FLOATING_SCORE_DURATION,
            opacity: 1
        });
    }

    addMatchCountPopup(x, y, matchCount) {
        // Only show for matches of 4 or more
        if (matchCount < 4) return;
        
        // Calculate screen position (center of the matched blocks)
        const screenX = GRID_PADDING + (x * (BLOCK_SIZE + GAP)) + BLOCK_SIZE/2;
        const screenY = GRID_PADDING + (y * (BLOCK_SIZE + GAP)) + BLOCK_SIZE/2;
        
        this.matchCountPopups.push({
            count: matchCount,
            x: screenX,
            y: screenY,
            startTime: performance.now(),
            duration: MATCH_COUNT_POPUP_DURATION,
            opacity: 1
        });
    }

    drawFloatingScores(currentTime) {
        this.floatingScores = this.floatingScores.filter(score => {
            const progress = (currentTime - score.startTime) / score.duration;
            if (progress >= 1) return false;
            
            const y = score.y - (progress * 50); // Float upward
            const opacity = 1 - progress;
            
            this.ctx.save();
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            
            if (score.multiplier > 1) {
                // Draw total score first (centered)
                this.ctx.font = `bold ${FLOATING_SCORE_FONT_SIZE}px "Press Start 2P"`;
                this.ctx.fillStyle = `rgba(255,180,0,${opacity})`;
                this.ctx.fillText(`${score.totalScore}`, score.x, y);
                
                // Draw chain multiplier to the right and slightly up
                this.ctx.font = `bold ${CHAIN_MULTIPLIER_FONT_SIZE}px "Press Start 2P"`;
                this.ctx.fillStyle = `rgba(255,220,0,${opacity})`;
                this.ctx.fillText(`×${score.multiplier}`, score.x + 80, y - 10);
            } else {
                // Just draw the score for non-chain matches
                this.ctx.font = `bold ${MATCH_COUNT_FONT_SIZE}px "Press Start 2P"`;
                this.ctx.fillStyle = `rgba(255,255,255,${opacity})`;
                this.ctx.fillText(`${score.baseScore}`, score.x, y);
            }
            
            this.ctx.restore();
            return true;
        });
    }

    drawMatchCountPopups(currentTime) {
        this.matchCountPopups = this.matchCountPopups.filter(popup => {
            const progress = (currentTime - popup.startTime) / popup.duration;
            if (progress >= 1) return false;
            
            this.ctx.save();
            
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
            this.ctx.translate(popup.x, popup.y);
            this.ctx.rotate(rotation);
            this.ctx.scale(scale, scale);
            
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
            this.ctx.shadowColor = color;
            this.ctx.shadowBlur = 10;
            
            // Draw rounded rectangle box
            this.ctx.fillStyle = `rgba(0,0,0,${opacity * 0.7})`;
            this.ctx.beginPath();
            this.ctx.roundRect(-boxWidth/2, -boxHeight/2, boxWidth, boxHeight, 8);
            this.ctx.fill();
            
            // Add border
            this.ctx.strokeStyle = color;
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
            
            // Draw number
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.font = 'bold 24px "Press Start 2P"';
            
            // Draw text
            this.ctx.fillStyle = color;
            this.ctx.fillText(`${popup.count}`, 0, 0);
            
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
                    
                    this.ctx.fillStyle = `rgba(255,255,255,${particleOpacity})`;
                    this.ctx.beginPath();
                    this.ctx.arc(particleX, particleY, particleSize, 0, Math.PI * 2);
                    this.ctx.fill();
                }
            }
            
            this.ctx.restore();
            return true;
        });
    }

    drawChainIndicator(currentTime) {
        if (!this.chainDisplay.active) return;
        
        const progress = (currentTime - this.chainDisplay.startTime) / this.chainDisplay.duration;
        if (progress >= 1) {
            this.chainDisplay.active = false;
            return;
        }

        // Scale up quickly then slowly fade out
        const scale = progress < 0.3 
            ? 1 + (progress * 3.33) // Scale up in first 30%
            : 2 - (progress * 0.5); // Slowly scale down
            
        const opacity = progress < 0.3 
            ? 1 
            : 1 - ((progress - 0.3) / 0.7); // Fade out after peak

        this.ctx.save();
        
        // Center of the game area
        const centerX = this.baseWidth / 2;
        const centerY = this.baseHeight / 2;
        
        this.ctx.translate(centerX, centerY);
        this.ctx.scale(scale, scale);
        
        // Draw chain number
        this.ctx.font = `bold ${CHAIN_DISPLAY_FONT_SIZE}px "Press Start 2P"`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        
        // Glow effect
        this.ctx.shadowColor = 'rgba(255, 220, 0, 0.8)';
        this.ctx.shadowBlur = 20;
        
        // Main text
        this.ctx.fillStyle = `rgba(255, 220, 0, ${opacity})`;
        this.ctx.fillText(`CHAIN`, 0, -30);
        this.ctx.fillText(`×${Math.pow(2, this.chainDisplay.value)}`, 0, 30);
        
        // Outline
        this.ctx.lineWidth = 3;
        this.ctx.strokeStyle = `rgba(255, 255, 255, ${opacity})`;
        this.ctx.strokeText(`CHAIN`, 0, -30);
        this.ctx.strokeText(`×${Math.pow(2, this.chainDisplay.value)}`, 0, 30);
        
        this.ctx.restore();
    }

    removeMatches(matches, isChain = false) {
        if (matches.length === 0) {
            this.isSwapping = false;
            // Reset chain counter if no new matches
            if (!isChain) {
                this.chainCounter = 0;
            }
            return;
        }

        // Clear existing chain timer if it exists
        if (this.chainTimer) {
            clearTimeout(this.chainTimer);
        }

        // Play match size sound effect
        audioManager.playMatchSound(matches.length, false);

        // Increment chain counter if this is part of a chain
        if (isChain) {
            this.chainCounter++;
            
            // Play chain sound based on chain level
            if (this.chainCounter >= 1) {
                audioManager.playChainSound(this.chainCounter, false);
            }
            
            // Activate chain display
            this.chainDisplay = {
                active: true,
                startTime: performance.now(),
                duration: 1000,
                value: this.chainCounter
            };
        } else {
            this.chainCounter = 0;
        }

        // Calculate score and add floating score display
        const matchScore = this.calculateMatchScore(matches.length, this.chainCounter);
        const baseScore = this.calculateMatchScore(matches.length, 0); // Score without chain multiplier
        
        // Add floating score at the center of the match
        const centerMatch = matches[Math.floor(matches.length / 2)];
        this.addFloatingScore(centerMatch.x, centerMatch.y, baseScore, this.chainCounter);
        
        // Add match count popup for matches of 4 or more
        if (matches.length >= 4) {
            this.addMatchCountPopup(centerMatch.x, centerMatch.y, matches.length);
        }
        
        this.score += matchScore;
        document.getElementById('scoreValue').textContent = this.score;

        // Check and update high score if needed
        const difficultyKey = `highScore_${this.speedState.difficulty}`;
        const currentHighScore = parseInt(localStorage.getItem(difficultyKey)) || 0;
        if (this.score > currentHighScore) {
            localStorage.setItem(difficultyKey, this.score);
            this.highScore = this.score;
            document.getElementById('highScoreValue').textContent = this.score;
        }

        // First phase: Flash the blocks
        matches.forEach(({x, y}) => {
            if (this.grid[y][x]) {
                this.grid[y][x] = {
                    type: this.grid[y][x],
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
                    if (this.grid[y][x]) {
                        this.grid[y][x] = {
                            type: this.grid[y][x].type,
                            state: 'popping',
                            animationStart: performance.now()
                        };
                        audioManager.playPopSound(false);
                    }
                }, index * POP_ANIMATION_DURATION);
                
                setTimeout(() => {
                    if (this.grid[y][x]) {
                        this.grid[y][x] = null;
                    }
                    
                    if (index === matches.length - 1) {
                        // After last block is removed, start dropping and check for chains
                        this.dropBlocks(true); // Pass true to indicate checking for chains
                    }
                }, index * POP_ANIMATION_DURATION + POP_ANIMATION_DURATION);
            });
        }, MATCH_FLASH_DURATION);

        // Set chain timer to reset counter if no new matches occur
        this.chainTimer = setTimeout(() => {
            this.chainCounter = 0;
        }, CHAIN_TIMEOUT);
    }
    
    checkMatches() {
        const matches = this.findMatches();
        if (matches.length > 0) {
            this.removeMatches(matches);
        } else {
            this.isSwapping = false;
        }
    }
    
    generatePreviewRow() {
        this.risingState.previewRow = [];
        for (let x = 0; x < GRID_X; x++) {
            let attempts = 0, color;
            do {
                color = this.elements[Math.floor(Math.random() * this.elements.length)];
                attempts++;
                if (attempts > GAME_RULES.MAX_BLOCK_ATTEMPTS) break;
            } while (
                // Check horizontal matches within preview row
                (x >= 2 && color === this.risingState.previewRow[x-1] && 
                 color === this.risingState.previewRow[x-2]) ||
                // Check vertical matches with existing grid
                (this.grid[GRID_Y-1] && this.grid[GRID_Y-2] && 
                 color === this.getBlockType(this.grid[GRID_Y-1][x]) &&
                 color === this.getBlockType(this.grid[GRID_Y-2][x]))
            );
            this.risingState.previewRow[x] = color;
        }
    }
    
    // Helper method to safely get block type regardless of block format
    getBlockType(block) {
        if (!block) return null;
        return typeof block === 'object' ? block.type : block;
    }
    
    updateRising(currentTime) {
        // Don't rise if blocks are falling or if there are active matches
        if (this.fallingBlocks.size > 0) return;
        
        // Check for any blocks in matching or popping state
        const hasActiveMatches = this.grid.some(row => 
            row.some(block => 
                block && 
                typeof block === 'object' && 
                (block.state === 'matching' || block.state === 'popping')
            )
        );
        
        if (hasActiveMatches) return;
        
        // Calculate elapsed time since last frame in seconds
        const deltaTime = (currentTime - this.lastFrameTime) / 1000;
        
        // Only prevent manual rising during final warning state
        const canManualRise = this.manualRising && !(this.dangerState.active && this.dangerState.isFinalWarning);
        
        // Use whichever speed is faster: manual or natural
        const currentSpeed = canManualRise ? 
            Math.max(this.manualRisingSpeed, this.risingState.speed) : 
            this.risingState.speed;
        
        // Calculate new offset based on speed
        this.risingState.offset += currentSpeed * deltaTime;
        
        // When offset reaches or exceeds 1, shift the grid up
        if (this.risingState.offset >= 1) {
            this.shiftGridUp();
            this.risingState.offset = 0;
            this.risingState.startTime = currentTime;
        }
    }
    
    shiftGridUp() {
        // Shift all rows up
        for (let y = 0; y < GRID_Y - 1; y++) {
            this.grid[y] = [...this.grid[y + 1]];
        }
        
        // Add new row at bottom from preview
        this.grid[GRID_Y - 1] = [...this.risingState.previewRow];
        
        // Generate new preview row
        this.generatePreviewRow();
        
        // Move cursor up to follow blocks (unless at top)
        if (this.cursorY > 0) {
            this.cursorY--;
        }
        
        // Check for matches after shifting
        this.checkMatches();
    }
    
    drawPreviewRow() {
        for (let x = 0; x < GRID_X; x++) {
            const blockType = this.risingState.previewRow[x];
            
            // Calculate precise pixel positions once
            const xPos = Math.round(GRID_PADDING + (x * (BLOCK_SIZE + GAP)));
            const yPos = Math.round(GRID_PADDING + ((GRID_Y - this.risingState.offset) * (BLOCK_SIZE + GAP)));
            const centerX = Math.round(xPos + (BLOCK_SIZE/2));
            const centerY = Math.round(yPos + (BLOCK_SIZE/2));
            
            // Draw block with reduced opacity
            this.ctx.globalAlpha = PREVIEW_ROW_OPACITY;
            this.ctx.fillStyle = this.getBlockColor(blockType);
            this.ctx.beginPath();
            this.ctx.roundRect(xPos, yPos, BLOCK_SIZE, BLOCK_SIZE, BLOCK_CORNER_RADIUS);
            this.ctx.fill();
            
            // Draw symbol
            const symbol = this.blockSymbols[blockType];
            if (symbol) {
                this.ctx.font = `${BLOCK_FONT_SIZE}px ${BLOCK_FONT_FAMILY}`;
                this.ctx.textAlign = 'center';
                this.ctx.textBaseline = 'middle';
                
                // Add strong black shadow
                this.ctx.shadowColor = 'rgba(0,0,0,0.8)';
                this.ctx.shadowBlur = BLOCK_SHADOW_BLUR;
                this.ctx.shadowOffsetX = BLOCK_SHADOW_OFFSET;
                this.ctx.shadowOffsetY = BLOCK_SHADOW_OFFSET;
                
                this.ctx.fillStyle = 'white';
                this.ctx.fillText(symbol, centerX, centerY);
            }
            this.ctx.globalAlpha = 1;
        }
    }
    
    dropBlocks(checkForChains = false) {
        // Set falling from chain flag
        this.fallingFromChain = checkForChains;
        
        let blocksFell = false;
        
        // Check each column from bottom to top
        for (let x = 0; x < GRID_X; x++) {
            for (let y = GRID_Y - 2; y >= 0; y--) {
                if (this.grid[y][x] && !this.grid[y + 1][x]) {
                    // Found a block that can fall
                    let fallDistance = 1;
                    let targetY = y + 1;
                    
                    // Find how far it can fall
                    while (targetY + 1 < GRID_Y && !this.grid[targetY + 1][x]) {
                        fallDistance++;
                        targetY++;
                    }
                    
                    // Create falling block object
                    const block = {
                        type: typeof this.grid[y][x] === 'object' ? this.grid[y][x].type : this.grid[y][x],
                        state: 'falling',
                        startY: y,
                        targetY: targetY,
                        currentY: y,
                        fallStart: performance.now()
                    };
                    
                    // Update grid
                    this.grid[targetY][x] = block;
                    this.grid[y][x] = null;
                    this.fallingBlocks.add(`${x},${targetY}`);
                    blocksFell = true;
                }
            }
        }
        
        if (!blocksFell) {
            // If no blocks fell, check for matches
            const newMatches = this.findMatches();
            if (newMatches.length > 0) {
                // Only count as chain if we're checking for chains AND there was a previous match
                const isChainMatch = checkForChains && this.chainCounter > 0;
                this.removeMatches(newMatches, isChainMatch);
            } else {
                this.chainCounter = 0;
                this.isSwapping = false;
            }
        }
    }
    
    updateFallingBlocks(currentTime) {
        if (this.fallingBlocks.size === 0) return;
        
        let allBlocksLanded = true;
        
        this.fallingBlocks.forEach(key => {
            const [x, targetY] = key.split(',').map(Number);
            const block = this.grid[targetY][x];
            
            if (!block || block.state !== 'falling') {
                this.fallingBlocks.delete(key);
                return;
            }
            
            const progress = Math.min((currentTime - block.fallStart) / FALL_ANIMATION_DURATION, 1);
            
            if (progress >= 1) {
                // Block has finished falling
                this.grid[targetY][x] = block.type;
                this.fallingBlocks.delete(key);
            } else {
                // Update block position with clamping
                const newY = block.startY + (block.targetY - block.startY) * progress;
                block.currentY = Math.min(newY, block.targetY);
                allBlocksLanded = false;
            }
        });
        
        // Check for new matches after ALL blocks have landed
        if (allBlocksLanded && this.fallingBlocks.size === 0) {
            const newMatches = this.findMatches();
            if (newMatches.length > 0) {
                // Only count as chain if blocks were falling from a previous match
                this.removeMatches(newMatches, this.fallingFromChain);
            } else {
                this.chainCounter = 0;
                this.isSwapping = false;
            }
            // Reset the chain flag
            this.fallingFromChain = false;
        }
    }
    
    gameLoop() {
        if (this.gameOver) {
            return;  // Just return if game is over, modal will handle the display
        }

        const currentTime = performance.now();
        
        // Update speed based on elapsed time and difficulty
        this.updateGameSpeed(currentTime);
        
        // Update and draw background effects
        this.updateBackgroundEffects(currentTime);
        this.drawBackgroundEffects();
        
        // Calculate and smooth FPS
        const deltaTime = currentTime - this.lastFrameTime;
        this.frameTimes[this.frameCount % FPS_SAMPLE_SIZE] = deltaTime;
        this.frameCount++;
        
        // Update falling blocks
        this.updateFallingBlocks(currentTime);
        
        // Only update rising if no blocks are falling
        if (this.fallingBlocks.size === 0) {
            this.updateRising(currentTime);
        }
        
        // Update timer
        this.updateTimer(currentTime);
        
        // Clear the canvas
        this.ctx.clearRect(0, 0, this.baseWidth, this.baseHeight);
        
        // Save the current transform state and reset
        this.ctx.save();
        
        // Draw background
        this.ctx.fillStyle = 'rgba(0,0,0,0.3)';
        this.ctx.fillRect(0, 0, this.baseWidth, this.baseHeight);
        
        // Draw blocks
        for (let y = 0; y < GRID_Y; y++) {
            for (let x = 0; x < GRID_X; x++) {
                this.drawBlock(x, y, this.grid[y][x]);
            }
        }
        
        this.drawPreviewRow();
        this.drawFloatingScores(currentTime);
        this.drawMatchCountPopups(currentTime);
        this.drawChainIndicator(currentTime);
        this.drawCursor();
        
        // Restore the original transform state
        this.ctx.restore();
        
        this.lastFrameTime = currentTime;
        this.rafId = requestAnimationFrame(() => this.gameLoop());
        
        // Check danger state after updates
        this.checkDangerState();
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

        // Set up theme change listener
        this.themeSelect.addEventListener('change', (e) => {
            const newTheme = e.target.value;
            this.updateTheme(newTheme);
            localStorage.setItem('selectedTheme', newTheme);
            audioManager.updateThemeMusic(newTheme);
        });
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

    initBackgroundEffects() {
        // Use window dimensions instead of game dimensions
        this.bgCanvas.width = window.innerWidth;
        this.bgCanvas.height = window.innerHeight;
        
        const currentTheme = localStorage.getItem('selectedTheme') || 'theme-elements';
        const themeEmojis = Object.values(this.themeSymbols[currentTheme]);
        
        // Create floating emojis with pong-like movement
        for (let i = 0; i < BACKGROUND_SETTINGS.EMOJI_COUNT; i++) {
            this.backgroundEmojis.push({
                symbol: themeEmojis[i % themeEmojis.length],
                x: Math.random() * window.innerWidth,
                y: Math.random() * window.innerHeight,
                speedX: (Math.random() - 0.5) * BACKGROUND_SETTINGS.EMOJI_SPEED,
                speedY: (Math.random() - 0.5) * BACKGROUND_SETTINGS.EMOJI_SPEED,
                size: BACKGROUND_SETTINGS.MIN_EMOJI_SIZE + Math.random() * 
                    (BACKGROUND_SETTINGS.MAX_EMOJI_SIZE - BACKGROUND_SETTINGS.MIN_EMOJI_SIZE)
            });
        }

        // Create particles
        for (let i = 0; i < BACKGROUND_SETTINGS.PARTICLE_COUNT; i++) {
            this.particles.push({
                x: Math.random() * window.innerWidth,
                y: Math.random() * window.innerHeight,
                speed: BACKGROUND_SETTINGS.PARTICLE_MIN_SPEED + Math.random() * 
                    (BACKGROUND_SETTINGS.PARTICLE_MAX_SPEED - BACKGROUND_SETTINGS.PARTICLE_MIN_SPEED),
                size: BACKGROUND_SETTINGS.PARTICLE_MIN_SIZE + Math.random() * 
                    (BACKGROUND_SETTINGS.PARTICLE_MAX_SIZE - BACKGROUND_SETTINGS.PARTICLE_MIN_SIZE)
            });
        }
        
        // Handle window resize
        window.addEventListener('resize', () => {
            this.bgCanvas.width = window.innerWidth;
            this.bgCanvas.height = window.innerHeight;
        });
    }

    updateBackgroundEffects(currentTime) {
        // Update floating emojis with bounce
        for (let emoji of this.backgroundEmojis) {
            emoji.x += emoji.speedX;
            emoji.y += emoji.speedY;
            
            // Bounce off edges
            if (emoji.x < 0 || emoji.x > window.innerWidth) {
                emoji.speedX *= -1;
            }
            if (emoji.y < 0 || emoji.y > window.innerHeight) {
                emoji.speedY *= -1;
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
        
        // Draw floating emojis
        for (let emoji of this.backgroundEmojis) {
            this.bgCtx.font = `${emoji.size}px Arial`;
            this.bgCtx.textAlign = 'center';
            this.bgCtx.textBaseline = 'middle';
            this.bgCtx.fillStyle = 'rgba(255,255,255,0.15)';
            this.bgCtx.fillText(emoji.symbol, emoji.x, emoji.y);
        }

        // Draw particles
        for (let particle of this.particles) {
            this.bgCtx.beginPath();
            this.bgCtx.fillStyle = 'rgba(255,255,255,0.2)';
            this.bgCtx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            this.bgCtx.fill();
        }
    }

    checkDangerState() {
        // Check if any blocks are in the danger zone (top N rows)
        const hasBlocksInDangerZone = Array.from({length: GAME_RULES.DANGER_TOP_ROWS}, (_, i) => 
            this.grid[i].some(block => block !== null)
        ).some(Boolean);

        // Check specifically for blocks in the very top row
        const hasBlocksAtTop = this.grid[0].some(block => block !== null);
        
        if (hasBlocksAtTop && !this.dangerState.active) {
            // Store the current rising speed before stopping
            const currentSpeed = this.risingState.speed;
            
            // Stop rising and enter final danger state
            this.risingState.speed = 0;
            this.dangerState = {
                active: true,
                startTime: performance.now(),
                warningDuration: DANGER_WARNING_DURATIONS[this.speedState.difficulty],
                isFinalWarning: true,
                previousSpeed: currentSpeed // Store the speed to resume at
            };
        } else if (hasBlocksInDangerZone && !this.dangerState.active) {
            // Enter early warning state but don't stop rising yet
            this.dangerState = {
                active: true,
                startTime: performance.now(),
                warningDuration: DANGER_WARNING_DURATIONS[this.speedState.difficulty],
                isFinalWarning: false
            };
        } else if (hasBlocksAtTop && this.dangerState.active && this.dangerState.isFinalWarning) {
            // Check if time's up during final warning
            const timeInDanger = performance.now() - this.dangerState.startTime;
            if (timeInDanger >= this.dangerState.warningDuration) {
                this.gameOver = true;
                this.showGameOver();
            }
        } else if (!hasBlocksInDangerZone && this.dangerState.active) {
            // Player cleared all blocks from danger zone
            this.dangerState.active = false;
            if (this.dangerState.isFinalWarning) {
                // Resume at the previous speed if we were in final warning
                this.risingState.speed = this.dangerState.previousSpeed;
            }
        } else if (hasBlocksAtTop && this.dangerState.active && !this.dangerState.isFinalWarning) {
            // Escalate from early warning to final warning
            const currentSpeed = this.risingState.speed;
            this.risingState.speed = 0;
            this.dangerState = {
                active: true,
                startTime: performance.now(),
                warningDuration: DANGER_WARNING_DURATIONS[this.speedState.difficulty],
                isFinalWarning: true,
                previousSpeed: currentSpeed
            };
        }
    }

    showGameOver() {
        // Stop the timer
        this.timerState.isRunning = false;

        const difficultyKey = `highScore_${this.speedState.difficulty}`;
        const currentHighScore = parseInt(localStorage.getItem(difficultyKey)) || 0;
        
        if (this.score > currentHighScore) {
            localStorage.setItem(difficultyKey, this.score);
            this.highScore = this.score;
        }
        
        // Update modal content
        document.getElementById('finalScore').textContent = this.score;
        document.getElementById('finalHighScore').textContent = currentHighScore;
        document.getElementById('finalDifficulty').textContent = this.speedState.difficulty.toUpperCase();
        
        // Show the modal
        const modal = document.getElementById('gameOverModal');
        modal.style.display = 'block';
    }

    resetGame() {
        // Hide the modal
        document.getElementById('gameOverModal').style.display = 'none';
        
        // Get current saved speed setting
        const savedSpeed = parseInt(localStorage.getItem('gameSpeed')) || DEFAULT_SPEED;
        const savedDifficulty = localStorage.getItem('gameDifficulty') || DEFAULT_DIFFICULTY;
        
        // Update speed state with saved values
        this.speedState = {
            initialSpeed: savedSpeed,
            currentSpeed: savedSpeed,
            difficulty: savedDifficulty,
            lastSpeedIncrease: performance.now(),
            baseIncreaseInterval: SPEED_SETTINGS.BASE_INCREASE_INTERVAL,
            baseSpeedIncrease: SPEED_SETTINGS.BASE_SPEED_INCREASE
        };
        
        // Reset game state
        this.initGrid();
        this.score = 0;
        this.gameOver = false;
        this.isSwapping = false;
        this.fallingBlocks.clear();
        this.chainCounter = 0;
        this.fallingFromChain = false;
        this.floatingScores = [];
        this.matchCountPopups = [];
        
        // Reset danger state with difficulty-based warning duration
        this.dangerState = {
            active: false,
            startTime: 0,
            warningDuration: DANGER_WARNING_DURATIONS[savedDifficulty],
            isFinalWarning: false
        };
        
        // Reset rising state with correct initial speed
        this.risingState = {
            offset: 0,
            startTime: performance.now(),
            speed: this.calculateRisingSpeed(savedSpeed),
            nextRow: [],
            previewRow: []
        };
        
        // Generate new preview row
        this.generatePreviewRow();
        
        // Reset cursor position
        this.cursorX = 0;
        this.cursorY = 0;
        
        // Reset UI
        document.getElementById('scoreValue').textContent = '0';
        
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

    // Add method to update speed during gameplay
    updateGameSpeed(currentTime) {
        const multiplier = this.difficultyMultipliers[this.speedState.difficulty];
        const interval = this.speedState.baseIncreaseInterval / multiplier;
        
        if (currentTime - this.speedState.lastSpeedIncrease >= interval) {
            // Increase speed if not at max
            if (this.speedState.currentSpeed < 50) {
                this.speedState.currentSpeed += this.speedState.baseSpeedIncrease;
                this.risingState.speed = this.calculateRisingSpeed(this.speedState.currentSpeed);
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
}

// Start game when page loads
window.addEventListener('load', () => {
    new CanvasGame();
}); 