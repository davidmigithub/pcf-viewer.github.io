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
 * Create a simple weld symbol: a cross with a circle at the midpoint of the pipe.
 * Alignment will be determined later; currently uses a placeholder direction.
 *
 * @param {Object} block             raw component block with geometry data
 * @param {string} pipelineRef       pipeline reference for userData
 * @param {Object} units             { coordScale, boreScale }
 * @returns {Group|null}             Three.js Group containing the weld symbol
 */
function createWeld(block, pipelineRef, units) {
    // retrieve end points for weld
    const ends = block.geometry['END-POINT'];
    if (!ends || ends.length < 2) {
        console.warn('createWeld: need two END-POINTs', block);
        return null;
    }

    // scale coordinates
    const p0 = new Vector3(...ends[0].coords.map(c => c * units.coordScale));
    const p1 = new Vector3(...ends[1].coords.map(c => c * units.coordScale));

    // determine radius from nominal diameter
    const rawDia = parseFloat(ends[0].nominal);
    if (isNaN(rawDia)) {
        console.warn('createWeld: invalid diameter', ends[0].nominal);
        return null;
    }
    const radius = (rawDia * units.boreScale) / 2;

    // compute center position
    const center = new Vector3().addVectors(p0, p1).multiplyScalar(0.5);

    // determine orientation direction
    let pipeDir = new Vector3().subVectors(p1, p0).normalize();
    if (pipeDir.length() === 0) {
        // fallback direction if points identical
        pipeDir = new Vector3(1, 0, 0); // TODO: replace with actual pipe axis
    }

    // quaternion to align Y-up to pipe direction
    const alignQuat = new Quaternion().setFromUnitVectors(
        new Vector3(0, 1, 0),
        pipeDir
    );

    // create material for weld
    const material = WELD_MATERIAL.clone();

    // build cross arms: two small cylinders
    const armLength = radius * 1.5;
    const armRadius = radius * 0.1;
    const arms = [];
    const axes = [
        new Vector3(1, 0, 0),
        new Vector3(0, 0, 1)
    ];
    axes.forEach((axis, i) => {
        // cylinder along axis
        const geo = new CylinderGeometry(armRadius, armRadius, armLength, GEOMETRY_SEGMENTS);
        geo.translate(0, armLength / 2, 0);
        // rotate from Y to axis
        const q = new Quaternion().setFromUnitVectors(
            new Vector3(0, 1, 0),
            axis
        );
        geo.applyQuaternion(q);
        // apply placeholder alignment
        geo.applyQuaternion(alignQuat);
        geo.translate(center.x, center.y, center.z);
        const mesh = new Mesh(geo, material);
        mesh.name = `WeldArm${i+1}`;
        mesh.userData = { pipeline: pipelineRef, type: block.type, rawBlock: block };
        arms.push(mesh);
    });

    // build central circle as flat cylinder
    const circleThickness = radius * 0.1;
    const circleGeo = new CylinderGeometry(radius * 0.8, radius * 0.8, circleThickness, GEOMETRY_SEGMENTS);
    // rotate so circle lies perpendicular to pipe axis
    circleGeo.applyQuaternion(alignQuat);
    circleGeo.translate(center.x, center.y, center.z);
    const circle = new Mesh(circleGeo, material);
    circle.name = 'WeldCircle';
    circle.userData = arms[0].userData;

    // group all parts
    const weldGroup = new Group();
    weldGroup.name = 'Weld';
    arms.forEach(a => weldGroup.add(a));
    weldGroup.add(circle);

    return weldGroup;
}

export { createWeld };