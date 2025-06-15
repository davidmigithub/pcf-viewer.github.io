import { Mesh, CylinderGeometry, Vector3, Quaternion } from "../vendor_mods/three.module.js";
import { TEE_MATERIAL, GEOMETRY_SEGMENTS } from "../settings.js";
import { BufferGeometryUtils } from "../vendor_mods/BufferGeometryUtils.js";

/**
 * Erstellt ein T-Stück (TEE) aus zwei Endpunkten und einem Verzweigungszweig.
 * @param {Object} block        - rawBlock mit END-POINT (2), CENTRE-POINT (1) und BRANCH1-POINT (1) plus DIAMETER
 * @param {string} pipelineRef  - Referenz der Pipeline (für userData)
 * @param {Object} units        - Einheitenskalierung { coordScale, boreScale }
 * @returns {Mesh|null}
 */
function createTee(block, pipelineRef, units) {
  const ends = block.geometry['END-POINT'];        // Erwartet zwei Punkte: [start, end]
  const centreArr = block.geometry['CENTRE-POINT']; // Verzweigungszentrum
  const branchArr = block.geometry['BRANCH1-POINT']; // Abzweig-Endpunkt

  if (!ends || ends.length < 2 || !centreArr || centreArr.length < 1 || !branchArr || branchArr.length < 1) {
    console.warn('createTee: Missing END-POINT (2), CENTRE-POINT (1) oder BRANCH1-POINT (1) für TEE', block);
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

  // Durchmesser skalieren (Haupt- und Abzweigungsrohr)
  const rawDiaMain = typeof ends[0].nominal === 'number' ? ends[0].nominal : parseFloat(ends[0].nominal);
  const rawDiaBr = typeof branchArr[0].nominal === 'number' ? branchArr[0].nominal : parseFloat(branchArr[0].nominal);
  if (isNaN(rawDiaMain) || isNaN(rawDiaBr)) {
    console.warn('createTee: Ungültiger nominaler Durchmesser', ends[0].nominal, branchArr[0].nominal);
    return null;
  }
  const radiusMain = (rawDiaMain * units.boreScale) / 2;
  const radiusBr = (rawDiaBr * units.boreScale) / 2;

  // Zylinder-Geometrie Hauptrohr (zwischen start und end)
  const dirMain = new Vector3().subVectors(end, start);
  const lenMain = dirMain.length();
  const geoMain = new CylinderGeometry(radiusMain, radiusMain, lenMain, GEOMETRY_SEGMENTS, 1, false);
  geoMain.translate(0, lenMain / 2, 0);
  const quatMain = new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), dirMain.clone().normalize());
  geoMain.applyQuaternion(quatMain);
  geoMain.translate(start.x, start.y, start.z);

  // Zylinder-Geometrie Abzweigung (zwischen centre und branchEnd)
  const dirBr = new Vector3().subVectors(branchEnd, centre);
  const lenBr = dirBr.length();
  const geoBr = new CylinderGeometry(radiusBr, radiusBr, lenBr, GEOMETRY_SEGMENTS, 1, false);
  geoBr.translate(0, lenBr / 2, 0);
  const quatBr = new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), dirBr.clone().normalize());
  geoBr.applyQuaternion(quatBr);
  geoBr.translate(centre.x, centre.y, centre.z);

  // Geometrien zusammenführen
  const mergedGeo = BufferGeometryUtils.mergeBufferGeometries([geoMain, geoBr], true);

  const material = TEE_MATERIAL.clone();
  const teeMesh = new Mesh(mergedGeo, material);
  teeMesh.name = 'Tee';

  // userData
  teeMesh.userData = {
    pipeline: pipelineRef,
    type: block.type,
    params: { start, end, centre, branchEnd, radiusMain, radiusBr },
    rawBlock: block
  };

  return teeMesh;
}

export { createTee };
