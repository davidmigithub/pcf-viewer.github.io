import { Mesh, CylinderGeometry, SphereGeometry, Vector3, Quaternion } from "../vendor_mods/three.module.js";
import { CAP_MATERIAL, GEOMETRY_SEGMENTS } from "../settings.js";

/**
 * Erstellt einen Enddeckel (CAP).
 * - Wenn nur ein Endpunkt vorhanden ist oder beide auf derselben Position liegen, als Kugel.
 * - Wenn zwei unterschiedliche Endpunkte vorliegen, als Zylinder.
 *
 * @param {Object} block        - rawBlock mit geometry['END-POINT'] (1–2 Punkte) und nominalem Durchmesser
 * @param {string} pipelineRef  - Referenz der Pipeline (für userData)
 * @param {Object} units        - Einheitenskalierung { coordScale, boreScale }
 * @returns {Mesh|null}
 */
function createCap(block, pipelineRef, units) {
    const ends = block.geometry['END-POINT'];
    if (!ends || ends.length === 0) {
        console.warn('createCap: Missing END-POINT for CAP', block);
        return null;
    }

    // Koordinaten skalieren
    const p0 = new Vector3(
        ends[0].coords[0] * units.coordScale,
        ends[0].coords[1] * units.coordScale,
        ends[0].coords[2] * units.coordScale
    );

    // Nominaler Durchmesser (String oder Zahl) → number
    const rawDia = typeof ends[0].nominal === 'number'
        ? ends[0].nominal
        : parseFloat(ends[0].nominal);
    if (isNaN(rawDia)) {
        console.warn('createCap: Invalid nominal diameter', ends[0].nominal);
        return null;
    }
    const radius = (rawDia * units.boreScale) / 2;

    // Prüfen, ob ein zweiter Punkt vorliegt und ob er sich unterscheidet
    let useSphere = true;
    let p1 = null;
    if (ends.length > 1) {
        p1 = new Vector3(
            ends[1].coords[0] * units.coordScale,
            ends[1].coords[1] * units.coordScale,
            ends[1].coords[2] * units.coordScale
        );
        if (!p1.equals(p0)) {
            useSphere = false;
        }
    }

    let mesh;
    if (useSphere) {
        // Kugel
        const sphereGeo = new SphereGeometry(radius * 0.96, GEOMETRY_SEGMENTS, GEOMETRY_SEGMENTS);
        mesh = new Mesh(sphereGeo, CAP_MATERIAL.clone());
        mesh.position.copy(p0);
        mesh.name = 'Cap (Sphere)';
    } else {
        // Zylinder zwischen p0 und p1
        const dir = new Vector3().subVectors(p1, p0);
        const length = dir.length();
        const cylGeo = new CylinderGeometry(radius, radius, length, GEOMETRY_SEGMENTS, 1, false);
        // Zylinder entlang Y aufbauen, dann verschieben und rotieren
        cylGeo.translate(0, length / 2, 0);
        const quat = new Quaternion().setFromUnitVectors(
            new Vector3(0, 1, 0),
            dir.clone().normalize()
        );
        cylGeo.applyQuaternion(quat);
        cylGeo.translate(p0.x, p0.y, p0.z);

        mesh = new Mesh(cylGeo, CAP_MATERIAL.clone());
        mesh.name = 'Cap (Cylinder)';
    }

    // userData für Pick & Info-Panel
    mesh.userData = {
        pipeline: pipelineRef,
        type: block.type,
        params: {
            points: useSphere ? [p0] : [p0, p1],
            radius
        },
        rawBlock: block
    };

    return mesh;
}

export { createCap };