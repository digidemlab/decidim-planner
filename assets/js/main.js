/**
 * Huvudskript för procesformulär
 */
document.addEventListener('DOMContentLoaded', function() {
  // Initialisera formulärets beroendemodul
  const formDependencies = new FormDependencies();
  formDependencies.init();

  // Initialisera sammanfattningsmodulen
  const formSummary = new FormSummary();
  formSummary.init();

  // Initialisera PDF-modulen
  const formPDF = new FormPDF();
  formPDF.init();

  // Initialisera tab-hanteringsmodulen
  const tabHandler = new TabHandler();
  tabHandler.init();

  // Logga att allt är laddat och klart
  console.log('Formulärapplikation initialiserad och redo.');
});
