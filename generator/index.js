const fs = require('fs');
const ejs = require('ejs');
const input = fs.readFileSync('./form-definition.mmd', 'utf-8');

// Ladda din EJS-template
const template = fs.readFileSync('./templates/form-template.ejs', 'utf-8');

function parseNodes(mermaid) {
  const lines = mermaid.split('\n');
  const nodes = [];
  const edges = [];
  const sections = [];
  const questions = [];
  const recommendations = [];

  // Mappning för att hålla koll på noder
  const nodeContents = {};

  lines.forEach(line => {
    line = line.trim();
    if (!line) return;

    // Matcha sektioner: A[**1 Typ av process**]
    const sectionMatch = line.match(/(\w+)\s*\[\*\*(.*?)\*\*\]/);
    if (sectionMatch) {
      const [, nodeId, title] = sectionMatch;
      sections.push({ id: nodeId, title: title.trim() });
      nodeContents[nodeId] = title.trim();
      return;
    }

    // Matcha frågor: B{Har processen tidsbestämda steg?}
    const questionMatch = line.match(/(\w+)\s*\{(.*?)\}/);
    if (questionMatch) {
      const [, nodeId, text] = questionMatch;
      questions.push({ id: nodeId, text: text.trim() });
      nodeContents[nodeId] = { type: 'question', text: text.trim() };
      nodes.push({ id: nodeId, type: 'question', text: text.trim() });
      return;
    }

    // Matcha rekommendationer/anvisningar: C[Skapa en Process]
    const recommendationMatch = line.match(/(\w+)\s*\[(.*?)\]/);
    if (recommendationMatch && !sectionMatch) {
      const [, nodeId, text] = recommendationMatch;
      recommendations.push({ id: nodeId, text: text.trim() });
      nodeContents[nodeId] = { type: 'recommendation', text: text.trim() };
      nodes.push({ id: nodeId, type: 'recommendation', text: text.trim() });
      return;
    }

    // Matcha envalskanter: B -->|Ja| C
    const singleChoiceMatch = line.match(/(\w+)\s*-->\s*\|(.*?)\|\s*(\w+)/);
    if (singleChoiceMatch) {
      const [, from, label, to] = singleChoiceMatch;
      edges.push({ from, to, label: label.trim(), multiple: false });
      return;
    }

    // Matcha enkla pilar: A --> B
    const simpleArrowMatch = line.match(/(\w+)\s*-->\s*(\w+)/);
    if (simpleArrowMatch) {
      const [, from, to] = simpleArrowMatch;
      edges.push({ from, to, multiple: false });
      return;
    }

    // Matcha flervalskanter: R -.->|Deltagare skapar egna förslag| S
    const multiChoiceMatch = line.match(/(\w+)\s*-\.?->\s*\|(.*?)\|\s*(\w+)/);
    if (multiChoiceMatch) {
      const [, from, label, to] = multiChoiceMatch;
      edges.push({ from, to, label: label.trim(), multiple: true });
      return;
    }
  });

  return { nodes, edges, sections, questions, recommendations };
}

function buildFormStructure(parsedData) {
  const { sections, questions, edges, recommendations } = parsedData;

  // Gruppera frågor och rekommendationer efter sektion
  const formStructure = [];

  // Skapa en mappning från frågans ID till själva frågan
  const questionsMap = {};
  questions.forEach(q => questionsMap[q.id] = q);

  // Skapa en mappning från rekommendationens ID till själva rekommendationen
  const recommendationsMap = {};
  recommendations.forEach(r => recommendationsMap[r.id] = r);

  // För varje sektion, hitta relaterade frågor och deras svarsalternativ
  sections.forEach(section => {
    const sectionData = {
      title: section.title,
      questions: []
    };

    // Hitta alla pilar som utgår från denna sektion
    const sectionEdges = edges.filter(e => e.from === section.id);
    sectionEdges.forEach(edge => {
      if (questionsMap[edge.to]) {
        // Om pilen går till en fråga
        const question = questionsMap[edge.to];

        // Hitta alla svarsalternativ för denna fråga
        const answers = edges.filter(e => e.from === question.id).map(e => {
          return {
            text: e.label || "Välj",
            target: e.to,
            multiple: e.multiple,
            recommendation: recommendationsMap[e.to] ? recommendationsMap[e.to].text : null
          };
        });

        sectionData.questions.push({
          id: question.id,
          text: question.text,
          answers: answers
        });
      }
    });

    formStructure.push(sectionData);
  });

  return formStructure;
}

// Skapa mappen om den inte finns
fs.mkdirSync('./public', { recursive: true });

// Analysera mermaid-data
const parsedData = parseNodes(input);

// Bygg formulärstruktur
const formStructure = buildFormStructure(parsedData);

// Använd EJS för att generera HTML
const html = ejs.render(template, {
  parsedData,
  formStructure,
  // Hjälpfunktion för att hitta rekommendation för ett svar
  getRecommendation: (to, recommendations, nodes) => {
    const recNode = nodes.find(n => n.id === to && n.type === 'recommendation');
    return recNode ? recNode.text : null;
  }
});

fs.writeFileSync('./public/index.html', html);
console.log('Formulär genererat till public/index.html');
