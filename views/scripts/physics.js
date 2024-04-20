import * as THREE from '../three.module.js';

function updatePhysics(player, deltaTime, terrainMesh) {
   
    // Raycasting para el terreno
    const raycaster = new THREE.Raycaster(player.mesh.position.clone().add(new THREE.Vector3(0, 0.5, 0)), new THREE.Vector3(0, -1, 0));
    const intersects = raycaster.intersectObject(terrainMesh);
    const groundThreshold = 0.05;

    if (intersects.length > 0) {
        const closest = intersects[0];
        const distanceToGround = closest.distance - 1.0; // Asume origen en el centro del jugador

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
        // Aplicar gravedad solo si el jugador no está en el suelo
        player.velocity.y += -9.81 * deltaTime;
    }
}


export { updatePhysics };