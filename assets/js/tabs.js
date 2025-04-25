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
    this.diagramContainer = document.getElementById('diagram-container');
    this.zoomLevel = 1;

    // Binds
    this.handleTabChange = this.handleTabChange.bind(this);
    this.handleZoomIn = this.handleZoomIn.bind(this);
    this.handleZoomOut = this.handleZoomOut.bind(this);
    this.handleResetZoom = this.handleResetZoom.bind(this);
  }

  /**
   * Initialisera modulen
   */
  init() {
    this.setupEventListeners();
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

    document.getElementById(tabId).classList.add('active');

    this.logDebug(`Tab changed to: ${tabId}`);

    // Om vi byter till diagram-fliken, se till att Mermaid renderar diagrammet
    if (tabId === 'diagram-tab') {
      this.initMermaidDiagram();
    }
  }

  /**
   * Tvinga fram Mermaid-diagram rendering
   */
  initMermaidDiagram() {
    if (window.mermaid) {
      try {
        // Fördröj renderingen något för att låta DOM:en uppdateras först
        setTimeout(() => {
          window.mermaid.contentLoaded();
          window.mermaid.init(undefined, document.querySelectorAll('.mermaid'));
          this.logDebug('Mermaid diagram re-initialized');
        }, 100);
      } catch (e) {
        console.error('Error initializing Mermaid diagram:', e);
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
  logDebug(message) {
    const timestamp = new Date().toISOString().substr(11, 8);
    console.log(`[${timestamp}] [Tabs] ${message}`);
  }
}
