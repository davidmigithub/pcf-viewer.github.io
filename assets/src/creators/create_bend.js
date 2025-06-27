import { QuadraticBezierCurve3, Mesh, TubeGeometry, Vector3, CircleGeometry } from "../vendor_mods/three.module.js";
import { BEND_MATERIAL, GEOMETRY_SEGMENTS } from "../settings.js";
import { BufferGeometryUtils } from "../vendor_mods/BufferGeometryUtils.js";

/**
 * Erstellt ein Bend/Elbow zwischen zwei Endpunkten mit einem Mittelpunkt und verschlossenen Enden.
 * Unterstützte Typen: ELBOW, BEND
 *
 * @param {Object} block       - rawBlock mit END-POINT (2), CENTRE-POINT (1) und DIAMETER
 * @param {string} pipelineRef - Referenz der Pipeline (für userData)
 * @param {Object} units       - Einheitenskalierung { coordScale, boreScale }
 * @returns {Mesh|null}
 */
function createBend(block, pipelineRef, units) {
    const ends = block.geometry['END-POINT'];
    const centre = block.geometry['CENTRE-POINT']?.[0];
    if (!ends || ends.length < 2 || !centre) {
        console.warn('createBend: Missing END-POINT or CENTRE-POINT for BEND');
        return null;
    }

    // Skalieren der Punkte
    const start = new Vector3(
        ends[0].coords[0] * units.coordScale,
        ends[0].coords[1] * units.coordScale,
        ends[0].coords[2] * units.coordScale
    );
    const end = new Vector3(
        ends[1].coords[0] * units.coordScale,
        ends[1].coords[1] * units.coordScale,
        ends[1].coords[2] * units.coordScale
    );
    const mid = new Vector3(
        centre.coords[0] * units.coordScale,
        centre.coords[1] * units.coordScale,
        centre.coords[2] * units.coordScale
    );

    // Durchmesser skalieren
    const rawDia = typeof ends[0].nominal === 'number' ? ends[0].nominal : parseFloat(ends[0].nominal);
    if (isNaN(rawDia)) {
        console.warn('createBend: Invalid nominal diameter', ends[0].nominal);
        return null;
    }
    const radius = (rawDia * units.boreScale) / 2;

    // Pfad über Quadratische Bezierkurve
    const path = new QuadraticBezierCurve3(start, mid, end);
    const tubeGeo = new TubeGeometry(path, 20, radius, GEOMETRY_SEGMENTS, false);

    // Endkappen als Kreisscheiben
    const capStart = new CircleGeometry(radius, GEOMETRY_SEGMENTS);
    capStart.lookAt(start.clone().sub(mid));
    capStart.translate(start.x, start.y, start.z);

    const capEnd = new CircleGeometry(radius, GEOMETRY_SEGMENTS);
    capEnd.lookAt(end.clone().sub(mid));
    capEnd.translate(end.x, end.y, end.z);

    // Alle Geometrien zusammenführen
    const geometry = BufferGeometryUtils.mergeBufferGeometries([tubeGeo, capStart, capEnd], true);

    const material = BEND_MATERIAL.clone();
    const bend = new Mesh(geometry, material);
    bend.name = 'Bend';

    // UserData
    bend.userData = {
        pipeline: pipelineRef,
        type: block.type,
        params: { start, mid, end, radius },
        rawBlock: block
    };

    return bend;
}

export { createBend };