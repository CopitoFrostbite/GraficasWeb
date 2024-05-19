


import { initGame, playerControls } from './init.js';
import { togglePause } from './pause.js';





const currentUser = JSON.parse(localStorage.getItem('currentUser'));



initGame();

document.addEventListener('keydown', function(event) {
    if (event.key === 'p') {
        togglePause();
    }
});

document.getElementById('resumen').addEventListener('click', function(event) {
    event.preventDefault();
    togglePause();
});

document.getElementById('salir').addEventListener('click', function(event) {
    event.preventDefault();
    if (localStorage.getItem('isHost') === 'true') {
        remove(ref(db, `rooms/${roomId}`)).then(() => {
            window.location.href = '../views/index.html';
        }).catch((error) => {
            console.error("Error al eliminar la sala: ", error);
        });
    } else {
        remove(ref(db, `rooms/${roomId}/players/${currentUser.uid}`)).then(() => {
            window.location.href = '../views/index.html';
        }).catch((error) => {
            console.error("Error al eliminar el jugador: ", error);
        });
    }
});