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
import { createSupport } from "./creators/create_support.js";

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

        console.groupCollapsed('◯ ComponentFactory → ', block.type.toUpperCase());
        console.log('Switch parameters →', block.type, ';', 'SKEY=', block.skey);
        
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
            case 'SUPPORT':
                mesh = createSupport(block, pipelineRef, this.units, this.pipelines);
                break;
            default:
                mesh = createPlaceholder(block, pipelineRef, this.units);
                break;
        }

        console.log('ℹ️', 'Block → ', block);
        console.log('ℹ️', 'Mesh  → ', mesh);

        if(mesh){
            console.log('✅', 'created mesh successfully');
        }
        else {
            console.log('❌', 'could not create mesh');
        }

        console.groupEnd();

        return mesh;
    }
}