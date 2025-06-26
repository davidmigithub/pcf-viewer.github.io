import {
    Group,
    Vector3,
    Quaternion,
    BufferGeometry,
    Line,
    LineLoop,
    LineBasicMaterial,
    Mesh,
    CylinderGeometry
} from "../vendor_mods/three.module.js";
import { WELD_MATERIAL, HITBOX_MATERIAL, GEOMETRY_SEGMENTS } from "../settings.js";
import { getPipeRadiusAtCoords, computeDirectionAtExternalKeypoint } from "../utils/helpers.js";

/**
 * Create a weld symbol with an invisible pick volume.
 * @param {Object} block
 * @param {string} pipelineRef
 * @param {Object} units
 * @param {Array} pipelines
 * @returns {Group|null}
 */
export function createWeld(block, pipelineRef, units, pipelines) {
    // 1) Coordinates and direction
    const rawCoords = block.geometry['END-POINT']?.[0]?.coords;
    if (!rawCoords) {
        console.warn('createWeld: missing END-POINT', block);
        return null;
    }
    const direction = computeDirectionAtExternalKeypoint(rawCoords, pipelines, block);

    console.log('createWeld: direction from helper:', direction, block);

    // 2) Compute position: midpoint if two endpoints
    const ends = block.geometry['END-POINT'];
    const p0 = new Vector3(...ends[0].coords.map(c => c * units.coordScale));
    let position = p0;
    if (ends.length > 1) {
        const p1 = new Vector3(...ends[1].coords.map(c => c * units.coordScale));
        const dist = p0.distanceTo(p1);
        if (dist >= 1e-6) {
            position = new Vector3().addVectors(p0, p1).multiplyScalar(0.5);
        }
    }

    // 3) Determine radius via helper
    const radius = getPipeRadiusAtCoords(rawCoords, units, pipelines);

    // 4) Create group and orientation
    const weldGroup = new Group();
    weldGroup.name = 'Weld';

    const alignQuat = new Quaternion().setFromUnitVectors(
        new Vector3(0, 1, 0),
        direction.clone().normalize()
    );

    // 5) Radial arms & circle
    const lineMaterial = new LineBasicMaterial({ color: WELD_MATERIAL.color });
    const armLength = radius * 1.6;
    const startDist = radius * 1.3;
    [45, 135, 225, 315].forEach((deg, i) => {
        const theta = deg * (Math.PI / 180);
        const dir2d = new Vector3(Math.cos(theta), 0, Math.sin(theta));
        const startPoint = dir2d.clone().multiplyScalar(startDist);
        const endPoint = dir2d.clone().multiplyScalar(startDist + armLength);
        const geo = new BufferGeometry().setFromPoints([startPoint, endPoint]);
        const line = new Line(geo, lineMaterial);
        line.name = `WeldArm${i + 1}`;
        line.userData = { pipeline: pipelineRef, type: block.type, rawBlock: block };
        weldGroup.add(line);
    });
    const circleGeo = new BufferGeometry();
    const pts = [];
    for (let i = 0; i <= GEOMETRY_SEGMENTS; i++) {
        const th = (i / GEOMETRY_SEGMENTS) * Math.PI * 2;
        pts.push(new Vector3(
            Math.cos(th) * radius * 1.1,
            0,
            Math.sin(th) * radius * 1.1
        ));
    }
    circleGeo.setFromPoints(pts);
    const circle = new LineLoop(circleGeo, lineMaterial);
    circle.name = 'WeldCircle';
    circle.userData = weldGroup.children[0].userData;
    weldGroup.add(circle);

    // 6) Invisible pick volume
    const pickRadius = startDist + armLength;
    const pickHeight = armLength * 0.1;
    const pickGeo = new CylinderGeometry(pickRadius, pickRadius, pickHeight, GEOMETRY_SEGMENTS);
    const pickMat = HITBOX_MATERIAL.clone();
    pickMat.depthTest = false;
    const pickMesh = new Mesh(pickGeo, pickMat);
    pickMesh.name = 'WeldCover';
    pickMesh.userData = { pipeline: pipelineRef, type: block.type, rawBlock: block };
    weldGroup.add(pickMesh);

    // 7) Apply orientation and position
    weldGroup.applyQuaternion(alignQuat);
    weldGroup.position.copy(position);

    return weldGroup;
}