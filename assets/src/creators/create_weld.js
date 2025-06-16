// create_weld.js
import {
    Mesh,
    Group,
    CylinderGeometry,
    Vector3,
    Quaternion
} from "../vendor_mods/three.module.js";
import { WELD_MATERIAL, GEOMETRY_SEGMENTS } from "../settings.js";

/**
 * Create a weld symbol: four arms at 45° intervals and a central cylinder
 * aligned with the pipe axis (thin disc when viewed along the pipe).
 * @param {Object} block       raw component block with geometry data
 * @param {string} pipelineRef pipeline reference for userData
 * @param {Object} units       { coordScale, boreScale }
 * @returns {Group|null}
 */
function createWeld(block, pipelineRef, units) {
    const ends = block.geometry['END-POINT'];
    if (!ends || ends.length < 2) {
        console.warn('createWeld: need two END-POINTs', block);
        return null;
    }

    // scale end-point positions
    const p0 = new Vector3(...ends[0].coords.map(c => c * units.coordScale));
    const p1 = new Vector3(...ends[1].coords.map(c => c * units.coordScale));

    // pipe radius from nominal diameter
    const rawDia = parseFloat(ends[0].nominal);
    if (isNaN(rawDia)) {
        console.warn('createWeld: invalid diameter', ends[0].nominal);
        return null;
    }
    const radius = (rawDia * units.boreScale) / 2;

    // center point of weld
    const center = new Vector3().addVectors(p0, p1).multiplyScalar(0.5);

    // pipe axis direction or fallback
    let pipeDir = new Vector3().subVectors(p1, p0).normalize();
    if (pipeDir.length() === 0) pipeDir.set(1, 0, 0);

    // quaternion aligning local Y to pipeDir
    const alignQuat = new Quaternion().setFromUnitVectors(
        new Vector3(0, 1, 0),
        pipeDir
    );

    // create weld group (origin-local)
    const weldGroup = new Group();
    weldGroup.name = 'Weld';

    const material = WELD_MATERIAL.clone();
    const armLength = radius * 1.5;
    const armRadius = radius * 0.1;
    const startDist = radius * 1.1;
    const angles = [45, 135, 225, 315];

    // create four arms in local XY-plane
    angles.forEach((deg, i) => {
        const rad = deg * (Math.PI / 180);
        const dir = new Vector3(Math.cos(rad), 0, Math.sin(rad));
        const geo = new CylinderGeometry(armRadius, armRadius, armLength, GEOMETRY_SEGMENTS);
        geo.translate(0, armLength / 2, 0);
        const qArm = new Quaternion().setFromUnitVectors(
            new Vector3(0, 1, 0),
            dir
        );
        geo.applyQuaternion(qArm);
        const mesh = new Mesh(geo, material);
        mesh.name = `WeldArm${i+1}`;
        mesh.userData = { pipeline: pipelineRef, type: block.type, rawBlock: block };
        mesh.position.copy(dir.multiplyScalar(startDist));
        weldGroup.add(mesh);
    });

    // create central cylinder along local Y (becomes pipe axis after align)
    const cylRadius = radius * 0.2;
    const cylLength = radius * 0.1;
    const circGeo = new CylinderGeometry(cylRadius, cylRadius, cylLength, GEOMETRY_SEGMENTS);
    // cylinder centered at origin
    const circle = new Mesh(circGeo, material);
    circle.name = 'WeldCircle';
    circle.userData = weldGroup.children[0].userData;
    weldGroup.add(circle);

    // align entire group to pipe direction and move to center
    weldGroup.applyQuaternion(alignQuat);
    weldGroup.position.copy(center);

    return weldGroup;
}

export { createWeld };