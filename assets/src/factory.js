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
            // case 'WELD':
                // mesh = createWeld(block, pipelineRef, this.units, this.pipelines);
                // break;
            default:
                console.warn('ComponentFactory: Unsupported component type', block.type);
                return createPlaceholder(block, pipelineRef, this.units);
        }

        return mesh;
    }
}