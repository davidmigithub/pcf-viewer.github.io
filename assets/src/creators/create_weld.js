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
 * Create a weld symbol: four arms at 45° intervals and a central circle.
 * Arms start just outside the pipe radius and extend outward.
 * Circle has 20% of the pipe diameter.
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

    // compute center position
    const center = new Vector3().addVectors(p0, p1).multiplyScalar(0.5);

    // determine pipe axis direction or fallback
    let pipeDir = new Vector3().subVectors(p1, p0).normalize();
    if (pipeDir.length() === 0) {
        pipeDir = new Vector3(1, 0, 0); // placeholder axis
    }
    const alignQuat = new Quaternion().setFromUnitVectors(
        new Vector3(0, 1, 0),
        pipeDir
    );

    // weld group container
    const weldGroup = new Group();
    weldGroup.name = 'Weld';

    // material clone
    const material = WELD_MATERIAL.clone();
    const armLength = radius * 1.5;
    const armRadius = radius * 0.1;

    // start distance just beyond pipe surface
    const startDist = radius * 1.1;
    // angles for four arms (degrees)
    const angles = [45, 135, 225, 315];

    angles.forEach((deg, i) => {
        const rad = deg * (Math.PI / 180);
        const dir = new Vector3(Math.cos(rad), 0, Math.sin(rad));
        // create cylinder along local Y
        const geo = new CylinderGeometry(armRadius, armRadius, armLength, GEOMETRY_SEGMENTS);
        geo.translate(0, armLength / 2, 0);
        // align to direction in XY
        const qArm = new Quaternion().setFromUnitVectors(
            new Vector3(0, 1, 0),
            dir
        );
        geo.applyQuaternion(qArm);
        const mesh = new Mesh(geo, material);
        mesh.name = `WeldArm${i+1}`;
        mesh.userData = { pipeline: pipelineRef, type: block.type, rawBlock: block };
        // position arm starting just outside pipe
        mesh.position.copy(dir.multiplyScalar(startDist));
        weldGroup.add(mesh);
    });

    // central circle as a flat cylinder
    const circleRadius = radius * 0.2;
    const circleThickness = radius * 0.1;
    const circGeo = new CylinderGeometry(circleRadius, circleRadius, circleThickness, GEOMETRY_SEGMENTS);
    // circle lies in XY plane by default (aligned along Z);
    // rotate from Y to Z so face shows to viewer
    circGeo.applyQuaternion(new Quaternion().setFromUnitVectors(
        new Vector3(0, 1, 0),
        new Vector3(0, 0, 1)
    ));
    const circle = new Mesh(circGeo, material);
    circle.name = 'WeldCircle';
    circle.userData = weldGroup.children[0].userData;
    weldGroup.add(circle);

    // apply pipe alignment and translate to center
    weldGroup.applyQuaternion(alignQuat);
    weldGroup.position.copy(center);

    return weldGroup;
}

export { createWeld };