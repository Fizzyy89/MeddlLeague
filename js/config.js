// Configuration & constants
export const GRID_X = 8;
export const GRID_Y = 16;
export const BLOCK_SIZE = 50;
export const GAP = 3;
export const GRID_PADDING = 5;

// Game mechanics
export const CHAIN_TIMEOUT = 2000; // Time in ms before chain resets
export const DEFAULT_SPEED = 3;
export const DEFAULT_DIFFICULTY = 'easy';

// Performance settings
export const FPS_SAMPLE_SIZE = 60;
export const FALL_SPEED = 600;
export const MANUAL_RISING_SPEED = 2;

// UI Layout
export const UI_SETTINGS = {
    MARGIN_HORIZONTAL: 80,
    MARGIN_VERTICAL: 200,
    MAX_GAME_WIDTH: 500,
    MIN_SCALE: 0.4,
    MAX_SCALE: 1.2
};

// Animation durations (in ms)
export const SWAP_ANIMATION_DURATION = 150;
export const MATCH_FLASH_DURATION = 600;
export const POP_ANIMATION_DURATION = 250;
export const FALL_ANIMATION_DURATION = 150;
export const FLOATING_SCORE_DURATION = 1000;
export const MATCH_COUNT_POPUP_DURATION = 1500;
export const CHAIN_DISPLAY_DURATION = 1000;
export const DANGER_PULSE_DURATION = 300;

// Visual effects
export const BLOCK_CORNER_RADIUS = 8;
export const CURSOR_CORNER_RADIUS = 8;
export const CURSOR_GLOW_RADIUS = 10;
export const CURSOR_PADDING = 3;
export const CURSOR_GLOW_PADDING = 5;
export const BLOCK_SHADOW_BLUR = 4;
export const BLOCK_SHADOW_OFFSET = 2;
export const PREVIEW_ROW_OPACITY = 0.3;

// Animation effects
export const ANIMATION_EFFECTS = {
    DANGER_SHADOW_BLUR: 20,
    MATCH_SHADOW_BLUR: 10,
    DANGER_PULSE_MIN: 0.7,
    DANGER_PULSE_MAX: 1.0,
    MATCH_ALPHA_MIN: 0.8,
    MATCH_ALPHA_MAX: 1.0,
    MATCH_SCALE_MIN: 1.0,
    MATCH_SCALE_MAX: 1.05
};

// Game rules
export const GAME_RULES = {
    DANGER_TOP_ROWS: 2,
    MAX_BLOCK_ATTEMPTS: 10,
    MIN_MATCH_SIZE: 3
};

// Font settings
export const BLOCK_FONT_SIZE = 30;
export const BLOCK_FONT_FAMILY = 'Arial';
export const FLOATING_SCORE_FONT_SIZE = 32;
export const CHAIN_MULTIPLIER_FONT_SIZE = 28;
export const MATCH_COUNT_FONT_SIZE = 24;
export const CHAIN_DISPLAY_FONT_SIZE = 48;

// Game speed settings
export const SPEED_SETTINGS = {
    MIN_SPEED: 1,
    MAX_SPEED: 50,
    MIN_ROWS_PER_SECOND: 0.083, // Speed 1: ~5 rows per minute
    MAX_ROWS_PER_SECOND: 0.833, // Speed 50: ~50 rows per minute
    BASE_INCREASE_INTERVAL: 20000, // 20 seconds
    BASE_SPEED_INCREASE: 1
};

// Difficulty multipliers for speed increase
export const DIFFICULTY_MULTIPLIERS = {
    'very-easy': 0.3,   // Speed increases 30% slower than normal
    'easy': 0.6,        // Speed increases 60% slower than normal
    'normal': 1.0,      // Normal speed increase
    'hard': 1.5,        // Speed increases 50% faster than normal
    'very-hard': 2.0    // Speed increases twice as fast
};

// Warning durations for danger state (in ms)
export const DANGER_WARNING_DURATIONS = {
    'very-easy': 4000,  // 4 seconds
    'easy': 3000,       // 3 seconds
    'normal': 2000,     // 2 seconds
    'hard': 1500,       // 1.5 seconds
    'very-hard': 1000   // 1 second
};

// Background effects
export const BACKGROUND_SETTINGS = {
    EMOJI_COUNT: 5,
    PARTICLE_COUNT: 20,
    MIN_EMOJI_SIZE: 60,
    MAX_EMOJI_SIZE: 100,
    EMOJI_SPEED: 2,
    PARTICLE_MIN_SPEED: 0.5,
    PARTICLE_MAX_SPEED: 1.0,
    PARTICLE_MIN_SIZE: 3,
    PARTICLE_MAX_SIZE: 6
};