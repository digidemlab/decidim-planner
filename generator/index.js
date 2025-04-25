const fs = require('fs');
const ejs = require('ejs');
const input = fs.readFileSync('./form-definition.mmd', 'utf-8');

// Ladda din EJS-template
const template = fs.readFileSync('./templates/form-template.ejs', 'utf-8');

function parseNodes(mermaid) {
  const lines = mermaid.split('\n');

  // Extrahera alla noder, frågor och kanter
  const nodes = {};
  const edges = [];

  // Först, identifiera alla noder
  lines.forEach(line => {
    line = line.trim();
    if (!line) return;

    // Matcha sektioner: A[**1 Typ av process**]
    const sectionMatch = line.match(/(\w+)\s*\[\*\*(.*?)\*\*\]/);
    if (sectionMatch) {
      const [, id, title] = sectionMatch;
      nodes[id] = {
        id,
        type: 'section',
        title: title.trim(),
        questions: []
      };
      return;
    }

    // Matcha frågor: B{Har processen tidsbestämda steg?}
    const questionMatch = line.match(/(\w+)\s*\{(.*?)\}/);
    if (questionMatch) {
      const [, id, text] = questionMatch;
      nodes[id] = {
        id,
        type: 'question',
        text: text.trim(),
        answers: []
      };
      return;
    }

    // Matcha rekommendationer/svar: C[Skapa en Process]
    const recommendationMatch = line.match(/(\w+)\s*\[(.*?)\]/);
    if (recommendationMatch && !sectionMatch) {
      const [, id, text] = recommendationMatch;
      nodes[id] = {
        id,
        type: 'recommendation',
        text: text.trim()
      };
    }
  });

  // Sedan, identifiera alla kopplingar
  lines.forEach(line => {
    line = line.trim();
    if (!line) return;

    // Matcha envalskanter med etikett: B -->|Ja| C
    const singleChoiceLabelMatch = line.match(/(\w+)\s*-->\s*\|(.*?)\|\s*(\w+)/);
    if (singleChoiceLabelMatch) {
      const [, from, label, to] = singleChoiceLabelMatch;
      edges.push({ from, to, label: label.trim(), multiple: false });
      return;
    }

    // Matcha enkla pilar utan etikett: A --> B
    const simpleArrowMatch = line.match(/(\w+)\s*-->\s*(\w+)/);
    if (simpleArrowMatch && !singleChoiceLabelMatch) {
      const [, from, to] = simpleArrowMatch;
      edges.push({ from, to, label: '', multiple: false });
      return;
    }

    // Matcha flervalskanter: R -.->|Deltagare skapar egna förslag| S
    const multiChoiceMatch = line.match(/(\w+)\s*-\.?->\s*\|(.*?)\|\s*(\w+)/);
    if (multiChoiceMatch) {
      const [, from, label, to] = multiChoiceMatch;
      edges.push({ from, to, label: label.trim(), multiple: true });
    }
  });

  // Identifiera sektioner och direkta frågor
  const sectionQuestionMap = {};

  // Först, hitta direkta kopplingar från sektioner till frågor
  edges.forEach(edge => {
    const fromNode = nodes[edge.from];
    const toNode = nodes[edge.to];

    if (fromNode && toNode) {
      // Om från-noden är en sektion och till-noden är en fråga
      if (fromNode.type === 'section' && toNode.type === 'question') {
        if (!sectionQuestionMap[fromNode.id]) {
          sectionQuestionMap[fromNode.id] = new Set();
        }
        sectionQuestionMap[fromNode.id].add(toNode.id);
      }
    }
  });

  // Associera frågor med svar
  edges.forEach(edge => {
    const fromNode = nodes[edge.from];
    const toNode = nodes[edge.to];

    if (fromNode && fromNode.type === 'question' && edge.label) {
      // Här lägger vi till svaret i frågan
      fromNode.answers.push({
        text: edge.label,
        targetId: edge.to,
        multiple: edge.multiple || false,
        recommendation: toNode && toNode.type === 'recommendation' ? toNode.text : null
      });
    }
  });

  // Bygg upp sektioner med deras frågor
  Object.keys(sectionQuestionMap).forEach(sectionId => {
    const section = nodes[sectionId];
    sectionQuestionMap[sectionId].forEach(questionId => {
      section.questions.push(nodes[questionId]);
    });
  });

  // Skapa en lista med sektioner i rätt ordning
  const sections = Object.values(nodes)
    .filter(node => node.type === 'section')
    .sort((a, b) => {
      // Sortera efter sektionens nummer om det finns
      const aNum = parseInt((a.title.match(/^(\d+)/) || [])[1] || '0');
      const bNum = parseInt((b.title.match(/^(\d+)/) || [])[1] || '0');
      return aNum - bNum;
    });

  return { nodes, edges, sections };
}

// Skapa mappen om den inte finns
fs.mkdirSync('./public', { recursive: true });

// Analysera mermaid-data
const parsedData = parseNodes(input);

// Debugging: Logga strukturen för att se vad som händer
console.log('Sections:', parsedData.sections.map(s => ({
  id: s.id,
  title: s.title,
  questionCount: s.questions.length,
  questions: s.questions.map(q => q.id)
})));

// Använd EJS för att generera HTML
const html = ejs.render(template, { parsedData });

fs.writeFileSync('./public/index.html', html);
console.log('Formulär genererat till public/index.html');
