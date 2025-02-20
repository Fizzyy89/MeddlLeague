class AudioManager {
  constructor() {
    // Find audio elements on the current page
    this.bgMusic = document.getElementById('bgMusic');
    this.volumeSlider = document.getElementById('volumeSlider');
    this.muteBtn = document.getElementById('muteBtn');
    this.popSound = new Audio('sounds/pop.mp3');
    this.altPopSound = new Audio('sounds/pop_dick.mp3');
    this.aiPopSound = new Audio('sounds/ai_pop.mp3');
    
    // Load saved sound preference
    this.useAltPopSound = localStorage.getItem('useAltPopSound') === 'true';
    
    // If we found audio controls, initialize them
    if (this.bgMusic && this.volumeSlider && this.muteBtn) {
      this.init();
    }

    // Add chain sounds
    this.chain1 = new Audio('sounds/chain1.mp3');
    this.chain2 = new Audio('sounds/chain2.mp3');
    this.chain3 = new Audio('sounds/chain3.mp3');

    // Add match size sounds
    this.match4 = new Audio('sounds/4blocks.mp3');
    this.match5 = new Audio('sounds/5blocks.mp3');
    this.match6 = new Audio('sounds/6blocks.mp3');

    // Set volumes for all sound effects
    const savedVolume = localStorage.getItem('volume') || 0.3;
    [this.chain1, this.chain2, this.chain3, 
     this.match4, this.match5, this.match6].forEach(sound => {
      sound.volume = savedVolume;
    });
  }

  init() {
    console.log('Initializing AudioManager');
    // Load saved volume settings
    const savedVolume = localStorage.getItem('volume') || 0.3;
    const savedMuted = localStorage.getItem('muted') === 'true';
    
    // Initial setup for background music
    if (this.bgMusic) {
      this.bgMusic.volume = savedVolume;
      this.bgMusic.muted = savedMuted;
    }
    
    // Initial setup for sound effects
    this.popSound.volume = savedVolume * 0.2;
    this.altPopSound.volume = savedVolume * 0.2;
    this.aiPopSound.volume = savedVolume * 0.2;
    this.popSound.muted = savedMuted;
    this.altPopSound.muted = savedMuted;
    this.aiPopSound.muted = savedMuted;
    
    // Set up UI controls if they exist
    if (this.volumeSlider && this.muteBtn) {
      this.volumeSlider.value = savedVolume;
      this.muteBtn.textContent = savedMuted ? '🔇' : '🔊';
      this.setupEventListeners();
    }

    // Set up alt pop sound checkbox
    const altSoundCheckbox = document.getElementById('useAltPopSound');
    if (altSoundCheckbox) {
      altSoundCheckbox.checked = this.useAltPopSound;
      altSoundCheckbox.addEventListener('change', (e) => {
        this.useAltPopSound = e.target.checked;
        localStorage.setItem('useAltPopSound', this.useAltPopSound);
      });
    }
    
    // Try to play initial music if it exists
    if (this.bgMusic) {
      this.bgMusic.play().catch(err => console.error('Error playing initial music:', err));
    }
  }

  setupEventListeners() {
    if (!this.volumeSlider || !this.muteBtn) return;

    this.volumeSlider.addEventListener('input', (e) => {
      const newVolume = e.target.value;
      if (this.bgMusic) this.bgMusic.volume = newVolume;
      this.popSound.volume = newVolume * 0.2;
      this.altPopSound.volume = newVolume * 0.2;
      this.aiPopSound.volume = newVolume * 0.2;
      localStorage.setItem('volume', newVolume);
      this.muteBtn.textContent = newVolume === '0' ? '🔇' : '🔊';
    });

    this.muteBtn.addEventListener('click', () => {
      const newMutedState = !this.isMuted();
      if (this.bgMusic) this.bgMusic.muted = newMutedState;
      this.popSound.muted = newMutedState;
      this.altPopSound.muted = newMutedState;
      this.aiPopSound.muted = newMutedState;
      localStorage.setItem('muted', newMutedState);
      this.muteBtn.textContent = newMutedState ? '🔇' : '🔊';
    });
  }

  isMuted() {
    return this.bgMusic ? this.bgMusic.muted : localStorage.getItem('muted') === 'true';
  }

  updateThemeMusic(theme) {
    if (!this.bgMusic) return;
    
    console.log('Updating theme music:', theme);
    const wasPlaying = !this.bgMusic.paused;
    const currentSrc = this.bgMusic.querySelector('source').src;
    const newSrc = `music/${theme.replace('theme-', '')}.mp3`;
    
    console.log('Current src:', currentSrc);
    console.log('New src:', newSrc);
    
    if (!currentSrc.endsWith(newSrc)) {
      this.bgMusic.querySelector('source').src = newSrc;
      this.bgMusic.load();
      if (wasPlaying || true) {
        this.bgMusic.play().catch(err => console.error('Error playing music:', err));
      }
    }
  }

  playPopSound(isAI = false) {
    if (this.isMuted()) return;
    
    let sound;
    if (isAI) {
      sound = this.aiPopSound;
    } else {
      sound = this.useAltPopSound ? this.altPopSound : this.popSound;
    }
    
    const clone = sound.cloneNode();
    clone.volume = (this.bgMusic ? this.bgMusic.volume : localStorage.getItem('volume')) * 0.3;
    clone.play().catch(console.log);
  }

  playSound(soundName) {
    if (this[soundName]) {
      this[soundName].currentTime = 0;
      this[soundName].play();
    }
  }

  updateVolume(volume) {
    // Update all audio volumes
    this.bgMusic.volume = volume;
    this.popSound.volume = volume;
    this.altPopSound.volume = volume;
    this.chain1.volume = volume;
    this.chain2.volume = volume;
    this.chain3.volume = volume;
    this.match4.volume = volume;
    this.match5.volume = volume;
    this.match6.volume = volume;
  }

  // Add new method to play match size sounds
  playMatchSound(matchSize) {
    if (this.isMuted()) return;

    let sound;
    if (matchSize === 4) {
      sound = this.match4;
    } else if (matchSize === 5) {
      sound = this.match5;
    } else if (matchSize >= 6) {
      sound = this.match6;
    }

    if (sound) {
      sound.currentTime = 0;
      sound.play().catch(console.error);
    }
  }
}

// Create a single instance to be shared across all pages
export const audioManager = new AudioManager(); 