import * as THREE from '../three.module.js';

function updatePhysics(player, deltaTime, terrainMesh) {
   
    
    const raycaster = new THREE.Raycaster(player.mesh.position.clone().add(new THREE.Vector3(0, 1.0, 0)), new THREE.Vector3(0, -1, 0));
    const intersects = raycaster.intersectObject(terrainMesh);
    const groundThreshold = 0.05;

    if (intersects.length > 0) {
        const closest = intersects[0];
        const distanceToGround = closest.distance - 1.0; //  origen en el centro del jugador

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
    for (let i = 0; i < players.length - 1; i++) {
        for (let j = i + 1; j < players.length; j++) {
            if (players[i].hitbox.intersectsBox(players[j].hitbox)) {
                // Manejar colisión entre players[i] y players[j]
                console.log(`Player ${players[i].id} ha colisionado con Player ${players[j].id}`);
                // Aquí falta aplicar la lógica  como resultado de la colisión
            }
        }
    }
}


export { updatePhysics, checkPlayerCollisions };