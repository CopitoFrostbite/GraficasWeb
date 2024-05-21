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

export async function cargarMonedaEnPosicion(url, posicion, escala, scene, mixers) {
    return loaderGLTF.loadAsync(url).then(gltf => {
        const moneda = gltf.scene;
        moneda.position.copy(posicion);
        moneda.scale.copy(escala);
        scene.add(moneda);
        
        if (gltf.animations.length > 0) {
            const mixer = new THREE.AnimationMixer(moneda);
            gltf.animations.forEach(clip => {
                mixer.clipAction(clip).play();
            });
            mixers.push(mixer);
        }

        // Crear el objeto de la moneda con su hitbox
        const monedaObjeto = {
            modelo: moneda,
            hitbox: new THREE.Box3().setFromObject(moneda)
        };

        return monedaObjeto;
    });
}

export async function cargarModeloEnPosicionYCaerConRetraso(posicion, retraso,scene,camera) {
    loaderGLTF.load(
    "./modelos/meteor.glb",
    function (model) {
        const obj = model.scene.clone(); 
        obj.position.copy(posicion); 
        obj.scale.set(3, 3, 3);
        scene.add(obj);

        // Temporizador para iniciar la caída después de un retraso
        setTimeout(() => {
            iniciarCaída(obj);
        }, retraso);

        // Función para iniciar la caída de la roca
        function iniciarCaída(roca) {
            const velocidadDeCaída = 0.7; // Ajusta la velocidad de caída según sea necesario
            animate();

            function animate() {
                roca.position.y -= velocidadDeCaída;

                // Verificar si la roca ha llegado al suelo
                if (roca.position.y <= -7) {
                    // Reproducir sonido
                    reproducirSonido();
                    //temblor
                    simularTemblor();
                    return;
                }

                requestAnimationFrame(animate);
            }
        }

       // Función para simular temblor en la cámara
       function simularTemblor() {
            const temblorIntensity = 0.1; // Intensidad del temblor
            const temblorDuration = 700; // Duración del temblor en milisegundos

            const initialPosition = camera.position.clone(); // Guarda la posición inicial de la cámara

            let endTime = Date.now() + temblorDuration;

            function shake() {
                const currentTime = Date.now();
                if (currentTime <= endTime) {
                    const randomOffsetX = Math.random() * temblorIntensity - temblorIntensity / 2;
                    const randomOffsetY = Math.random() * temblorIntensity - temblorIntensity / 2;
                    const randomOffsetZ = Math.random() * temblorIntensity - temblorIntensity / 2;

                    camera.position.set(
                        initialPosition.x + randomOffsetX,
                        initialPosition.y + randomOffsetY,
                        initialPosition.z + randomOffsetZ
                    );

                    requestAnimationFrame(shake);
                }
                else {
                    // Restaurar la posición original de la cámara
                    camera.position.copy(initialPosition);
                }
            }

            shake(); }

        // Función para reproducir el sonido cuando la roca llegue al suelo
        function reproducirSonido() {
            const listener = new THREE.AudioListener();
            camera.add(listener);
            const sound = new THREE.Audio(listener);
            const audioLoader = new THREE.AudioLoader();

            audioLoader.load('./explosion.mp3', function(buffer) {
                sound.setBuffer(buffer);
                sound.setVolume(0.5); // Ajusta el volumen según sea necesario
                sound.play();
            });
        }
    }
);
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