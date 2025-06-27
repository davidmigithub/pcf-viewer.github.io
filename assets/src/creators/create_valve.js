import {
    Mesh,
    Group,
    CylinderGeometry,
    Vector3,
    Quaternion
} from "../vendor_mods/three.module.js";
import { VALVE_MATERIAL, HITBOX_MATERIAL, GEOMETRY_SEGMENTS } from "../settings.js";
import { createPipe } from "./create_pipe.js";

/**
 * Vereinfachtes Ventil: zwei Kegel mit abgeschnittenen Spitzen (25 % Radius),
 * kein Kugel-Element mehr. Optional unsichtbares Cover für Picking.
 *
 * @param {Object} block
 * @param {string} pipelineRef
 * @param {Object} units       { coordScale, boreScale }
 * @returns {Group|null}
 */
function createValve(block, pipelineRef, units) {
    const ends = block.geometry['END-POINT'];
    if (!ends || ends.length < 2) {
        console.warn('createValve: need two END-POINTs');
        return null;
    }

    // Skalierte Endpunkte
    const start = new Vector3(...ends[0].coords.map(c => c * units.coordScale));
    const end = new Vector3(...ends[1].coords.map(c => c * units.coordScale));

    // Radius aus nominalem Durchmesser des ersten Endpunkts
    const rawDia = parseFloat(ends[0].nominal);
    if (isNaN(rawDia)) {
        console.warn('createValve: invalid diameter', ends[0].nominal);
        return null;
    }
    const radius = (rawDia * units.boreScale) / 2;
    const tipRadius = radius * 0.25;  // 25% Spitze

    // Mittelpunkt (oder aus CENTRE-POINT)
    let centre;
    const cArr = block.geometry['CENTRE-POINT'];
    if (cArr && cArr.length > 0) {
        centre = new Vector3(...cArr[0].coords.map(c => c * units.coordScale));
    } else {
        centre = new Vector3().addVectors(start, end).multiplyScalar(0.5);
    }

    // Richtungen/Längen
    const dir1 = new Vector3().subVectors(centre, start);
    const dir2 = new Vector3().subVectors(centre, end);
    const len1 = dir1.length(), len2 = dir2.length();
    if (len1 === 0 || len2 === 0) {
        console.warn('createValve: zero-length segment');
        return null;
    }

    const material = VALVE_MATERIAL.clone();

    // Kegel 1: Basis am START (radius), Spitze im CENTRE (tipRadius)
    const geo1 = new CylinderGeometry(tipRadius, radius, len1, GEOMETRY_SEGMENTS, 1, false);
    geo1.translate(0, len1 / 2, 0);
    const quat1 = new Quaternion().setFromUnitVectors(
        new Vector3(0, 1, 0),
        dir1.clone().normalize()
    );
    geo1.applyQuaternion(quat1);
    geo1.translate(start.x, start.y, start.z);
    const cone1 = new Mesh(geo1, material);
    cone1.name = 'ValveCone1';
    cone1.userData = { pipeline: pipelineRef, type: block.type, rawBlock: block };

    // Kegel 2: Basis am END (radius), Spitze im CENTRE (tipRadius)
    const geo2 = new CylinderGeometry(tipRadius, radius, len2, GEOMETRY_SEGMENTS, 1, false);
    geo2.translate(0, len2 / 2, 0);
    const quat2 = new Quaternion().setFromUnitVectors(
        new Vector3(0, 1, 0),
        dir2.clone().normalize()
    );
    geo2.applyQuaternion(quat2);
    geo2.translate(end.x, end.y, end.z);
    const cone2 = new Mesh(geo2, material);
    cone2.name = 'ValveCone2';
    cone2.userData = cone1.userData;

    // Unsichtbarer Cover-Pipe für Picking
    let cover = createPipe(block, pipelineRef, units);
    if (cover) {
        cover.material = HITBOX_MATERIAL.clone();
        cover.material.transparent = true;
        cover.material.opacity = 0;
        cover.material.depthWrite = false;
        cover.material.depthTest = false;
        cover.renderOrder = 1;
        cover.name = 'ValveCover';
        cover.userData = cone1.userData;
    }

    // Gruppe zusammenbauen
    const valveGroup = new Group();
    valveGroup.name = 'Valve';
    valveGroup.add(cone1, cone2);
    if (cover) valveGroup.add(cover);

    return valveGroup;
}

export { createValve };