import * as THREE from './three.module.js';
import { OrbitControls } from './OrbitControls.js';
import { GLTFLoader } from './GLTFLoader.js';
import Player from './scripts/player.js';
import PlayerControls from './scripts/playerControls.js';
import { checkPlayerCollisions } from './scripts/physics.js';
import { db } from './scripts/firebaseConfig.js';  
import {      
    ref,
    onValue,
    set,
    update
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";
import { cargarModeloEnPosicion, cargarModelo, cargarAnimaciones, cargarPowerupEnPosicion } from './utils.js';

const roomId = localStorage.getItem('roomId');
const currentUser = JSON.parse(localStorage.getItem('currentUser'));

if (!roomId || !currentUser) {
    alert("No se pudo cargar el ID de la sala o el usuario. Redirigiendo al inicio de sesión.");
    window.location.href = 'index.html';
}

const scene = new THREE.Scene();
const loader = new THREE.TextureLoader();
const clock = new THREE.Clock();
const mixers = [];
const players = {};
let rayoModel = null;

loader.load('./fondo hielo.jpg', function (texture) {
  scene.background = texture;
});

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 45, 5);

const hemisphereLight = new THREE.HemisphereLight(0xffffbb, 0x080820, 1);
scene.add(hemisphereLight);

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.domElement.tabIndex = '0';
document.body.appendChild(renderer.domElement);
renderer.domElement.focus();
new OrbitControls(camera, renderer.domElement);

async function init() {
  const terrainMesh = await cargarModeloEnPosicion('./modelos/low-poly_ice_world.glb', new THREE.Vector3(0, 0, 0), new THREE.Vector3(1.3, 1.3, 1.3), scene, mixers);

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

  posicionesPinos.forEach(pos => cargarModeloEnPosicion('./modelos/pino.glb', pos, new THREE.Vector3(0.8, 0.8, 0.8), scene, mixers));

  cargarModeloEnPosicion('./modelos/PolarBear.glb', new THREE.Vector3(15, 1.5, -17), new THREE.Vector3(0.5, 0.5, 0.5), scene, mixers);
  cargarPowerupEnPosicion('./modelos/rayo.glb', new THREE.Vector3(-13, 2, 0), new THREE.Vector3(0.8, 0.5, 0.8), scene, mixers);
  

  await initPlayer(terrainMesh);

  // Leer todos los jugadores en la sala
  onValue(ref(db, `rooms/${roomId}/players`), (snapshot) => {
      const playersData = snapshot.val();
      for (const playerId in playersData) {
          if (playersData.hasOwnProperty(playerId)) {
              if (!players[playerId]) {
                  // Añadir nuevo jugador a la escena
                  addPlayerToScene(playerId, playersData[playerId], terrainMesh);
              } else {
                  // Actualizar jugador existente
                  updatePlayerFromDatabase(playerId, playersData[playerId]);
              }
          }
      }
  });

  if (localStorage.getItem('isHost') === 'true') {
      console.log("Soy el host, iniciar lógica de host...");
      // Código específico para el host
      requestAnimationFrame(animateHost);
  } else {
      console.log("Soy un cliente, iniciar lógica de cliente...");
      // Código específico para el cliente
      requestAnimationFrame(animateClient);
  }

}

console.log(localStorage.getItem('currentUser'));
console.log(localStorage.getItem('roomId'));

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

  const playerControls = new PlayerControls(camera, renderer.domElement);
  const isHost = localStorage.getItem('isHost') === 'true';
  const newPlayer = new Player(currentUser.uid, playerModelData, "Zorro", playerControls, scene, terrainMesh, db, roomId, isHost);

  await cargarAnimaciones('./modelos/AnimacionZorroRun.glb', newPlayer.animations.mixer);

  newPlayer.animationsMap = {
      'Run': 'Armature|mixamo.com|Layer0',
  };

  players[currentUser.uid] = newPlayer;
  scene.add(playerModelData.scene);
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

let lastDatabaseUpdate = Date.now();
const databaseUpdateInterval = 1000;
const now = Date.now();
if (now - lastDatabaseUpdate >= databaseUpdateInterval) {  
  function updateDatabase() {
      for (const playerId in players) {
          const player = players[playerId];
          set(ref(db, `rooms/${roomId}/players/${playerId}`), {
              uid: playerId,
              characterName: player.characterName,
              position: {
                  x: player.mesh.position.x,
                  y: player.mesh.position.y,
                  z: player.mesh.position.z
              },
              rotation: {
                  x: player.mesh.rotation.x,
                  y: player.mesh.rotation.y,
                  z: player.mesh.rotation.z
              },
              velocity: {
                  x: player.velocity.x,
                  y: player.velocity.y,
                  z: player.velocity.z
              },
              tackleState: player.tackleState,
              hitbox: {
                  min: {
                      x: player.hitbox.min.x,
                      y: player.hitbox.min.y,
                      z: player.hitbox.min.z
                  },
                  max: {
                      x: player.hitbox.max.x,
                      y: player.hitbox.max.y,
                      z: player.hitbox.max.z
                  }
              },
              tackleHitbox: {
                  min: {
                      x: player.tackleHitbox.min.x,
                      y: player.tackleHitbox.min.y,
                      z: player.tackleHitbox.min.z
                  },
                  max: {
                      x: player.tackleHitbox.max.x,
                      y: player.tackleHitbox.max.z
                  }
              }
          });
      }
      lastDatabaseUpdate = now;
  }
}

let lastFrameTime = Date.now();

function animateHost() {
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

  //updateDatabase(); // Only the host updates the database
}

function animateClient() {
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

init();

// Pausar y reanudar el juego
let isPaused = false;
const pauseModal = document.getElementById('pauseModal');

function togglePause() {
    if (isPaused) {
        pauseModal.style.display = 'none';
        isPaused = false;
       
        requestAnimationFrame(localStorage.getItem('isHost') === 'true' ? animateHost : animateClient);
    } else {
        pauseModal.style.display = 'flex';
        isPaused = true;
        
        cancelAnimationFrame(localStorage.getItem('isHost') === 'true' ? animateHost : animateClient);
    }
}

document.addEventListener('keydown', function(event) {
    if (event.key === 'p') {
        togglePause();
    }
});

document.getElementById('resumen').addEventListener('click', function(event) {
    event.preventDefault();
    togglePause();
});

document.getElementById('salir').addEventListener('click', function(event) {
    event.preventDefault();

    if (localStorage.getItem('isHost') === 'true') {
        // Eliminar toda la sala
        remove(ref(db, `rooms/${roomId}`)).then(() => {
            window.location.href = '../views/index.html';
        }).catch((error) => {
            console.error("Error al eliminar la sala: ", error);
        });
    } else {
        // Eliminar el jugador de la sala
        remove(ref(db, `rooms/${roomId}/players/${currentUser.uid}`)).then(() => {
            window.location.href = '../views/index.html';
        }).catch((error) => {
            console.error("Error al eliminar el jugador: ", error);
        });
    }
});