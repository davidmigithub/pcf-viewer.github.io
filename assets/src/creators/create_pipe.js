import { Mesh, CylinderGeometry, Vector3 } from "../vendor_mods/three.module.js";
import { PIPE_MATERIAL, GEOMETRY_SEGMENTS } from "../settings.js";

/**
 * Erstellt eine Rohr-Komponente basierend auf einem PCF-Block.
 * Nimmt stets die ersten beiden Einträge aus END-POINT als Start/Endpunkt
 * und verwendet das .nominal-Feld als Durchmesser.
 *
 * @param {Object} block       - rawBlock mit Attributen
 * @param {string} pipelineRef - Referenzname der Pipeline
 * @param {Object} units       - Einheitenskalierung { coordScale, boreScale }
 * @returns {Mesh|null}        - Drei.js Mesh oder null bei Fehlern
 */
function createPipe(block, pipelineRef, units) {
    const endArr = block.geometry['END-POINT'];
    if (!endArr || endArr.length < 2) {
        console.warn('createPipe: Need two END-POINT entries for PIPE');
        return null;
    }

    // Aus den ersten beiden End-Point-Objekten
    const startObj = endArr[0];
    const endObj = endArr[1];

    // Koordinaten skalieren
    const start = new Vector3(
        startObj.coords[0] * units.coordScale,
        startObj.coords[1] * units.coordScale,
        startObj.coords[2] * units.coordScale
    );
    const end = new Vector3(
        endObj.coords[0] * units.coordScale,
        endObj.coords[1] * units.coordScale,
        endObj.coords[2] * units.coordScale
    );

    // Durchmesser aus .nominal ziehen und skalieren
    const rawDiameter = typeof startObj.nominal === 'number'
        ? startObj.nominal
        : parseFloat(startObj.nominal);
    if (isNaN(rawDiameter)) {
        console.warn('createPipe: Invalid nominal diameter', startObj.nominal);
        return null;
    }
    const diameter = rawDiameter * units.boreScale;

    // Geometrie und Material
    const material = PIPE_MATERIAL.clone();
    const length = start.distanceTo(end);
    const geo = new CylinderGeometry(diameter / 2, diameter / 2, length, GEOMETRY_SEGMENTS, 1, false);
    geo.translate(0, length / 2, 0);
    geo.rotateX(Math.PI / 2);

    // Mesh erstellen
    const mesh = new Mesh(geo, material);
    mesh.name = 'Pipe';
    mesh.position.copy(start);
    mesh.lookAt(end);

    // Metadaten für Picking und Info
    mesh.userData = {
        pipeline: pipelineRef,
        type: block.type,
        params: { start, end, diameter },
        rawBlock: block
    };

    return mesh;
}

export { createPipe };