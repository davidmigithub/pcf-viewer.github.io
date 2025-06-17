import { PcfParser } from "./parser.js";
import { SceneBuilder } from "./scene-builder.js";

// Initialize the 3D scene builder & UI
const builder = new SceneBuilder();

// Handle PCF generation events
window.addEventListener('pcf-url', async (e) => {
    builder.ui.showSpinner();
    try {
        let url, fileName;
        if (typeof e.detail === 'object') {
            url = e.detail.url;
            fileName = e.detail.name;
        } else {
            url = e.detail;
            fileName = `Model ${builder.filesData.length + 1}`;
        }
        if (!url) return;

        const buffer = await fetch(url).then(r => r.arrayBuffer());
        const text = new TextDecoder('utf-8').decode(buffer);
        const parsed = new PcfParser(text).parse();

        builder.addFile(parsed, fileName);

        // Reset file input so same file can be re-selected
        const fileInput = document.getElementById('file-input');
        if (fileInput) fileInput.value = '';
    }
    catch (err) {
        console.error('Error loading PCF:', err);
    }
    finally {
        builder.ui.hideSpinner();
    }
});

// Set up UI interactions once DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // DOM references
    const card = document.querySelector('.drop-card');
    const fileInput = document.getElementById('file-input');
    const selectBtn = document.getElementById('select-file');
    const sampleBtn   = document.getElementById('load-sample');
    const sideMenu = document.getElementById('sideMenu');
    const spinnerText = document.getElementById('spinner-text');

    // Handle a single file: update UI and dispatch PCF event
    function handleFile(file) {
        sideMenu.innerHTML = '';
        card.classList.add('hidden');

        spinnerText.textContent = `Generate ${file.name}…`;
        builder.ui.showSpinner();

        const blobUrl = URL.createObjectURL(file);
        window.dispatchEvent(new CustomEvent('pcf-url', {
            detail: {
                url: blobUrl,
                name: file.name
            }
        }));
    }

    // Load the sample PCF from repo path
    sampleBtn.addEventListener('click', () => {
        card.classList.add('hidden');
        spinnerText.textContent = `Generate sample.pcf…`;
        builder.ui.showSpinner();
        window.dispatchEvent(new CustomEvent('pcf-url', {
            detail: {
                url: 'sample_pcf/sample.pcf',
                name: 'sample.pcf'
            }
        }));
    });

    // Drag & Drop: prevent default and toggle hover class
    ['dragenter', 'dragover'].forEach(evt =>
        document.body.addEventListener(evt, e => {
            e.preventDefault();
            document.body.classList.add('drag-hover');
        })
    );
    ['dragleave', 'drop'].forEach(evt =>
        document.body.addEventListener(evt, e => {
            e.preventDefault();
            document.body.classList.remove('drag-hover');
        })
    );

    // On drop, filter for .pcf files
    document.body.addEventListener('drop', e => {
        e.preventDefault();
        Array.from(e.dataTransfer.files)
            .filter(f => /\.pcf$/i.test(f.name))
            .forEach(f => handleFile(f));
    });

    // Button to open file dialog
    selectBtn.addEventListener('click', () => fileInput.click());

    // File input change handler
    fileInput.addEventListener('change', e => {
        Array.from(e.target.files)
            .filter(f => /\.pcf$/i.test(f.name))
            .forEach(f => handleFile(f));
    });
});