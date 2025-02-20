class AudioManager {
  constructor() {
    // Find audio elements on the current page
    this.bgMusic = document.getElementById('bgMusic');
    this.volumeSlider = document.getElementById('volumeSlider');
    this.muteBtn = document.getElementById('muteBtn');
    this.popSound = new Audio('sounds/pop.mp3');
    this.aiPopSound = new Audio('sounds/ai_pop.mp3');
    
    // If we found audio controls, initialize them
    if (this.bgMusic && this.volumeSlider && this.muteBtn) {
      this.init();
    }
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
    this.aiPopSound.volume = savedVolume * 0.2;
    this.popSound.muted = savedMuted;
    this.aiPopSound.muted = savedMuted;
    
    // Set up UI controls if they exist
    if (this.volumeSlider && this.muteBtn) {
      this.volumeSlider.value = savedVolume;
      this.muteBtn.textContent = savedMuted ? '🔇' : '🔊';
      this.setupEventListeners();
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
      this.aiPopSound.volume = newVolume * 0.2;
      localStorage.setItem('volume', newVolume);
      this.muteBtn.textContent = newVolume === '0' ? '🔇' : '🔊';
    });

    this.muteBtn.addEventListener('click', () => {
      const newMutedState = !this.isMuted();
      if (this.bgMusic) this.bgMusic.muted = newMutedState;
      this.popSound.muted = newMutedState;
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
    
    const sound = isAI ? this.aiPopSound : this.popSound;
    const clone = sound.cloneNode();
    clone.volume = (this.bgMusic ? this.bgMusic.volume : localStorage.getItem('volume')) * 0.3;
    clone.play().catch(console.log);
  }
}

// Create a single instance to be shared across all pages
export const audioManager = new AudioManager(); 