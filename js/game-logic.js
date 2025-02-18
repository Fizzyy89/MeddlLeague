import { playerState, aiState } from './state.js';
import { domManager } from './dom.js';
import { audioManager } from './audio.js';
import { GRID_X, GRID_Y, ELEMENTS, BLOCK_SIZE, GAP, GRID_PADDING, 
         SWAP_DELAY, MATCH_DELAY, DROP_DELAY, RISE_DELAY, getRiseTime } from './config.js';

// Utility functions
export const randomElement = () => ELEMENTS[Math.floor(Math.random() * ELEMENTS.length)];

export function updateBlockPos(block, x, y) {
  block.style.gridRow = y + 1;
  block.style.gridColumn = x + 1;
}

export function updateBlockVisuals(block, color) {
  if (color) {
    block.dataset.color = color;
    block.className = `block ${color}`;
  } else {
    block.dataset.color = '';
    block.className = 'block';
  }
}

// Core game mechanics
export function swapBlocks(x1, y1, x2, y2, isAI = false) {
  const state = isAI ? aiState : playerState;
  const grid = state.grid;
  
  if (state.isSwapping || state.gameOver) return;
  
  const block1 = grid[y1][x1];
  const block2 = grid[y2][x2];
  
  if (block1.classList.contains('matched') || 
      block2.classList.contains('matched') ||
      block1.classList.contains('popping') || 
      block2.classList.contains('popping')) {
    return;
  }
  
  state.isSwapping = true;
  
  const bothHaveColors = block1.dataset.color && block2.dataset.color;
  if (bothHaveColors) {
    block1.classList.add('swapping-right');
    block2.classList.add('swapping-left');
  }
  
  [grid[y1][x1], grid[y2][x2]] = [grid[y2][x2], grid[y1][x1]];
  updateBlockPos(grid[y1][x1], x1, y1);
  updateBlockPos(grid[y2][x2], x2, y2);
  
  setTimeout(() => {
    if (bothHaveColors) {
      block1.classList.remove('swapping-right');
      block2.classList.remove('swapping-left');
    }
    
    // Start a new chain sequence if there's no active chain
    const startNewChain = state.chainLevel === 0;
    if (startNewChain) {
      state.chainLevel = 1;
    }
    
    dropBlocks(isAI);
    state.isSwapping = false;
  }, SWAP_DELAY);
}

export function findMatches(isAI = false) {
  const grid = isAI ? aiState.grid : playerState.grid;
  const matches = new Set();
  
  // Horizontal matches
  for (let y = 0; y < GRID_Y; y++) {
    let count = 1;
    for (let x = 1; x < GRID_X; x++) {
      if (grid[y][x].dataset.color &&
          !grid[y][x].classList.contains('falling') &&
          !grid[y][x].classList.contains('popping') &&
          !grid[y][x].classList.contains('matched') &&
          !grid[y][x - 1].classList.contains('falling') &&
          !grid[y][x - 1].classList.contains('popping') &&
          !grid[y][x - 1].classList.contains('matched') &&
          grid[y][x].dataset.color === grid[y][x - 1].dataset.color) {
        count++;
      } else {
        if (count >= 3) {
          for (let i = x - count; i < x; i++) matches.add(`${i},${y}`);
        }
        count = 1;
      }
    }
    if (count >= 3) {
      for (let i = GRID_X - count; i < GRID_X; i++) matches.add(`${i},${y}`);
    }
  }

  // Vertical matches
  for (let x = 0; x < GRID_X; x++) {
    let count = 1;
    for (let y = 1; y < GRID_Y; y++) {
      if (grid[y][x].dataset.color &&
          !grid[y][x].classList.contains('falling') &&
          !grid[y][x].classList.contains('popping') &&
          !grid[y][x].classList.contains('matched') &&
          !grid[y - 1][x].classList.contains('falling') &&
          !grid[y - 1][x].classList.contains('popping') &&
          !grid[y - 1][x].classList.contains('matched') &&
          grid[y][x].dataset.color === grid[y - 1][x].dataset.color) {
        count++;
      } else {
        if (count >= 3) {
          for (let i = y - count; i < y; i++) matches.add(`${x},${i}`);
        }
        count = 1;
      }
    }
    if (count >= 3) {
      for (let i = GRID_Y - count; i < GRID_Y; i++) matches.add(`${x},${i}`);
    }
  }

  return Array.from(matches).map(m => {
    const [x, y] = m.split(',').map(Number);
    return { x, y };
  });
}

export function removeMatches(matches, isAI = false) {
  const state = isAI ? aiState : playerState;
  
  if (!state.animationLock) {
    state.animationLock = true;
    // Only initialize chainLevel if it's not already in a chain
    if (state.chainLevel === 0) {
      state.chainLevel = 1;
    }
  }
  
  // Create background pulse for matches of 3 or more, or chains
  if (matches.length >= 3 || state.chainLevel > 1) {
    createBackgroundPulse(matches.length, state.chainLevel);
  }
  
  // Calculate center point of matches for score display
  const centerX = Math.floor(matches.reduce((sum, m) => sum + m.x, 0) / matches.length);
  const centerY = Math.floor(matches.reduce((sum, m) => sum + m.y, 0) / matches.length);
  
  // Award points
  if (!isAI) {
    const points = calculateMatchPoints(matches.length, state.chainLevel);
    updateScore(points, centerX, centerY);
  }

  // First add matched class to all blocks
  matches.forEach(({ x, y }) => state.grid[y][x].classList.add('matched'));

  // After a shorter matched animation, pop them one by one
  setTimeout(() => {
    // Sort matches from top to bottom, left to right
    const sortedMatches = matches.sort((a, b) => {
      if (a.y === b.y) return a.x - b.x;
      return a.y - b.y;
    });

    // Pop each block with a shorter delay
    sortedMatches.forEach(({ x, y }, index) => {
      setTimeout(() => {
        const block = state.grid[y][x];
        block.classList.remove('matched');
        block.classList.add('popping');
        audioManager.playPopSound(isAI);

        // Faster cleanup after pop animation
        setTimeout(() => {
          block.classList.remove('popping');
          block.dataset.color = '';
          block.className = 'block';
        }, 150); // Reduced from 200ms
      }, index * 60); // Reduced from 100ms to 60ms delay between pops
    });

    // Wait less time for pops to complete before dropping
    setTimeout(() => {
      setTimeout(() => dropBlocks(isAI), 30); // Reduced from 50ms
    }, matches.length * 60 + 100); // Adjusted timing for faster pops
  }, MATCH_DELAY / 2); // Cut the match delay in half
}

export function dropBlocks(isAI = false) {
  const state = isAI ? aiState : playerState;
  let changed = false;
  let blocksDropped = false;
  
  // First pass: Calculate where blocks will land
  const landingPositions = new Map(); // Store color and final position of falling blocks
  
  for (let x = 0; x < GRID_X; x++) {
    let writeIndex = GRID_Y - 1;
    
    for (let y = GRID_Y - 1; y >= 0; y--) {
      if (state.grid[y][x].dataset.color && 
          !state.grid[y][x].classList.contains('matched') && 
          !state.grid[y][x].classList.contains('popping')) {
        // Check if we're trying to drop into an already occupied space
        if (writeIndex < y && 
            state.grid[writeIndex][x].dataset.color && 
            !state.grid[writeIndex][x].classList.contains('matched') && 
            !state.grid[writeIndex][x].classList.contains('popping')) {
          // If we can't drop and we're in row 0, it's game over
          if (y === 0) {
            domManager.showGameOver(isAI);
            state.gameOver = true;
            return;
          }
          // Otherwise, just update the write index and continue
          writeIndex = y;
        }
        
        if (y !== writeIndex) {
          landingPositions.set(`${x},${writeIndex}`, state.grid[y][x].dataset.color);
          writeIndex--;
          changed = true;
          blocksDropped = true;
        } else {
          landingPositions.set(`${x},${y}`, state.grid[y][x].dataset.color);
          writeIndex--;
        }
      }
    }
  }
  
  // Modified findMatches to consider landing positions
  const findMatchesWithLanding = () => {
    const matches = new Set();
    
    // Helper to get color at position (either current or landing)
    const getColorAt = (x, y) => {
      const landingColor = landingPositions.get(`${x},${y}`);
      if (landingColor) return landingColor;
      return state.grid[y][x].dataset.color;
    };
    
    // Check for matches considering landing positions
    // Horizontal matches
    for (let y = 0; y < GRID_Y; y++) {
      let count = 1;
      let currentColor = null;
      for (let x = 0; x < GRID_X; x++) {
        const color = getColorAt(x, y);
        if (color && color === currentColor) {
          count++;
        } else {
          if (count >= 3) {
            for (let i = x - count; i < x; i++) matches.add(`${i},${y}`);
          }
          count = 1;
          currentColor = color;
        }
      }
      if (count >= 3) {
        for (let i = GRID_X - count; i < GRID_X; i++) matches.add(`${i},${y}`);
      }
    }
    
    // Vertical matches
    for (let x = 0; x < GRID_X; x++) {
      let count = 1;
      let currentColor = null;
      for (let y = 0; y < GRID_Y; y++) {
        const color = getColorAt(x, y);
        if (color && color === currentColor) {
          count++;
        } else {
          if (count >= 3) {
            for (let i = y - count; i < y; i++) matches.add(`${x},${i}`);
          }
          count = 1;
          currentColor = color;
        }
      }
      if (count >= 3) {
        for (let i = GRID_Y - count; i < GRID_Y; i++) matches.add(`${x},${i}`);
      }
    }
    
    return Array.from(matches).map(m => {
      const [x, y] = m.split(',').map(Number);
      return { x, y };
    });
  };
  
  // Perform the actual block drops
  for (let x = 0; x < GRID_X; x++) {
    let writeIndex = GRID_Y - 1;
    const fallDistances = new Map();
    
    for (let y = GRID_Y - 1; y >= 0; y--) {
      if (state.grid[y][x].dataset.color) {
        if (y !== writeIndex) {
          fallDistances.set(y, { targetY: writeIndex, distance: (writeIndex - y) * (BLOCK_SIZE + GAP) });
          writeIndex--;
          changed = true;
          blocksDropped = true;
        } else writeIndex--;
      }
    }
    
    for (let [sourceY, { targetY, distance }] of fallDistances) {
      const fallingBlock = state.grid[sourceY][x];
      const color = fallingBlock.dataset.color;
      updateBlockVisuals(fallingBlock, null);
      
      const targetBlock = state.grid[targetY][x];
      updateBlockVisuals(targetBlock, color);
      updateBlockPos(targetBlock, x, targetY);
      
      // Calculate duration based on distance (maintaining consistent speed)
      const baseDuration = 0.2; // Increased from 0.15 to 0.2
      const duration = Math.min(0.6, baseDuration + (Math.abs(targetY - sourceY) * 0.06)); // Increased increment and max duration
      
      targetBlock.style.setProperty('--fall-distance', `${distance}px`);
      targetBlock.style.setProperty('--fall-duration', `${duration}s`);
      targetBlock.classList.add('falling');
    }
  }
  
  if (changed) {
    setTimeout(() => {
      document.querySelectorAll('.falling').forEach(b => b.classList.remove('falling'));
      
      setTimeout(() => {
        const matches = findMatchesWithLanding();
        if (matches.length > 0) {
          if (blocksDropped && state.animationLock) state.chainLevel++;
          removeMatches(matches, isAI);
        } else {
          animationComplete(isAI);
        }
      }, 50);
    }, DROP_DELAY);
  } else {
    const matches = findMatchesWithLanding();
    if (matches.length > 0) {
      removeMatches(matches, isAI);
    } else {
      animationComplete(isAI);
    }
  }
}

export function riseBlocks(isAI = false) {
  const state = isAI ? aiState : playerState;
  const grid = state.grid;
  
  state.animationLock = true;

  // Spawn a new row at the top (row 0)
  // For each column we pick a random color and mark the block as "new"
  for (let x = 0; x < GRID_X; x++) {
    let attempts = 0, color;
    do {
      color = randomElement();
      attempts++;
      if (attempts > 10) break;
    } while (false); // No extra adjacent-color checks needed when spawning at the top
    updateBlockVisuals(grid[0][x], color);
    updateBlockPos(grid[0][x], x, 0);
    grid[0][x].classList.add('new-row'); // mark as a freshly spawned row
  }

  // Stay locked for 1 second then "release" so the block(s) can drop (if any space is available)
  setTimeout(() => {
    for (let x = 0; x < GRID_X; x++) {
      grid[0][x].classList.remove('new-row');
    }
    // Let the gravity / drop logic handle moving any blocks down into vacant positions
    dropBlocks(isAI);
  }, 1000);
}

function calculateMatchPoints(matchCount, chainLevel) {
  // Base points for a match of 3
  let points = 100;
  
  // Bonus points for matches larger than 3
  if (matchCount > 3) {
    points += (matchCount - 3) * 50;
  }
  
  // Chain bonus (triples for each chain)
  const multiplier = Math.pow(3, chainLevel - 1);
  points *= multiplier;
  
  return Math.floor(points);
}

function createBackgroundPulse(matchCount, chainLevel) {
  const numPulses = Math.min(3, Math.floor((matchCount + chainLevel) / 2));
  
  for (let i = 0; i < numPulses; i++) {
    setTimeout(() => {
      const pulse = document.createElement('div');
      pulse.className = 'background-pulse';
      
      const duration = Math.max(800, matchCount * 150 + chainLevel * 200);
      pulse.style.animation = `backgroundPulse ${duration}ms ease-out`;
      pulse.style.animationFillMode = 'forwards';
      
      document.body.appendChild(pulse);
      setTimeout(() => pulse.remove(), duration);
    }, i * 200);
  }
}

function animationComplete(isAI = false) {
  const state = isAI ? aiState : playerState;
  
  // Only reset chainLevel if there are no pending matches
  const matches = findMatches(isAI);
  if (matches.length === 0) {
    state.chainLevel = 0;
  }
  
  state.animationLock = false;
  
  if (state.pendingRowRise) {
    state.pendingRowRise = false;
    riseBlocks(isAI);
  }
}

export function initGrid(isAI = false) {
  const state = isAI ? aiState : playerState;
  const gridElement = isAI ? domManager.aiGrid : domManager.playerGrid;
  
  gridElement.innerHTML = '';
  state.grid = [];
  
  for (let y = 0; y < GRID_Y; y++) {
    state.grid[y] = [];
    for (let x = 0; x < GRID_X; x++) {
      const block = document.createElement('div');
      block.className = 'block';
      updateBlockPos(block, x, y);
      
      if (y >= GRID_Y / 2) {  // Fill bottom half with blocks
        let attempts = 0, color;
        do {
          color = randomElement();
          attempts++;
          if (attempts > 10) break;
        } while (
          (x >= 2 && color === state.grid[y][x - 1]?.dataset.color && color === state.grid[y][x - 2]?.dataset.color) ||
          (y >= 2 && color === state.grid[y - 1][x]?.dataset.color && color === state.grid[y - 2][x]?.dataset.color)
        );
        
        updateBlockVisuals(block, color);
      }
      
      state.grid[y][x] = block;
      gridElement.appendChild(block);
    }
  }
  
  setTimeout(() => {
    if (findMatches(isAI).length) {
      removeMatches(findMatches(isAI), isAI);
    }
  }, 100);
  
  // Update cursor position for both player and AI
  if (!isAI) {
    domManager.updateCursor(state.cursorX, state.cursorY);
  } else {
    // Set initial AI cursor position to middle of bottom row
    const initialX = Math.floor(GRID_X / 2) - 1;
    const initialY = GRID_Y - 1;
    domManager.updateCursor(initialX, initialY, true);
  }
}

export function updateScore(points, x, y) {
  playerState.currentScore += points;
  domManager.scoreDisplay.textContent = playerState.currentScore;
  
  // Get current difficulty
  const currentDifficulty = localStorage.getItem('gameDifficulty') || '3';
  const highScoreKey = `highScore_${currentDifficulty}`;
  const currentHighScore = parseInt(localStorage.getItem(highScoreKey)) || 0;
  
  if (playerState.currentScore > currentHighScore) {
    localStorage.setItem(highScoreKey, playerState.currentScore);
    domManager.highScoreDisplay.textContent = playerState.currentScore;
  }
  
  domManager.updateScore(points, x, y);
}

export function riseNewRow(isAI = false) {
  const state = isAI ? aiState : playerState;
  const grid = state.grid;
  
  state.animationLock = true;

  // Get current difficulty from localStorage
  const difficulty = parseInt(localStorage.getItem('gameDifficulty')) || 1;
  const riseTime = getRiseTime(difficulty);

  // Create a new row container
  const risingRow = document.createElement('div');
  risingRow.className = 'rising-row';
  
  // Set the rise duration as a CSS custom property
  risingRow.style.setProperty('--rise-duration', `${riseTime}ms`);

  // Create blocks for each column
  for (let x = 0; x < GRID_X; x++) {
    const block = document.createElement('div');
    block.className = 'block';
    const color = randomElement();
    updateBlockVisuals(block, color);
    risingRow.appendChild(block);
  }

  // Add the rising row to the game container
  const container = isAI ? domManager.aiBoard : domManager.playerContainer;
  container.appendChild(risingRow);

  // After the rise time, check if we can add the new row
  setTimeout(() => {
    // Check if any column in row 0 is occupied
    for (let x = 0; x < GRID_X; x++) {
      if (grid[0][x].dataset.color) {
        // Can't add new row - game over!
        risingRow.remove();
        domManager.showGameOver(isAI);
        state.gameOver = true;
        state.animationLock = false;
        return;
      }
    }
    
    // If we get here, it's safe to add the new row
    for (let x = 0; x < GRID_X; x++) {
      const newColor = risingRow.children[x].dataset.color;
      updateBlockVisuals(grid[0][x], newColor);
    }
    risingRow.remove();
    
    // Let gravity / drop logic integrate the new row
    dropBlocks(isAI);
    state.animationLock = false;
    
    // Start the next rising row cycle if the game is still active
    if (!state.gameOver) {
      riseNewRow(isAI);
    }
  }, riseTime);
}

function updateDangerAnimation() {
  const inDanger = playerState.grid[0]?.some(block => block.dataset.color);
  if (inDanger) domManager.shakeContainer.classList.add('shaking');
  else domManager.shakeContainer.classList.remove('shaking');
  
  playerState.grid.forEach(row => row.forEach(block => {
    if (block.dataset.color && 
        !block.classList.contains('falling') && 
        !block.classList.contains('shift-up')) {
      if (inDanger) block.classList.add('danger');
      else block.classList.remove('danger');
    } else {
      block.classList.remove('danger');
    }
  }));
} 