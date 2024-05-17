// PlayerControls.js
 class PlayerControls2 {
    constructor(camera, domElement) {
        this.camera = camera;
        this.domElement = domElement;
        this.jump = false;
        this.tackle = false;
        
        // Escuchar eventos de teclado en todo el documento
        this.moveState = { forward: false, backward: false, left: false, right: false };

        document.addEventListener('keydown', (e) => this.onKeyDown(e), false);
        document.addEventListener('keyup', (e) => this.onKeyUp(e), false);
    }

    onKeyDown(event) {
        if (event.repeat) {
            return; // Ignorar eventos de tecla repetidos
        }

        switch (event.code) {
            case 'ArrowUp':
           
                this.moveState.forward = true;
                break;
            case 'ArrowLeft':
            
                this.moveState.left = true;
                break;
            case 'ArrowDown':
           
                this.moveState.backward = true;
                break;
            case 'ArrowRight':
            
                this.moveState.right = true;
                break;
             case 'ShiftRight':
                 this.jump = true;
                 break;
        }
    }

    onKeyUp(event) {
        switch (event.code) {
            case 'ArrowUp':
           
                this.moveState.forward = false;
                break;
            case 'ArrowLeft':
           
                this.moveState.left = false;
                break;
            case 'ArrowDown':
            
                this.moveState.backward = false;
                break;
            case 'ArrowRight':
            
                this.moveState.right = false;
                break;
            case 'ShiftRight':
                this.jump = false;
                break;
        }
    }

    // Una nueva función para obtener el estado de movimiento
    getMovement() {
        return this.moveState;
    }

    isRunning() {
        return this.run;
    }

    isTackling() {
        return this.tackle;
    }
}
export default PlayerControls2;