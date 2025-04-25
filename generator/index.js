const fs = require('fs');
const ejs = require('ejs');
const input = fs.readFileSync('./form-definition.mmd', 'utf-8');

// Ladda din EJS-template
const template = fs.readFileSync('./templates/form-template.ejs', 'utf-8');

// Enhanced debugging function
function debugLog(stage, data) {
  console.log(`\n=== DEBUG: ${stage} ===`);
  console.log(JSON.stringify(data, (key, value) => {
    // Handle circular references and Sets
    if (key === 'questions' && Array.isArray(value)) {
      return value.map(q => ({id: q.id, text: q.text, answerCount: q.answers ? q.answers.length : 0}));
    }
    if (value instanceof Set) {
      return [...value];
    }
    return value;
  }, 2));
}

function parseNodes(mermaid) {
  const lines = mermaid.split('\n');
  console.log(`Parsing ${lines.length} lines from Mermaid file`);

  // Extrahera alla noder, frågor och kanter
  const nodes = {};
  const edges = [];

  // Först, identifiera alla noder
  console.log("Starting node identification...");
  lines.forEach((line, index) => {
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
      console.log(`Line ${index+1}: Found section ${id}: "${title.trim()}"`);
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
      console.log(`Line ${index+1}: Found question ${id}: "${text.trim()}"`);
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
      console.log(`Line ${index+1}: Found recommendation ${id}: "${text.trim()}"`);
      return;
    }
  });

  debugLog("All identified nodes",
    Object.entries(nodes).map(([id, node]) => ({
      id,
      type: node.type,
      text: node.type === 'section' ? node.title : node.text || 'N/A'
    }))
  );

  // Sedan, identifiera alla kopplingar
  console.log("\nStarting edge identification...");
  lines.forEach((line, index) => {
    line = line.trim();
    if (!line) return;

    // Matcha envalskanter med etikett: B -->|Ja| C
    const singleChoiceLabelMatch = line.match(/(\w+)\s*-->\s*\|(.*?)\|\s*(\w+)/);
    if (singleChoiceLabelMatch) {
      const [, from, label, to] = singleChoiceLabelMatch;
      edges.push({ from, to, label: label.trim(), multiple: false });
      console.log(`Line ${index+1}: Found single-choice edge: ${from} --|${label.trim()}|--> ${to}`);
      return;
    }

    // Matcha enkla pilar utan etikett: A --> B
    const simpleArrowMatch = line.match(/(\w+)\s*-->\s*(\w+)/);
    if (simpleArrowMatch && !singleChoiceLabelMatch) {
      const [, from, to] = simpleArrowMatch;
      edges.push({ from, to, label: '', multiple: false });
      console.log(`Line ${index+1}: Found simple edge: ${from} --> ${to}`);
      return;
    }

    // Matcha flervalskanter: R -.->|Deltagare skapar egna förslag| S
    const multiChoiceMatch = line.match(/(\w+)\s*-\.?->\s*\|(.*?)\|\s*(\w+)/);
    if (multiChoiceMatch) {
      const [, from, label, to] = multiChoiceMatch;
      edges.push({ from, to, label: label.trim(), multiple: true });
      console.log(`Line ${index+1}: Found multi-choice edge: ${from} -.-|${label.trim()}|--> ${to}`);
    }
  });

  debugLog("All identified edges", edges);

  // Identifiera sektioner och direkta frågor
  console.log("\nMapping sections to questions...");
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
        console.log(`Mapped section ${fromNode.id} to question ${toNode.id}`);
      }
    }
  });

  debugLog("Section to question mapping", sectionQuestionMap);

  // Hitta indirekta kopplingar (sektion -> mellanliggande nod -> fråga)
  console.log("\nLooking for indirect connections...");
  edges.forEach(edge => {
    const fromNode = nodes[edge.from];
    const toNode = nodes[edge.to];

    if (fromNode && toNode && toNode.type === 'question') {
      // Leta efter sektioner som pekar på denna nod
      edges.filter(e => e.to === fromNode.id).forEach(innerEdge => {
        const possibleSection = nodes[innerEdge.from];
        if (possibleSection && possibleSection.type === 'section') {
          if (!sectionQuestionMap[possibleSection.id]) {
            sectionQuestionMap[possibleSection.id] = new Set();
          }
          if (!sectionQuestionMap[possibleSection.id].has(toNode.id)) {
            sectionQuestionMap[possibleSection.id].add(toNode.id);
            console.log(`Found indirect connection: section ${possibleSection.id} -> ${fromNode.id} -> question ${toNode.id}`);
          }
        }
      });
    }
  });

  // Associera frågor med svar
  console.log("\nAssociating questions with answers...");
  edges.forEach(edge => {
    const fromNode = nodes[edge.from];
    const toNode = nodes[edge.to];

    if (fromNode && fromNode.type === 'question') {
      // Här lägger vi till svaret i frågan
      const answer = {
        text: edge.label || "(välj)",
        targetId: edge.to,
        multiple: edge.multiple || false,
        recommendation: toNode && toNode.type === 'recommendation' ? toNode.text : null
      };

      fromNode.answers.push(answer);
      console.log(`Added answer "${answer.text}" to question ${fromNode.id}${answer.recommendation ? ` with recommendation: "${answer.recommendation}"` : ''}`);
    }
  });

  // Bygg upp sektioner med deras frågor
  console.log("\nBuilding section structures with questions...");
  Object.keys(sectionQuestionMap).forEach(sectionId => {
    const section = nodes[sectionId];
    sectionQuestionMap[sectionId].forEach(questionId => {
      if (nodes[questionId]) {
        section.questions.push(nodes[questionId]);
        console.log(`Added question ${questionId} to section ${sectionId}`);
      } else {
        console.warn(`WARNING: Question ${questionId} referenced but not found!`);
      }
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

  console.log(`\nFound ${sections.length} sections in total, ordered by number`);
  sections.forEach(section => {
    console.log(`- Section ${section.id}: "${section.title}" with ${section.questions.length} questions`);
    section.questions.forEach(question => {
      console.log(`  - Question: "${question.text}" with ${question.answers.length} answers`);
      question.answers.forEach(answer => {
        console.log(`    - Answer: "${answer.text}"${answer.recommendation ? ` -> "${answer.recommendation}"` : ''}`);
      });
    });
  });

  return { nodes, edges, sections };
}

// Skapa mappen om den inte finns
fs.mkdirSync('./public', { recursive: true });

// Analysera mermaid-data
console.log("\n==== Starting Mermaid diagram parsing ====");
const parsedData = parseNodes(input);

// Spara debugg-utdata till fil
fs.writeFileSync('./debug-output.json', JSON.stringify({
  sections: parsedData.sections.map(s => ({
    id: s.id,
    title: s.title,
    questions: s.questions.map(q => ({
      id: q.id,
      text: q.text,
      answers: q.answers
    }))
  }))
}, null, 2));
console.log("Debug information saved to debug-output.json");

// Använd EJS för att generera HTML
console.log("\nGenerating HTML with EJS template...");
const html = ejs.render(template, { parsedData });

fs.writeFileSync('./public/index.html', html);
console.log('Formulär genererat till public/index.html');
