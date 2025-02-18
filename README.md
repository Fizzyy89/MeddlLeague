# Landratsamt Puzzle League Documentation

## Overview
Landratsamt Puzzle League is a browser-based match-3 puzzle game inspired by games like Panel de Pon/Tetris Attack. The game features both single-player and AI opponent modes, multiple themes, and difficulty settings.

## File Structure
The game is organized into several key files and directories: 

landratsamt-puzzle-league/
├── index.html           # Main menu/landing page
├── game.html           # Game interface
├── css/
│ ├── style.css        # Main styles
│ ├── themes.css       # Theme-specific styles
│ └── animations.css   # Animation definitions
├── js/
│ ├── main.js         # Game initialization and management
│ ├── game-logic.js   # Core gameplay mechanics
│ ├── state.js        # Game state management
│ ├── input.js        # Input handling
│ ├── dom.js          # DOM manipulation
│ ├── audio.js        # Audio system
│ ├── ai-logic.js     # AI opponent logic
│ ├── theme-manager.js # Theme management
│ └── config.js       # Game constants and settings
└── music/
  ├── menu.mp3        # Menu background music
  └── theme.mp3       # In-game background music
```

## HTML Files

### index.html
The main menu page that serves as the entry point to the game.

#### Key Features:
- **Game Mode Selection**
  - Solo Play
  - VS Computer (Alpha version)
  - Options Menu
  - High Scores Display

- **Options Modal**
  - Difficulty settings (1-10 scale)
  - Visual difficulty indicators with color coding
  - Persistent settings storage using localStorage
  - Warning system for high difficulty levels

- **High Scores Modal**
  - Displays scores for each difficulty level
  - Color-coded difficulty display
  - Persistent score storage

- **Audio Controls**
  - Volume slider
  - Mute toggle
  - Persistent audio settings

- **Visual Elements**
  - Particle effects background
  - Bouncing emoji animations
  - Retro-styled logo

### game.html
The main game interface where gameplay takes place.

#### Key Features:
- **Game Boards**
  - Main player grid
  - AI opponent grid (for VS mode)
  - Cursor system for both players

- **Information Panel**
  - Game mode indicator
  - Current difficulty display
  - Score tracking
  - High score display
  - How to play instructions
  - Theme selector

- **Theme System**
  Available themes:
  - Elements
  - Farm Animals
  - Retro Gaming
  - Space
  - Food
  - Weather

- **Controls**
  - Keyboard support (arrow keys + space)
  - Mouse support (click to swap)
  - Menu navigation

- **Audio System**
  - Background music
  - Volume controls
  - Mute functionality

## CSS Files

### animations.css
Contains all animation keyframes and animation-related styles for the game.

#### Key Animation Categories:

- **Points Popup Animations**
  - `pointsFloat`: Standard points animation
  - `pointsFloatHuge`: Enhanced animation for large point values
  - Properties: Scale, rotation, opacity transitions

- **Game Element Animations**
  - `shimmer`: Shimmering effect for matched blocks
  - `dangerPulse`: Warning animation for danger state
  - `dangerSpin`: Rotation animation for danger indicators
  - `shift-up`: Block movement animation
  - `fall-custom`: Customizable falling animation with dynamic distance
  - `cursorGlow`: Pulsing glow effect for the cursor
  - `pulseGlow`: General purpose pulsing opacity animation

- **Block Interaction Animations**
  - `swap-left`, `swap-right`: Block swapping animations
  - `popAndVanish`: Block clearing animation
  - `scaleUp`: Block appearance animation

- **Background and Particle Effects**
  - `particleFloat`: Floating particle animation
  - `backgroundPulse`: Background effect animation
  - `gradientBG`: Gradient background movement
  - `gradientFlow`: Flowing gradient animation

- **Menu and UI Animations**
  - `bounce1` through `bounce5`: Unique bouncing patterns for emoji decorations
  - `glow`: Text glow effect animation
  - `float`: Floating element animation
  - `lineExpand`: Decorative line animation

### style.css
Main stylesheet containing core game styles and layouts.

#### Key Style Components:

- **Base Layout**
  - Responsive grid system
  - Flexbox-based layouts
  - Game board positioning
  - Modal overlay structure

- **Game Elements**
  - Block styling and dimensions
  - Cursor design and positioning
  - Grid layout and spacing
  - Score display formatting

- **UI Components**
  - Information panel design
  - Volume controls
  - Menu buttons and navigation
  - Modal windows

- **Theme Integration**
  - Theme-specific container styles
  - Background gradients
  - Visual effect containers

- **Responsive Design**
  - Mobile-friendly adjustments
  - Flexible layouts
  - Dynamic sizing

### themes.css
Manages the visual themes and their variations.

#### Theme System:

- **Theme Variables**
  Each theme defines:
  - Block colors (red, blue, green, yellow, purple)
  - Emoji characters for each color
  - Background gradients
  - Particle effects
  - Pulse colors

- **Available Themes**
  1. **Elements Theme**
     - Natural element emojis (🔥💧🍀⚡🌀)
     - Vibrant primary colors

  2. **Farm Animals Theme**
     - Farm animal emojis (🐮🐑🐷🐔🐴)
     - Softer, pastoral color palette

  3. **Retro Gaming Theme**
     - Classic gaming symbols (♥◆★●▲)
     - NES-inspired color scheme

  4. **Space Theme**
     - Space-related emojis (🛸⭐👾☄️🪐)
     - Deep space color gradients

  5. **Food Theme**
     - Food emojis (🍓🫐🥑🍌🍇)
     - Bright, appetizing colors

  6. **Weather Theme**
     - Weather emojis (🌅🌈🌱☀️⚡)
     - Natural phenomenon colors

  7. **Villain Theme** (AI Only)
     - Villain-themed emojis (👿💀🦹⚔️🗡️)
     - Dark, ominous color scheme

#### Theme Implementation:
- CSS Custom Properties for easy theme switching
- Consistent structure across themes
- Separate particle and pulse effect definitions
- Theme-specific background gradients
- Automatic emoji and color coordination

## JavaScript Files

### config.js
Contains game constants and configuration settings.

#### Key Configurations:
- **Grid Settings**
  - `GRID_X`: 8 columns
  - `GRID_Y`: 16 rows
  - `ELEMENTS`: Available block colors ['red', 'blue', 'green', 'yellow', 'purple']
  - `BLOCK_SIZE`: 50 pixels
  - `GAP`: 3 pixels between blocks

- **Animation Timings**
  - `SWAP_DELAY`: 100ms for block swapping
  - `MATCH_DELAY`: 500ms for match recognition
  - `DROP_DELAY`: 300ms for block dropping
  - `RISE_DELAY`: 300ms for rising blocks

- **Difficulty System**
  - Rising row timing configuration (RISE_TIMINGS):
    - Level 1: 15 seconds (Very Easy)
    - Level 2: 12 seconds (Easy)
    - Level 3: 10 seconds (Default)
    - Level 4-10: Progressively faster timings
    - Level 10: 2.5 seconds (Hardest)

- **AI Settings**
  Basic AI configuration for difficulty level 1:
  - `moveDelay`: 1500ms between moves
  - `thinkTime`: 600ms decision time
  - `missChance`: 60% chance to miss optimal moves
  - `randomChance`: 50% chance for random moves
  - `setupChance`: 20% chance to set up combinations

### main.js
Core game management and initialization.

#### Key Components:
- **GameManager Class**
  - Initializes game systems
  - Handles game mode selection
  - Manages game state
  - Controls rising block mechanics
  - Handles game reset functionality

- **Game Mode Management**
  - Solo play initialization
  - VS AI mode setup
  - Mode-specific UI updates
  - Difficulty level handling

- **Event Listeners**
  - User interaction handling
  - Audio initialization
  - Info box toggle functionality
  - Game state updates

### game-logic.js
Core gameplay mechanics and rules implementation.

#### Key Features:

- **Block Management**
  - `updateBlockPos`: Updates block grid position
  - `updateBlockVisuals`: Handles block appearance
  - `randomElement`: Random block color generation

- **Core Mechanics**
  - `swapBlocks`: Block swapping logic
  - `findMatches`: Match detection algorithm
  - `removeMatches`: Match clearing and scoring
  - `dropBlocks`: Gravity and block falling
  - `riseBlocks`: Rising block mechanics

- **Scoring System**
  - Point calculation based on:
    - Match size (3+ blocks)
    - Chain combos
    - Difficulty level
  - High score tracking per difficulty level

- **Game State Control**
  - Grid initialization
  - Game over detection
  - Chain combo tracking
  - Animation state management

- **Visual Effects**
  - Background pulse effects
  - Score popup animations
  - Danger state indicators
  - Chain reaction visuals

#### Notable Algorithms:

- **Match Detection**
  - Horizontal and vertical match scanning
  - Chain combo detection
  - Match validation during block movement

- **Block Dropping**
  - Gravity simulation
  - Landing position calculation
  - Drop distance optimization
  - Collision detection

- **Rising Block System**
  - Dynamic difficulty adjustment
  - Safe row insertion
  - Game over condition checking
  - Animation timing management

- **Score Calculation**
  ```javascript
  Base Points = 100
  Match Bonus = (MatchSize - 3) * 50
  Chain Multiplier = 3^(ChainLevel - 1)
  Final Score = (Base Points + Match Bonus) * Chain Multiplier
  ```

### audio.js
Audio system management and sound effects handling.

#### Key Features:
- **Audio Manager Class**
  - Manages background music and sound effects
  - Handles volume controls
  - Persists audio settings

- **Sound Components**
  - Background music management
  - Pop sound effects (player and AI)
  - Volume control system
  - Mute functionality

- **Settings Persistence**
  - Saves volume level to localStorage
  - Saves mute state
  - Restores audio settings on page load

- **Theme Integration**
  - Theme-specific background music
  - Dynamic music switching
  - Seamless audio transitions

### input.js
Handles user input and control systems.

#### Key Features:
- **Input Manager Class**
  - Keyboard controls
  - Mouse input handling
  - Cursor positioning
  - Window resize handling

- **Control Schemes**
  - **Keyboard Controls**
    - Arrow keys for cursor movement
    - Spacebar for block swapping
    - Input validation and boundary checking

  - **Mouse Controls**
    - Real-time cursor following
    - Click to swap blocks
    - Grid-aligned cursor positioning
    - Boundary protection

- **Technical Implementation**
  - Grid coordinate calculation
  - Pixel-to-grid position conversion
  - Responsive cursor positioning
  - Event propagation management

### state.js
Manages game state and data structures.

#### Components:

- **GameState Class**
  Core player state management:
  ```javascript
  {
    grid: [],              // Game grid
    cursorX: 0,           // Cursor X position
    cursorY: 0,           // Cursor Y position
    isSwapping: false,    // Block swap state
    gameOver: false,      // Game over flag
    pendingRowRise: false,// Rising row state
    animationLock: false, // Animation state
    currentScore: 0,      // Current game score
    highScore: 0,         // Stored high score
    chainLevel: 0         // Current chain combo
  }
  ```

- **AIState Class**
  AI opponent state management:
  ```javascript
  {
    grid: [],              // AI grid
    cursorX: 0,           // AI cursor X
    cursorY: 0,           // AI cursor Y
    isMoving: false,      // Movement state
    moveQueue: [],        // Planned moves
    lastMoveTime: 0,      // Move timing
    animationLock: false, // Animation state
    pendingRowRise: false,// Rising row state
    chainLevel: 0,        // Chain combo
    score: 0,             // AI score
    gameOver: false,      // Game over state
    difficulty: 'easy',   // AI difficulty
    moveInterval: null    // Move timer
  }
  ```

#### State Management:
- **Player State**
  - Score tracking
  - Grid state
  - Animation states
  - Game progress
  - High score persistence

- **AI State**
  - Movement planning
  - Decision timing
  - Difficulty handling
  - Independent grid management
  - AI behavior control

- **Reset Functionality**
  - Complete state reset
  - Timer cleanup
  - Animation state clearing
  - Score reset
  - Grid clearing

### ai-logic.js
AI opponent implementation and decision-making system.

#### Key Components:

- **AI Decision Making**
  - Move evaluation and selection
  - Strategic planning
  - Difficulty-based behavior adjustment
  - Chain combo recognition

- **Core AI Features**
  ```javascript
  - Move Finding:
    - Direct matches
    - Setup opportunities
    - Height reduction
    - Strategic drops
    
  - Decision Weights:
    - Match size
    - Chain potential
    - Column height
    - Board position
  ```

- **AI Strategies**
  - **Match Detection**
    - Horizontal and vertical scanning
    - Future match prediction
    - Chain opportunity recognition

  - **Danger Management**
    - Height monitoring
    - Emergency moves
    - Stack reduction
    - Survival prioritization

  - **Move Types**
    - Direct matches (immediate points)
    - Setup moves (future opportunities)
    - Random moves (unpredictability)
    - Defensive moves (height management)

- **Difficulty Implementation**
  - Move delay timing
  - Decision accuracy
  - Strategic depth
  - Random move frequency

### theme-manager.js
Manages visual themes and their transitions.

#### Key Features:

- **Theme Management**
  - Theme loading and switching
  - Persistent theme storage
  - Dynamic theme updates
  - Audio-visual synchronization

- **Theme Components**
  ```javascript
  Themes: {
    elements:  {emojis: "🔥💧🍀⚡🌀", style: "vibrant"}
    animals:   {emojis: "🐮🐑🐷🐔🐴", style: "pastoral"}
    retro:     {emojis: "♥◆★●▲", style: "classic"}
    space:     {emojis: "🛸⭐👾☄️🪐", style: "cosmic"}
    food:      {emojis: "🍓🫐🥑🍌🍇", style: "appetizing"}
    weather:   {emojis: "🌅🌈🌱☀️⚡", style: "natural"}
    villain:   {emojis: "👿💀🦹⚔️🗡️", style: "dark"}
  }
  ```

- **Theme Integration**
  - CSS class management
  - Emoji animation updates
  - Background adjustments
  - Music synchronization

### dom.js
Manages DOM manipulation and UI updates.

#### Key Components:

- **DOM Element Management**
  - Grid creation and updates
  - Cursor positioning
  - Score display
  - Modal handling

- **UI Components**
  ```javascript
  Elements: {
    grids:      {player, ai}
    containers: {game, shake, cursor}
    displays:   {score, highScore}
    controls:   {theme, difficulty}
    modals:     {gameOver, options}
  }
  ```

- **Visual Features**
  - Score popups
  - Cursor animation
  - Grid shaking
  - Theme switching

- **Event Handling**
  - Window resizing
  - Theme changes
  - Score updates
  - Game over states

#### Technical Implementation:

- **Grid Management**
  - Dynamic grid creation
  - Block positioning
  - Cursor tracking
  - Animation handling

- **Score Display**
  - Point popup animations
  - High score updates
  - Chain bonus display
  - Persistent storage

- **Modal System**
  - Game over screen
  - Options display
  - High score board
  - Theme selection

- **Responsive Design**
  - Window resize handling
  - Grid repositioning
  - Cursor recalculation
  - Layout adjustment