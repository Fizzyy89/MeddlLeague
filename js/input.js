import { playerState } from './state.js';
import { domManager } from './dom.js';
import { swapBlocks } from './game-logic.js';
import { GRID_X, GRID_Y, BLOCK_SIZE, GAP, GRID_PADDING } from './config.js';

export class InputManager {
  constructor() {
    this.setupEventListeners();
  }

  setupEventListeners() {
    document.addEventListener('keydown', this.handleKeyDown.bind(this));
    domManager.playerContainer.addEventListener('mousemove', this.handleMouseMove.bind(this));
    domManager.playerContainer.addEventListener('click', this.handleMouseClick.bind(this));
    window.addEventListener('resize', () => domManager.updateCursor(playerState.cursorX, playerState.cursorY));
  }

  handleKeyDown(e) {
    const actions = {
      ArrowUp: () => { if (playerState.cursorY > 0) playerState.cursorY--; },
      ArrowDown: () => { if (playerState.cursorY < GRID_Y - 1) playerState.cursorY++; },
      ArrowLeft: () => { if (playerState.cursorX > 0) playerState.cursorX--; },
      ArrowRight: () => { if (playerState.cursorX < GRID_X - 2) playerState.cursorX++; },
      ' ': () => swapBlocks(playerState.cursorX, playerState.cursorY, playerState.cursorX + 1, playerState.cursorY)
    };

    if (actions[e.key]) {
      e.preventDefault();
      actions[e.key]();
      domManager.updateCursor(playerState.cursorX, playerState.cursorY);
    }
  }

  handleMouseMove(event) {
    const gridRect = domManager.playerGrid.getBoundingClientRect();
    const containerRect = domManager.playerContainer.getBoundingClientRect();
    const baseX = gridRect.left - containerRect.left + GRID_PADDING - 3;
    const baseY = gridRect.top - containerRect.top + GRID_PADDING - 3;
    const mouseX = event.clientX - containerRect.left;
    const mouseY = event.clientY - containerRect.top;
    
    playerState.cursorX = Math.max(0, Math.min(Math.floor((mouseX - baseX) / (BLOCK_SIZE + GAP)), GRID_X - 2));
    playerState.cursorY = Math.max(0, Math.min(Math.floor((mouseY - baseY) / (BLOCK_SIZE + GAP)), GRID_Y - 1));
    
    domManager.updateCursor(playerState.cursorX, playerState.cursorY);
  }

  handleMouseClick() {
    swapBlocks(playerState.cursorX, playerState.cursorY, playerState.cursorX + 1, playerState.cursorY);
  }
}

export const inputManager = new InputManager(); 