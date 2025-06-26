// assets/src/creators/create_support.js

import {
    Group,
    Vector3,
    BufferGeometry,
    Line,
    LineBasicMaterial,
    CylinderGeometry,
    ConeGeometry,
    Mesh
} from "../vendor_mods/three.module.js";
import { HITBOX_MATERIAL, GEOMETRY_SEGMENTS, SUPPORT_MATERIAL } from "../settings.js";
import { getPipeRadiusAtCoords, getPipeDirectionAtCoords } from "../utils/helpers.js";
import { createPlaceholder } from "./create_placeholder.js";

/**
 * Create a support symbol based on SKEY.
 */
export function createSupport(block, pipelineRef, units, pipelines) {
    // 1) Determine raw position from CO-ORDS
    const raw = block.geometry['CO-ORDS']?.[0]?.coords;
    if (!raw) {
        console.warn('createSupport: missing CO-ORDS', block);
        return null;
    }
    const center = new Vector3(...raw.map(c => c * units.coordScale));

    // 2) Create group for support symbol
    const supportGroup = new Group();
    supportGroup.name = 'Support';
    supportGroup.userData = { pipeline: pipelineRef, type: block.type, rawBlock: block };

    // 3) Draw symbol for ANCH type only, constructing in local coords
    if (block.skey === 'ANCH' || block.skey === 'GUID' || block.skey === 'SKID' || block.skey === 'SPRG' || block.skey === 'HANG') {
        const radius = getPipeRadiusAtCoords(raw, units, pipelines);
        const R = radius * 4;
        const mat = new LineBasicMaterial({ color: SUPPORT_MATERIAL.color });

        /**
         * Helper to add an axis line and arrowheads along local axis.
         * @param {'x'|'y'|'z'} dir - Local axis coordinate
         */
        function addAxis(dir) {
            // Main line from -R to +R
            const from = new Vector3();
            const to = new Vector3();
            from[dir] = -R;
            to[dir] = R;
            const lineGeo = new BufferGeometry().setFromPoints([from, to]);
            const line = new Line(lineGeo, mat);
            line.name = `Support_ANCH_${dir}`;
            line.userData = supportGroup.userData;
            supportGroup.add(line);

            // Arrowhead geometry
            const arrowLength = R * 0.2;
            const baseRadius = arrowLength * 0.5;
            const inset = arrowLength * 1.5;

            const coneGeo = new ConeGeometry(baseRadius, arrowLength, 8);
            coneGeo.rotateX(Math.PI / 2);

            [true, false].forEach(isPositive => {
                const arrow = new Mesh(coneGeo, mat);
                arrow.position[dir] = isPositive ? (R - inset) : (-R + inset);
                arrow.lookAt(new Vector3(0, 0, 0));
                arrow.name = `Support_ANCH_${dir}_arrow_${isPositive ? 'pos' : 'neg'}`;
                arrow.userData = supportGroup.userData;
                supportGroup.add(arrow);
            });
        }

        ['x', 'y', 'z'].forEach(addAxis);

        // 4) Invisible pick volume
        const pickR = units.coordScale * 0.6;
        const pickGeo = new CylinderGeometry(pickR, pickR, pickR * 0.1, 8);
        const pickMat = HITBOX_MATERIAL.clone();
        pickMat.depthTest = false;
        const pickMesh = new Mesh(pickGeo, pickMat);
        pickMesh.name = 'SupportPick';
        pickMesh.userData = supportGroup.userData;
        supportGroup.add(pickMesh);

        // 5) Rotate entire symbol to align with pipe direction
        const pipeDir = getPipeDirectionAtCoords(raw, units, pipelines) || new Vector3(1, 0, 0);
        const angleZ = Math.atan2(pipeDir.y, pipeDir.x);
        supportGroup.rotation.set(0, 0, angleZ);

        // 6) Position group at center
        supportGroup.position.copy(center);

        return supportGroup;
    }

    // Non-ANCH: just add pick volume and position
    return createPlaceholder(block, pipelineRef, units);
}
