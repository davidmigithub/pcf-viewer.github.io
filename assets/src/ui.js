export class UI {
    constructor() {
        this.infoBox = document.getElementById('infoBox');
        this.spinnerOverlay = document.getElementById('spinner-overlay');
        this.filenameOverlay = document.getElementById('filename-overlay');
        this.sideMenu = document.getElementById('sideMenu');
        this.builder = null;
    }

    setBuilder(builder) {
        this.builder = builder;
        console.log('[UI] Builder set:', builder);
    }

    buildSideMenu(filesData) {
        if (!this.builder) return;

        // Pipeline checkboxes grouped by file
        const plcHtml = filesData.map(file => {
        const pipelines = Array.isArray(file.parsed.pipelines?.pipelines)
            ? file.parsed.pipelines.pipelines
            : [];
        const lines = pipelines.map(pl => `
            <label>
            <input type="checkbox"
                    data-pipeline="${file.fileName}|${pl.reference}"
                    checked>
            ${pl.reference}
            </label>
        `).join('<br>');
        return `<div class="file-group"><strong>${file.fileName}</strong><br>${lines}</div>`;
        }).join('<hr>');

        // Category checkboxes (types)
        const types = new Set();
        filesData.forEach(file => {
        (file.parsed.pipelines?.pipelines || []).forEach(pl => {
            (pl.components || []).forEach(block => {
            if (block.type) types.add(block.type);
            });
        });
        });
        const typeHtml = Array.from(types).map(t => `
        <label>
            <input type="checkbox"
                data-type="${t}"
                checked>
            ${t}
        </label>
        `).join('<br>');

        this.sideMenu.innerHTML = `
        <div class="menu-content">
            <h3>Files & Pipelines</h3>
            ${plcHtml}
            <hr>
            <h3>Categories</h3>
            ${typeHtml}
        </div>
        `;

        // Event listeners
        this.sideMenu.querySelectorAll('input[type=checkbox]').forEach(cb => {
        cb.addEventListener('change', e => {
            const chk = e.target;
            if (chk.dataset.pipeline) {
            this.builder.togglePipeline(chk.dataset.pipeline, chk.checked);
            } else if (chk.dataset.type) {
            this.builder.toggleType(chk.dataset.type, chk.checked);
            }
        });
        });
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
        this.spinnerOverlay.hidden = false;
        this.filenameOverlay.hidden = true;
        this.sideMenu.hidden = true;
    }

    hideSpinner() {
        this.spinnerOverlay.hidden = true;
        this.filenameOverlay.hidden = false;
        this.sideMenu.hidden = false;
    }
}