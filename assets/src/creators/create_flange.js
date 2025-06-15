import { Mesh, CylinderGeometry, Vector3, Quaternion } from "../vendor_mods/three.module.js";
import { FLANGE_MATERIAL, GEOMETRY_SEGMENTS } from "../settings.js";

// Faktor, um den Flansch im Vergleich zum Rohr-Durchmesser zu verbreitern
const FLANGE_OVERSIZE_FACTOR = 1.4;

/**
 * Erstellt einen Flansch (FLANGE) aus zwei Endpunkten.
 * @param {Object} block        - rawBlock mit END-POINT (2) und DIAMETER
 * @param {string} pipelineRef  - Referenz der Pipeline (für userData)
 * @param {Object} units        - Einheitenskalierung { coordScale, boreScale }
 * @returns {Mesh|null}
 */
function createFlange(block, pipelineRef, units) {
  const ends = block.geometry['END-POINT']; // Erwartet zwei Punkte: [start, end]

  if (!ends || ends.length < 2) {
    console.warn('createFlange: Missing END-POINT (2) für FLANGE', block);
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

  // Prüfen, ob Punkte identisch sind
  if (start.distanceTo(end) === 0) {
    console.warn('createFlange: Start- und Endpunkt sind identisch – kein Flansch erstellt', block);
    return null;
  }

  // Durchmesser skalieren (beide Enden sollten identisch sein)
  const rawDia1 = typeof ends[0].nominal === 'number' ? ends[0].nominal : parseFloat(ends[0].nominal);
  const rawDia2 = typeof ends[1].nominal === 'number' ? ends[1].nominal : parseFloat(ends[1].nominal);
  if (isNaN(rawDia1) || isNaN(rawDia2)) {
    console.warn('createFlange: Ungültiger nominaler Durchmesser', ends[0].nominal, ends[1].nominal);
    return null;
  }
  // Beide Durchmesser sollten gleich sein, wir nehmen den ersten
  const baseRadius = (rawDia1 * units.boreScale) / 2;
  // Flansch etwas breiter
  const radius = baseRadius * FLANGE_OVERSIZE_FACTOR;

  // Geometrie erstellen: Zylinder zwischen start und end
  const dir = new Vector3().subVectors(end, start);
  const length = dir.length();
  const geometry = new CylinderGeometry(radius, radius, length, GEOMETRY_SEGMENTS, 1, false);

  // Ursprung an einem Ende und Ausrichtung
  geometry.translate(0, length / 2, 0);
  const quat = new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), dir.clone().normalize());
  geometry.applyQuaternion(quat);
  geometry.translate(start.x, start.y, start.z);

  // Material und Mesh
  const material = FLANGE_MATERIAL.clone();
  const flangeMesh = new Mesh(geometry, material);
  flangeMesh.name = 'Flange';

  // userData
  flangeMesh.userData = {
    pipeline: pipelineRef,
    type: block.type,
    params: { start, end, radius, baseRadius, oversizeFactor: FLANGE_OVERSIZE_FACTOR },
    rawBlock: block
  };

  return flangeMesh;
}

export { createFlange };