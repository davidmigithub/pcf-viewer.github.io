import { PcfParser }        from "./parser.js";
import { SceneBuilder }     from "./scene-builder.js";

const builder = new SceneBuilder();

window.addEventListener('pcf-url', async (e) => {
  builder.ui.showSpinner();
  try {
    let url, fileName;
    if (typeof e.detail === 'object') {
      url      = e.detail.url;
      fileName = e.detail.name;
    } else {
      url      = e.detail;
      fileName = `Model ${builder.filesData.length + 1}`;
    }
    if (!url) return;

    const buffer = await fetch(url).then(r => r.arrayBuffer());
    const text   = new TextDecoder('utf-8').decode(buffer);
    const parsed = new PcfParser(text).parse();

    builder.addFile(parsed, fileName);

    const fileInput = document.querySelector('input[type=file]');
    if (fileInput) fileInput.value = '';
  }
  catch (err) {
    console.error('Error loading PCF:', err);
  }
  finally {
    builder.ui.hideSpinner();
  }
});