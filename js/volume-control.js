// Common volume control implementation for all pages
import { audioManager } from './audio.js';

export function initializeVolumeControl() {
    const volumeSlider = document.getElementById('volumeSlider');
    const muteBtn = document.getElementById('muteBtn');
    
    if (!volumeSlider || !muteBtn) {
        console.debug('Volume controls not found on this page');
        return;
    }
    
    // Set initial values
    const currentVolume = parseFloat(localStorage.getItem('masterVolume') ?? '0.3');
    volumeSlider.value = currentVolume;
    muteBtn.textContent = currentVolume === 0 ? '🔇' : '🔊';
    
    // Handle volume changes
    volumeSlider.addEventListener('input', (e) => {
        // Get the numeric value from the slider
        let newVolume = parseFloat(e.target.value);
        
        // When the slider is at the leftmost position, ensure volume is exactly 0
        // For step=0.05, this means if the value is 0.05 or less
        if (newVolume <= 0.05) {
            newVolume = 0;
            // Force slider to show 0 position
            volumeSlider.value = 0;
        }
 
        // Update volume through audio manager
        audioManager.setMasterVolume(newVolume);
        
        // Update UI
        muteBtn.textContent = newVolume === 0 ? '🔇' : '🔊';
    });
}

// Call this on DOMContentLoaded or when needed
document.addEventListener('DOMContentLoaded', initializeVolumeControl); 