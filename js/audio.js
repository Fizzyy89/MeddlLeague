class AudioManager {
  constructor() {
    // Volume settings with new defaults
    this.masterVolume = parseFloat(localStorage.getItem('masterVolume') ?? '0.3');
    this.musicVolume = parseFloat(localStorage.getItem('musicVolume') ?? '0.8');
    this.sfxVolume = parseFloat(localStorage.getItem('sfxVolume') ?? '0.8');
    this.musicMuted = localStorage.getItem('musicMuted') === 'true';
    this.sfxMuted = localStorage.getItem('sfxMuted') === 'true';

    // Background Music
    this.bgMusic = document.getElementById('bgMusic');
    if (this.bgMusic) {
      this.bgMusic.volume = this.musicMuted ? 0 : this.masterVolume * this.musicVolume;
    }

    // Sound Effects
    this.sounds = {
      pop: new Audio('sounds/pop.mp3'),
      altPop: new Audio('sounds/pop_dick.mp3'),
      aiPop: new Audio('sounds/ai_pop.mp3'),
      chain1: new Audio('sounds/chain1.mp3'),
      chain2: new Audio('sounds/chain2.mp3'),
      chain3: new Audio('sounds/chain3.mp3'),
      match4: new Audio('sounds/4blocks.mp3'),
      match5: new Audio('sounds/5blocks.mp3'),
      match6: new Audio('sounds/6blocks.mp3')
    };

    // Initialize sound volumes
    this.updateAllVolumes();

    // Load saved sound preference
    this.useAltPopSound = localStorage.getItem('useAltPopSound') === 'true';

    // Find all volume controls
    this.volumeSliders = {
      master: document.getElementById('masterVolume'),
      menu: document.getElementById('volumeSlider'),
      game: document.querySelector('.game-container #volumeSlider')
    };
    
    this.muteBtns = {
      master: document.getElementById('masterMuteBtn'),
      menu: document.getElementById('muteBtn'),
      game: document.querySelector('.game-container #muteBtn')
    };

    // Initialize all controls
    this.initAllControls();
  }

  initAllControls() {
    // Set initial values for all volume sliders
    Object.values(this.volumeSliders).forEach(slider => {
      if (slider) {
        slider.value = this.masterVolume;
      }
    });

    // Set initial states for all mute buttons
    Object.values(this.muteBtns).forEach(btn => {
      if (btn) {
        btn.textContent = this.masterVolume === 0 ? '🔇' : '🔊';
      }
    });

    // Set up event listeners for all volume controls
    this.setupAllEventListeners();
  }

  setupAllEventListeners() {
    // Add input listeners to all volume sliders
    Object.entries(this.volumeSliders).forEach(([key, slider]) => {
      if (slider) {
        slider.addEventListener('input', (e) => {
          const newVolume = parseFloat(e.target.value);
          this.setMasterVolume(newVolume);
          this.syncAllControls();
        });
      }
    });

    // Add click listeners to all mute buttons
    Object.entries(this.muteBtns).forEach(([key, btn]) => {
      if (btn) {
        btn.addEventListener('click', () => {
          const newVolume = this.masterVolume === 0 ? 0.3 : 0;
          this.setMasterVolume(newVolume);
          this.syncAllControls();
        });
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

    // Update all mute buttons
    Object.values(this.muteBtns).forEach(btn => {
      if (btn) {
        btn.textContent = this.masterVolume === 0 ? '🔇' : '🔊';
      }
    });
  }

  updateAllVolumes() {
    // Update music volume
    if (this.bgMusic && !this.musicMuted) {
      this.bgMusic.volume = this.masterVolume * this.musicVolume;
    }

    // Update all sound effects
    if (!this.sfxMuted) {
      Object.values(this.sounds).forEach(sound => {
        sound.volume = this.masterVolume * this.sfxVolume;
      });
    }
  }

  setMasterVolume(volume) {
    this.masterVolume = volume;
    localStorage.setItem('masterVolume', volume);
    this.updateAllVolumes();
    this.syncAllControls();
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
    if (!this.sfxMuted) {
      Object.values(this.sounds).forEach(sound => {
        sound.volume = this.masterVolume * this.sfxVolume;
      });
    }
  }

  toggleMusicMute() {
    this.musicMuted = !this.musicMuted;
    localStorage.setItem('musicMuted', this.musicMuted);
    if (this.bgMusic) {
      this.bgMusic.volume = this.musicMuted ? 0 : this.masterVolume * this.musicVolume;
    }
    return this.musicMuted;
  }

  toggleSFXMute() {
    this.sfxMuted = !this.sfxMuted;
    localStorage.setItem('sfxMuted', this.sfxMuted);
    this.updateAllVolumes();
    return this.sfxMuted;
  }

  playSound(soundName) {
    if (this.sfxMuted || !this.sounds[soundName]) return;
    
    const sound = this.sounds[soundName].cloneNode();
    sound.volume = this.masterVolume * this.sfxVolume;
    sound.play().catch(console.error);
  }

  playPopSound(isAI = false) {
    if (this.sfxMuted) return;
    
    const soundName = isAI ? 'aiPop' : (this.useAltPopSound ? 'altPop' : 'pop');
    this.playSound(soundName);
  }

  playMatchSound(matchSize) {
    if (this.sfxMuted) return;

    if (matchSize === 4) {
      this.playSound('match4');
    } else if (matchSize === 5) {
      this.playSound('match5');
    } else if (matchSize >= 6) {
      this.playSound('match6');
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