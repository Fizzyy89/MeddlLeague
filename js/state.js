// Game state management
class GameState {
  constructor() {
    this.grid = [];
    this.cursorX = 0;
    this.cursorY = 0;
    this.isSwapping = false;
    this.gameOver = false;
    this.pendingRowRise = false;
    this.animationLock = false;
    this.currentScore = 0;
    this.highScore = parseInt(localStorage.getItem('highScore')) || 0;
    this.chainLevel = 0;
  }

  reset() {
    this.grid = [];
    this.cursorX = 0;
    this.cursorY = 0;
    this.isSwapping = false;
    this.gameOver = false;
    this.pendingRowRise = false;
    this.animationLock = false;
    this.currentScore = 0;
    this.chainLevel = 0;
  }
}

class AIState {
  constructor() {
    this.grid = [];
    this.cursorX = 0;
    this.cursorY = 0;
    this.isMoving = false;
    this.moveQueue = [];
    this.lastMoveTime = 0;
    this.animationLock = false;
    this.pendingRowRise = false;
    this.chainLevel = 0;
    this.score = 0;
    this.gameOver = false;
    this.difficulty = 'easy';
    this.moveInterval = null;
  }

  reset() {
    this.grid = [];
    this.cursorX = 0;
    this.cursorY = 0;
    this.isMoving = false;
    this.moveQueue = [];
    this.lastMoveTime = 0;
    this.animationLock = false;
    this.pendingRowRise = false;
    this.chainLevel = 0;
    this.score = 0;
    this.gameOver = false;
    if (this.moveInterval) {
      clearInterval(this.moveInterval);
      this.moveInterval = null;
    }
  }
}

export const playerState = new GameState();
export const aiState = new AIState(); 