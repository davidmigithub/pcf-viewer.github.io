import { PcfParser } from "./parser.js";
import { SceneBuilder } from "./scene-builder.js";
import { UI } from './ui.js';

const ui = new UI();
let builder, rootGroup;

window.addEventListener('pcf-url', async e => {
  console.groupCollapsed('🔵 pcf-url event');
  console.log('Event detail (blob URL or path):', e.detail);

  ui.showSpinner();
  try {
    const url = e.detail;
    let text = '';

    // 1) Fetch
    if (url) {
      try {
        console.log('Fetching PCF from URL…');
        const buffer = await fetch(url)
          .then(res => res.arrayBuffer());
        console.log('Fetched PCF bytes. Length:', buffer.byteLength);

        const decoder = new TextDecoder('utf-8');
        text = decoder.decode(buffer);
        console.log('Decoded PCF text. Length:', text.length);
      }
      catch (fetchError) {
        console.error('Error fetching PCF file:', fetchError);
        return;
      }
    } else {
      console.warn('No URL provided, initializing with empty PCF');
    }

    // 2) Parse
    let parsed;
    try {
      console.log('Parsing PCF text...');
      parsed = new PcfParser(text).parse();
    } catch (parseError) {
      console.error('Error parsing PCF:', parseError);
      return;
    }

    // 3) Init/Update SceneBuilder
    if (!builder) {
      console.log('Creating SceneBuilder with parsed data');
      builder = new SceneBuilder(parsed);
    } else {
      console.log('Updating SceneBuilder with new parsed data');
      builder.update(parsed);
    }

    // 4) Build/Rebuild
    if (rootGroup) {
      console.log('Removing previous root group from scene');
      builder.scene.remove(rootGroup);
    }
    console.log('Building new root group');
    rootGroup = builder.build();
    builder.scene.add(rootGroup);

  } finally {
    ui.hideSpinner();
    console.groupEnd();
  }
});

// Kick off initial empty scene
console.log('Dispatching initial empty pcf-url event');
document.dispatchEvent(new CustomEvent('pcf-url', { detail: '' }));