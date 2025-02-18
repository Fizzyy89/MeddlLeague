import { domManager } from './dom.js';
import { audioManager } from './audio.js';

class ThemeManager {
  constructor() {
    this.loadSavedTheme();
    this.setupEventListeners();
  }

  loadSavedTheme() {
    // Load saved theme or default to elements theme
    const savedTheme = localStorage.getItem('gameTheme') || 'theme-elements';
    domManager.playerContainer.className = `game-container ${savedTheme}`;
    domManager.themeSelect.value = savedTheme;
    this.updateBouncingEmoji(savedTheme);
  }

  setupEventListeners() {
    domManager.themeSelect.addEventListener('change', (e) => {
      const newTheme = e.target.value;
      
      // Remove all theme classes
      domManager.playerContainer.classList.remove(
        'theme-elements', 
        'theme-animals', 
        'theme-retro',
        'theme-space',
        'theme-food',
        'theme-weather'
      );
      
      // Add new theme class
      domManager.playerContainer.classList.add(newTheme);
      
      // Save preference
      localStorage.setItem('gameTheme', newTheme);
      
      // Update music and emojis
      audioManager.updateThemeMusic(newTheme);
      this.updateBouncingEmoji(newTheme);
    });
  }

  updateBouncingEmoji(theme) {
    const emojiElements = document.querySelectorAll('.bouncing-emoji');
    const themeClass = `.${theme}`;
    const style = getComputedStyle(document.querySelector(themeClass));
    
    // Get all emojis from current theme
    const emojis = [
      style.getPropertyValue('--emoji-red'),
      style.getPropertyValue('--emoji-blue'),
      style.getPropertyValue('--emoji-green'),
      style.getPropertyValue('--emoji-yellow'),
      style.getPropertyValue('--emoji-purple')
    ].map(e => e.replace(/"/g, ''));
    
    // Assign each emoji to a bouncing element
    emojiElements.forEach((element, index) => {
      element.textContent = emojis[index];
    });
  }

  // Helper method to get current theme
  getCurrentTheme() {
    return domManager.themeSelect.value;
  }

  // Method to force a theme update
  setTheme(theme) {
    domManager.themeSelect.value = theme;
    domManager.themeSelect.dispatchEvent(new Event('change'));
  }
}

export const themeManager = new ThemeManager(); 