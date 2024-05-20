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

function checkPlayerCollisions(players) {
    const pushStrength = 5; // Ajusta la fuerza del empuje según sea necesario
    const tacklePushStrength = 10; // Fuerza de empuje para el tacleo

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
            }

            if (player2.tackleState === 'active' && player2.tackleHitbox.intersectsBox(player1.hitbox)) {
                const direction = new THREE.Vector3().subVectors(player1.mesh.position, player2.mesh.position).normalize();
                player1.push(direction.multiplyScalar(tacklePushStrength));
                console.log(`Player ${player2.id} tacleó a Player ${player1.id}`);
            }

            updatePlayerCollisionInDatabase(player1);
            updatePlayerCollisionInDatabase(player2);
        }
    }
    
}

function updatePlayerCollisionInDatabase(player) {
    update(ref(db, `rooms/${player.roomId}/players/${player.id}`), {
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