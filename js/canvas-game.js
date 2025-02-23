import { GRID_X, GRID_Y, ELEMENTS, BLOCK_SIZE, GAP, GRID_PADDING } from './config.js';
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
        this.frameTimes = new Array(60).fill(0); // For FPS smoothing
        this.rafId = null;
        
        // Initialize background effect arrays
        this.backgroundEmojis = [];
        this.particles = [];
        
        // Base dimensions (logical size)
        this.baseWidth = (GRID_X * BLOCK_SIZE) + ((GRID_X - 1) * GAP) + (GRID_PADDING * 2);
        this.baseHeight = (GRID_Y * BLOCK_SIZE) + ((GRID_Y - 1) * GAP) + (GRID_PADDING * 2);
        
        // Get saved settings
        const savedSpeed = parseInt(localStorage.getItem('gameSpeed')) || 3;
        const savedDifficulty = localStorage.getItem('gameDifficulty') || 'normal';
        
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
        
        // Falling state tracking
        this.fallingBlocks = new Set();
        this.lastFrameTime = performance.now();
        this.fallSpeed = 600;
        
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
            warningDuration: 3000
        };

        // Add manual rising state
        this.manualRising = false;
        this.manualRisingSpeed = 1; // Increased from 0.8 to 1 for faster manual rising
        
        // Initialize game components in order
        this.initGrid();                // First create the grid
        this.generatePreviewRow();      // Then generate preview row
        this.setupEventListeners();     // Set up input handlers
        
        // Add swap animation state
        this.swapState = {
            isAnimating: false,
            startTime: 0,
            duration: 200,  // Increased slightly for smoother animation
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
        
        // Start background music
        audioManager.bgMusic.play().catch(console.error);
        
        // Start game loop
        this.rafId = requestAnimationFrame(() => this.gameLoop());
    }
    
    resize() {
        // Get container dimensions
        const container = this.canvas.parentElement;
        const containerWidth = container.clientWidth;
        
        // Calculate available height (accounting for UI elements)
        const availableHeight = window.innerHeight - 200; // -200 for margins/UI
        
        // Calculate maximum scale that fits in container
        const maxScaleX = (containerWidth - 30) / this.baseWidth;  // -30 for padding
        const maxScaleY = availableHeight / this.baseHeight;
        
        // Set minimum and maximum scales
        const minScale = 1;    // Never smaller than original size
        const maxScale = 2.5;  // Allow up to 2.5x scaling
        
        // Calculate optimal scale
        this.scale = Math.min(maxScaleX, maxScaleY, maxScale);
        this.scale = Math.max(this.scale, minScale);
        
        // Set canvas size
        this.canvas.width = this.baseWidth * this.scale;
        this.canvas.height = this.baseHeight * this.scale;
        
        // Enable smooth scaling
        this.ctx.imageSmoothingEnabled = true;
        
        // Also resize background canvas
        this.bgCanvas.width = this.baseWidth * this.scale;
        this.bgCanvas.height = this.baseHeight * this.scale;
        this.bgCtx.imageSmoothingEnabled = true;
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
                        if (attempts > 10) break;
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
            const dangerProgress = (currentTime - this.dangerState.startTime) / 300; // 300ms per pulse
            const dangerPulse = Math.sin(dangerProgress * Math.PI * 2) * 0.3 + 0.7;
            
            this.ctx.save();
            this.ctx.shadowColor = 'red';
            this.ctx.shadowBlur = 20;
            this.ctx.globalAlpha *= dangerPulse;
        } else if (y < 3 && this.dangerState.active) {
            // Normal danger state for top 3 rows
            const dangerProgress = (currentTime - this.dangerState.startTime) / 300;
            const dangerPulse = Math.sin(dangerProgress * Math.PI * 2) * 0.3 + 0.7;
            
            this.ctx.save();
            this.ctx.shadowColor = 'red';
            this.ctx.shadowBlur = 20;
            this.ctx.globalAlpha *= dangerPulse;
        }
        
        // Draw block background with animation effects
        this.ctx.fillStyle = this.getBlockColor(blockType);
        
        if (blockState === 'matching') {
            const progress = (currentTime - block.animationStart) / 300;
            
            // Gentle glow effect
            this.ctx.shadowColor = this.getBlockColor(blockType);
            this.ctx.shadowBlur = 10;
            
            // Subtle pulse that doesn't go too transparent
            const alpha = 0.8 + Math.sin(progress * Math.PI * 4) * 0.2;
            this.ctx.globalAlpha = alpha;
            
            // Very subtle scale pulse
            const scale = 1 + Math.sin(progress * Math.PI * 4) * 0.05;
            this.ctx.translate(centerX, centerY);
            this.ctx.scale(scale, scale);
            this.ctx.translate(-centerX, -centerY);
        } else if (blockState === 'popping') {
            const progress = (currentTime - block.animationStart) / 300;
            const scale = 1 - progress;
            const alpha = 1 - progress;
            
            // Scale block from center while fading out
            this.ctx.translate(centerX, centerY);
            this.ctx.scale(scale, scale);
            this.ctx.translate(-centerX, -centerY);
            this.ctx.globalAlpha = alpha;
        }
        
        this.ctx.beginPath();
        this.ctx.roundRect(xPos, yPos, BLOCK_SIZE, BLOCK_SIZE, 8);
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
            this.ctx.font = '30px Arial';
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
            } else {
                // Normal emoji rendering
                this.ctx.shadowColor = 'rgba(0,0,0,0.8)';
                this.ctx.shadowBlur = 4;
                this.ctx.shadowOffsetX = 2;
                this.ctx.shadowOffsetY = 2;
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
            this.ctx.setTransform(this.scale, 0, 0, this.scale, 0, 0);
        }

        if ((this.dangerState.active && this.dangerState.isFinalWarning) || 
            (y < 3 && this.dangerState.active)) {
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
        this.ctx.roundRect(xPos - 3, yPos - 3, (BLOCK_SIZE * 2) + GAP + 6, BLOCK_SIZE + 6, 8);
        this.ctx.stroke();
        
        // Draw cursor glow
        this.ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.roundRect(xPos - 5, yPos - 5, (BLOCK_SIZE * 2) + GAP + 10, BLOCK_SIZE + 10, 10);
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
        }, this.swapState.duration);
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
                if (this.grid[y][x] && 
                    this.grid[y][x] === this.grid[y-1][x]) {
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

    addFloatingScore(x, y, baseScore, chainLevel) {
        const multiplier = chainLevel > 0 ? Math.pow(2, chainLevel) : 1;
        const totalScore = baseScore * multiplier;
        
        // Calculate screen position
        const screenX = GRID_PADDING + (x * (BLOCK_SIZE + GAP)) + BLOCK_SIZE/2;
        const screenY = GRID_PADDING + (y * (BLOCK_SIZE + GAP));
        
        this.floatingScores.push({
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

    drawFloatingScores(currentTime) {
        this.floatingScores = this.floatingScores.filter(score => {
            const progress = (currentTime - score.startTime) / score.duration;
            if (progress >= 1) return false;
            
            const y = score.y - (progress * 50); // Float upward
            const opacity = 1 - progress;
            
            this.ctx.save();
            this.ctx.textAlign = 'center';
            this.textBaseline = 'middle';
            
            if (score.multiplier > 1) {
                // Draw total score first (centered)
                this.ctx.font = 'bold 32px "Press Start 2P"';
                this.ctx.fillStyle = `rgba(255,180,0,${opacity})`;
                this.ctx.fillText(`${score.totalScore}`, score.x, y);
                
                // Draw chain multiplier to the right and slightly up
                this.ctx.font = 'bold 28px "Press Start 2P"';
                this.ctx.fillStyle = `rgba(255,220,0,${opacity})`;
                this.ctx.fillText(`×${score.multiplier}`, score.x + 80, y - 10);
            } else {
                // Just draw the score for non-chain matches
                this.ctx.font = 'bold 24px "Press Start 2P"';
                this.ctx.fillStyle = `rgba(255,255,255,${opacity})`;
                this.ctx.fillText(`${score.baseScore}`, score.x, y);
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
        this.ctx.font = 'bold 48px "Press Start 2P"';
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
        audioManager.playMatchSound(matches.length);

        // Increment chain counter if this is part of a chain
        if (isChain) {
            this.chainCounter++;
            
            // Play chain sound based on chain level
            if (this.chainCounter === 1) {
                audioManager.playSound('chain1');
            } else if (this.chainCounter === 2) {
                audioManager.playSound('chain2');
            } else if (this.chainCounter >= 3) {
                audioManager.playSound('chain3');
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

        // First phase: Flash the blocks (800ms)
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
                        audioManager.playPopSound();
                    }
                }, index * 200);
                
                setTimeout(() => {
                    if (this.grid[y][x]) {
                        this.grid[y][x] = null;
                    }
                    
                    if (index === matches.length - 1) {
                        // After last block is removed, start dropping and check for chains
                        this.dropBlocks(true); // Pass true to indicate checking for chains
                    }
                }, index * 200 + 200);
            });
        }, 600);

        // Set chain timer to reset counter if no new matches occur
        this.chainTimer = setTimeout(() => {
            this.chainCounter = 0;
        }, 2000); // Reset chain if no new matches within 2 seconds
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
                if (attempts > 10) break;
            } while (
                (x >= 2 && color === this.risingState.previewRow[x-1] && 
                 color === this.risingState.previewRow[x-2])
            );
            this.risingState.previewRow[x] = color;
        }
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
        
        // Only allow manual rising if not in danger state
        const canManualRise = this.manualRising && !this.dangerState.active;
        
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
            this.ctx.globalAlpha = 0.3;
            this.ctx.fillStyle = this.getBlockColor(blockType);
            this.ctx.beginPath();
            this.ctx.roundRect(xPos, yPos, BLOCK_SIZE, BLOCK_SIZE, 8);
            this.ctx.fill();
            
            // Draw symbol
            const symbol = this.blockSymbols[blockType];
            if (symbol) {
                this.ctx.font = '30px Arial';
                this.ctx.textAlign = 'center';
                this.ctx.textBaseline = 'middle';
                
                // Add strong black shadow
                this.ctx.shadowColor = 'rgba(0,0,0,0.8)';
                this.ctx.shadowBlur = 4;
                this.ctx.shadowOffsetX = 2;
                this.ctx.shadowOffsetY = 2;
                
                this.ctx.fillStyle = 'white';
                this.ctx.fillText(symbol, centerX, centerY);
                
                // Reset shadow settings
                this.ctx.shadowColor = 'transparent';
                this.ctx.shadowBlur = 0;
                this.ctx.shadowOffsetX = 0;
                this.ctx.shadowOffsetY = 0;
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
        const fallDuration = 150; // Duration of fall animation in ms
        
        this.fallingBlocks.forEach(key => {
            const [x, targetY] = key.split(',').map(Number);
            const block = this.grid[targetY][x];
            
            if (!block || block.state !== 'falling') {
                this.fallingBlocks.delete(key);
                return;
            }
            
            const progress = Math.min((currentTime - block.fallStart) / fallDuration, 1);
            
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
        this.frameTimes[this.frameCount % 60] = deltaTime;
        this.frameCount++;
        
        // Update falling blocks
        this.updateFallingBlocks(currentTime);
        
        // Only update rising if no blocks are falling
        if (this.fallingBlocks.size === 0) {
            this.updateRising(currentTime);
        }
        
        // Update timer
        this.updateTimer(currentTime);
        
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.save();
        this.ctx.scale(this.scale, this.scale);
        
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
        this.drawChainIndicator(currentTime);
        this.drawCursor();
        
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
        volumeSlider.value = audioManager.bgMusic.volume;
        muteBtn.textContent = audioManager.bgMusic.muted ? '🔇' : '🔊';
        
        // Set up volume control
        volumeSlider.addEventListener('input', (e) => {
            const newVolume = e.target.value;
            audioManager.bgMusic.volume = newVolume;
            localStorage.setItem('volume', newVolume);
            muteBtn.textContent = newVolume === '0' ? '🔇' : '🔊';
        });
        
        // Set up mute toggle using AudioManager
        muteBtn.addEventListener('click', () => {
            audioManager.bgMusic.muted = !audioManager.bgMusic.muted;
            localStorage.setItem('muted', audioManager.bgMusic.muted);
            muteBtn.textContent = audioManager.bgMusic.muted ? '🔇' : '🔊';
            
            // Ensure volume slider reflects muted state
            if (audioManager.bgMusic.muted) {
                volumeSlider.value = 0;
            } else {
                volumeSlider.value = localStorage.getItem('volume') || 0.3;
            }
        });
    }

    initBackgroundEffects() {
        // Use window dimensions instead of game dimensions
        this.bgCanvas.width = window.innerWidth;
        this.bgCanvas.height = window.innerHeight;
        
        const currentTheme = localStorage.getItem('selectedTheme') || 'theme-elements';
        const themeEmojis = Object.values(this.themeSymbols[currentTheme]);
        
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
        const hasBlocksAtTop = this.grid[0].some(block => block !== null);
        
        if (hasBlocksAtTop && !this.dangerState.active) {
            // Store the current rising speed before stopping
            const currentSpeed = this.risingState.speed;
            
            // Stop rising and enter final danger state
            this.risingState.speed = 0;
            this.dangerState = {
                active: true,
                startTime: performance.now(),
                warningDuration: baseWarningDuration * durationMultipliers[this.speedState.difficulty],
                isFinalWarning: true,
                previousSpeed: currentSpeed // Store the speed to resume at
            };
        } else if (hasBlocksAtTop && this.dangerState.active && this.dangerState.isFinalWarning) {
            // Check if time's up during final warning
            const timeInDanger = performance.now() - this.dangerState.startTime;
            if (timeInDanger >= this.dangerState.warningDuration) {
                this.gameOver = true;
                this.showGameOver();  // Show the game over modal
            }
        } else if (!hasBlocksAtTop && this.dangerState.active && this.dangerState.isFinalWarning) {
            // Player cleared the top row in time
            this.dangerState.active = false;
            // Resume at the previous speed instead of fixed value
            this.risingState.speed = this.dangerState.previousSpeed;
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
        
        // Reset game state
        this.initGrid();
        this.score = 0;
        this.gameOver = false;
        this.isSwapping = false;
        this.fallingBlocks.clear();
        this.chainCounter = 0;
        this.fallingFromChain = false;
        
        // Reset danger state
        this.dangerState = {
            active: false,
            startTime: 0,
            warningDuration: 2000,
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