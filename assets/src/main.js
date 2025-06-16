import { PcfParser } from "./parser.js";
import { SceneBuilder } from "./scene-builder.js";
import { UI } from './ui.js';

const ui = new UI();
const builder = new SceneBuilder();
ui.setBuilder(builder);
const filesData = [];

window.addEventListener('pcf-url', async (e) => {
  ui.showSpinner();
  try {
    let url, fileName;
    if (typeof e.detail === 'object') {
      url = e.detail.url;
      fileName = e.detail.name;
    } else {
      url = e.detail;
      fileName = `Model ${filesData.length + 1}`;
    }

    if (!url) return;

    const buffer = await fetch(url).then(res => res.arrayBuffer());
    const text = new TextDecoder('utf-8').decode(buffer);
    const parsed = new PcfParser(text).parse();

    filesData.push({ parsed, fileName });
    builder.addFile(parsed, fileName);
    ui.buildSideMenu(filesData);
  } catch (err) {
    console.error('Error loading PCF:', err);
  } finally {
    ui.hideSpinner();
  }
});
