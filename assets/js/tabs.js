/**
 * TabHandler - Hanterar växling mellan flikar och zoom-funktioner för diagrammet
 */
class TabHandler {
  constructor() {
    this.tabButtons = document.querySelectorAll('.tab-button');
    this.tabContents = document.querySelectorAll('.tab-content');
    this.zoomInButton = document.getElementById('zoom-in');
    this.zoomOutButton = document.getElementById('zoom-out');
    this.resetZoomButton = document.getElementById('reset-zoom');
    this.renderDiagramButton = document.getElementById('render-diagram');
    this.diagramContainer = document.getElementById('diagram-container');
    this.mermaidDiagram = document.getElementById('mermaid-diagram');
    this.zoomLevel = 1;

    // Originalinnehållet i Mermaid-kodblocket (hämtas från ett data-attribut i template)
    this.mermaidSource = this.mermaidDiagram ? this.mermaidDiagram.getAttribute('data-source') : '';

    // Binds
    this.handleTabChange = this.handleTabChange.bind(this);
    this.handleZoomIn = this.handleZoomIn.bind(this);
    this.handleZoomOut = this.handleZoomOut.bind(this);
    this.handleResetZoom = this.handleResetZoom.bind(this);
    this.renderMermaidDiagram = this.renderMermaidDiagram.bind(this);
  }

  /**
   * Initialisera modulen
   */
  init() {
    this.setupEventListeners();

    // Om diagram-fliken är aktiv från början, rendera direkt
    if (document.getElementById('diagram-tab') &&
        document.getElementById('diagram-tab').classList.contains('active')) {
      // Kort fördröjning för att låta DOM ladda klart
      setTimeout(() => this.renderMermaidDiagram(), 100);
    }

    this.logDebug('TabHandler initialized');
  }

  /**
   * Sätt upp eventlyssnare
   */
  setupEventListeners() {
    // Tabbar
    this.tabButtons.forEach(button => {
      button.addEventListener('click', this.handleTabChange);
    });

    // Zoom-knappar
    if (this.zoomInButton) {
      this.zoomInButton.addEventListener('click', this.handleZoomIn);
    }

    if (this.zoomOutButton) {
      this.zoomOutButton.addEventListener('click', this.handleZoomOut);
    }

    if (this.resetZoomButton) {
      this.resetZoomButton.addEventListener('click', this.handleResetZoom);
    }

    // Render-knapp (om den finns)
    if (this.renderDiagramButton) {
      this.renderDiagramButton.addEventListener('click', this.renderMermaidDiagram);
    }
  }

  /**
   * Hantera byte av flik
   */
  handleTabChange(event) {
    const tabId = event.target.getAttribute('data-tab');

    // Avaktivera alla flikar och innehåll
    this.tabButtons.forEach(button => {
      button.classList.remove('active');
      // Ta bort Tailwind aktiv stilar
      button.classList.remove('text-blue-600', 'border-blue-500');
      button.classList.add('text-gray-500', 'border-transparent');
    });

    this.tabContents.forEach(content => {
      content.classList.remove('active');
    });

    // Aktivera den klickade fliken
    event.target.classList.add('active');
    // Lägg till Tailwind aktiv stilar
    event.target.classList.remove('text-gray-500', 'border-transparent');
    event.target.classList.add('text-blue-600', 'border-blue-500');

    const targetTab = document.getElementById(tabId);
    targetTab.classList.add('active');

    this.logDebug(`Tab changed to: ${tabId}`);

    // Om vi byter till diagram-fliken, rendera diagrammet
    if (tabId === 'diagram-tab') {
      // Kort fördröjning för att låta DOM uppdateras
      setTimeout(() => this.renderMermaidDiagram(), 50);
    }
  }

  /**
   * Rendera Mermaid-diagram dynamiskt
   */
  renderMermaidDiagram() {
    this.logDebug('Rendering Mermaid diagram...');

    try {
      // Kontrollera om Mermaid är laddat
      if (!window.mermaid) {
        this.logDebug('Mermaid library not loaded');
        return;
      }

      // Kontrollera om containern finns
      if (!this.mermaidDiagram) {
        this.logDebug('Mermaid diagram container not found');
        return;
      }

      // Rensa tidigare innehåll
      this.mermaidDiagram.innerHTML = '';

      // Lägg till Mermaid-koden i ett pre-element
      const preMermaid = document.createElement('pre');
      preMermaid.className = 'mermaid';
      preMermaid.textContent = this.mermaidSource;
      this.mermaidDiagram.appendChild(preMermaid);

      // Konfigurera Mermaid
      window.mermaid.initialize({
        startOnLoad: false,
        securityLevel: 'loose',
        theme: 'default',
        flowchart: {
          htmlLabels: true,
          curve: 'basis',
          nodeSpacing: 50,
          rankSpacing: 80,
          wrap: true,
          width: 50
        },
        logLevel: 'error'
      });

      // Rendera diagrammet
      window.mermaid.contentLoaded();
      this.logDebug('Mermaid diagram rendered successfully');
    } catch (error) {
      this.logDebug('Error rendering Mermaid diagram:', error);

      // Om rendering misslyckas, lägg till ett felmeddelande
      if (this.mermaidDiagram) {
        this.mermaidDiagram.innerHTML = `
          <div class="p-4 bg-red-100 text-red-700 rounded-md">
            <p>Det gick inte att rendera diagrammet. Försök klicka på "Rendera diagram"-knappen eller ladda om sidan.</p>
            <p>Tekniskt fel: ${error.message}</p>
          </div>
        `;
      }
    }
  }

  /**
   * Hantera zoom in
   */
  handleZoomIn() {
    if (this.zoomLevel < 3) { // Maximal zoom-nivå
      this.zoomLevel += 0.2;
      this.updateZoom();
    }
  }

  /**
   * Hantera zoom ut
   */
  handleZoomOut() {
    if (this.zoomLevel > 0.5) { // Minimal zoom-nivå
      this.zoomLevel -= 0.2;
      this.updateZoom();
    }
  }

  /**
   * Återställ zoom till standard
   */
  handleResetZoom() {
    this.zoomLevel = 1;
    this.updateZoom();
  }

  /**
   * Uppdatera zoom-nivån för diagrammet
   */
  updateZoom() {
    if (this.diagramContainer) {
      this.diagramContainer.style.transform = `scale(${this.zoomLevel})`;
      this.diagramContainer.style.transformOrigin = 'center top';
      this.diagramContainer.style.transition = 'transform 0.3s ease';

      this.logDebug(`Zoom level updated to: ${this.zoomLevel}`);
    }
  }

  /**
   * Hjälpmetod för loggning med tidstämpel
   */
  logDebug(message, error) {
    const timestamp = new Date().toISOString().substr(11, 8);
    console.log(`[${timestamp}] [Tabs] ${message}`);

    if (error) {
      console.error(error);
    }
  }
}
