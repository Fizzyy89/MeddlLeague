class AudioManager {
  constructor() {
    // Volume settings with new defaults
    this.masterVolume = parseFloat(localStorage.getItem('masterVolume') ?? '0.3');
    this.musicVolume = parseFloat(localStorage.getItem('musicVolume') ?? '0.8');
    this.sfxVolume = parseFloat(localStorage.getItem('sfxVolume') ?? '0.8');
    this.musicMuted = localStorage.getItem('musicMuted') === 'true';
    this.sfxMuted = localStorage.getItem('sfxMuted') === 'true';

    // Current AI personality
    this.currentAiPersonality = localStorage.getItem('aiPersonality') || 'robot';
    
    // Current Player personality
    this.currentPlayerPersonality = localStorage.getItem('playerPersonality') || 'default';

    // Background Music
    this.bgMusic = document.getElementById('bgMusic');
    if (this.bgMusic) {
      this.bgMusic.volume = this.musicMuted ? 0 : this.masterVolume * this.musicVolume;
      
      // Ensure the volume is correctly set on source change (for theme switching)
      this.bgMusic.addEventListener('loadeddata', () => {
        this.bgMusic.volume = this.musicMuted ? 0 : this.masterVolume * this.musicVolume;
      });
      
      // Add error handling for music playback
      this.bgMusic.addEventListener('error', (e) => {
        console.error('Audio error with background music:', e);
      });
    } else {
      console.debug('No background music element found');
    }

    // Load saved sound preference
    this.useAltPopSound = localStorage.getItem('useAltPopSound') === 'true';

    // Find all volume controls
    this.volumeSliders = {
      master: document.getElementById('masterVolume'),
      menu: document.getElementById('volumeSlider'),
      game: document.querySelector('.game-container #volumeSlider')
    };
    
    // Volume indicator icons (no longer buttons, just visual indicators)
    this.volumeIcons = {
      master: document.getElementById('masterMuteBtn'),
      menu: document.getElementById('muteBtn'),
      game: document.querySelector('.game-container #muteBtn')
    };

    // Initialize sound collections
    this.sounds = {};
    this.playerSounds = {};
    this.aiSounds = {};

    // Load sounds asynchronously to prevent 404 errors
    this.loadSounds();

    // Initialize all controls
    this.initAllControls();
  }
  
  // Helper method to safely create an Audio object
  createAudio(path) {
    const audio = new Audio();
    
    // Add error handling to prevent console errors for missing files
    audio.addEventListener('error', (e) => {
      // Just silently log to avoid console spam
      if (e.target.error) {
        console.debug(`Could not load audio file: ${path}`);
      }
    });
    
    // Set the source after adding the error listener
    audio.src = path;
    
    return audio;
  }
  
  loadSounds() {
    // Load player sound effects (organized by personality)
    this.playerSounds = {
      default: {
        pop: this.createAudio('sounds/player/default/pop.mp3'),
        chain1: this.createAudio('sounds/player/default/chain1.mp3'),
        chain2: this.createAudio('sounds/player/default/chain2.mp3'),
        chain3: this.createAudio('sounds/player/default/chain3.mp3'),
        match4: this.createAudio('sounds/player/default/4blocks.mp3'),
        match5: this.createAudio('sounds/player/default/5blocks.mp3'),
        match6: this.createAudio('sounds/player/default/6blocks.mp3')
      },
      drachenlord: {
        pop: this.createAudio('sounds/player/drachenlord/pop.mp3'),
        chain1: this.createAudio('sounds/player/drachenlord/chain1.mp3'),
        chain2: this.createAudio('sounds/player/drachenlord/chain2.mp3'),
        chain3: this.createAudio('sounds/player/drachenlord/chain3.mp3'),
        match4: this.createAudio('sounds/player/drachenlord/4blocks.mp3'),
        match5: this.createAudio('sounds/player/drachenlord/5blocks.mp3'),
        match6: this.createAudio('sounds/player/drachenlord/6blocks.mp3')
      }
    };

    // AI Sound Effects (organized by personality)
    this.aiSounds = {
      robot: {
        pop: this.createAudio('sounds/ai/robot/pop.mp3'),
        chain1: this.createAudio('sounds/ai/robot/chain1.mp3'),
        chain2: this.createAudio('sounds/ai/robot/chain2.mp3'),
        chain3: this.createAudio('sounds/ai/robot/chain3.mp3'),
        match4: this.createAudio('sounds/ai/robot/4blocks.mp3'),
        match5: this.createAudio('sounds/ai/robot/5blocks.mp3'),
        match6: this.createAudio('sounds/ai/robot/6blocks.mp3')
      }
      // Additional AI personalities can be added here
    };
    
    // Legacy sound effects - only load altPop since we know it exists
    // For other sounds, we'll use the personality sounds as fallbacks
    this.sounds = {
      altPop: this.createAudio('sounds/pop_dick.mp3')
    };
    
    // Set volumes for all sounds
    this.updateAllVolumes();
  }

  initAllControls() {
    // Set initial values for all volume sliders
    Object.values(this.volumeSliders).forEach(slider => {
      if (slider) {
        slider.value = this.masterVolume;
      }
    });

    // Set initial states for all volume indicators
    Object.values(this.volumeIcons).forEach(icon => {
      if (icon) {
        icon.textContent = this.masterVolume === 0 ? '🔇' : '🔊';
        // Make sure the icon is not clickable by removing pointer cursor
        icon.style.cursor = 'default';
      }
    });

    // Set up event listeners for volume sliders
    this.setupVolumeSliderListeners();
  }

  setupVolumeSliderListeners() {
    // Add input listeners to all volume sliders
    Object.entries(this.volumeSliders).forEach(([key, slider]) => {
      if (slider) {
        slider.addEventListener('input', (e) => {
          const newVolume = parseFloat(e.target.value);
          this.setMasterVolume(newVolume);
          this.updateVolumeIcons(newVolume);
        });
      }
    });
  }

  updateVolumeIcons(volume) {
    // Update all volume icons based on volume level
    Object.values(this.volumeIcons).forEach(icon => {
      if (icon) {
        icon.textContent = volume === 0 ? '🔇' : '🔊';
      }
    });
  }

  syncAllControls() {
    // Update all volume sliders
    Object.values(this.volumeSliders).forEach(slider => {
      if (slider) {
        slider.value = this.masterVolume;
      }
    });

    // Update all volume icons
    this.updateVolumeIcons(this.masterVolume);
  }

  updateAllVolumes() {
    // Update music volume - check for bgMusic again in case it wasn't available during construction
    const bgMusic = this.bgMusic || document.getElementById('bgMusic');
    
    // Extra check to ensure the audio is fully muted when masterVolume is 0 or very close to 0
    if (this.masterVolume === 0 || this.masterVolume <= 0.001) {
      if (bgMusic) {
        bgMusic.volume = 0;
        this.bgMusic = bgMusic; // Store the reference if we just found it
      }
      return; // Skip all other audio updates to ensure nothing plays
    }
    
    if (bgMusic && !this.musicMuted) {
      bgMusic.volume = this.masterVolume * this.musicVolume;
      this.bgMusic = bgMusic; // Store the reference if we just found it
    }

    // Update all sound effects
    if (!this.sfxMuted) {
      // Update legacy sounds
      if (this.sounds) {
        Object.values(this.sounds).forEach(sound => {
          sound.volume = this.masterVolume * this.sfxVolume;
        });
      }
      
      // Update all player sound effects
      Object.values(this.playerSounds).forEach(personality => {
        Object.values(personality).forEach(sound => {
          sound.volume = this.masterVolume * this.sfxVolume;
        });
      });
      
      // Update all AI sound effects
      Object.values(this.aiSounds).forEach(personality => {
        Object.values(personality).forEach(sound => {
          sound.volume = this.masterVolume * this.sfxVolume;
        });
      });
    }
    
    // Always sync all controls after volume changes
    this.syncAllControls();
  }

  setMasterVolume(volume) {
    this.masterVolume = volume;
    localStorage.setItem('masterVolume', volume);
    
    // If master volume is 0 or very close to 0, consider everything muted
    if (volume === 0 || volume <= 0.001) {
      this.musicMuted = true;
      this.sfxMuted = true;
      // Ensure volume is exactly 0 to prevent tiny sound leakage
      this.masterVolume = 0;
      localStorage.setItem('masterVolume', 0);
    } else {
      this.musicMuted = false;
      this.sfxMuted = false;
    }
    
    this.updateAllVolumes();
    // Note: syncAllControls is now called inside updateAllVolumes
  }

  setMusicVolume(volume) {
    this.musicVolume = volume;
    localStorage.setItem('musicVolume', volume);
    if (this.bgMusic && !this.musicMuted) {
      this.bgMusic.volume = this.masterVolume * this.musicVolume;
    }
  }

  setSFXVolume(volume) {
    this.sfxVolume = volume;
    localStorage.setItem('sfxVolume', volume);
    this.updateAllVolumes();
  }

  // Helper method to safely play a sound
  safePlaySound(sound) {
    if (!sound || this.sfxMuted) return;
    
    try {
      const soundClone = sound.cloneNode();
      soundClone.volume = this.masterVolume * this.sfxVolume;
      soundClone.play().catch(err => {
        // Silently handle play errors
        console.debug('Error playing sound:', err);
      });
    } catch (err) {
      // Silently handle clone errors
      console.debug('Error cloning sound:', err);
    }
  }

  playSound(soundName) {
    if (this.sfxMuted) return;
    
    // If the sound exists in the legacy collection, play it
    if (this.sounds[soundName]) {
      this.safePlaySound(this.sounds[soundName]);
      return;
    }
    
    // Otherwise, fall back to the current player personality
    console.debug(`Legacy sound "${soundName}" not found, using player personality sound instead`);
    this.playPlayerSound(soundName);
  }

  playPlayerSound(soundName, personality = null) {
    if (this.sfxMuted) return;
    
    // Use specified personality or default to current
    const playerPersonality = personality || this.currentPlayerPersonality;
    
    // Check if personality exists
    if (!this.playerSounds[playerPersonality]) {
      console.debug(`Player personality "${playerPersonality}" not found, using default instead`);
      this.safePlaySound(this.playerSounds.default[soundName]);
      return;
    }
    
    // Check if sound exists for this personality
    if (!this.playerSounds[playerPersonality][soundName]) {
      console.debug(`Sound "${soundName}" not found for player personality "${playerPersonality}"`);
      return;
    }
    
    this.safePlaySound(this.playerSounds[playerPersonality][soundName]);
  }

  playAiSound(soundName, personality = null) {
    if (this.sfxMuted) return;
    
    // Use specified personality or default to current
    const aiPersonality = personality || this.currentAiPersonality;
    
    // Check if personality exists
    if (!this.aiSounds[aiPersonality]) {
      console.debug(`AI personality "${aiPersonality}" not found, using robot instead`);
      this.safePlaySound(this.aiSounds.robot[soundName]);
      return;
    }
    
    // Check if sound exists for this personality
    if (!this.aiSounds[aiPersonality][soundName]) {
      console.debug(`Sound "${soundName}" not found for AI personality "${aiPersonality}"`);
      return;
    }
    
    this.safePlaySound(this.aiSounds[aiPersonality][soundName]);
  }

  playPopSound(isAI = false) {
    if (this.sfxMuted) return;
    
    if (isAI) {
      this.playAiSound('pop');
    } else {
      // For backward compatibility with the useAltPopSound option
      if (this.useAltPopSound && this.sounds.altPop) {
        this.safePlaySound(this.sounds.altPop);
      } else {
        this.playPlayerSound('pop');
      }
    }
  }

  playMatchSound(matchSize, isAI = false) {
    if (this.sfxMuted) return;

    let soundName;
    if (matchSize === 4) {
      soundName = 'match4';
    } else if (matchSize === 5) {
      soundName = 'match5';
    } else if (matchSize >= 6) {
      soundName = 'match6';
    } else {
      return; // No sound for matches smaller than 4
    }
    
    if (isAI) {
      this.playAiSound(soundName);
    } else {
      this.playPlayerSound(soundName);
    }
  }

  playChainSound(chainLevel, isAI = false) {
    if (this.sfxMuted) return;
    
    let soundName;
    if (chainLevel === 1) {
      soundName = 'chain1';
    } else if (chainLevel === 2) {
      soundName = 'chain2';
    } else if (chainLevel >= 3) {
      soundName = 'chain3';
    } else {
      return; // No sound for chain level 0
    }
    
    if (isAI) {
      this.playAiSound(soundName);
    } else {
      this.playPlayerSound(soundName);
    }
  }

  setAiPersonality(personality) {
    if (this.aiSounds[personality]) {
      this.currentAiPersonality = personality;
      localStorage.setItem('aiPersonality', personality);
      return true;
    } else {
      console.debug(`AI personality "${personality}" not found, keeping current personality`);
      return false;
    }
  }
  
  setPlayerPersonality(personality) {
    if (this.playerSounds[personality]) {
      this.currentPlayerPersonality = personality;
      localStorage.setItem('playerPersonality', personality);
      return true;
    } else {
      console.debug(`Player personality "${personality}" not found, keeping current personality`);
      return false;
    }
  }

  updateThemeMusic(theme) {
    if (!this.bgMusic) return;
    
    const wasPlaying = !this.bgMusic.paused;
    const currentSrc = this.bgMusic.querySelector('source').src;
    const newSrc = `music/${theme.replace('theme-', '')}.mp3`;
    
    if (!currentSrc.endsWith(newSrc)) {
      this.bgMusic.querySelector('source').src = newSrc;
      this.bgMusic.load();
      if (wasPlaying) {
        this.bgMusic.play().catch(console.error);
      }
    }
  }
}

// Create a single instance to be shared across all pages
export const audioManager = new AudioManager(); 