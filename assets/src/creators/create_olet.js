import { Mesh, CylinderGeometry, Vector3, Quaternion } from "../vendor_mods/three.module.js";
import { OLET_MATERIAL, GEOMETRY_SEGMENTS } from "../settings.js";

/**
 * Erstellt ein OLET als Zylinder zwischen Centre-Point und Branch1-Point.
 *
 * @param {Object} block        - rawBlock mit CENTRE-POINT (1) und BRANCH1-POINT (1) plus nominalem Durchmesser
 * @param {string} pipelineRef  - Referenz der Pipeline (für userData)
 * @param {Object} units        - Einheitenskalierung { coordScale, boreScale }
 * @returns {Mesh|null}
 */
function createOlet(block, pipelineRef, units) {
    const centreArr = block.geometry['CENTRE-POINT'];
    const branchArr = block.geometry['BRANCH1-POINT'];
    if (!centreArr || centreArr.length < 1 || !branchArr || branchArr.length < 1) {
        console.warn('createOlet: Missing CENTRE-POINT (1) or BRANCH1-POINT (1)', block);
        return null;
    }

    // Punkte skalieren
    const centre = new Vector3(
        centreArr[0].coords[0] * units.coordScale,
        centreArr[0].coords[1] * units.coordScale,
        centreArr[0].coords[2] * units.coordScale
    );
    const branchEnd = new Vector3(
        branchArr[0].coords[0] * units.coordScale,
        branchArr[0].coords[1] * units.coordScale,
        branchArr[0].coords[2] * units.coordScale
    );

    // Nominaldurchmesser aus Branch1 nehmen
    const rawDiaBr = typeof branchArr[0].nominal === 'number'
        ? branchArr[0].nominal
        : parseFloat(branchArr[0].nominal);
    if (isNaN(rawDiaBr)) {
        console.warn('createOlet: Invalid nominal diameter on BRANCH1-POINT', branchArr[0].nominal);
        return null;
    }
    const radiusBr = (rawDiaBr * units.boreScale) / 2;

    // Richtung und Länge des Abzweigs
    const dir = new Vector3().subVectors(branchEnd, centre);
    const length = dir.length();

    // Zylinder-Geometrie (Hauptabzweig)
    const geo = new CylinderGeometry(radiusBr, radiusBr, length, GEOMETRY_SEGMENTS, 1, false);
    geo.translate(0, length / 2, 0);
    const quat = new Quaternion().setFromUnitVectors(
        new Vector3(0, 1, 0),
        dir.clone().normalize()
    );
    geo.applyQuaternion(quat);
    geo.translate(centre.x, centre.y, centre.z);

    // Mesh erzeugen
    const material = OLET_MATERIAL.clone();
    const oletMesh = new Mesh(geo, material);
    oletMesh.name = 'Olet';

    // userData für Picking & Info
    oletMesh.userData = {
        pipeline: pipelineRef,
        type: block.type,
        params: { centre, branchEnd, radiusBr },
        rawBlock: block
    };

    return oletMesh;
}

export { createOlet };