import { Vector3 } from "../vendor_mods/three.module.js";

export function getPipeRadiusAtCoords(targetCoords, units, pipelines) {
    const [tx, ty, tz] = targetCoords;
    const point = new Vector3(
        tx * units.coordScale,
        ty * units.coordScale,
        tz * units.coordScale
    );
    let foundRadius = units.coordScale;  // fallback radius
    let minDist = Infinity;
    const tolerance = units.coordScale * 0.01;  // 1 cm tolerance

    for (const pipeline of pipelines) {
        for (const block of (pipeline.components || [])) {
            if (block.type.toUpperCase() !== 'PIPE') continue;
            const ends = block.geometry['END-POINT'];
            if (!ends || ends.length !== 2) continue;

            const p1 = new Vector3(...ends[0].coords).multiplyScalar(units.coordScale);
            const p2 = new Vector3(...ends[1].coords).multiplyScalar(units.coordScale);
            const dir = p2.clone().sub(p1);
            const lenSq = dir.lengthSq();
            if (lenSq === 0) continue;

            // project point onto line segment
            const t = Math.max(0, Math.min(1, point.clone().sub(p1).dot(dir) / lenSq));
            const proj = p1.clone().add(dir.multiplyScalar(t));
            const dist = proj.distanceTo(point);
            if (dist <= tolerance && dist < minDist) {
                minDist = dist;
                const rawDia = parseFloat(ends[0].nominal);
                foundRadius = isNaN(rawDia)
                    ? units.coordScale
                    : (rawDia * units.boreScale) / 2;
            }
        }
    }

    console.log('getPipeRadiusAtCoords →', foundRadius);
    return foundRadius;
}

export function getPipeDirectionAtCoords(targetCoords, units, pipelines) {
  // Calculates normalized direction in XY-plane without scaling factors
  const [tx, ty, tz] = targetCoords;
  const point = new Vector3(tx, ty, tz);

  let minDist = Infinity;
  let bestDir = null;
  const tolerance = 0.01; // 1cm in model units

  for (const pipeline of pipelines) {
    for (const block of pipeline.components || []) {
      if (block.type.toUpperCase() !== 'PIPE') continue;
      const ends = block.geometry['END-POINT'];
      if (!ends || ends.length !== 2) continue;

      // Use raw coordinates for endpoints
      const p1 = new Vector3(...ends[0].coords);
      const p2 = new Vector3(...ends[1].coords);
      const lineDir = p2.clone().sub(p1);
      const lenSq = lineDir.lengthSq();
      if (lenSq === 0) continue;

      // Project the query point onto the pipe segment
      const t = Math.max(0, Math.min(1, point.clone().sub(p1).dot(lineDir) / lenSq));
      const proj = p1.clone().add(lineDir.clone().multiplyScalar(t));
      const dist = proj.distanceTo(point);

      if (dist <= tolerance && dist < minDist) {
        minDist = dist;
        // Project direction into XY-plane
        const dirXY = new Vector3(lineDir.x, lineDir.y, 0);
        if (dirXY.lengthSq() === 0) {
          // Pipe runs purely along Z; return unit Z
          bestDir = new Vector3(0, 0, 1);
        } else {
          bestDir = dirXY.normalize();
        }
      }
    }
  }

  return bestDir;
}

export function computeDirectionAtExternalKeypoint(targetCoords, pipelines, excludeBlock = null) {
    const EXTERNAL_KEYPOINT_REGEX = /^(END-POINT|BRANCH\d+-POINT|PORT-POINT)$/;
    const INTERNAL_KEYPOINT_REGEX = /^(CENTRE-POINT|CO-ORDS)$/;
    const dummyDir = new Vector3(1, 0, 0);
    const [tx, ty, tz] = targetCoords;
    const hits = [];

    // search for matching external keypoints
    for (const pipeline of pipelines) {
        for (const block of (pipeline.components || [])) {
            if (block === excludeBlock) continue;
            const geom = block.geometry || {};
            const hasPoint = Object.entries(geom).some(([key, entries]) => {
                if (!EXTERNAL_KEYPOINT_REGEX.test(key)) return false;
                return entries.some(pt =>
                    pt.coords[0] === tx && pt.coords[1] === ty && pt.coords[2] === tz
                );
            });
            if (hasPoint) hits.push({ block, geom });
        }
    }

    // best case: exactly two endpoints and no internal keypoints
    for (const { block, geom } of hits) {
        const externalKeys = Object.keys(geom).filter(k => EXTERNAL_KEYPOINT_REGEX.test(k));
        const endpointList = geom['END-POINT'] || [];
        const hasInternal = Object.keys(geom).some(k => INTERNAL_KEYPOINT_REGEX.test(k));

        const onlyEndpoints =
            externalKeys.length === 1 &&
            externalKeys[0] === 'END-POINT' &&
            endpointList.length === 2 &&
            !hasInternal;

        if (onlyEndpoints) {
            const [p1, p2] = endpointList;
            const v1 = new Vector3(...p1.coords);
            const v2 = new Vector3(...p2.coords);
            if (!v1.equals(v2)) {
                const direction = v2.clone().sub(v1).normalize();
                console.log(
                    `computeDirectionAtExternalKeypoint: best-case direction at [${tx},${ty},${tz}]`,
                    direction
                );
                return direction;
            }
        }
    }

    if (hits.length > 0) {
        console.log(
            `computeDirectionAtExternalKeypoint: ${hits.length} components at [${tx},${ty},${tz}], using dummy`,
            dummyDir
        );
    } else {
        console.log(
            `computeDirectionAtExternalKeypoint: no components at [${tx},${ty},${tz}], using dummy`,
            dummyDir
        );
    }
    return dummyDir.clone();
}