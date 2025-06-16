// create_weld.js
import {
    Mesh,
    Group,
    CylinderGeometry,
    Vector3,
    Quaternion
} from "../vendor_mods/three.module.js";
import { WELD_MATERIAL, GEOMETRY_SEGMENTS } from "../settings.js";
import { getExternalKeypointDirection } from "../factory.js";

/**
 * Create a weld symbol: four arms at 45° intervals and a central cylinder
 * aligned with the pipe axis (thin disc when viewed along the pipe).
 * Uses getWeldDirection to handle identical or missing endpoints by scanning
 * pipeline components, excluding the current block.
 * @param {Object} block       raw component block with geometry data
 * @param {string} pipelineRef pipeline reference for userData
 * @returns {Group|null}
 */
function createWeld(block, pipelineRef) {
    const ends = block.geometry['END-POINT'];
    if (!ends || ends.length < 2) {
        console.warn('createWeld: need two END-POINTs', block);
        return null;
    }

    // compute endpoints and center (uses same units as pipe components)
    const p0 = new Vector3(...ends[0].coords);
    const p1 = new Vector3(...ends[1].coords);
    const center = new Vector3().addVectors(p0, p1).multiplyScalar(0.5);

    // pipe radius from nominal diameter
    const rawDia = parseFloat(ends[0].nominal);
    if (isNaN(rawDia)) {
        console.warn('createWeld: invalid diameter', ends[0].nominal);
        return null;
    }
    const radius = rawDia / 2;

    // determine axis direction via factory helper
    // passes block to exclude itself and pipelineRef to limit search
    const pipeDir = getExternalKeypointDirection(block, pipelineRef);
    const alignQuat = new Quaternion().setFromUnitVectors(
        new Vector3(0, 1, 0),
        pipeDir
    );

    // group at origin
    const weldGroup = new Group();
    weldGroup.name = 'Weld';
    const material = WELD_MATERIAL.clone();

    // dimensions for arms
    const armLength = radius * 1.5;
    const armRadius = radius * 0.1;
    const startDist = radius * 1.1;
    const angles = [45, 135, 225, 315];

    // create four arms
    angles.forEach((deg, i) => {
        const rad = deg * (Math.PI / 180);
        const dir = new Vector3(Math.cos(rad), 0, Math.sin(rad));
        const geo = new CylinderGeometry(armRadius, armRadius, armLength, GEOMETRY_SEGMENTS);
        geo.translate(0, armLength / 2, 0);
        const qArm = new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), dir);
        geo.applyQuaternion(qArm);
        const mesh = new Mesh(geo, material);
        mesh.name = `WeldArm${i+1}`;
        mesh.userData = { pipeline: pipelineRef, type: block.type, rawBlock: block };
        mesh.position.copy(dir.multiplyScalar(startDist));
        weldGroup.add(mesh);
    });

    // central cylinder along local Y
    const cylRadius = radius * 0.2;
    const cylLength = radius * 0.1;
    const circGeo = new CylinderGeometry(cylRadius, cylRadius, cylLength, GEOMETRY_SEGMENTS);
    const circle = new Mesh(circGeo, material);
    circle.name = 'WeldCircle';
    circle.userData = weldGroup.children[0].userData;
    weldGroup.add(circle);

    // align and position
    weldGroup.applyQuaternion(alignQuat);
    weldGroup.position.copy(center);

    return weldGroup;
}

export { createWeld };