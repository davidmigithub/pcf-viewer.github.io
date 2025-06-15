import { PcfParser } from "./parser.js";
import { SceneBuilder } from "./scene-builder.js";
import { UI } from './ui.js';

const ui = new UI();
let builder = null;
let rootGroup = null;

window.addEventListener('pcf-url', async (e) => {
  console.groupCollapsed('🔵 pcf-url event');
  console.log('Event detail:', e.detail);

  ui.showSpinner();
  let parsed;

  try {
    // 1) Fetch PCF-Text
    let text = '';
    if (e.detail) {
      console.log('Fetching PCF from URL…');
      const buffer = await fetch(e.detail).then(res => res.arrayBuffer());
      console.log('Fetched PCF bytes. Length:', buffer.byteLength);
      text = new TextDecoder('utf-8').decode(buffer);
      console.log('Decoded PCF text. Length:', text.length);
    } else {
      console.warn('No URL provided, initializing with empty PCF');
    }

    // 2) Parse
    console.log('Parsing PCF text…');
    parsed = new PcfParser(text).parse();
    console.log('  → pipelines count:', Array.isArray(parsed.pipelines) ? parsed.pipelines.length : parsed.pipelines?.pipelines?.length);

    // 3) Init oder Update SceneBuilder
    if (!builder) {
      console.log('Creating new SceneBuilder');
      builder = new SceneBuilder(parsed);
      ui.setBuilder(builder);    // Builder einmalig an UI übergeben
    } else {
      console.log('Updating existing SceneBuilder');
      builder.update(parsed);
    }

    // 4) Entferne altes Root-Group und baue die Szene neu
    if (rootGroup) {
      console.log('Removing previous root group');
      builder.scene.remove(rootGroup);
    }
    console.log('Building scene graph…');
    rootGroup = builder.build();
    builder.scene.add(rootGroup);

    // 5) Side-Menu mit Checkboxen neu aufbauen
    console.log('Building side menu');
    ui.buildSideMenu(parsed);
  }
  catch (err) {
    console.error('Error in pcf-url handler:', err);
  }
  finally {
    ui.hideSpinner();
    console.groupEnd();
  }
});

// Kick off initial empty scene
console.log('Dispatching initial empty pcf-url event');
document.dispatchEvent(new CustomEvent('pcf-url', { detail: '' }));