import {
    Object3D,
    Vector3,
    WebGLRenderer,
    Scene,
    PerspectiveCamera,
    HemisphereLight,
    Vector2,
    Raycaster,
    Group,
    Box3
} from "./vendor_mods/three.module.js";
import { OrbitControls } from "./vendor_mods/OrbitControls.js";
import { ViewHelper } from "./vendor_mods/ViewHelper.js";
import Stats from "./vendor_mods/stats.module.js";
import { ComponentFactory } from "./factory.js";
import { UI } from "./ui.js";
import {
    SCENEBACKGROUND,
    HIGHLIGHT_COLOR,
    HIGHLIGHT_EMISSIVE,
    HIGHLIGHT_EMISSIVE_INTENSITY,
    HIGHLIGHT_OPACITY,
    HEMI_LIGHT_SKY_COLOR,
    HEMI_LIGHT_GROUND_COLOR,
    HEMI_LIGHT_INTENSITY,
    VIEW_HELPER_POSITION
} from './settings.js';

export class SceneBuilder {
    constructor() {
        Object3D.DEFAULT_UP = new Vector3(0, 0, 1);
        this.renderer = new WebGLRenderer({ antialias: true });
        this.renderer.physicallyCorrectLights = true;
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.autoClear = false;
        document.body.appendChild(this.renderer.domElement);

        this.stats = new Stats();
        document.body.appendChild(this.stats.dom);

        this.scene = new Scene();
        this.scene.background = SCENEBACKGROUND.clone();

        this.camera = new PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.001, 10000);
        this.camera.position.set(20, 20, 20);

        this.controls = new OrbitControls(this.camera, this.renderer.domElement);

        const hemi = new HemisphereLight(
            HEMI_LIGHT_SKY_COLOR,
            HEMI_LIGHT_GROUND_COLOR,
            HEMI_LIGHT_INTENSITY
        );
        this.scene.add(hemi);

        this.helper = new ViewHelper(this.camera, this.renderer, VIEW_HELPER_POSITION);
        this.helper.setControls(this.controls);

        this.raycaster = new Raycaster();
        this.pointer = new Vector2();
        this.INTERSECTED = null;

        this.controlsMoved = false;
        this.controls.addEventListener('start', () => { this.controlsMoved = false; });
        this.controls.addEventListener('change', () => {
            this.controlsMoved = true;
            this._clearSelection();
            this.ui.hideInfo();
        });

        this.renderer.domElement.addEventListener('mouseup', evt => {
            if (!this.controlsMoved) {
                this.pointer.x = (evt.clientX / window.innerWidth) * 2 - 1;
                this.pointer.y = - (evt.clientY / window.innerHeight) * 2 + 1;
                this._handlePick(evt.clientX, evt.clientY);
            }
        });

        this.rootGroup = new Group();
        this.rootGroup.name = "PipingSystem";
        this.scene.add(this.rootGroup);

        // State maps to persist visibility
        this.pipelineVisibility = {};
        this.typeVisibility = {};

        this.filesData = [];

        this.ui = new UI();
        this.ui.setBuilder(this);
        this.ui.buildSideMenu(this.filesData);

        this._setupResizeListener();
        this._animate();
    }

    addFile(parsed, fileName) {
        this.removeFile(fileName, true);

        this.filesData.push({ parsed, fileName });

        const pipelinesArray = Array.isArray(parsed.pipelines?.pipelines)
            ? parsed.pipelines.pipelines
            : [];
        const factory = new ComponentFactory(parsed.units, parsed.materials, pipelinesArray);
        const fileGroup = new Group();
        fileGroup.name = fileName;

        pipelinesArray.forEach(plc => {
            const uniqueName = `${fileName}|${plc.reference}`;
            const plGroup = new Group();
            plGroup.name = uniqueName;
            plc.components.forEach(block => {
                const mesh = factory.build({ block }, plc.reference);
                if (mesh) {
                    mesh.userData.type = block.type;
                    mesh.userData.pipelineRef = plc.reference;
                    mesh.userData.fileName = fileName;
                    plGroup.add(mesh);
                }
            });
            fileGroup.add(plGroup);
        });

        this.rootGroup.add(fileGroup);

        // Apply saved visibility for pipelines in this file
        pipelinesArray.forEach(plc => {
            const uniqueName = `${fileName}|${plc.reference}`;
            const visible = this.pipelineVisibility[uniqueName] !== false;
            this.togglePipeline(uniqueName, visible);
        });

        // Apply saved visibility for types
        Object.entries(this.typeVisibility).forEach(([type, visible]) => {
            if (visible === false) this.toggleType(type, false);
        });

        this.ui.buildSideMenu(this.filesData);
        this._frameCamera(this.rootGroup);
    }

    removeFile(fileName) {
        const group = this.rootGroup.getObjectByName(fileName);
        if (group) {
            this.rootGroup.remove(group);
            group.traverse(obj => {
                if (obj.geometry) obj.geometry.dispose();
                if (obj.material) {
                    Array.isArray(obj.material)
                        ? obj.material.forEach(m => m.dispose())
                        : obj.material.dispose();
                }
            });
        }
        const idx = this.filesData.findIndex(f => f.fileName === fileName);
        if (idx !== -1) this.filesData.splice(idx, 1);

        this.ui.buildSideMenu(this.filesData);

        if (this.rootGroup.children.length === 0) {
            this.controls.target.set(0, 0, 0);
            this.controls.update();
            this.camera.position.set(20, 20, 20);
        } else {
            this._frameCamera(this.rootGroup);
        }
    }

    togglePipeline(uniqueName, visible) {
        // Persist state
        this.pipelineVisibility[uniqueName] = visible;
        const group = this.scene.getObjectByName(uniqueName);
        if (group) {
            group.visible = visible;
        } else {
            console.warn(`Pipeline group '${uniqueName}' not found`);
        }
    }

    toggleType(type, visible) {
        // Persist state
        this.typeVisibility[type] = visible;
        this.scene.traverse(obj => {
            if (obj.isMesh && obj.userData.type === type) {
                obj.visible = visible;
            }
        });
    }

    _frameCamera(rootGroup) {
        const MAX_REFRAME_ANGLE = Math.PI / 12; // 15°, move to settings.js later on
        const box = new Box3().setFromObject(rootGroup);
        const center = box.getCenter(new Vector3());
        const size = box.getSize(new Vector3()).length();
        const offset = size;

        const currentTarget = this.controls.target.clone();
        const currentDir = this.camera.position.clone().sub(currentTarget).normalize();
        const newDir = currentTarget.clone().sub(center).negate().normalize();
        const dot = currentDir.dot(newDir);
        const angle = Math.acos(Math.min(Math.max(dot, -1), 1));
        if (angle < MAX_REFRAME_ANGLE) {
            return;
        }

        const newPos = center.clone().add(currentDir.multiplyScalar(offset));
        this.camera.position.copy(newPos);
        this.controls.target.copy(center);
        this.controls.update();
    }

    _clearSelection() {
        if (this.INTERSECTED) {
            const mat = this.INTERSECTED.material;
            mat.color.copy(this.currentColor);
            mat.emissive.copy(this.currentEmissive);
            mat.emissiveIntensity = this.currentEmissiveIntensity;
            mat.opacity = this.currentOpacity;
            mat.transparent = this.currentTransparent;
            this.INTERSECTED = null;
        }
    }

    _handlePick(clientX, clientY) {
        this.raycaster.setFromCamera(this.pointer, this.camera);
        const visibleMeshes = [];
        this.scene.traverse(obj => {
            if (obj.isMesh && obj.visible) visibleMeshes.push(obj);
        });
        const hits = this.raycaster.intersectObjects(visibleMeshes, true);
        if (hits.length > 0) {
            const picked = hits[0].object;
            if (this.INTERSECTED !== picked) {
                if (this.INTERSECTED) this._clearSelection();
                this.INTERSECTED = picked;
                const mat = picked.material;
                this.currentColor = mat.color.clone();
                this.currentEmissive = mat.emissive.clone();
                this.currentEmissiveIntensity = mat.emissiveIntensity;
                this.currentOpacity = mat.opacity;
                this.currentTransparent = mat.transparent;
                mat.color.copy(HIGHLIGHT_COLOR);
                mat.emissive.copy(HIGHLIGHT_EMISSIVE);
                mat.emissiveIntensity = HIGHLIGHT_EMISSIVE_INTENSITY;
                mat.opacity = HIGHLIGHT_OPACITY;
                mat.transparent = true;
                this._showInfo(picked.userData.rawBlock, clientX, clientY);
            }
        } else {
            this._clearSelection();
            this.ui.hideInfo();
        }
    }

    _showInfo(userData, x, y) {
        this.ui.showInfo(userData, x, y);
    }

    _setupResizeListener() {
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight, true);
            this.controls.update();
            this.helper.render();
        });
    }

    _animate() {
        this.stats.begin();
        requestAnimationFrame(() => this._animate());
        this.renderer.clear();
        this.renderer.render(this.scene, this.camera);
        this.helper.render();
        this.stats.end();
    }
}