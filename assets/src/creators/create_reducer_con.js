import { Mesh, CylinderGeometry, Vector3 } from "../vendor_mods/three.module.js";
import { REDUCERCONC_MATERIAL, GEOMETRY_SEGMENTS } from "../settings.js";

/**
 * Erstellt einen konzentrischen Reducer zwischen zwei Endpunkten.
 * Unterstützter Typ: REDUCER-CONCENTRIC
 *
 * @param {Object} block       - rawBlock mit END-POINT (2) und Nominal-Durchmesser
 * @param {string} pipelineRef - Referenz der Pipeline (für userData)
 * @param {Object} units       - Einheitenskalierung { coordScale, boreScale }
 * @returns {Mesh|null}
 */
function createReducerCon(block, pipelineRef, units) {
    // END-POINT liefert zwei Punkte mit Koordinaten und nominalem Durchmesser
    const ends = block.geometry['END-POINT'];
    if (!ends || ends.length < 2) {
        console.warn('createReducerConcentric: Missing END-POINT for REDUCER-CONCENTRIC', block);
        return null;
    }

    // Punkte skalieren
    const p0 = ends[0], p1 = ends[1];
    const start = new Vector3(
        p0.coords[0] * units.coordScale,
        p0.coords[1] * units.coordScale,
        p0.coords[2] * units.coordScale
    );
    const end = new Vector3(
        p1.coords[0] * units.coordScale,
        p1.coords[1] * units.coordScale,
        p1.coords[2] * units.coordScale
    );

    // Durchmesser skalieren (Nominal-Durchmesser)
    const rawDiaS = typeof p0.nominal === 'number' ? p0.nominal : parseFloat(p0.nominal);
    const rawDiaE = typeof p1.nominal === 'number' ? p1.nominal : parseFloat(p1.nominal);
    if (isNaN(rawDiaS) || isNaN(rawDiaE)) {
        console.warn('createReducerConcentric: Invalid nominal diameter', p0.nominal, p1.nominal);
        return null;
    }
    const diaS = rawDiaS * units.boreScale;
    const diaE = rawDiaE * units.boreScale;

    // Höhe des Zylinders
    const height = start.distanceTo(end);

    // Geometrie: Zylinder mit unterschiedlichem Radius oben/unten
    const geometry = new CylinderGeometry(
        diaE / 2,  // radiusTop
        diaS / 2,  // radiusBottom
        height,
        GEOMETRY_SEGMENTS, // radialSegments
        1,                // heightSegments
        false             // openEnded
    );

    // Anpassung: Zylinder von der Basis ausrichten
    geometry.translate(0, height / 2, 0);
    geometry.rotateX(Math.PI / 2);

    // Material
    const material = REDUCERCONC_MATERIAL.clone();
    const reducer = new Mesh(geometry, material);
    reducer.name = 'ReducerConcentric';

    // Positionierung und Ausrichtung
    reducer.position.copy(start);
    reducer.lookAt(end);

    // UserData für Auswahl und Anzeige
    reducer.userData = {
        pipeline: pipelineRef,
        type: block.type,
        params: { start, end, diameterStart: diaS, diameterEnd: diaE },
        rawBlock: block
    };

    return reducer;
}

export { createReducerCon };