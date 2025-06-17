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
 * Create a weld symbol with an invisible pick volume,
 * using HITBOX_MATERIAL from settings.
 *
 * @param {Object} block
 * @param {string} pipelineRef
 * @param {Object} units
 * @param {Array} pipelines
 * @returns {Group|null}
 */
function createWeld(block, pipelineRef, units, pipelines) {
    const factory = new ComponentFactory(units, {}, pipelines);
    const rawCoords = block.geometry['END-POINT']?.[0]?.coords;
    const direction = factory.computeDirectionAtExternalKeypoint(rawCoords, block);

    console.log('createWeld: direction from factory:', direction, block);

    const ends = block.geometry['END-POINT'];
    if (!ends || ends.length === 0) {
        console.warn('createWeld: no END-POINTs', block);
        return null;
    }

    const p0 = new Vector3(...ends[0].coords.map(c => c * units.coordScale));
    let point = p0;
    if (ends.length > 1) {
        const p1 = new Vector3(...ends[1].coords.map(c => c * units.coordScale));
        const dist = p0.distanceTo(p1);
        if (dist >= 1e-6) {
            point = new Vector3().addVectors(p0, p1).multiplyScalar(0.5);
        }
    }

    const rawDia = parseFloat(ends[0].nominal);
    if (isNaN(rawDia)) {
        console.warn('createWeld: invalid diameter', ends[0].nominal);
        return null;
    }
    const radius = (rawDia * units.boreScale) / 2;

    const alignQuat = new Quaternion().setFromUnitVectors(
        new Vector3(0, 1, 0),
        direction.clone().normalize()
    );

    const weldGroup = new Group();
    weldGroup.name = 'Weld';

    // Radial arms & circle (unchanged)
    const lineMaterial = new LineBasicMaterial({ color: WELD_MATERIAL.color });
    const armLength = radius * 1.6;
    const startDist = radius * 1.3;
    [45,135,225,315].forEach((deg,i) => {
        const theta = deg * (Math.PI/180);
        const dir2d = new Vector3(Math.cos(theta),0,Math.sin(theta));
        const startPoint = dir2d.clone().multiplyScalar(startDist);
        const endPoint = dir2d.clone().multiplyScalar(startDist + armLength);
        const geo = new BufferGeometry().setFromPoints([startPoint, endPoint]);
        const line = new Line(geo, lineMaterial);
        line.name = `WeldArm${i+1}`;
        line.userData = { pipeline: pipelineRef, type: block.type, rawBlock: block };
        weldGroup.add(line);
    });
    const circleGeo = new BufferGeometry();
    const pts=[];
    for(let i=0;i<=GEOMETRY_SEGMENTS;i++) {
        const th=(i/GEOMETRY_SEGMENTS)*Math.PI*2;
        pts.push(new Vector3(Math.cos(th)*radius*1.1,0,Math.sin(th)*radius*1.1));
    }
    circleGeo.setFromPoints(pts);
    const circle = new LineLoop(circleGeo, lineMaterial);
    circle.name = 'WeldCircle';
    circle.userData = weldGroup.children[0].userData;
    weldGroup.add(circle);

    // Invisible pick volume
    const pickRadius = (startDist + armLength);
    const pickHeight = armLength * 0.1;
    const pickGeo = new CylinderGeometry(pickRadius, pickRadius, pickHeight, GEOMETRY_SEGMENTS);
    const pickMat = HITBOX_MATERIAL.clone();
    pickMat.depthTest = false;
    const pickMesh = new Mesh(pickGeo, pickMat);
    pickMesh.name = 'WeldCover';
    pickMesh.userData = { pipeline: pipelineRef, type: block.type, rawBlock: block };
    weldGroup.add(pickMesh);

    // Align and position
    weldGroup.applyQuaternion(alignQuat);
    weldGroup.position.copy(point);

    return weldGroup;
}

export { createWeld };