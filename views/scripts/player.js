import * as THREE from '../three.module.js';
import { updatePhysics } from './physics.js';

class Player {
    constructor(id,mesh, controls, scene, terrainMesh) {
        this.id = id;
        this.mesh = mesh; // El mesh del personaje en Three.js
        this.controls = controls; // Un objeto que maneja las entradas del usuario
        this.scene = scene; // La escena a la que pertenece el jugador
        this.terrainMesh = terrainMesh;
        this.velocity = new THREE.Vector3(); // Velocidad actual del jugador
        this.friction = 0.98
        this.jumpForce = 15;
        this.isGrounded = false; // Si el jugador está en el suelo o no
    }

    update(deltaTime) {
        // Actualiza la lógica del jugador cada frame
        this.handleInput(deltaTime);
        this.handlePhysics(deltaTime);
        this.checkOutOfBounds();
    }

    handleInput(deltaTime) {
        const movement = this.controls.getMovement();
        const acceleration = 70.0;
       // Aplicar entradas de movimiento
        if (movement.forward) {
            this.velocity.z -= acceleration * deltaTime;
        }
        if (movement.backward) {
            this.velocity.z += acceleration * deltaTime;
        }
        if (movement.left) {
            this.velocity.x -= acceleration * deltaTime;
        }
        if (movement.right) {
            this.velocity.x += acceleration * deltaTime;
        }
        if (movement.jump && this.isGrounded) {
            this.velocity.y += this.jumpForce; // Aplica la fuerza de salto
            this.isGrounded = false; // Asegúrate de que no se pueda saltar de nuevo hasta aterrizar
        }
        
        
        
    }

    handlePhysics(deltaTime) {
        // Aplica la física, como la gravedad y las colisiones
        updatePhysics(this, deltaTime, this.terrainMesh);
        this.velocity.x *= this.friction;
        this.velocity.z *= this.friction;

        // Aplicar la velocidad al mesh del jugador
        this.mesh.position.addScaledVector(this.velocity, deltaTime);
         // Resetear la velocidad en x y z para detener el movimiento si no hay entradas
        
       
    }

    checkOutOfBounds() {
        // Comprueba si el jugador ha salido del escenario y actúa en consecuencia
        if (this.mesh.position.y < -10) {
            // Aquí manejarías lo que sucede cuando el jugador cae fuera del escenario
            console.log('Jugador fuera del escenario');
        }
    }

    push(force) {
        // Aplica una fuerza al jugador, como ser empujado por otro
        this.velocity.add(force);
    }
}


export default Player;