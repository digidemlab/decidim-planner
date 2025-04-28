/**
 * FormDependencies - Hanterar visning och döljer frågor baserat på beroendeförhållanden
 */
class FormDependencies {
  constructor() {
    // Element
    this.allInputs = document.querySelectorAll('.answer-input');
    this.allQuestions = document.querySelectorAll('.question-container');

    // State
    this.formState = {
      selectedAnswers: {}
    };

    // Konstanter
    this.MAX_ITERATIONS = 10; // Säkerhet för att undvika oändliga loopar

    // Binds
    this.handleInputChange = this.handleInputChange.bind(this);
  }

  /**
   * Initialisera moduleN
   */
  init() {
    this.setupEventListeners();
    this.updateFormState();
    this.updateQuestionVisibility();
    this.logDebug('FormDependencies initialized');
  }

  /**
   * Sätt upp eventlyssnare
   */
  setupEventListeners() {
    this.allInputs.forEach(input => {
      input.addEventListener('change', this.handleInputChange);
    });
  }

  /**
   * Hantera ändringar i inputs
   */
  handleInputChange() {
    this.updateFormState();
    this.updateQuestionVisibility();
  }

  /**
   * Uppdatera formulärets state baserat på valda alternativ
   */
  updateFormState() {
    this.formState.selectedAnswers = {};

    // Samla alla valda alternativ från formuläret
    this.allInputs.forEach(input => {
      if (input.checked) {
        const questionId = input.getAttribute('data-question-id');
        const answerText = input.getAttribute('data-answer-text');

        if (!this.formState.selectedAnswers[questionId]) {
          this.formState.selectedAnswers[questionId] = [];
        }

        this.formState.selectedAnswers[questionId].push(answerText);
      }
    });

    this.logDebug('Form state updated: ' + JSON.stringify(this.formState.selectedAnswers));
  }

  /**
   * Kontrollera om en fråga ska visas baserat på dess beroenden
   */
  shouldShowQuestion(question) {
    const dependenciesJSON = question.getAttribute('data-dependencies');
    if (!dependenciesJSON || dependenciesJSON === '[]') {
      return true; // Frågor utan beroenden är alltid synliga
    }

    const dependencies = JSON.parse(dependenciesJSON);
    if (dependencies.length === 0) {
      return true;
    }

    // Kontrollera om alla beroenden är uppfyllda
    return dependencies.every(dep => {
      const dependentQuestionId = dep.questionId;
      const requiredAnswer = dep.answer;

      // Kolla om det finns svar på beroendefrågans fråga
      const answersForQuestion = this.formState.selectedAnswers[dependentQuestionId] || [];

      // Kolla om det krävda svaret finns bland de valda svaren
      const hasSatisfiedDependency = answersForQuestion.includes(requiredAnswer);

      this.logDebug(`Checking dependency for question ${question.id}: ${dependentQuestionId} expects "${requiredAnswer}", found: ${hasSatisfiedDependency}`);

      return hasSatisfiedDependency;
    });
  }

  /**
   * Uppdatera synlighet för alla frågor
   */
  updateQuestionVisibility() {
    this.logDebug('Updating question visibility...');

    // Först behöver vi kolla i flera omgångar eftersom dolda frågor kan skapa kedjeeffekter
    // när deras svar rensas (t.ex. fråga C beror på B som beror på A)

    let changed = true;
    let iterations = 0;

    while (changed && iterations < this.MAX_ITERATIONS) {
      iterations++;
      changed = false;

      this.allQuestions.forEach(question => {
        const questionId = question.id.replace('question-', '');
        const shouldShow = this.shouldShowQuestion(question);
        const isCurrentlyShown = !question.classList.contains('hidden-question');

        // Om visningsstatusen behöver ändras
        if (shouldShow !== isCurrentlyShown) {
          changed = true;

          if (shouldShow) {
            question.classList.remove('hidden-question');
            this.logDebug(`Showing question ${questionId}`);
          } else {
            question.classList.add('hidden-question');
            this.logDebug(`Hiding question ${questionId}`);

            // Om vi döljer en fråga, rensa dess svar
            const inputs = question.querySelectorAll('input');
            let hadCheckedInputs = false;

            inputs.forEach(input => {
              if (input.checked) {
                hadCheckedInputs = true;
                input.checked = false;
              }
            });

            const textareas = question.querySelectorAll('textarea');
            textareas.forEach(textarea => {
              if (textarea.value) {
                hadCheckedInputs = true;
                textarea.value = '';
              }
            });

            // Om vi rensade några svar, uppdatera formState
            if (hadCheckedInputs) {
              this.updateFormState();
            }
          }
        }
      });

      this.logDebug(`Visibility update iteration ${iterations}, changes: ${changed}`);
    }
  }

  /**
   * Hjälpmetod för loggning med tidstämpel
   */
  logDebug(message) {
    const timestamp = new Date().toISOString().substr(11, 8);
    console.log(`[${timestamp}] [Dependencies] ${message}`);
  }
}
