/**
 * FormSummary - Hanterar sammanfattning av användarens val
 */
class FormSummary {
  constructor() {
    // Element
    this.form = document.getElementById('processForm');
    this.summarizeBtn = document.getElementById('summarizeBtn');
    this.summaryDiv = document.getElementById('summary');
    this.summaryContent = document.getElementById('summaryContent');

    // Binds
    this.handleSummarizeClick = this.handleSummarizeClick.bind(this);
  }

  /**
   * Initialisera modulen
   */
  init() {
    if (this.summarizeBtn) {
      this.summarizeBtn.addEventListener('click', this.handleSummarizeClick);
    }
    this.logDebug('FormSummary initialized');
  }

  /**
   * Hantera klick på sammanfattningsknappen
   */
  handleSummarizeClick() {
    const sectionSummary = this.collectFormData();
    this.renderSummary(sectionSummary);
  }

  /**
   * Samla in all data från formuläret
   */
  collectFormData() {
    // Samla ihop valda alternativ och rekommendationer per sektion
    const sectionSummary = {};

    // Först, initiera sektioner
    document.querySelectorAll('.section').forEach(section => {
      const sectionId = section.id.replace('section-', '');
      const sectionTitle = section.querySelector('h2').textContent;
      sectionSummary[sectionId] = {
        title: sectionTitle,
        answers: [],
        recommendations: new Set() // Använd Set för att undvika duplicerade rekommendationer
      };
    });

    // Samla svar och rekommendationer från formuläret
    this.collectCheckedInputs(sectionSummary);
    this.collectTextareaInputs(sectionSummary);

    return sectionSummary;
  }

  /**
   * Samla in valda kryssrutor och radioknappar
   */
  collectCheckedInputs(sectionSummary) {
    const checkedInputs = this.form.querySelectorAll('input:checked');
    checkedInputs.forEach(input => {
      const questionContainer = input.closest('.question-container');
      if (!questionContainer || questionContainer.classList.contains('hidden-question')) {
        return; // Skippa dolda frågor
      }

      const questionId = input.getAttribute('data-question-id');
      const questionText = questionContainer.querySelector('h3').textContent;
      const answerText = input.getAttribute('data-answer-text');
      const sectionElement = questionContainer.closest('.section');
      const sectionId = sectionElement.id.replace('section-', '');

      // Lägg till svaret i rätt sektion
      sectionSummary[sectionId].answers.push({
        question: questionText,
        answer: answerText
      });

      // Kolla om det finns en rekommendation kopplad till svaret
      const label = input.nextElementSibling;
      if (label) {
        const recommendationSpan = label.querySelector('span');
        if (recommendationSpan) {
          const recommendationText = recommendationSpan.textContent.trim();
          sectionSummary[sectionId].recommendations.add(recommendationText);
        }
      }
    });
  }

  /**
   * Samla in textfältssvar
   */
  collectTextareaInputs(sectionSummary) {
    const filledTextareas = this.form.querySelectorAll('textarea');
    filledTextareas.forEach(textarea => {
      if (!textarea.value.trim() || textarea.closest('.question-container').classList.contains('hidden-question')) {
        return; // Skippa tomma eller dolda textfält
      }

      const questionContainer = textarea.closest('.question-container');
      const questionText = questionContainer.querySelector('h3').textContent;
      const sectionElement = questionContainer.closest('.section');
      const sectionId = sectionElement.id.replace('section-', '');

      // Lägg till svaret i rätt sektion
      sectionSummary[sectionId].answers.push({
        question: questionText,
        answer: textarea.value.trim()
      });
    });
  }

  /**
   * Rendera sammanfattningen till DOM
   */
  renderSummary(sectionSummary) {
    this.summaryContent.innerHTML = '';
    let hasSummaryContent = false;

    // Gå igenom sektionerna i ordning
    const sections = document.querySelectorAll('.section');
    sections.forEach(sectionElement => {
      const sectionId = sectionElement.id.replace('section-', '');
      const sectionData = sectionSummary[sectionId];

      if (sectionData.answers.length > 0 || sectionData.recommendations.size > 0) {
        hasSummaryContent = true;

        // Skapa sektionsrubrik
        const sectionDiv = document.createElement('div');
        sectionDiv.className = 'mb-6';

        const sectionHeader = document.createElement('h3');
        sectionHeader.className = 'text-xl font-bold mb-3';
        sectionHeader.textContent = sectionData.title;
        sectionDiv.appendChild(sectionHeader);

        // Lägg till rekommendationer om de finns
        if (sectionData.recommendations.size > 0) {
          const recList = this.createRecommendationsList(sectionData.recommendations);
          sectionDiv.appendChild(recList);
        }

        // Lägg till svar om de finns
        if (sectionData.answers.length > 0) {
          this.createAnswersSections(sectionData.answers, sectionDiv);
        }

        this.summaryContent.appendChild(sectionDiv);

        // Lägg till avdelare mellan sektioner om det inte är sista sektionen
        if (sectionElement !== sections[sections.length - 1]) {
          const divider = document.createElement('hr');
          divider.className = 'my-4 border-gray-300';
          this.summaryContent.appendChild(divider);
        }
      }
    });

    if (!hasSummaryContent) {
      this.summaryContent.innerHTML = '<p class="text-red-600">Inga val har gjorts. Vänligen välj alternativ i formuläret.</p>';
    }

    // Visa sammanfattningsdelen
    this.summaryDiv.classList.remove('hidden');

    // Scrolla till sammanfattningen
    this.summaryDiv.scrollIntoView({ behavior: 'smooth' });
  }

  /**
   * Skapa en lista med rekommendationer
   */
  createRecommendationsList(recommendations) {
    const recList = document.createElement('ul');
    recList.className = 'list-disc pl-6 mb-4';

    [...recommendations].forEach(rec => {
      const recItem = document.createElement('li');
      recItem.className = 'text-green-700 mb-2';
      recItem.textContent = rec;
      recList.appendChild(recItem);
    });

    return recList;
  }

  /**
   * Skapa sektioner för svar grupperade per fråga
   */
  createAnswersSections(answers, parentElement) {
    // Gruppera svar efter fråga
    const questionGroups = {};
    answers.forEach(item => {
      if (!questionGroups[item.question]) {
        questionGroups[item.question] = [];
      }
      questionGroups[item.question].push(item.answer);
    });

    // Skapa listor med svar per fråga
    Object.entries(questionGroups).forEach(([question, answers]) => {
      const questionDiv = document.createElement('div');
      questionDiv.className = 'mb-3';

      const questionHeader = document.createElement('h4');
      questionHeader.className = 'font-semibold';
      questionHeader.textContent = question;
      questionDiv.appendChild(questionHeader);

      const answersList = document.createElement('ul');
      answersList.className = 'list-disc pl-6 mb-2';

      answers.forEach(answer => {
        const answerItem = document.createElement('li');
        answerItem.textContent = answer;
        answersList.appendChild(answerItem);
      });

      questionDiv.appendChild(answersList);
      parentElement.appendChild(questionDiv);
    });
  }

  /**
   * Hjälpmetod för loggning med tidstämpel
   */
  logDebug(message) {
    const timestamp = new Date().toISOString().substr(11, 8);
    console.log(`[${timestamp}] [Summary] ${message}`);
  }
}
