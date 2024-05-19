import { clock, mixers, players, rayoModel, renderer, camera,scene } from './init.js';
import { checkPlayerCollisions } from './physics.js';
import { isPaused } from './pause.js';

export function animateHost() {
    requestAnimationFrame(animateHost);
    const deltaTime = clock.getDelta();

    mixers.forEach(mixer => mixer.update(deltaTime));

    for (const playerId in players) {
        players[playerId].update(deltaTime);
    }

    checkPlayerCollisions(Object.values(players));

    if (rayoModel) {
        rayoModel.rotation.y += 0.01;
    }

    renderer.render(scene, camera);

    
}

export function animateClient() {
    requestAnimationFrame(animateClient);
    const deltaTime = clock.getDelta();

    mixers.forEach(mixer => mixer.update(deltaTime));

    for (const playerId in players) {
        players[playerId].update(deltaTime);
    }

    checkPlayerCollisions(Object.values(players));

    if (rayoModel) {
        rayoModel.rotation.y += 0.01;
    }

    renderer.render(scene, camera);
}