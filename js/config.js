// Configuration & constants
export const GRID_X = 8;
export const GRID_Y = 16;
export const ELEMENTS = ['red', 'blue', 'green', 'yellow', 'purple'];
export const BLOCK_SIZE = 50;
export const GAP = 3;
export const GRID_PADDING = 5;
export const GAME_PADDING = 15;

// Animation timing constants
export const SWAP_DELAY = 100;
export const MATCH_DELAY = 500;
export const DROP_DELAY = 300;
export const RISE_DELAY = 300;

// Rising row timing constants (in milliseconds)
export const RISE_TIMINGS = {
  1: 15000,  // 15 seconds - Very Easy
  2: 12000,  // 12 seconds - Easy
  3: 10000,  // 10 seconds - Default
  4: 8000,   // 8 seconds
  5: 6500,   // 6.5 seconds
  6: 5000,   // 5 seconds
  7: 4000,   // 4 seconds
  8: 3500,   // 3.5 seconds
  9: 3000,   // 3 seconds
  10: 2500   // 2.5 seconds - Hard
};

// Helper function to get rise time based on difficulty
export function getRiseTime(difficulty) {
  return RISE_TIMINGS[difficulty] || RISE_TIMINGS[1];
}

// Simplified AI settings
export const AI_SETTINGS = {
  "1": {
    moveDelay: 1500,
    thinkTime: 600,
    missChance: 0.6,
    randomChance: 0.5,
    setupChance: 0.2
  }
}; 