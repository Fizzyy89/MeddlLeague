import { playerState, aiState } from './state.js';
import { domManager } from './dom.js';
import { audioManager } from './audio.js';
import { themeManager } from './theme-manager.js';
import { inputManager } from './input.js';
import { aiLogic } from './ai-logic.js';
import { initGrid, riseNewRow } from './game-logic.js';
import { GRID_X, GRID_Y } from './config.js';

class GameManager {
  constructor() {
    console.log('GameManager initializing...');
    this.setupEventListeners();
    this.initializeFromURL();
    
    // Add this line to check danger state every 200ms
    setInterval(() => this.updateDangerAnimation(), 200);
  }

  setupEventListeners() {
    // Remove difficulty selection handler
    
    // Start music after first user interaction
    document.addEventListener('click', () => {
      if (audioManager.bgMusic.paused) {
        audioManager.updateThemeMusic(themeManager.getCurrentTheme());
        audioManager.bgMusic.play().catch(console.log);
      }
    }, { once: true });

    // Update danger animation
    setInterval(() => this.updateDangerAnimation(), 200);

    // Add toggle functionality for info box
    const infoBox = document.querySelector('.info-box');
    const toggleButton = document.querySelector('.info-box-toggle');
    
    toggleButton?.addEventListener('click', () => {
      infoBox.classList.toggle('hidden');
    });
  }

  initializeFromURL() {
    console.log('Initializing from URL...');
    const urlParams = new URLSearchParams(window.location.search);
    const mode = urlParams.get('mode');
    console.log('Mode from URL:', mode);
    
    if (mode === 'vs-ai') {
      document.body.classList.add('vs-ai-mode');
      
      // Set default difficulty to "1"
      aiState.difficulty = "1";
      
      initGrid();
      initGrid(true);
      aiLogic.startAI();
      this.startRisingBlocks(true);
    } else {
      // Solo mode
      document.body.classList.remove('vs-ai-mode');
      
      initGrid();
      this.startRisingBlocks(false);
    }
  }

  startRisingBlocks(includeAI) {
    // Start the rising row cycle for the player's grid.
    if (!playerState.gameOver) {
      riseNewRow();
    }

    // Additionally, if in VS AI mode, start the rising row cycle for AI.
    if (includeAI && !aiState.gameOver) {
      riseNewRow(true);
    }
  }

  resetGame() {
    // Reset player state
    playerState.reset();
    domManager.scoreDisplay.textContent = '0';
    
    // Reset AI state if in VS AI mode
    if (document.body.classList.contains('vs-ai-mode')) {
      aiState.reset();
    }
    
    // Clear ALL intervals thoroughly
    const highestId = window.setInterval(() => {}, 0);
    for (let i = 0; i < highestId; i++) {
      window.clearInterval(i);
    }
    
    // Reset cursor position and update display
    playerState.cursorX = 0;
    playerState.cursorY = 0;
    domManager.updateCursor(0, 0);
  }

  updateDangerAnimation() {
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
}

// Initialize game when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM loaded, creating GameManager...');
  new GameManager();
});

// Update game mode title based on URL parameter
function updateGameModeTitle() {
  const urlParams = new URLSearchParams(window.location.search);
  const mode = urlParams.get('mode');
  const gameModeTitle = document.getElementById('gameMode');
  const currentDifficulty = localStorage.getItem('gameDifficulty') || '3';
  
  if (gameModeTitle) {
    if (mode === 'vs-ai') {
      gameModeTitle.textContent = 'VS. COMPUTER';
    } else {
      gameModeTitle.textContent = 'SOLO PLAY';
    }
  }

  // Update difficulty display
  const difficultyDisplay = document.getElementById('currentDifficulty');
  if (difficultyDisplay) {
    difficultyDisplay.textContent = currentDifficulty;
  }

  // Load the high score for current difficulty
  const highScoreKey = `highScore_${currentDifficulty}`;
  const currentHighScore = localStorage.getItem(highScoreKey) || '0';
  const highScoreDisplay = document.getElementById('highScoreValue');
  if (highScoreDisplay) {
    highScoreDisplay.textContent = currentHighScore;
  }
}

// Call this when the page loads
updateGameModeTitle(); 