import { GLTFLoader } from './GLTFLoader.js';
import * as THREE from './three.module.js';

const loaderGLTF = new GLTFLoader();

export async function cargarModeloEnPosicion(url, posicion, escala, scene, mixers) {
    return loaderGLTF.loadAsync(url).then(gltf => {
        const obj = gltf.scene;
        obj.position.copy(posicion);
        obj.scale.copy(escala);
        scene.add(obj);
        if (gltf.animations.length > 0) {
            const mixer = new THREE.AnimationMixer(obj);
            gltf.animations.forEach(clip => {
                mixer.clipAction(clip).play();
            });
            mixers.push(mixer);
        }
        return obj;
    });
}

export async function cargarPowerupEnPosicion(url, posicion, escala, scene, mixers) {
    return loaderGLTF.loadAsync(url).then(gltf => {
        const obj = gltf.scene;
        obj.position.copy(posicion);
        obj.scale.copy(escala);
        scene.add(obj);

        // Variables para la animación sinusoidal
        let time = 0;

        // Añadir la animación de rotación y traslación sinusoidal
        function animar() {
            obj.rotation.y += 0.01;
            obj.position.y = posicion.y + Math.sin(time) * 0.5;
            time += 0.02;  // Ajustar este valor para cambiar la velocidad de la onda
            requestAnimationFrame(animar);
        }
        animar();

        if (gltf.animations.length > 0) {
            const mixer = new THREE.AnimationMixer(obj);
            gltf.animations.forEach(clip => {
                mixer.clipAction(clip).play();
            });
            mixers.push(mixer);
        }
        return obj;
    });
}

export async function cargarModelo(url) {
    const gltf = await loaderGLTF.loadAsync(url);
    return { scene: gltf.scene, animations: gltf.animations };
}



export async function cargarAnimaciones(url, mixer) {
    try {
        const gltf = await loaderGLTF.loadAsync(url);
        gltf.animations.forEach((clip) => {
            const action = mixer.clipAction(clip);
            action.setLoop(THREE.LoopRepeat);
            action.paused = true;
            console.log(`Animación preparada: ${clip.name}`);
        });
    } catch (error) {
        console.error('Hubo un problema al cargar el archivo GLB:', error);
    }
}