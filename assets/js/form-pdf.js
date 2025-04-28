/**
 * FormPDF - Hanterar generering av PDF från sammanfattningen
 */
class FormPDF {
  constructor() {
    // Element
    this.downloadPDFBtn = document.getElementById('downloadPDF');
    this.summaryContent = document.getElementById('summaryContent');

    // Konstanter
    this.documentTitle = document.title || 'Process Sammanfattning';

    // Binds
    this.handleDownloadClick = this.handleDownloadClick.bind(this);
    this.generatePDF = this.generatePDF.bind(this);
    this.addRecommendationsToDoc = this.addRecommendationsToDoc.bind(this);
    this.addQuestionAnswersToDoc = this.addQuestionAnswersToDoc.bind(this);
  }

  /**
   * Initialisera modulen
   */
  init() {
    if (this.downloadPDFBtn) {
      this.downloadPDFBtn.addEventListener('click', this.handleDownloadClick);
      this.logDebug('FormPDF initialized');
    } else {
      this.logDebug('Download PDF button not found');
    }
  }

  /**
   * Hantera klick på nedladdningsknappen
   */
  handleDownloadClick() {
    this.logDebug('Download button clicked');
    this.generatePDF();
  }

  /**
   * Generera och ladda ner PDF
   */
  generatePDF() {
    // Se till att jsPDF är laddat
    if (typeof window.jspdf === 'undefined') {
      alert('PDF-biblioteket kunde inte laddas. Försök igen senare.');
      return;
    }

    this.logDebug('Generating PDF...');
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Titel
    doc.setFontSize(18);
    doc.text(this.documentTitle, pageWidth / 2, 20, { align: 'center' });

    // Innehåll
    doc.setFontSize(12);
    let yPos = 40;

    // Hämta sektioner från sammanfattningen
    const sectionHeaders = this.summaryContent.querySelectorAll('h3');

    if (sectionHeaders.length === 0) {
      this.logDebug('No sections found in summary');
      // Om det inte finns några sektioner, lägg till ett meddelande
      doc.text("Ingen sammanfattning tillgänglig. Gör val i formuläret först.", 20, yPos);
    } else {
      // Process each section
      sectionHeaders.forEach(header => {
        // Sektionsrubrik
        const sectionTitle = header.textContent;
        doc.setFont(undefined, 'bold');
        doc.text(sectionTitle, 20, yPos);
        doc.setFont(undefined, 'normal');
        yPos += 10;

        // Hämta sektionens parent-div
        const sectionDiv = header.parentElement;

        // Rekommendationer (första UL-elementet efter rubriken)
        yPos = this.addRecommendationsToDoc(doc, sectionDiv, pageWidth, yPos);

        // Frågor och svar (alla DIV-element med className 'mb-3')
        yPos = this.addQuestionAnswersToDoc(doc, sectionDiv, pageWidth, yPos);

        // Kontrollera om vi behöver ny sida
        if (yPos > 270) {
          doc.addPage();
          yPos = 20;
        }
      });
    }

    // Spara PDF
    doc.save('process-sammanfattning.pdf');
    this.logDebug('PDF generated and saved');
  }

  /**
   * Lägg till rekommendationer i PDF-dokumentet
   */
  addRecommendationsToDoc(doc, sectionDiv, pageWidth, yPos) {
    const recList = sectionDiv.querySelector('ul');
    if (recList && recList.children.length > 0) {
      const recommendations = recList.querySelectorAll('li');
      recommendations.forEach(rec => {
        doc.setTextColor(0, 100, 0); // Grön text för rekommendationer
        const recText = rec.textContent.trim();

        // Hantera långa texter med wrapped text
        const textLines = doc.splitTextToSize(recText, pageWidth - 50);
        doc.text("• " + textLines[0], 25, yPos);
        yPos += 6;

        // Om det finns fler rader, lägg till dem
        if (textLines.length > 1) {
          for (let i = 1; i < textLines.length; i++) {
            doc.text("  " + textLines[i], 25, yPos);
            yPos += 6;
          }
        }
      });

      doc.setTextColor(0, 0, 0); // Återställ textfärg
      yPos += 5; // Extra utrymme efter rekommendationer
    }

    return yPos;
  }

  /**
   * Lägg till frågor och svar i PDF-dokumentet
   */
  addQuestionAnswersToDoc(doc, sectionDiv, pageWidth, yPos) {
    const questionDivs = sectionDiv.querySelectorAll('div.mb-3');
    questionDivs.forEach(questionDiv => {
      // Frågetext
      const questionHeader = questionDiv.querySelector('h4');
      if (questionHeader) {
        const questionText = questionHeader.textContent;
        doc.setFont(undefined, 'italic');

        // Hantera långa frågor
        const questionLines = doc.splitTextToSize(questionText, pageWidth - 50);
        doc.text(questionLines, 25, yPos);
        yPos += 6 * questionLines.length;

        doc.setFont(undefined, 'normal');
      }

      // Svarsalternativ
      const answers = questionDiv.querySelectorAll('li');
      answers.forEach(answer => {
        const answerText = answer.textContent.trim();

        // Hantera långa svar
        const answerLines = doc.splitTextToSize(answerText, pageWidth - 60);
        doc.text("- " + answerLines[0], 30, yPos);
        yPos += 6;

        // Om det finns fler rader, lägg till dem
        if (answerLines.length > 1) {
          for (let i = 1; i < answerLines.length; i++) {
            doc.text("  " + answerLines[i], 30, yPos);
            yPos += 6;
          }
        }
      });

      yPos += 5; // Extra utrymme efter svar
    });

    return yPos;
  }

  /**
   * Hjälpmetod för loggning med tidstämpel
   */
  logDebug(message) {
    const timestamp = new Date().toISOString().substr(11, 8);
    console.log(`[${timestamp}] [PDF] ${message}`);
  }
}
