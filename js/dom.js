import { playerState } from './state.js';
import { GRID_X, GRID_Y, BLOCK_SIZE, GAP, GRID_PADDING } from './config.js';

// DOM element references and manipulation
export class DOMManager {
  constructor() {
    // Grid elements
    this.playerGrid = document.getElementById('gameGrid');
    this.aiGrid = document.getElementById('aiGrid');
    
    // Containers
    this.playerContainer = document.querySelector('.game-container:not(.theme-retro)');
    this.aiBoard = document.querySelector('.game-container.theme-retro');
    this.shakeContainer = document.createElement('div');
    
    // Cursors
    this.cursorContainer = document.getElementById('cursorContainer');
    this.aiCursorElement = document.getElementById('aiCursor');
    this.cursorBlocks = [document.createElement('div'), document.createElement('div')];
    this.aiCursorBlocks = [document.createElement('div'), document.createElement('div')];
    
    // Score displays
    this.scoreDisplay = document.getElementById('scoreValue');
    this.highScoreDisplay = document.getElementById('highScoreValue');
    
    // Initialize high score display
    this.highScoreDisplay.textContent = playerState.highScore;
    
    // Selectors
    this.themeSelect = document.getElementById('themeSelect');
    this.difficultySelect = document.getElementById('difficultySelect');
    
    this.initializeDOM();
  }

  initializeDOM() {
    // Setup shake container
    this.shakeContainer.className = 'shake-container';
    this.playerContainer.appendChild(this.shakeContainer);
    
    // Setup cursor blocks
    this.cursorBlocks.forEach(block => {
      block.className = 'cursor-block';
      this.cursorContainer.appendChild(block);
    });
    
    this.aiCursorBlocks.forEach(block => {
      block.className = 'cursor-block';
      this.aiCursorElement.appendChild(block);
    });
    
    // Setup AI board
    this.aiBoard.classList.add('ai-board', 'theme-villain');
  }

  updateCursor(x, y, isAI = false) {
    const grid = isAI ? this.aiGrid : this.playerGrid;
    const container = isAI ? this.aiBoard : this.playerContainer;
    const blocks = isAI ? this.aiCursorBlocks : this.cursorBlocks;
    
    const gridRect = grid.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    const baseX = gridRect.left - containerRect.left + GRID_PADDING - 3;
    const baseY = gridRect.top - containerRect.top + GRID_PADDING - 3;
    const xPos = baseX + x * (BLOCK_SIZE + GAP);
    const yPos = baseY + y * (BLOCK_SIZE + GAP);
    
    blocks[0].style.transform = `translate(${xPos}px, ${yPos}px)`;
    blocks[1].style.transform = `translate(${xPos + BLOCK_SIZE + GAP}px, ${yPos}px)`;
  }

  updateScore(points, x, y) {
    const pointsPopup = document.createElement('div');
    pointsPopup.className = 'points-popup';
    
    if (points >= 500) pointsPopup.classList.add('huge');
    else if (points >= 200) pointsPopup.classList.add('big');
    
    pointsPopup.textContent = `+${points}`;
    
    const gridRect = this.playerGrid.getBoundingClientRect();
    pointsPopup.style.left = `${x * (BLOCK_SIZE + GAP) + GRID_PADDING}px`;
    pointsPopup.style.top = `${y * (BLOCK_SIZE + GAP) + GRID_PADDING}px`;
    
    this.playerGrid.appendChild(pointsPopup);
    setTimeout(() => pointsPopup.remove(), 1200);
  }

  showGameOver(isWin = false) {
    const modal = document.createElement('div');
    modal.className = 'game-over-modal';
    modal.innerHTML = `
      <h2>${isWin ? 'YOU WIN!' : 'GAME OVER!'}</h2>
      <p>${isWin ? 'Congratulations!' : `Final Score: ${playerState.currentScore}`}</p>
      ${!isWin ? `<p>High Score: ${playerState.highScore}</p>` : ''}
      <button>Play Again</button>
    `;
    
    document.body.appendChild(modal);
    modal.querySelector('button').addEventListener('click', () => {
      location.reload();
    });
  }
}

export const domManager = new DOMManager(); 