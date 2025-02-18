class AudioManager {
  constructor() {
    this.bgMusic = document.getElementById('bgMusic');
    this.volumeSlider = document.getElementById('volumeSlider');
    this.muteBtn = document.getElementById('muteBtn');
    this.popSound = new Audio('sounds/pop.mp3');
    this.aiPopSound = new Audio('sounds/ai_pop.mp3');
    
    this.init();
  }

  init() {
    // Load saved volume settings
    const savedVolume = localStorage.getItem('volume') || 0.3;
    const savedMuted = localStorage.getItem('muted') === 'true';
    
    // Initial setup
    this.bgMusic.volume = savedVolume;
    this.bgMusic.muted = savedMuted;
    this.volumeSlider.value = savedVolume;
    this.muteBtn.textContent = savedMuted ? '🔇' : '🔊';
    
    this.popSound.volume = 0.2;
    this.aiPopSound.volume = 0.2;
    
    this.setupEventListeners();
  }

  setupEventListeners() {
    this.volumeSlider.addEventListener('input', (e) => {
      const newVolume = e.target.value;
      this.bgMusic.volume = newVolume;
      localStorage.setItem('volume', newVolume);
      this.muteBtn.textContent = newVolume === '0' ? '🔇' : '🔊';
    });

    this.muteBtn.addEventListener('click', () => {
      this.bgMusic.muted = !this.bgMusic.muted;
      localStorage.setItem('muted', this.bgMusic.muted);
      this.muteBtn.textContent = this.bgMusic.muted ? '🔇' : '🔊';
    });
  }

  updateThemeMusic(theme) {
    const wasPlaying = !this.bgMusic.paused;
    const currentSrc = this.bgMusic.querySelector('source').src;
    const newSrc = `music/${theme.replace('theme-', '')}.mp3`;
    
    if (!currentSrc.endsWith(newSrc)) {
      this.bgMusic.querySelector('source').src = newSrc;
      this.bgMusic.load();
      if (wasPlaying) {
        this.bgMusic.play().catch(console.log);
      }
    }
  }

  playPopSound(isAI = false) {
    if (this.bgMusic.muted) return;
    
    const sound = isAI ? this.aiPopSound : this.popSound;
    const clone = sound.cloneNode();
    clone.volume = this.bgMusic.volume * 0.3;
    clone.play().catch(console.log);
  }
}

export const audioManager = new AudioManager(); 