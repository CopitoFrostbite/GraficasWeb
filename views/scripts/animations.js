import * as THREE from '../three.module.js';

class Animations {
    constructor(mesh, gltf) {
        this.mesh = mesh;
        this.mixer = new THREE.AnimationMixer(this.mesh);
        this.animations = {};
        this.currentAction = null;

        gltf.animations.forEach((clip) => {
            this.animations[clip.name] = clip;
            this.mixer.clipAction(clip);
        });
    }

    playAnimation(name) {
        const action = this.animations[name];
        if (action) {
            if (this.currentAction !== action) {
                if (this.currentAction) {
                    this.currentAction.fadeOut(0.5);
                }
                action.reset().fadeIn(0.5).play();
                this.currentAction = action;
                let direction = new THREE.Vector3(this.velocity.x, 0, this.velocity.z).normalize();
                let lookAtTarget = new THREE.Vector3().addVectors(this.mesh.position, direction);
                this.mesh.lookAt(lookAtTarget);
            }
        } else {
            console.warn(`Animation ${name} not found for character ${this.characterName}`);
        }
    }

    stopAnimation(name) {
        const action = this.mixer._actions.find(action => action._clip.name === name);
        if (action) {
            action.fadeOut(0.5);
            action.onFinish = () => {
                action.stop();
            };
            if (this.currentAction === action) {
                this.currentAction = null;
            }
        } else {
            console.warn(`Animation ${name} not found for character ${this.characterName}`);
        }
    }

    update(deltaTime) {
        if (this.mixer) {
            this.mixer.update(deltaTime);
        }
    }
}

export default Animations;