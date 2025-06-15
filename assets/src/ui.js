export class UI {
    constructor() {
        this.infoBox = document.getElementById('infoBox');
        this.spinnerOverlay = document.getElementById('spinner-overlay');
        this.filenameOverlay = document.getElementById('filename-overlay');
    }

    showInfo(block, x, y) {
        const pipelineLines = block.pipelineRawLines || [];
        const compLines = block.componentRawLines || [];
        const matLines = block.materialRawLines || [];

        const sanitize = line =>
            line.replace(/&/g, '&amp;').replace(/</g, '&lt;');

        const buildSection = lines => {
            if (!lines.length) return '';
            return `<pre>${lines.map(sanitize).join('<br>')}</pre>`;
        };

        const sections = [
            buildSection(pipelineLines),
            buildSection(compLines),
            buildSection(matLines),
        ].filter(html => html !== '');

        const html = sections.join('<hr>');

        this.infoBox.innerHTML = html;

        const offset = 10;
        this.infoBox.style.left = `${x + offset}px`;
        this.infoBox.style.top = `${y + offset}px`;
        this.infoBox.style.display = 'block';
    }

    hideInfo() {
        this.infoBox.style.display = 'none';
    }

    showSpinner() {
        this.spinnerOverlay.classList.remove('hidden');
        this.filenameOverlay.hidden = true;
    }

    hideSpinner() {
        this.spinnerOverlay.classList.add('hidden');
        this.filenameOverlay.hidden = false;
    }
}