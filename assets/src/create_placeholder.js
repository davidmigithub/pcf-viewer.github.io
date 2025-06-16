import { Mesh, CylinderGeometry, SphereGeometry, Vector3, Quaternion } from "../vendor_mods/three.module.js";
import { PLACEHOLDER_MATERIAL, GEOMETRY_SEGMENTS } from "../settings.js";

/**
 * Erzeugt ein generisches Platzhalter-Mesh für nicht unterstützte Komponenten.
 * - Bei zwei Punkten mit unterschiedlichen Koordinaten: Zylinder.
 * - Bei nur einem Punkt oder identischen Punkten: Kugel.
 *
 * @param {Object} block        - Der Komponentenblock mit Geometrieinformationen.
 * @param {string} pipelineRef  - Pipeline-Referenz.
 * @param {Object} units        - Einheitenskalierung { coordScale, boreScale }
 * @returns {Mesh|null}
 */
function createPlaceholder(block, pipelineRef, units) {
  const geometry = block.geometry || {};
  const pointTypes = Object.keys(geometry).filter(key => key.includes('POINT'));

  let points = [];

  for (const type of pointTypes) {
    const entries = geometry[type];
    if (Array.isArray(entries)) {
      for (const entry of entries) {
        if (entry.coords && entry.nominal != null) {
          const position = new Vector3(
            entry.coords[0] * units.coordScale,
            entry.coords[1] * units.coordScale,
            entry.coords[2] * units.coordScale
          );

          const diameter = typeof entry.nominal === 'number'
            ? entry.nominal
            : parseFloat(entry.nominal);
          if (isNaN(diameter)) continue;

          points.push({ position, radius: (diameter * units.boreScale) / 2 });
        }
      }
    }
  }

  if (points.length === 0) {
    console.warn('createPlaceholder: Kein gültiger Punkt mit Nominaldurchmesser gefunden:', block);
    return null;
  }

  // Nur ein Punkt → Kugel
  if (points.length === 1 || points[0].position.equals(points[1].position)) {
    const { position, radius } = points[0];
    const sphereGeo = new SphereGeometry(radius * 0.96, GEOMETRY_SEGMENTS, GEOMETRY_SEGMENTS);
    const mesh = new Mesh(sphereGeo, PLACEHOLDER_MATERIAL.clone());
    mesh.position.copy(position);
    mesh.name = 'Placeholder (Sphere)';
    mesh.userData = { pipeline: pipelineRef, type: block.type, params: { radius }, rawBlock: block };
    return mesh;
  }

  // Zwei Punkte → Zylinder
  const [p0, p1] = [points[0].position, points[1].position];
  const radius = Math.min(points[0].radius, points[1].radius); // konservativ

  const dir = new Vector3().subVectors(p1, p0);
  const length = dir.length();
  const cylGeo = new CylinderGeometry(radius, radius, length, GEOMETRY_SEGMENTS, 1, false);
  cylGeo.translate(0, length / 2, 0);
  const quat = new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), dir.clone().normalize());
  cylGeo.applyQuaternion(quat);
  cylGeo.translate(p0.x, p0.y, p0.z);

  const mesh = new Mesh(cylGeo, PLACEHOLDER_MATERIAL.clone());
  mesh.name = 'Placeholder (Cylinder)';
  mesh.userData = {
    pipeline: pipelineRef,
    type: block.type,
    params: { radius, points: [p0, p1] },
    rawBlock: block
  };
  return mesh;
}

export { createPlaceholder };
