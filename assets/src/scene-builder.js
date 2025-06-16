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
  constructor(parsed) {
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
    this.controls.addEventListener('start', () => {
      this.controlsMoved = false;
    });
    this.controls.addEventListener('change', () => {
      this.controlsMoved = true;
      this._clearSelection();
      this.ui.hideInfo();
    });

    const canvas = this.renderer.domElement;
    canvas.addEventListener('mouseup', evt => {
      if (!this.controlsMoved) {
        this.pointer.x = (evt.clientX / window.innerWidth) * 2 - 1;
        this.pointer.y = - (evt.clientY / window.innerHeight) * 2 + 1;
        this._handlePick(evt.clientX, evt.clientY);
      }
    });

    this.parsed = parsed;
    this.factory = new ComponentFactory(parsed.units, parsed.materials);

    this.ui = new UI();
    this._setupResizeListener();
    this._animate();
  }

  update(parsed) {
    this.parsed = parsed;
    this.factory = new ComponentFactory(parsed.units, parsed.materials);
  }

  build() {
    const pipelines = (this.parsed && this.parsed.pipelines && Array.isArray(this.parsed.pipelines.pipelines))
      ? this.parsed.pipelines.pipelines
      : [];

    const root = new Group();
    root.name = "PipingSystem";

    pipelines.forEach(plc => {
      const plGroup = new Group();
      plGroup.name = plc.reference;

      plc.components.forEach(block => {
        const mesh = this.factory.build({ block }, plc.reference);
        if (mesh) {
          mesh.userData.type = block.type;
          mesh.userData.pipelineRef = plc.reference;
          plGroup.add(mesh);
        }
      });

      root.add(plGroup);
    });

    this._frameCamera(root);
    return root;
  }

  togglePipeline(pipelineRef, visible) {
    const group = this.scene.getObjectByName(pipelineRef);
    if (group) {
        group.visible = visible;
    } else {
        console.warn(`Pipeline group '${pipelineRef}' not found`);
    }
  }

  toggleType(type, visible) {
    this.scene.traverse(obj => {
        if (obj.isMesh && obj.userData.type === type) {
            obj.visible = visible;
        }
    });
  }

  _frameCamera(rootGroup) {
    const box = new Box3().setFromObject(rootGroup);
    const center = box.getCenter(new Vector3());
    const size = box.getSize(new Vector3()).length();

    const offset = size * 1;
    this.camera.position.set(
      center.x + offset,
      center.y + offset,
      center.z + offset
    );

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
    const hits = this.raycaster.intersectObjects(this.scene.children, true);

    // only visible objects
    const visibleMeshes = [];
    this.scene.traverse(obj => {
        if (obj.isMesh && obj.visible) {
            visibleMeshes.push(obj);
        }
    });

    if (hits.length > 0) {
      const picked = hits[0].object;
      if (this.INTERSECTED !== picked) {
        if (this.INTERSECTED) {
          const oldMat = this.INTERSECTED.material;
          oldMat.color.copy(this.currentColor);
          oldMat.emissive.copy(this.currentEmissive);
          oldMat.emissiveIntensity = this.currentEmissiveIntensity;
          oldMat.opacity = this.currentOpacity;
          oldMat.transparent = this.currentTransparent;
        }

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