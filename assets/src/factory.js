import { createPlaceholder } from "./creators/create_placeholder.js";
import { createPipe } from "./creators/create_pipe.js";
import { createBend } from "./creators/create_bend.js";
import { createReducerCon } from "./creators/create_reducer_con.js";
import { createTee } from "./creators/create_tee.js";
import { createFlange } from "./creators/create_flange.js";
import { createCap } from "./creators/create_cap.js";
import { createOlet } from "./creators/create_olet.js";
import { createValve } from "./creators/create_valve.js";
import { createWeld } from "./creators/create_weld.js";
import { Vector3 } from "./vendor_mods/three.module.js";

// Regex to match keypoints
const EXTERNAL_KEYPOINT_REGEX = /^(END-POINT|BRANCH\d+-POINT|PORT-POINT)$/;
const INTERNAL_KEYPOINT_REGEX = /^(CENTRE-POINT|CO-ORDS)$/;

export class ComponentFactory {
    constructor(units, materials, pipelines) {
        this.units = units;
        this.materials = materials;
        this.pipelines = pipelines;
    }

    build({ block }, pipelineRef) {
        let mesh = null;

        const currentPipeline = this.pipelines.find(plc => plc.reference === pipelineRef);

        switch (block.type.toUpperCase()) {
            case 'PIPE':
                mesh = createPipe(block, pipelineRef, this.units, this.pipelines);
                break;
            case 'ELBOW':
            case 'BEND':
                mesh = createBend(block, pipelineRef, this.units, this.pipelines);
                break;
            case 'REDUCER-CONCENTRIC':
                mesh = createReducerCon(block, pipelineRef, this.units, this.pipelines);
                break;
            case 'TEE':
                mesh = createTee(block, pipelineRef, this.units, this.pipelines);
                break;
            case 'FLANGE':
                mesh = createFlange(block, pipelineRef, this.units, this.pipelines);
                break;
            case 'CAP':
                mesh = createCap(block, pipelineRef, this.units, this.pipelines);
                break;
            case 'OLET':
                mesh = createOlet(block, pipelineRef, this.units, this.pipelines);
                break;
            case 'VALVE':
                mesh = createValve(block, pipelineRef, this.units, this.pipelines);
                break;
            case 'WELD':
                mesh = createWeld(block, pipelineRef, this.units, this.pipelines);
                break;
            default:
                console.warn('ComponentFactory: Unsupported component type', block.type);
                return createPlaceholder(block, pipelineRef, this.units);
        }

        return mesh;
    }

    computeDirectionAtExternalKeypoint(targetCoords, excludeBlock = null) {
        const dummyDir = new Vector3(1, 0, 0);
        const [tx, ty, tz] = targetCoords;
        let count = 0;

        // Collect all blocks that lie on the target point
        const hits = [];

        for (const pipeline of this.pipelines) {
            for (const block of (pipeline.components || [])) {
                if (block === excludeBlock) continue;

                const geom = block.geometry || {};
                // Check if any external keypoint matches the target coordinates
                const hasPoint = Object.entries(geom).some(([key, entries]) => {
                    if (!EXTERNAL_KEYPOINT_REGEX.test(key)) return false;
                    return entries.some(pt =>
                        pt.coords[0] === tx &&
                        pt.coords[1] === ty &&
                        pt.coords[2] === tz
                    );
                });
                if (hasPoint) {
                    count++;
                    hits.push({ block, geom });
                }
            }
        }

        // Best-Case: choose block with exactly two END-POINTs and no other keypoints
        for (const { block, geom } of hits) {
            const externalKeys = Object.keys(geom).filter(k => EXTERNAL_KEYPOINT_REGEX.test(k));
            const endpointList = geom['END-POINT'] || [];
            // No internal keypoints (CENTRE-POINT or CO-ORDS) allowed
            const hasInternal = Object.keys(geom).some(k => INTERNAL_KEYPOINT_REGEX.test(k));

            const onlyEndpoints =
                externalKeys.length === 1 &&               // only one type of external key
                externalKeys[0] === 'END-POINT' &&         // that is END-POINT
                endpointList.length === 2 &&               // exactly two endpoints
                !hasInternal;                              // no internal keypoints present

            if (onlyEndpoints) {
                const [p1, p2] = endpointList;
                const v1 = new Vector3(...p1.coords);
                const v2 = new Vector3(...p2.coords);

                if (!v1.equals(v2)) {
                    const direction = v2.clone().sub(v1).normalize();
                    console.log(
                        `ComponentFactory: best-case direction from block ${block.type} at [${tx},${ty},${tz}]`,
                        direction
                    );
                    return direction;
                }
            }
        }

        // Fallback: log and return dummy direction
        if (hits.length > 0) {
            console.log(
                `ComponentFactory: ${hits.length} components at [${tx},${ty},${tz}], but no best-case; returning dummy direction`,
                dummyDir
            );
        } else {
            console.log(
                `ComponentFactory: no components at [${tx},${ty},${tz}]; returning dummy direction`,
                dummyDir
            );
        }
        return dummyDir.clone();
    }
}