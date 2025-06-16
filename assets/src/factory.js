import { createPlaceholder } from "./creators/create_placeholder.js";
import { createPipe } from "./creators/create_pipe.js";
import { createBend } from "./creators/create_bend.js";
import { createReducerCon } from "./creators/create_reducer_con.js";
import { createTee } from "./creators/create_tee.js";
import { createFlange } from "./creators/create_flange.js";
import { createCap } from "./creators/create_cap.js";
import { createOlet } from "./creators/create_olet.js";
import { createValve } from "./creators/create_valve.js";

export class ComponentFactory {
  constructor(units, materials) {
    this.units = units;
    this.materials = materials;
  }

  build({ block }, pipelineRef) {
    let mesh = null;

    switch (block.type.toUpperCase()) {
        case 'PIPE':
          mesh = createPipe(block, pipelineRef, this.units);
          break;
        case 'ELBOW':
        case 'BEND':
          mesh = createBend(block, pipelineRef, this.units);
          break;
        case 'REDUCER-CONCENTRIC':
          mesh = createReducerCon(block, pipelineRef, this.units);
          break;
        case 'TEE':
          mesh = createTee(block, pipelineRef, this.units);
          break;
        case 'FLANGE':
          mesh = createFlange(block, pipelineRef, this.units);
          break;
        case 'CAP':
          mesh = createCap(block, pipelineRef, this.units);
          break;
        case 'OLET':
          mesh = createOlet(block, pipelineRef, this.units);
          break;
        case 'VALVE':
          mesh = createValve(block, pipelineRef, this.units);
          break;

      // TODO: add more cases

      default:
        console.warn('ComponentFactory: Unsupported component type', block.type);
        return createPlaceholder(block, pipelineRef, this.units);
    }

    return mesh;
  }
}