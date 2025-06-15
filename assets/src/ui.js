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

    buildSideMenu(parsed) {
        console.groupCollapsed('[UI] buildSideMenu called');
        console.log('[UI] this.builder:', this.builder);
        console.log('[UI] parsed:', parsed);

        if (!this.builder) {
            console.warn('[UI] No builder available, aborting side menu build');
            console.groupEnd();
            return;
        }

        // pipelines ist ein Objekt mit dem Array pipelines.pipelines
        const pipelines = (parsed.pipelines && Array.isArray(parsed.pipelines.pipelines))
            ? parsed.pipelines.pipelines
            : [];
        console.log('[UI] Found pipelines count:', pipelines.length);

        // alle component-Typen sammeln
        const types = new Set();
        pipelines.forEach(pl => {
            (pl.components || []).forEach(block => {
                if (block.type) types.add(block.type);
            });
        });
        console.log('[UI] Found types:', Array.from(types));

        // HTML für Pipelines
        const plcHtml = pipelines.map(pl => `
      <label>
        <input type="checkbox"
               data-pipeline="${pl.reference}"
               checked>
        ${pl.reference}
      </label>
    `).join('<br>');
        console.log('[UI] Pipeline HTML:', plcHtml);

        // HTML für Typ-Filter
        const typeHtml = Array.from(types).map(t => `
      <label>
        <input type="checkbox"
               data-type="${t}"
               checked>
        ${t}
      </label>
    `).join('<br>');
        console.log('[UI] Type HTML:', typeHtml);

        // in den Side-Menu-Container schreiben
        this.sideMenu.innerHTML = `
      <div class="menu-content">
        <h3>Pipelines</h3>
        ${plcHtml}
        <hr>
        <h3>Categories</h3>
        ${typeHtml}
      </div>
    `;
        console.log('[UI] sideMenu innerHTML set');

        // Events verknüpfen
        const checkboxes = this.sideMenu.querySelectorAll('input[type=checkbox]');
        console.log('[UI] Number of checkboxes found:', checkboxes.length);
        checkboxes.forEach(cb => {
            cb.addEventListener('change', e => {
                const chk = e.target;
                console.log(`[UI] checkbox changed: ${chk.dataset.pipeline || chk.dataset.type} = ${chk.checked}`);
                if (chk.dataset.pipeline) {
                    this.builder.togglePipeline(chk.dataset.pipeline, chk.checked);
                } else if (chk.dataset.type) {
                    this.builder.toggleType(chk.dataset.type, chk.checked);
                }
            });
        });
        console.groupEnd();
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