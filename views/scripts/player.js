import * as THREE from '../three.module.js';
import { updatePhysics } from './physics.js';

class Player {
    constructor(id, gltf,characterName, controls, scene, terrainMesh) {
        this.id = id;
        this.characterName = characterName;
        this.mesh = gltf.scene; 
        this.animations = {};
        this.animationsMap = {};
        this.mixer = new THREE.AnimationMixer(this.mesh);
       
        this.currentAction = null;
       
        gltf.animations.forEach((clip) => {
            console.log(`Cargando animación: ${clip.name}`); //  nombre real de la animación
            this.animations[clip.name] = clip;
            this.mixer.clipAction(clip);
        });
        this.animationsMap = {
            Run: 'Armature|mixamo.com|Layer0',
            
        };
        this.controls = controls; 
        this.scene = scene; 
        this.terrainMesh = terrainMesh;
        this.velocity = new THREE.Vector3(); 
        this.friction = 0.98
        this.jumpForce = 15;
        this.isGrounded = false; 
        this.hitbox = new THREE.Box3(new THREE.Vector3(), new THREE.Vector3());
        this.hitbox.setFromObject(this.mesh);
    }

    update(deltaTime) {
        // Actualiza la lógica del jugador cada frame
        this.handleInput(deltaTime);
        this.handlePhysics(deltaTime);
        this.mesh.position.addScaledVector(this.velocity, deltaTime);
        this.velocity.multiplyScalar(this.friction);
        this.checkOutOfBounds();
        this.hitbox.setFromObject(this.mesh);
        const currentPosition = this.mesh.position.clone();

        // Actualiza el mixer para procesar la animación
        if (this.mixer) {
            this.mixer.update(deltaTime);
        }
    
        // Después de la actualización de la animación, restablece la posición del personaje
        this.mesh.position.copy(currentPosition);
        
    }

    handleInput(deltaTime) {
        const movement = this.controls.getMovement();
        const acceleration = 70.0;
       // Aplicar entradas de movimiento
        if (movement.forward ) {
            this.velocity.z -= acceleration * deltaTime;
           
        }
       
        if (movement.backward ) {
            this.velocity.z += acceleration * deltaTime;
          
        }
        if (movement.left ) {
            this.velocity.x -= acceleration * deltaTime;
           
        }
        if (movement.right ) {
            this.velocity.x += acceleration * deltaTime;
            this.playAnimation( "Run");
            this.isRunning = true;
        }
        if (!movement.right ) {
            
            this.stopAnimation( "Run");
            this.isRunning = false;
        }
        if (movement.jump && this.isGrounded) {
            this.velocity.y += this.jumpForce; 
            this.isGrounded = false; 
        }

       
        
        
        
    }

    playAnimation(name) {
        // Busca la acción con el nombre 'Run' en el mixer del jugador.
        const action = this.mixer._actions.find(action => action._clip.name === name);
        if (action) {
            if (this.currentAction !== action) {
                if (this.currentAction) {
                    this.currentAction.fadeOut(0.5);
                }
                action.reset().fadeIn(0.5).play();
                this.currentAction = action;
            }
        } else {
            console.warn(`Animation ${name} not found for character ${this.characterName}`);
        }
    }

    stopAnimation(name) {
        const action = this.mixer._actions.find(action => action._clip.name === name);
        if (action) {
            
            action.fadeOut(0.5);
            
            action.onFinish = () => {
                action.stop(); 
            };
    
            
            if (this.currentAction === action) {
                this.currentAction = null;
            }
        } else {
            console.warn(`Animation ${name} not found for character ${this.characterName}`);
        }
    }

    handlePhysics(deltaTime) {
        // Aplica la física, como la gravedad y las colisiones
        updatePhysics(this, deltaTime, this.terrainMesh);
        this.velocity.x *= this.friction;
        this.velocity.z *= this.friction;

        // Aplicar la velocidad al mesh del jugador
        this.mesh.position.addScaledVector(this.velocity, deltaTime);
         
        
       
    }

    checkOutOfBounds() {
        // Comprueba si el jugador ha salido del escenario y actúa en consecuencia
        if (this.mesh.position.y < -10) {
            // Aquí  falta agregar logica cuando el jugador cae fuera del escenario
            console.log('Jugador fuera del escenario');
        }
    }

    push(force) {
        // Aplica una fuerza al jugador, como ser empujado por otro
        this.velocity.add(force);
    }
}


export default Player;