import { aiState } from './state.js';
import { domManager } from './dom.js';
import { swapBlocks, findMatches } from './game-logic.js';
import { AI_SETTINGS, GRID_X, GRID_Y } from './config.js';

class AILogic {
  constructor() {
    // Don't start AI in constructor - let game manager handle it
  }

  startAI() {
    // Clear any existing interval
    if (aiState.moveInterval) clearInterval(aiState.moveInterval);
    
    // Set initial cursor position
    const initialX = Math.floor(GRID_X / 2) - 1;
    const initialY = GRID_Y - 1;
    domManager.updateCursor(initialX, initialY, true);
    
    // Make an immediate first move
    if (!aiState.gameOver && !aiState.isMoving) {
      this.makeMove();
    }
    
    // Then set up the regular interval for future moves
    aiState.moveInterval = setInterval(() => {
      try {
        if (!aiState.gameOver && !aiState.isMoving) {
          this.makeMove();
        }
      } catch (error) {
        console.error('AI Error:', error);
      }
    }, AI_SETTINGS[aiState.difficulty].moveDelay);
  }

  makeMove() {
    if (aiState.gameOver || aiState.isMoving || aiState.animationLock) return;
    
    aiState.isMoving = true;
    try {
      let move;
      
      // Chance to make a random move based on difficulty
      if (Math.random() < AI_SETTINGS[aiState.difficulty].randomChance) {
        // 50% chance to make a completely random swap
        if (Math.random() < 0.5) {
          move = this.makeRandomMove();
        } else {
          // Otherwise make a "fidget" move
          move = this.makeRandomMove();
          const { x1, y1 } = move;
          
          setTimeout(() => {
            domManager.updateCursor(x1, y1, true);
            setTimeout(() => {
              swapBlocks(x1, y1, x1 + 1, y1, true);
              setTimeout(() => {
                swapBlocks(x1, y1, x1 + 1, y1, true);
              }, AI_SETTINGS[aiState.difficulty].moveDelay / 2);
            }, AI_SETTINGS[aiState.difficulty].thinkTime);
            
            aiState.isMoving = false;
            return;
          }, AI_SETTINGS[aiState.difficulty].thinkTime);
        }
      } else {
        // First look for direct matches
        move = this.findBestMove();
        
        // If no direct match, sometimes look for setup moves
        if (!move && Math.random() < AI_SETTINGS[aiState.difficulty].setupChance) {
          move = this.findSetupMove();
        }
      }
      
      if (move) {
        const randomDelay = AI_SETTINGS[aiState.difficulty].thinkTime + 
                          Math.random() * AI_SETTINGS[aiState.difficulty].moveDelay;
        setTimeout(() => {
          const { x1, y1 } = move;
          domManager.updateCursor(x1, y1, true);
          setTimeout(() => {
            swapBlocks(x1, y1, x1 + 1, y1, true);
          }, AI_SETTINGS[aiState.difficulty].thinkTime / 2);
        }, randomDelay);
      }
    } catch (error) {
      console.error('AI Move Error:', error);
    } finally {
      aiState.isMoving = false;
    }
  }

  findBestMove() {
    let bestScore = 0;
    let bestMove = null;
    
    // Check if AI is in danger (blocks in top 3 rows)
    const inDanger = aiState.grid.slice(0, 3).some(row => 
      row.some(block => block.dataset.color)
    );
    
    // If in danger, first look for moves that can reduce tower heights
    if (inDanger) {
      bestMove = this.findHeightReductionMove();
      if (bestMove) {
        return bestMove;
      }
    }

    // Continue with regular match finding logic...
    for (let y = 0; y < GRID_Y; y++) {
      for (let x = 0; x < GRID_X - 1; x++) {
        const block1 = aiState.grid[y][x];
        const block2 = aiState.grid[y][x + 1];
        
        if (!block1.dataset.color || !block2.dataset.color ||
            block1.classList.contains('matched') || 
            block2.classList.contains('matched')) {
          continue;
        }
        
        [aiState.grid[y][x], aiState.grid[y][x + 1]] = [aiState.grid[y][x + 1], aiState.grid[y][x]];
        
        const matches = findMatches(true);
        if (matches.length >= 3) {
          let score = matches.length * 100;
          
          // When in danger, heavily prioritize matches in upper rows
          if (inDanger) {
            // Exponential bonus for matches higher up the grid
            score += Math.pow(GRID_Y - y, 3) * 50;
          } else {
            // Normal slight preference for higher matches
            score += (GRID_Y - y) * 50;
          }
          
          // Chance to miss good moves based on difficulty
          if (score > bestScore && Math.random() > AI_SETTINGS[aiState.difficulty].missChance) {
            bestScore = score;
            bestMove = { x1: x, y1: y };
          }
        }
        
        [aiState.grid[y][x], aiState.grid[y][x + 1]] = [aiState.grid[y][x + 1], aiState.grid[y][x]];
      }
    }
    
    // If no good matches found and medium/hard difficulty, look for strategic drops
    if (!bestMove && 
        (aiState.difficulty === 'medium' || aiState.difficulty === 'hard') && 
        Math.random() < AI_SETTINGS[aiState.difficulty].setupChance) {
      bestMove = this.findStrategicDropMove();
    }
    
    return bestMove;
  }

  findSetupMove() {
    let bestScore = 0;
    let bestMove = null;
    
    // Look through all possible moves
    for (let y = 0; y < GRID_Y; y++) {
      for (let x = 0; x < GRID_X - 1; x++) {
        let score = this.evaluateSetupMove(x, y);
        if (score > bestScore) {
          bestScore = score;
          bestMove = { x1: x, y1: y };
        }
      }
    }
    
    return bestMove;
  }

  evaluateSetupMove(x, y) {
    let score = 0;
    const block1 = aiState.grid[y][x];
    const block2 = aiState.grid[y][x + 1];
    
    if (!block1.dataset.color || !block2.dataset.color ||
        block1.classList.contains('matched') || 
        block2.classList.contains('matched')) {
      return 0;
    }
    
    // Temporarily make the swap
    [aiState.grid[y][x], aiState.grid[y][x + 1]] = [aiState.grid[y][x + 1], aiState.grid[y][x]];
    
    // Check for potential matches after blocks would fall
    const potentialMatches = this.simulateFallAndFindMatches();
    if (potentialMatches.length > 0) {
      score = potentialMatches.length * 75; // Less than direct matches
      // Bonus for higher matches
      score += (GRID_Y - Math.min(...potentialMatches.map(m => m.y))) * 25;
    }
    
    // Undo the swap
    [aiState.grid[y][x], aiState.grid[y][x + 1]] = [aiState.grid[y][x + 1], aiState.grid[y][x]];
    
    return score;
  }

  makeRandomMove() {
    const y = Math.floor(Math.random() * GRID_Y);
    const x = Math.floor(Math.random() * (GRID_X - 1));
    return { x1: x, y1: y };
  }

  simulateFallAndFindMatches() {
    // Create a copy of the grid for simulation
    let simGrid = Array(GRID_Y).fill().map(() => Array(GRID_X).fill().map(() => ({
      color: null
    })));

    // Copy current grid state
    for (let y = 0; y < GRID_Y; y++) {
      for (let x = 0; x < GRID_X; x++) {
        simGrid[y][x].color = aiState.grid[y][x].dataset.color;
      }
    }
    
    // Simulate gravity
    let moved;
    do {
      moved = false;
      for (let x = 0; x < GRID_X; x++) {
        for (let y = GRID_Y - 2; y >= 0; y--) {
          if (simGrid[y][x].color && !simGrid[y + 1][x].color) {
            simGrid[y + 1][x].color = simGrid[y][x].color;
            simGrid[y][x].color = null;
            moved = true;
          }
        }
      }
    } while (moved);
    
    return this.findMatchesInSimGrid(simGrid);
  }

  findMatchesInSimGrid(simGrid) {
    const matches = [];
    
    // Check horizontal matches
    for (let y = 0; y < GRID_Y; y++) {
      let count = 1;
      let color = null;
      for (let x = 0; x < GRID_X; x++) {
        if (simGrid[y][x].color === color) {
          count++;
        } else {
          if (count >= 3) {
            for (let i = x - count; i < x; i++) {
              matches.push({ x: i, y });
            }
          }
          count = 1;
          color = simGrid[y][x].color;
        }
      }
      if (count >= 3) {
        for (let i = GRID_X - count; i < GRID_X; i++) {
          matches.push({ x: i, y });
        }
      }
    }
    
    // Check vertical matches
    for (let x = 0; x < GRID_X; x++) {
      let count = 1;
      let color = null;
      for (let y = 0; y < GRID_Y; y++) {
        if (simGrid[y][x].color === color) {
          count++;
        } else {
          if (count >= 3) {
            for (let i = y - count; i < y; i++) {
              matches.push({ x, y: i });
            }
          }
          count = 1;
          color = simGrid[y][x].color;
        }
      }
      if (count >= 3) {
        for (let i = GRID_Y - count; i < GRID_Y; i++) {
          matches.push({ x, y: i });
        }
      }
    }
    
    return matches;
  }

  findHeightReductionMove() {
    // Find the highest columns
    const columnHeights = new Array(GRID_X).fill(0);
    for (let x = 0; x < GRID_X; x++) {
      for (let y = 0; y < GRID_Y; y++) {
        if (aiState.grid[y][x].dataset.color) {
          columnHeights[x] = GRID_Y - y;
          break;
        }
      }
    }

    // Find adjacent columns with biggest height difference
    let bestDiff = 0;
    let bestMove = null;

    for (let x = 0; x < GRID_X - 1; x++) {
      const heightDiff = Math.abs(columnHeights[x] - columnHeights[x + 1]);
      if (heightDiff > bestDiff) {
        // Find the highest block in the taller column that can be moved
        const tallerCol = columnHeights[x] > columnHeights[x + 1] ? x : x + 1;
        const shorterCol = tallerCol === x ? x + 1 : x;
        const y = GRID_Y - columnHeights[tallerCol];
        
        // Check if this move would create a match
        const block1 = aiState.grid[y][tallerCol];
        const block2 = aiState.grid[y][shorterCol];
        
        if (block1.dataset.color && !block2.dataset.color) {
          bestDiff = heightDiff;
          bestMove = {
            x1: Math.min(tallerCol, shorterCol),
            y1: y
          };
        }
      }
    }

    return bestMove;
  }

  findStrategicDropMove() {
    let bestScore = 0;
    let bestMove = null;

    // Look for opportunities to create potential matches through dropping
    for (let x = 0; x < GRID_X - 1; x++) {
      for (let y = 0; y < GRID_Y; y++) {
        const block1 = aiState.grid[y][x];
        const block2 = aiState.grid[y][x + 1];
        
        if (!block1.dataset.color || !block2.dataset.color) continue;
        
        // Simulate the swap and drop
        [aiState.grid[y][x], aiState.grid[y][x + 1]] = [aiState.grid[y][x + 1], aiState.grid[y][x]];
        
        // Calculate potential score based on:
        // 1. How many blocks would drop
        // 2. Potential for future matches
        const score = this.evaluateDropPosition(x, y);
        
        if (score > bestScore) {
          bestScore = score;
          bestMove = { x1: x, y1: y };
        }
        
        // Undo the swap
        [aiState.grid[y][x], aiState.grid[y][x + 1]] = [aiState.grid[y][x + 1], aiState.grid[y][x]];
      }
    }

    return bestScore > 50 ? bestMove : null;
  }

  evaluateDropPosition(x, y) {
    let score = 0;
    
    // Count how many blocks would drop
    let dropCount = 0;
    for (let checkY = y; checkY < GRID_Y - 1; checkY++) {
      if (aiState.grid[checkY][x].dataset.color && !aiState.grid[checkY + 1][x].dataset.color) {
        dropCount++;
      }
    }
    
    // Higher score for more drops
    score += dropCount * 20;
    
    // Check for potential matches after dropping
    const potentialMatches = this.simulateFallAndFindMatches();
    score += potentialMatches.length * 30;
    
    // Bonus for reducing height of tall columns
    if (y < GRID_Y / 2) {
      score += (GRID_Y - y) * 10;
    }
    
    return score;
  }
}

export const aiLogic = new AILogic(); 