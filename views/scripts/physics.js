import * as THREE from '../three.module.js';
import { ref, update } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";
import { db } from './firebaseConfig.js';

function updatePhysics(player, deltaTime, terrainMesh) {
    const raycaster = new THREE.Raycaster(player.mesh.position.clone().add(new THREE.Vector3(0, 1.0, 0)), new THREE.Vector3(0, -1, 0));
    const intersects = raycaster.intersectObject(terrainMesh);
    const groundThreshold = 0.05;

    if (intersects.length > 0) {
        const closest = intersects[0];
        const distanceToGround = closest.distance - 1.0; // origen en el centro del jugador

        if (distanceToGround <= groundThreshold) {
            player.mesh.position.y -= distanceToGround; // Ajusta jugador al suelo
            player.velocity.y = 0;
            if (!player.isGrounded) {
                console.log("grounded");
            }
            player.isGrounded = true;
        } else {
            if (player.isGrounded) {
                console.log("airborne");
            }
            player.isGrounded = false;
            // Aplicar gravedad solo si el jugador no está en el suelo
            player.velocity.y += -9.81 * deltaTime;
        }
    } else {
        if (player.isGrounded) {
            console.log("airborne");
        }
        player.isGrounded = false;
        
        player.velocity.y += -9.81 * deltaTime;
    }
}

function checkPlayerCollisions(players,difficulty,roomId,monedas,scene) {
    let pushStrength;
    let tacklePushStrength;

    // Establecer la fuerza de empuje según la dificultad
    if (difficulty === 'easy') {
        pushStrength = 3; 
        tacklePushStrength = 5; 
    } else if (difficulty === 'hard') {
        pushStrength = 8; 
        tacklePushStrength = 25; 
    }

    for (let i = 0; i < players.length - 1; i++) {
        for (let j = i + 1; j < players.length; j++) {
            const player1 = players[i];
            const player2 = players[j];

           if (player1.hitbox.intersectsBox(player2.hitbox)) {
                // Calcula la dirección del empuje
                
                const direction = new THREE.Vector3().subVectors(player2.mesh.position, player1.mesh.position).normalize();

                // Aplica la fuerza de empuje a ambos jugadores
                const player1Push = direction.clone().multiplyScalar(-pushStrength);
                const player2Push = direction.clone().multiplyScalar(pushStrength);

                player1.push(player1Push);
                player2.push(player2Push);

                console.log(`Player ${player1.id} ha colisionado con Player ${player2.id}`);
            }

            // Verificar tacleo
            
            if (player1.tackleState === 'active' && player1.tackleHitbox.intersectsBox(player2.hitbox)) {
                const direction = new THREE.Vector3().subVectors(player2.mesh.position, player1.mesh.position).normalize();
                player2.push(direction.multiplyScalar(tacklePushStrength));
                console.log(`Player ${player1.id} tacleó a Player ${player2.id}`);
                console.log(difficulty);
            }

            if (player2.tackleState === 'active' && player2.tackleHitbox.intersectsBox(player1.hitbox)) {
                const direction = new THREE.Vector3().subVectors(player1.mesh.position, player2.mesh.position).normalize();
                player1.push(direction.multiplyScalar(tacklePushStrength));
                console.log(`Player ${player2.id} tacleó a Player ${player1.id}`);
                console.log(difficulty);
            }

            updatePlayerCollisionInDatabase(player1,roomId);
            updatePlayerCollisionInDatabase(player2,roomId);
        }
    }

     // Verificar colisiones de jugadores con monedas
     for (const player of players) {
        for (let i = monedas.length - 1; i >= 0; i--) {
            const moneda = monedas[i];

            if (player.hitbox.intersectsBox(moneda.hitbox)) {
                // Destruir la moneda colisionada
                scene.remove(moneda.modelo);
                monedas.splice(i, 1);

                // Sumar un punto al jugador
                player.score = (player.score || 0) + 1;
                console.log(`Player ${player.id} recogió una moneda. Puntuación: ${player.score}`);

                // Actualizar la puntuación del jugador en la base de datos
                updatePlayerScoreInDatabase(player, roomId);
            }
        }
    }

    
}

async function updatePlayerScoreInDatabase(player, roomId) {
    const playerRef = ref(db, `rooms/${roomId}/players/${player.id}`);
    await update(playerRef, { score: player.score });
}

function updatePlayerCollisionInDatabase(player,roomId) {
    update(ref(db, `rooms/${roomId}/players/${player.id}`), {
        position: player.mesh.position,
        velocity: player.velocity,
        tackleState: player.tackleState,
        hitbox: {
            min: player.hitbox.min,
            max: player.hitbox.max,
        },
        tackleHitbox: {
            min: player.tackleHitbox.min,
            max: player.tackleHitbox.max,
        }
    });
}

export { updatePhysics, checkPlayerCollisions };