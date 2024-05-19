import * as THREE from '../three.module.js';
import { GLTFLoader } from '../GLTFLoader.js';
import { firebaseConfig } from './firebaseConfig.js';
import Player from './player.js';
import PlayerControls from './playerControls.js';
import { onValue, ref,getDatabase } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";
import { animateHost, animateClient } from './animate.js';
import { OrbitControls } from '../OrbitControls.js';
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";

export let playerControls;
export let clock;
export let mixers = [];
export let players = {};
export let rayoModel = null;
export let renderer;
export let camera;
export let scene = new THREE.Scene();
const roomId = localStorage.getItem('roomId');
const currentUser = JSON.parse(localStorage.getItem('currentUser'));
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const loader = new THREE.TextureLoader();
const loaderGLTF = new GLTFLoader();

loader.load('./fondo hielo.jpg', function (texture) {
    scene.background = texture;
});

camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 45, 5);

const hemisphereLight = new THREE.HemisphereLight(0xffffbb, 0x080820, 1);
scene.add(hemisphereLight);

renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.domElement.tabIndex = '0';
document.body.appendChild(renderer.domElement);
renderer.domElement.focus();
new OrbitControls(camera, renderer.domElement);

clock = new THREE.Clock();

export async function initGame() {
    const terrainMesh = await cargarModeloEnPosicion('./modelos/low-poly_ice_world.glb', new THREE.Vector3(0, 0, 0), new THREE.Vector3(1.3, 1.3, 1.3));

    const iceTexture = loader.load('./modelos/iceTex.jpg', function (texture) {
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(1, 1);
        terrainMesh.traverse(function (child) {
            if (child.isMesh) {
                child.material.map = texture;
                child.material.needsUpdate = true;
            }
        });
    });

    const posicionesPinos = [
        new THREE.Vector3(-20, 0, 0),
        new THREE.Vector3(3, 0.5, -17),
        new THREE.Vector3(20, 0, 4),
        new THREE.Vector3(20, 0, 0),
        new THREE.Vector3(0, 0, -20),
        new THREE.Vector3(0, 0.5, 20),
    ];

    posicionesPinos.forEach(pos => cargarModeloEnPosicion('./modelos/pino.glb', pos, new THREE.Vector3(0.8, 0.8, 0.8)));

    cargarModeloEnPosicion('./modelos/PolarBear.glb', new THREE.Vector3(15, 1.5, -17), new THREE.Vector3(0.5, 0.5, 0.5));
    cargarRayo(new THREE.Vector3(-13, 2, 0));

    await initPlayer(terrainMesh);

    onValue(ref(db, `rooms/${roomId}/players`), (snapshot) => {
        const playersData = snapshot.val();
        for (const playerId in playersData) {
            if (playersData.hasOwnProperty(playerId)) {
                if (!players[playerId]) {
                    addPlayerToScene(playerId, playersData[playerId], terrainMesh);
                } else {
                    updatePlayerFromDatabase(playerId, playersData[playerId]);
                }
            }
        }
    });

    if (localStorage.getItem('isHost') === 'true') {
        console.log("Soy el host, iniciar lógica de host...");
        requestAnimationFrame(animateHost);
    } else {
        console.log("Soy un cliente, iniciar lógica de cliente...");
        requestAnimationFrame(animateClient);
    }
}

async function initPlayer(terrainMesh) {
    const playerModelData = await cargarModelo('./modelos/StaticZorroR.glb');
    const initialPosition = { x: 0, y: 8, z: 0 };
    const initialRotation = { x: 0, y: 0, z: 0 };

    playerModelData.scene.position.set(initialPosition.x, initialPosition.y, initialPosition.z);
    playerModelData.scene.rotation.set(initialRotation.x, initialRotation.y, initialRotation.z);
    playerModelData.scene.scale.set(0.8, 0.8, 0.8);
    playerModelData.scene.rotateY(Math.PI / 2);

    renderer.domElement.tabIndex = '0';
    renderer.domElement.focus();

    playerControls = new PlayerControls(camera, renderer.domElement);
    const isHost = localStorage.getItem('isHost') === 'true';
    const newPlayer = new Player(currentUser.uid, playerModelData, "Zorro", playerControls, scene, terrainMesh, db, roomId, isHost);

    await cargarAnimaciones('./modelos/AnimacionZorroRun.glb', newPlayer.animations.mixer);

    newPlayer.animationsMap = {
        'Run': 'Armature|mixamo.com|Layer0',
    };

    players[currentUser.uid] = newPlayer;
    scene.add(playerModelData.scene);
}

async function cargarAnimaciones(url, mixer) {
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

function cargarModeloEnPosicion(url, posicion, escala) {
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

async function cargarModelo(url) {
    const gltf = await loaderGLTF.loadAsync(url);
    return { scene: gltf.scene, animations: gltf.animations };
}

function cargarRayo(posicion) {
    loaderGLTF.load('./modelos/rayo.glb', function (model) {
        const obj = model.scene;
        obj.position.copy(posicion);
        obj.scale.set(0.8, 0.5, 0.8);
        scene.add(obj);
        rayoModel = obj;
    });
}

async function addPlayerToScene(playerId, playerData, terrainMesh) {
    if (!playerData.position || !playerData.rotation) {
        console.error(`Player data incomplete for playerId: ${playerId}`, playerData);
        return;
    }

    const playerModelData = await cargarModelo('./modelos/StaticConejoR.glb');
    playerModelData.scene.position.set(playerData.position.x, playerData.position.y, playerData.position.z);
    playerModelData.scene.rotation.set(playerData.rotation.x, playerData.rotation.y, playerData.rotation.z);
    playerModelData.scene.scale.set(0.8, 0.8, 0.8);

    const isHost = localStorage.getItem('isHost') === 'true';
    const newPlayer = new Player(playerId, playerModelData, "Conejo", null, scene, terrainMesh, db, roomId);
    newPlayer.mesh.position.set(playerData.position.x, playerData.position.y, playerData.position.z);
    newPlayer.mesh.rotation.set(playerData.rotation.x, playerData.rotation.y, playerData.rotation.z);
    newPlayer.velocity.set(playerData.velocity.x, playerData.velocity.y, playerData.velocity.z);
    newPlayer.tackleState = playerData.tackleState;
    newPlayer.hitbox.set(new THREE.Vector3(playerData.hitbox.min.x, playerData.hitbox.min.y, playerData.hitbox.min.z), new THREE.Vector3(playerData.hitbox.max.x, playerData.hitbox.max.y, playerData.hitbox.max.z));
    newPlayer.tackleHitbox.set(new THREE.Vector3(playerData.tackleHitbox.min.x, playerData.tackleHitbox.min.y, playerData.tackleHitbox.min.z), new THREE.Vector3(playerData.tackleHitbox.max.x, playerData.tackleHitbox.max.y, playerData.tackleHitbox.max.z));

    await cargarAnimaciones('./modelos/AnimacionConejoRun.glb', newPlayer.animations.mixer);

    newPlayer.animationsMap = {
        'Run': 'Armature|mixamo.com|Layer0',
    };

    players[playerId] = newPlayer;
    scene.add(playerModelData.scene);
}

function updatePlayerFromDatabase(playerId, playerData) {
    const player = players[playerId];
    player.mesh.position.set(playerData.position.x, playerData.position.y, playerData.position.z);
    player.mesh.rotation.set(playerData.rotation.x, playerData.rotation.y, playerData.rotation.z);
    player.velocity.set(playerData.velocity.x, playerData.velocity.y, playerData.velocity.z);
    player.tackleState = playerData.tackleState;
    player.hitbox.set(new THREE.Vector3(playerData.hitbox.min.x, playerData.hitbox.min.y, playerData.hitbox.min.z), new THREE.Vector3(playerData.hitbox.max.x, playerData.hitbox.max.y, playerData.hitbox.max.z));
    player.tackleHitbox.set(new THREE.Vector3(playerData.tackleHitbox.min.x, playerData.tackleHitbox.min.y, playerData.tackleHitbox.min.z), new THREE.Vector3(playerData.tackleHitbox.max.x, playerData.tackleHitbox.max.y, playerData.tackleHitbox.max.z));
}