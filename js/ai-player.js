import { GRID_X, GRID_Y } from './config.js';

export class AIPlayer {
    constructor(gameState) {
        this.gameState = gameState;
        this.thinkingTime = 0;
        this.lastMoveTime = 0;
        this.moveDelay = 500; // Minimum time between moves in ms
        this.difficultyLevel = 3; // Default medium difficulty (1-5)
        
        // Movement settings
        this.cursorStepDelay = 150; // Delay between cursor movements in ms
        this.lastCursorMoveTime = 0;
        this.movementQueue = []; // Queue of cursor movements to execute
        this.isMoving = false;
        this.targetPosition = null; // Where the AI wants to move to
        this.shouldSwapAfterMoving = false;
        
        // Load AI difficulty from localStorage if available
        const savedAiDifficulty = localStorage.getItem('aiDifficulty');
        if (savedAiDifficulty) {
            this.difficultyLevel = parseInt(savedAiDifficulty);
            console.log(`AI difficulty set from localStorage: ${this.difficultyLevel}`);
        } else {
            console.log(`Using default AI difficulty: ${this.difficultyLevel}`);
        }
        
        // Difficulty settings
        this.difficultySettings = {
            1: { // Very Easy
                moveDelay: 1000,
                cursorStepDelay: 250, // Slower cursor movement
                matchPriority: 0.6,
                chainPriority: 0.2,
                clearTopPriority: 0.8,
                lookAheadDepth: 1,
                randomMoveChance: 0.4
            },
            2: { // Easy
                moveDelay: 800,
                cursorStepDelay: 200,
                matchPriority: 0.7,
                chainPriority: 0.4,
                clearTopPriority: 0.8,
                lookAheadDepth: 1,
                randomMoveChance: 0.25
            },
            3: { // Medium
                moveDelay: 600,
                cursorStepDelay: 150,
                matchPriority: 0.8,
                chainPriority: 0.6,
                clearTopPriority: 0.9,
                lookAheadDepth: 2,
                randomMoveChance: 0.15
            },
            4: { // Hard
                moveDelay: 400,
                cursorStepDelay: 100,
                matchPriority: 0.9,
                chainPriority: 0.8,
                clearTopPriority: 0.95,
                lookAheadDepth: 2,
                randomMoveChance: 0.05
            },
            5: { // Very Hard
                moveDelay: 300,
                cursorStepDelay: 50, // Faster cursor movement
                matchPriority: 1.0,
                chainPriority: 0.9,
                clearTopPriority: 1.0,
                lookAheadDepth: 3,
                randomMoveChance: 0.0
            }
        };
        
        // Apply difficulty settings
        this.applyDifficultySettings();
        console.log("AI Player initialized successfully");
    }
    
    applyDifficultySettings() {
        const settings = this.difficultySettings[this.difficultyLevel] || this.difficultySettings[3];
        this.moveDelay = settings.moveDelay;
        this.cursorStepDelay = settings.cursorStepDelay;
        this.matchPriority = settings.matchPriority;
        this.chainPriority = settings.chainPriority;
        this.clearTopPriority = settings.clearTopPriority;
        this.lookAheadDepth = settings.lookAheadDepth;
        this.randomMoveChance = settings.randomMoveChance;
    }
    
    setDifficulty(level) {
        this.difficultyLevel = Math.max(1, Math.min(5, level));
        localStorage.setItem('aiDifficulty', this.difficultyLevel);
        this.applyDifficultySettings();
    }
    
    makeMove(gameInstance) {
        const currentTime = performance.now();
        
        // If we're already moving, continue the cursor movement
        if (this.isMoving) {
            this.continueCursorMovement(gameInstance, currentTime);
            return;
        }
        
        // Don't start a new move too quickly
        if (currentTime - this.lastMoveTime < this.moveDelay) {
            return;
        }
        
        // Don't make moves if blocks are falling or matching
        if (this.gameState.fallingBlocks.size > 0 || this.hasActiveMatches()) {
            return;
        }
        
        // Check if game board is set up correctly
        if (!this.gameState.grid || this.gameState.grid.length === 0) {
            console.error("AI game board not properly initialized");
            return;
        }
        
        // Occasionally make a random move based on difficulty
        if (Math.random() < this.randomMoveChance) {
            console.log("AI making random move");
            // Use cursor movement for random moves too instead of direct placement
            this.makeRandomMoveWithCursor(gameInstance);
            this.lastMoveTime = currentTime;
            return;
        }
        
        // Find the best move
        const bestMove = this.findBestMove(gameInstance);
        
        if (bestMove) {
            console.log(`AI planning strategic move to (${bestMove.x}, ${bestMove.y}) with score ${bestMove.score}`);
            
            // Start moving the cursor to the target position
            this.startCursorMovement(bestMove.x, bestMove.y, true);
            
        } else {
            console.log("AI could not find a good move, making random move");
            // Make a random move
            this.makeRandomMoveWithCursor(gameInstance);
        }
        
        this.lastMoveTime = currentTime;
    }
    
    startCursorMovement(targetX, targetY, shouldSwap) {
        this.isMoving = true;
        this.targetPosition = { x: targetX, y: targetY };
        this.shouldSwapAfterMoving = shouldSwap;
        this.lastCursorMoveTime = performance.now();
        this.movementQueue = this.calculateMovementSteps(targetX, targetY);
    }
    
    continueCursorMovement(gameInstance, currentTime) {
        // Check if it's time for the next cursor movement
        if (currentTime - this.lastCursorMoveTime < this.cursorStepDelay) {
            return;
        }
        
        // If the queue is empty and we've reached the target, make the swap
        if (this.movementQueue.length === 0) {
            // Double-check we're at the right position before swapping
            if (this.targetPosition && 
                this.gameState.cursorX === this.targetPosition.x && 
                this.gameState.cursorY === this.targetPosition.y) {
                
                // We've definitely reached the target position
                if (this.shouldSwapAfterMoving) {
                    gameInstance.swapBlocks(this.gameState);
                    this.shouldSwapAfterMoving = false;
                }
                
                this.isMoving = false;
                this.targetPosition = null;
                this.lastMoveTime = currentTime;
                return;
            } else if (this.targetPosition) {
                // We somehow didn't reach the target position correctly
                // Recalculate path and continue moving
                console.log("AI cursor position doesn't match target, recalculating path");
                this.movementQueue = this.calculateMovementSteps(
                    this.targetPosition.x, 
                    this.targetPosition.y
                );
                
                // Don't proceed further this frame
                return;
            } else {
                // No target position, just stop moving
                this.isMoving = false;
                this.lastMoveTime = currentTime;
                return;
            }
        }
        
        // Get the next movement from the queue
        const nextMove = this.movementQueue.shift();
        
        // Apply the movement (with bounds checking)
        switch (nextMove) {
            case 'left':
                if (this.gameState.cursorX > 0) {
                    this.gameState.cursorX--;
                }
                break;
            case 'right':
                if (this.gameState.cursorX < GRID_X - 2) {
                    this.gameState.cursorX++;
                }
                break;
            case 'up':
                if (this.gameState.cursorY > 0) {
                    this.gameState.cursorY--;
                }
                break;
            case 'down':
                if (this.gameState.cursorY < GRID_Y - 1) {
                    this.gameState.cursorY++;
                }
                break;
        }
        
        // Update the last cursor move time
        this.lastCursorMoveTime = currentTime;
    }
    
    calculateMovementSteps(targetX, targetY) {
        const steps = [];
        const currentX = this.gameState.cursorX;
        const currentY = this.gameState.cursorY;
        
        // Calculate horizontal steps first
        const horizontalSteps = targetX - currentX;
        if (horizontalSteps > 0) {
            for (let i = 0; i < horizontalSteps; i++) {
                steps.push('right');
            }
        } else if (horizontalSteps < 0) {
            for (let i = 0; i < Math.abs(horizontalSteps); i++) {
                steps.push('left');
            }
        }
        
        // Then calculate vertical steps
        const verticalSteps = targetY - currentY;
        if (verticalSteps > 0) {
            for (let i = 0; i < verticalSteps; i++) {
                steps.push('down');
            }
        } else if (verticalSteps < 0) {
            for (let i = 0; i < Math.abs(verticalSteps); i++) {
                steps.push('up');
            }
        }
        
        return steps;
    }
    
    makeRandomMoveWithCursor(gameInstance) {
        // Find a random valid position
        let attempts = 0;
        let validMove = false;
        let randomX, randomY;
        
        while (!validMove && attempts < 20) {
            randomX = Math.floor(Math.random() * (GRID_X - 1));
            randomY = Math.floor(Math.random() * GRID_Y);
            
            // Check if both positions have blocks
            if (this.gameState.grid[randomY][randomX] && this.gameState.grid[randomY][randomX+1]) {
                validMove = true;
            }
            
            attempts++;
        }
        
        if (validMove) {
            // Start moving to the random position
            this.startCursorMovement(randomX, randomY, true);
        }
    }
    
    makeRandomMove(gameInstance) {
        // This method now uses the same cursor movement system as other moves
        // to prevent any jumps or teleports
        this.makeRandomMoveWithCursor(gameInstance);
    }
    
    hasActiveMatches() {
        // Check if any blocks are in matching or popping state
        return this.gameState.grid.some(row => 
            row.some(block => 
                block && 
                typeof block === 'object' && 
                (block.state === 'matching' || block.state === 'popping')
            )
        );
    }
    
    findBestMove(gameInstance) {
        const moves = [];
        
        // Check each possible swap position
        for (let y = 0; y < GRID_Y; y++) {
            for (let x = 0; x < GRID_X - 1; x++) {
                // Skip if either position doesn't have a block
                if (!this.gameState.grid[y][x] || !this.gameState.grid[y][x+1]) {
                    continue;
                }
                
                // Skip if either block is in a special state
                const block1 = this.gameState.grid[y][x];
                const block2 = this.gameState.grid[y][x+1];
                
                const isBlock1Locked = block1 && typeof block1 === 'object' && 
                    (block1.state === 'matching' || block1.state === 'popping' || block1.state === 'falling');
                const isBlock2Locked = block2 && typeof block2 === 'object' && 
                    (block2.state === 'matching' || block2.state === 'popping' || block2.state === 'falling');
                
                if (isBlock1Locked || isBlock2Locked) {
                    continue;
                }
                
                // Simulate the swap
                const score = this.evaluateMove(gameInstance, x, y);
                
                if (score > 0) {
                    moves.push({
                        x,
                        y,
                        score
                    });
                }
            }
        }
        
        // Sort moves by score (highest first)
        moves.sort((a, b) => b.score - a.score);
        
        // Return the best move, or null if no good moves found
        return moves.length > 0 ? moves[0] : null;
    }
    
    evaluateMove(gameInstance, x, y) {
        // Create a copy of the grid for simulation
        const gridCopy = this.copyGrid(this.gameState.grid);
        
        // Swap the blocks in the copy
        [gridCopy[y][x], gridCopy[y][x+1]] = [gridCopy[y][x+1], gridCopy[y][x]];
        
        // Check for matches after the swap
        const matches = this.findMatches(gridCopy);
        
        if (matches.length === 0) {
            return 0; // No matches, not a good move
        }
        
        // Base score on number of matches
        let score = matches.length * 10;
        
        // Bonus for larger matches
        const matchSizes = this.countMatchSizes(matches);
        for (const size in matchSizes) {
            if (size >= 4) {
                score += (size - 3) * 20 * matchSizes[size];
            }
        }
        
        // Bonus for matches near the top of the grid
        for (const match of matches) {
            const [matchX, matchY] = match.split(',').map(Number);
            
            // Higher priority for clearing blocks at the top
            if (matchY < 3) {
                score += (3 - matchY) * 30 * this.clearTopPriority;
            }
        }
        
        // Look ahead for potential chains if difficulty allows
        if (this.lookAheadDepth > 1) {
            const chainScore = this.evaluateChainPotential(gridCopy, matches);
            score += chainScore * this.chainPriority;
        }
        
        return score;
    }
    
    evaluateChainPotential(grid, initialMatches) {
        // Create a working copy of the grid
        const gridCopy = this.copyGrid(grid);
        
        // Remove the initial matches
        for (const match of initialMatches) {
            const [x, y] = match.split(',').map(Number);
            gridCopy[y][x] = null;
        }
        
        // Simulate gravity (blocks falling)
        this.simulateGravity(gridCopy);
        
        // Check for new matches after falling
        const newMatches = this.findMatches(gridCopy);
        
        if (newMatches.length === 0) {
            return 0; // No chain potential
        }
        
        // Score based on number of chain matches
        let chainScore = newMatches.length * 20;
        
        // Bonus for larger chain matches
        const matchSizes = this.countMatchSizes(newMatches);
        for (const size in matchSizes) {
            if (size >= 4) {
                chainScore += (size - 3) * 30 * matchSizes[size];
            }
        }
        
        // Recursively check for more chains if depth allows
        if (this.lookAheadDepth > 2) {
            const nextChainScore = this.evaluateChainPotential(gridCopy, newMatches);
            chainScore += nextChainScore * 2; // Double score for deeper chains
        }
        
        return chainScore;
    }
    
    simulateGravity(grid) {
        // Simulate blocks falling due to gravity
        let blocksFell;
        
        do {
            blocksFell = false;
            
            // Check each column from bottom to top
            for (let x = 0; x < GRID_X; x++) {
                for (let y = GRID_Y - 2; y >= 0; y--) {
                    if (grid[y][x] && !grid[y + 1][x]) {
                        // Move block down
                        grid[y + 1][x] = grid[y][x];
                        grid[y][x] = null;
                        blocksFell = true;
                    }
                }
            }
        } while (blocksFell);
    }
    
    findMatches(grid) {
        const matches = new Set();
        
        // Horizontal matches
        for (let y = 0; y < GRID_Y; y++) {
            let count = 1;
            let currentType = null;
            
            for (let x = 0; x < GRID_X; x++) {
                const blockType = this.getBlockType(grid[y][x]);
                
                if (blockType && blockType === currentType) {
                    count++;
                } else {
                    if (count >= 3) {
                        for (let i = x - count; i < x; i++) {
                            matches.add(`${i},${y}`);
                        }
                    }
                    count = 1;
                    currentType = blockType;
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
            let currentType = null;
            
            for (let y = 0; y < GRID_Y; y++) {
                const blockType = this.getBlockType(grid[y][x]);
                
                if (blockType && blockType === currentType) {
                    count++;
                } else {
                    if (count >= 3) {
                        for (let i = y - count; i < y; i++) {
                            matches.add(`${x},${i}`);
                        }
                    }
                    count = 1;
                    currentType = blockType;
                }
            }
            
            // Check end of column
            if (count >= 3) {
                for (let i = GRID_Y - count; i < GRID_Y; i++) {
                    matches.add(`${x},${i}`);
                }
            }
        }
        
        return Array.from(matches);
    }
    
    countMatchSizes(matches) {
        // Group matches by connected regions
        const visited = new Set();
        const regions = [];
        
        for (const match of matches) {
            if (visited.has(match)) continue;
            
            const region = new Set();
            const queue = [match];
            visited.add(match);
            region.add(match);
            
            while (queue.length > 0) {
                const current = queue.shift();
                const [x, y] = current.split(',').map(Number);
                
                // Check adjacent positions
                const adjacent = [
                    `${x+1},${y}`, `${x-1},${y}`, 
                    `${x},${y+1}`, `${x},${y-1}`
                ];
                
                for (const adj of adjacent) {
                    if (matches.includes(adj) && !visited.has(adj)) {
                        visited.add(adj);
                        region.add(adj);
                        queue.push(adj);
                    }
                }
            }
            
            regions.push(region);
        }
        
        // Count regions by size
        const sizes = {};
        for (const region of regions) {
            const size = region.size;
            sizes[size] = (sizes[size] || 0) + 1;
        }
        
        return sizes;
    }
    
    getBlockType(block) {
        if (!block) return null;
        return typeof block === 'object' ? block.type : block;
    }
    
    copyGrid(grid) {
        return grid.map(row => [...row]);
    }
} 