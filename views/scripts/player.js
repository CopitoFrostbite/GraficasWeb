import * as THREE from '../three.module.js';
import { updatePhysics } from './physics.js';
import Animations from './animations.js';
import { ref, set, update, remove } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";
import { db } from './firebaseConfig.js';
const TACKLE_STATE = {
    IDLE: 'idle',
    STARTUP: 'startup',
    ACTIVE: 'active',
    ENDLAG: 'endlag'
};

class Player {
    constructor(id, gltf, characterName, controls, scene, terrainMesh, databaseRef,gamemode, roomId, isHost) {
        this.id = id;
        this.characterName = characterName;
        this.mesh = gltf.scene;
        this.animations = new Animations(this.mesh, gltf);
        this.controls = controls;
        this.scene = scene;
        this.score = 0;
        this.terrainMesh = terrainMesh;
        this.databaseRef = db; // Referencia a la base de datos de Firebase
        this.roomId = roomId; // ID de la sala
        this.velocity = new THREE.Vector3();
        this.friction = 0.98;
        this.jumpForce = 15;
        this.isGrounded = false;
        this.isMoving = false;
        this.hitbox = new THREE.Box3(new THREE.Vector3(), new THREE.Vector3());
        this.hitbox.setFromObject(this.mesh);
        this.tackleHitbox = new THREE.Box3(new THREE.Vector3(), new THREE.Vector3());
        this.isHost = isHost;

        // Estados de tacleada
        this.tackleState = TACKLE_STATE.IDLE;
        this.tackleCounter = 0;

        // Tiempos de los estados de tacleada (en frames)
        this.tackleStartupFrames = 10;
        this.tackleActiveFrames = 20;
        this.tackleEndlagFrames = 40;

        // Crear visualizaciones de hitboxes
        this.hitboxHelper = this.createHitboxHelper(this.hitbox, 0x00ff00);
        this.tackleHitboxHelper = this.createHitboxHelper(this.tackleHitbox, 0x0000ff);
        this.scene.add(this.hitboxHelper);
        this.scene.add(this.tackleHitboxHelper);
    }

    update(deltaTime) {
        this.handleInput(deltaTime);
        this.handlePhysics(deltaTime);
        this.mesh.position.addScaledVector(this.velocity, deltaTime);
        this.velocity.multiplyScalar(this.friction);
        this.checkOutOfBounds();
        this.hitbox.setFromObject(this.mesh);
        this.updateTackleHitbox();

        // Actualizar las visualizaciones de hitboxes
        this.updateHitboxHelper(this.hitboxHelper, this.hitbox);
        this.updateHitboxHelper(this.tackleHitboxHelper, this.tackleHitbox);
        this.updateTackleHitboxColor();

        // Gestionar la transición de estados de tacleada
        if (this.tackleState !== TACKLE_STATE.IDLE) {
            this.tackleCounter++;
            if (this.tackleState === TACKLE_STATE.STARTUP && this.tackleCounter >= this.tackleStartupFrames) {
                this.tackleState = TACKLE_STATE.ACTIVE;
                this.tackleCounter = 0;
            } else if (this.tackleState === TACKLE_STATE.ACTIVE && this.tackleCounter >= this.tackleActiveFrames) {
                this.tackleState = TACKLE_STATE.ENDLAG;
                this.tackleCounter = 0;
            } else if (this.tackleState === TACKLE_STATE.ENDLAG && this.tackleCounter >= this.tackleEndlagFrames) {
                this.tackleState = TACKLE_STATE.IDLE;
                this.tackleCounter = 0;
            }
        }

        this.animations.update(deltaTime);

        // Enviar la posición y estado actualizados a Firebase
         this.saveToDatabase();
    }

    handleInput(deltaTime) {
        const movement = this.controls ? this.controls.getMovement() : {};
        const acceleration = 20.0;
        let moveDirection = new THREE.Vector3();

        if (movement.forward) {
            this.velocity.z -= acceleration * deltaTime;
            moveDirection.z -= 1;
            this.isMoving = true;
            this.isRunning = true;
        }
        if (movement.backward) {
            this.velocity.z += acceleration * deltaTime;
            moveDirection.z += 1;
            this.isMoving = true;
            this.isRunning = true;
        }
        if (movement.left) {
            this.velocity.x -= acceleration * deltaTime;
            moveDirection.x -= 1;
            this.isRunning = true;
            this.isMoving = true;
        }
        if (movement.right) {
            this.velocity.x += acceleration * deltaTime;
            moveDirection.x += 1;
            this.isRunning = true;
            this.isMoving = true;
        }
        if (!movement.right && !movement.left && !movement.forward && !movement.backward) {
            this.isRunning = false;
            this.isMoving = false;
        }
        if (movement.jump && this.isGrounded) {
            this.velocity.y += this.jumpForce;
            this.isGrounded = false;
        }
        if (this.isMoving) {
            this.animations.playAnimation("Armature|mixamo.com|Layer0");
            this.isRunning = true;

            // Ajustar la rotación del personaje
            moveDirection.normalize();
            const lookAtTarget = this.mesh.position.clone().add(moveDirection);
            this.mesh.lookAt(lookAtTarget);
        } else {
            this.animations.stopAnimation("Armature|mixamo.com|Layer0");
            this.isRunning = false;
        }

        // Verificar si el jugador está tacleando
        if (this.controls && this.controls.isTackling() && this.tackleState === TACKLE_STATE.IDLE) {
            this.tackleState = TACKLE_STATE.STARTUP;
            this.tackleCounter = 0;
        }

        // Actualizar la hitbox de tacleada solo cuando está activa
        if (this.tackleState === TACKLE_STATE.ACTIVE) {
            this.updateTackleHitbox();
        }
    }

    updateTackleHitbox() {
        const forwardDirection = new THREE.Vector3(0, 0, 1).applyQuaternion(this.mesh.quaternion).normalize(); // Cambiar a dirección frontal
        const hitboxCenter = this.mesh.position.clone().add(forwardDirection.multiplyScalar(2.0)); // Ajustar la distancia 
        const offset = new THREE.Vector3(0, 1.5, 0); // Ajustar el offset si es necesario
        hitboxCenter.add(offset);
        this.tackleHitbox.setFromCenterAndSize(hitboxCenter, new THREE.Vector3(2, 3.5, 1.5)); // Ajustar el tamaño
    }

    updateTackleHitboxColor() {
        if (this.tackleState === TACKLE_STATE.STARTUP || this.tackleState === TACKLE_STATE.ENDLAG) {
            this.tackleHitboxHelper.material.color.set(0x0000ff); // Azul
        } else if (this.tackleState === TACKLE_STATE.ACTIVE) {
            this.tackleHitboxHelper.material.color.set(0xff0000); // Rojo
        }
    }

    createHitboxHelper(box, color) {
        const helper = new THREE.Box3Helper(box, color);
        this.scene.add(helper);
        return helper;
    }

    updateHitboxHelper(helper, box) {
        helper.box.copy(box);
    }

    handlePhysics(deltaTime) {
        updatePhysics(this, deltaTime, this.terrainMesh);
        this.velocity.x *= this.friction;
        this.velocity.z *= this.friction;
        this.mesh.position.addScaledVector(this.velocity, deltaTime);
    }

    checkOutOfBounds() {
        if (this.mesh.position.y < -10) {
            console.log('Jugador fuera del escenario');
        }
    }

    push(force) {
        this.velocity.add(force);
    }

   async saveToDatabase() {
        set(ref(this.databaseRef, `rooms/${this.roomId}/players/${this.id}`), {
            uid: this.id,
            characterName: this.characterName,
            position: {
                x: this.mesh.position.x,
                y: this.mesh.position.y,
                z: this.mesh.position.z
            },
            rotation: {
                x: this.mesh.rotation.x,
                y: this.mesh.rotation.y,
                z: this.mesh.rotation.z
            },
            velocity: {
                x: this.velocity.x,
                y: this.velocity.y,
                z: this.velocity.z
            },
            tackleState: this.tackleState,
            hitbox: {
                min: {
                    x: this.hitbox.min.x,
                    y: this.hitbox.min.y,
                    z: this.hitbox.min.z
                },
                max: {
                    x: this.hitbox.max.x,
                    y: this.hitbox.max.y,
                    z: this.hitbox.max.z
                }
            },
            isHost: this.isHost,
            tackleHitbox: {
                min: {
                    x: this.tackleHitbox.min.x,
                    y: this.tackleHitbox.min.y,
                    z: this.tackleHitbox.min.z
                },
                max: {
                    x: this.tackleHitbox.max.x,
                    y: this.tackleHitbox.max.y,
                    z: this.tackleHitbox.max.z
                }
            }
        });
    }  catch (error) {
        console.error("Error al guardar el jugador en la base de datos:", error);
      }

      async removeFromDatabase() {
        try {
          await remove(ref(this.db, `rooms/${this.roomId}/players/${this.uid}`));
        } catch (error) {
          console.error("Error al eliminar el jugador de la base de datos:", error);
        }
      }
}

export default Player;