import { playerControls } from './init.js';
import { animateHost,animateClient } from './animate.js';




let isPaused = false;

function togglePause() {
    isPaused = !isPaused;
    const pauseModal = document.getElementById('pauseModal');
    if (isPaused) {
        pauseModal.style.display = 'block';
    } else {
        pauseModal.style.display = 'none';
    }
}

document.getElementById('resumen').addEventListener('click', () => {
    togglePause();
});

document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
        togglePause();
    }
});

export { isPaused, togglePause };