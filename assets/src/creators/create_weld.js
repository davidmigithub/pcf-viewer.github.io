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
import { ComponentFactory } from "../factory.js";

/**
 * Create a weld symbol using line segments and an invisible pick volume,
 * based on a point and a direction.
 * @param {Object} block       Raw component block with geometry data
 * @param {string} pipelineRef Pipeline reference for userData
 * @param {Object} units       { coordScale, boreScale }
 * @param {Array}  pipelines   All pipelines for direction computation
 * @returns {Group|null}
 */
function createWeld(block, pipelineRef, units, pipelines) {
    // Determine direction via factory (currently returns dummy vector)
    const factory = new ComponentFactory(units, /*materials=*/{}, pipelines);
    const rawCoords = block.geometry['END-POINT']?.[0]?.coords;
    const direction = factory.computeDirectionAtExternalKeypoint(rawCoords, block);

    console.log(`createWeld: direction from factory:`, direction, block);

    // Read end-point data
    const ends = block.geometry['END-POINT'];
    if (!ends || ends.length === 0) {
        console.warn('createWeld: no END-POINTs', block);
        return null;
    }

    // Scale end-point positions
    const p0 = new Vector3(...ends[0].coords.map(c => c * units.coordScale));
    let point = p0;

    if (ends.length === 1) {
        console.warn('createWeld: only one END-POINT, using direction from factory', block);
    } else {
        const p1 = new Vector3(...ends[1].coords.map(c => c * units.coordScale));
        const dist = p0.distanceTo(p1);
        if (dist < 1e-6) {
            console.warn('createWeld: identical END-POINTs, using direction from factory', block);
        } else {
            point = new Vector3().addVectors(p0, p1).multiplyScalar(0.5);
        }
    }

    // Compute pipe radius
    const rawDia = parseFloat(ends[0].nominal);
    if (isNaN(rawDia)) {
        console.warn('createWeld: invalid diameter', ends[0].nominal);
        return null;
    }
    const radius = (rawDia * units.boreScale) / 2;

    // Align quaternion
    const alignQuat = new Quaternion().setFromUnitVectors(
        new Vector3(0, 1, 0),
        direction.clone().normalize()
    );

    // Build weld symbol group
    const weldGroup = new Group();
    weldGroup.name = 'Weld';

    const lineMaterial = new LineBasicMaterial({ color: WELD_MATERIAL.color });
    const armLength = radius * 1.6;
    const startDist = radius * 1.3;
    const angles = [45, 135, 225, 315];

    // Four radial arms in local XY plane
    angles.forEach((deg, i) => {
        const rad = deg * (Math.PI / 180);
        const dir2d = new Vector3(Math.cos(rad), 0, Math.sin(rad));

        const startPoint = dir2d.clone().multiplyScalar(startDist);
        const endPoint = dir2d.clone().multiplyScalar(startDist + armLength);

        const geo = new BufferGeometry().setFromPoints([startPoint, endPoint]);
        const line = new Line(geo, lineMaterial);
        line.name = `WeldArm${i+1}`;
        line.userData = { pipeline: pipelineRef, type: block.type, rawBlock: block };
        weldGroup.add(line);
    });

    // Central circle in local XZ plane
    const circleGeo = new BufferGeometry();
    const circlePoints = [];
    for (let i = 0; i <= GEOMETRY_SEGMENTS; i++) {
        const theta = (i / GEOMETRY_SEGMENTS) * Math.PI * 2;
        circlePoints.push(new Vector3(
            Math.cos(theta) * radius * 1.1,
            0,
            Math.sin(theta) * radius * 1.1
        ));
    }
    circleGeo.setFromPoints(circlePoints);
    const circle = new LineLoop(circleGeo, lineMaterial);
    circle.name = 'WeldCircle';
    circle.userData = weldGroup.children[0].userData;
    weldGroup.add(circle);

    // Invisible pick volume: cylinder around weld
    const pickRadius = (startDist + armLength) * 1.0;
    const pickHeight = armLength * 0.5;
    const pickGeo = new CylinderGeometry(pickRadius, pickRadius, pickHeight, GEOMETRY_SEGMENTS);
    const pickMat = HITBOX_MATERIAL.clone();
    const pickMesh = new Mesh(pickGeo, pickMat);
    pickMesh.name = 'WeldPicker';
    pickMesh.userData = { pipeline: pipelineRef, type: block.type, rawBlock: block };
    weldGroup.add(pickMesh);

    // Apply alignment and position
    weldGroup.applyQuaternion(alignQuat);
    weldGroup.position.copy(point);

    return weldGroup;
}

export { createWeld };