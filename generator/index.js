const fs = require('fs');
const ejs = require('ejs');
const input = fs.readFileSync('./form-definition.mmd', 'utf-8');

// Ladda din EJS-template
const template = fs.readFileSync('./templates/form-template.ejs', 'utf-8');

function parseNodes(mermaid) {
  // Spara den råa Mermaid-koden för visning i UI:t
  const rawMermaid = mermaid;

  // Extrahera titel om den finns
  let title = "Processskapare";
  const titleMatch = mermaid.match(/---\s*\ntitle:\s*(.*?)\s*\n---/s);
  if (titleMatch) {
    title = titleMatch[1].trim();
    // Ta bort titel-delen från mermaid-texten
    mermaid = mermaid.replace(/---\s*\ntitle:\s*.*?\s*\n---/s, '');
  }

  const lines = mermaid.split('\n');
  console.log(`Parsing ${lines.length} lines from Mermaid file`);

  // Extrahera alla noder, frågor och kanter
  const nodes = {};
  const edges = [];
  let currentSection = null;

  // Först, identifiera alla noder
  console.log("Starting node identification...");
  lines.forEach((line, index) => {
    line = line.trim();
    if (!line) {
      // Blank rad kan indikera ny sektion
      currentSection = null;
      return;
    }

    // Matcha sektioner: A[**1 Typ av process**]
    const sectionMatch = line.match(/(\w+)\s*\[\*\*(.*?)\*\*\]/);
    if (sectionMatch) {
      const [, id, title] = sectionMatch;
      nodes[id] = {
        id,
        type: 'section',
        title: title.trim(),
        questions: [],
        recommendations: [] // För att samla rekommendationer per sektion
      };
      currentSection = id;
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
        answers: [],
        section: currentSection,  // Koppla till nuvarande sektion om den finns
        dependencies: [], // För att hantera direkta beroenden
        indirectDependencies: [] // För att hantera indirekta beroenden via mellanliggande noder
      };
      console.log(`Line ${index+1}: Found question ${id}: "${text.trim()}"${currentSection ? ` (attached to section ${currentSection})` : ''}`);
      return;
    }

    // Matcha rekommendationer/svar: C[Skapa en Process]
    const recommendationMatch = line.match(/(\w+)\s*\[(.*?)\]/);
    if (recommendationMatch && !sectionMatch) {
      const [, id, text] = recommendationMatch;
      nodes[id] = {
        id,
        type: 'recommendation',
        text: text.trim(),
        section: currentSection // Koppla rekommendation till aktuell sektion
      };
      console.log(`Line ${index+1}: Found recommendation ${id}: "${text.trim()}"`);
      return;
    }
  });

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

  // Strategier för att koppla frågor till sektioner och identifiera beroenden
  // 1. Använd direkt sektion-till-fråga-koppling från edges
  // 2. Använd frågornas inbäddade sektionsreferens
  // 3. Använd indirekt koppling via mellanliggande noder

  // Strategi 1: Identifiera sektioner och direkta frågor
  console.log("\nMapping sections to questions using direct connections...");

  // Hitta direkta kopplingar från sektioner till frågor
  edges.forEach(edge => {
    const fromNode = nodes[edge.from];
    const toNode = nodes[edge.to];

    if (fromNode && toNode) {
      // Om från-noden är en sektion och till-noden är en fråga
      if (fromNode.type === 'section' && toNode.type === 'question') {
        console.log(`Mapped section ${fromNode.id} to question ${toNode.id} via direct connection`);
        if (!fromNode.questions.some(q => q.id === toNode.id)) {
          fromNode.questions.push(toNode);
        }
      }
    }
  });

  // Strategi 2: Använd frågornas inbäddade sektionsreferens
  console.log("\nMapping sections to questions using embedded section references...");
  Object.values(nodes).forEach(node => {
    if (node.type === 'question' && node.section && nodes[node.section]) {
      const section = nodes[node.section];
      // Kontrollera om frågan redan finns i sektionen (för att undvika dubbletter)
      if (!section.questions.some(q => q.id === node.id)) {
        section.questions.push(node);
        console.log(`Mapped section ${section.id} to question ${node.id} via embedded reference`);
      }
    }

    // Koppla rekommendationer till sektioner
    if (node.type === 'recommendation' && node.section && nodes[node.section]) {
      const section = nodes[node.section];
      section.recommendations.push(node);
      console.log(`Added recommendation ${node.id} to section ${section.id}`);
    }
  });

  // Strategi 3: Använd indirekt koppling via mellanliggande noder
  console.log("\nMapping sections to questions using indirect connections...");
  edges.forEach(edge => {
    const fromNode = nodes[edge.from];

    if (fromNode && fromNode.type === 'section') {
      // Hitta alla noder som denna sektion pekar till
      const connectedNodes = edges
        .filter(e => e.from === fromNode.id)
        .map(e => nodes[e.to])
        .filter(n => n);  // Filtrera bort undefined

      // För varje ansluten nod, hitta frågor som den pekar till
      connectedNodes.forEach(intermediateNode => {
        edges
          .filter(e => e.from === intermediateNode.id)
          .forEach(secondaryEdge => {
            const targetNode = nodes[secondaryEdge.to];
            if (targetNode && targetNode.type === 'question') {
              // Kontrollera om frågan redan finns i sektionen (för att undvika dubbletter)
              if (!fromNode.questions.some(q => q.id === targetNode.id)) {
                fromNode.questions.push(targetNode);
                console.log(`Mapped section ${fromNode.id} to question ${targetNode.id} via intermediate node ${intermediateNode.id}`);
              }
            }
          });
      });
    }
  });

  // Identifiera direkta beroenden mellan frågor
  console.log("\nIdentifying direct dependencies between questions...");
  edges.forEach(edge => {
    const fromNode = nodes[edge.from];
    const toNode = nodes[edge.to];

    // Om en fråga leder till en annan fråga med ett visst svar, är det ett direkt beroende
    if (fromNode && fromNode.type === 'question' &&
        toNode && toNode.type === 'question' &&
        edge.label) {

      console.log(`Found direct dependency: question ${toNode.id} depends on answer "${edge.label}" from question ${fromNode.id}`);

      // Lägg till beroendeinformation till målfrågan
      toNode.dependencies.push({
        questionId: fromNode.id,
        answer: edge.label,
        multiple: edge.multiple || false
      });
    }
  });

  // Identifiera indirekta beroenden via mellanliggande noder (t.ex. rekommendationer)
  console.log("\nIdentifying indirect dependencies through intermediate nodes...");

  // Skapa en hjälpfunktion för att hitta kedjor av beroenden
  function findDependencyChains(questionId, answerText, intermediateNodeId) {
    // Hitta alla noder som den mellanliggande noden pekar till
    const onwardEdges = edges.filter(e => e.from === intermediateNodeId);

    onwardEdges.forEach(edge => {
      const targetNode = nodes[edge.to];

      // Om målnoden är en fråga, har vi hittat en beroendekedja
      if (targetNode && targetNode.type === 'question') {
        console.log(`Found indirect dependency: question ${targetNode.id} depends on answer "${answerText}" from question ${questionId} via ${intermediateNodeId}`);

        // Lägg till det indirekta beroendet
        targetNode.indirectDependencies.push({
          questionId: questionId,
          answer: answerText,
          multiple: false, // Indirekta beroenden är inte flerval
          via: intermediateNodeId
        });
      }

      // Fortsätt leta längre i kedjan (om det finns ännu längre kedjor)
      if (targetNode && targetNode.type !== 'question') {
        findDependencyChains(questionId, answerText, targetNode.id);
      }
    });
  }

  // Gå igenom alla kopplingar från frågor till icke-frågor (rekommendationer, etc)
  edges.forEach(edge => {
    const fromNode = nodes[edge.from];
    const toNode = nodes[edge.to];

    // Om en fråga leder till en icke-fråga med ett svarsalternativ
    if (fromNode && fromNode.type === 'question' &&
        toNode && toNode.type !== 'question' &&
        toNode.type !== 'section' &&
        edge.label) {

      // Sök efter kedjor av beroenden från denna mellanliggande nod
      findDependencyChains(fromNode.id, edge.label, toNode.id);
    }
  });

  // Associera frågor med svar och rekommendationer
  console.log("\nAssociating questions with answers and recommendations...");
  edges.forEach(edge => {
    const fromNode = nodes[edge.from];
    const toNode = nodes[edge.to];

    if (fromNode && fromNode.type === 'question') {
      // Hoppa över kanter utan etikett (label) som går till frågor
      // Dessa är troligen bara strukturella kopplingar, inte faktiska svarsalternativ
      if (!edge.label && toNode && toNode.type === 'question') {
        return;
      }

      // Här lägger vi till svaret i frågan
      const answer = {
        text: edge.label || "(välj)",
        targetId: edge.to,
        multiple: edge.multiple || false,
        recommendation: toNode && toNode.type === 'recommendation' ? toNode.text : null
      };

      fromNode.answers.push(answer);
      console.log(`Added answer "${answer.text}" to question ${fromNode.id}${answer.recommendation ? ` with recommendation: "${answer.recommendation}"` : ''}`);

      // Samla rekommendationer per sektion
      if (answer.recommendation && fromNode.section) {
        const section = nodes[fromNode.section];
        if (section && !section.recommendations.some(r => r.text === answer.recommendation)) {
          section.recommendations.push({
            type: 'derived',
            text: answer.recommendation,
            from: {
              question: fromNode.id,
              answer: answer.text
            }
          });
          console.log(`Added derived recommendation "${answer.recommendation}" to section ${section.id}`);
        }
      }
    }
  });

  // Sortera frågorna i varje sektion baserat på beroenden
  Object.values(nodes)
    .filter(node => node.type === 'section')
    .forEach(section => {
      if (section.questions.length <= 1) return;

      // Sortera så att frågor utan beroenden kommer först, sedan de med beroenden
      section.questions.sort((a, b) => {
        const aDeps = (a.dependencies ? a.dependencies.length : 0) +
                     (a.indirectDependencies ? a.indirectDependencies.length : 0);
        const bDeps = (b.dependencies ? b.dependencies.length : 0) +
                     (b.indirectDependencies ? b.indirectDependencies.length : 0);
        return aDeps - bDeps;
      });

      console.log(`Sorted questions in section ${section.id} based on dependencies`);
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
    console.log(`- Section ${section.id}: "${section.title}" with ${section.questions.length} questions and ${section.recommendations.length} recommendations`);
    section.questions.forEach(question => {
      const totalDeps = (question.dependencies ? question.dependencies.length : 0) +
                        (question.indirectDependencies ? question.indirectDependencies.length : 0);

      console.log(`  - Question: "${question.text}" with ${question.answers.length} answers and ${totalDeps} total dependencies`);

      if (question.dependencies && question.dependencies.length > 0) {
        question.dependencies.forEach(dep => {
          console.log(`    - Direct dependency: Depends on question ${dep.questionId} with answer "${dep.answer}"`);
        });
      }

      if (question.indirectDependencies && question.indirectDependencies.length > 0) {
        question.indirectDependencies.forEach(dep => {
          console.log(`    - Indirect dependency: Depends on question ${dep.questionId} with answer "${dep.answer}" via ${dep.via}`);
        });
      }

      question.answers.forEach(answer => {
        console.log(`    - Answer: "${answer.text}"${answer.recommendation ? ` -> "${answer.recommendation}"` : ''}`);
      });
    });
  });

  return { title, rawMermaid, nodes, edges, sections };
}

// Skapa mappen om den inte finns
fs.mkdirSync('./public', { recursive: true });
fs.mkdirSync('./public/assets', { recursive: true });
fs.mkdirSync('./public/assets/js', { recursive: true });

// Analysera mermaid-data
console.log("\n==== Starting Mermaid diagram parsing ====");
const parsedData = parseNodes(input);

// Spara debugg-utdata till fil
fs.writeFileSync('./debug-output.json', JSON.stringify({
  title: parsedData.title,
  rawMermaid: parsedData.rawMermaid,
  sections: parsedData.sections.map(s => ({
    id: s.id,
    title: s.title,
    recommendations: s.recommendations,
    questions: s.questions.map(q => ({
      id: q.id,
      text: q.text,
      dependencies: q.dependencies || [],
      indirectDependencies: q.indirectDependencies || [],
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

// Kopiera externa JavaScript-filer om de finns
const jsFiles = [
  { src: './assets/js/form-dependencies.js', dest: './public/assets/js/form-dependencies.js' },
  { src: './assets/js/form-summary.js', dest: './public/assets/js/form-summary.js' },
  { src: './assets/js/form-pdf.js', dest: './public/assets/js/form-pdf.js' },
  { src: './assets/js/tabs.js', dest: './public/assets/js/tabs.js' },
  { src: './assets/js/main.js', dest: './public/assets/js/main.js' }
];

jsFiles.forEach(file => {
  try {
    if (fs.existsSync(file.src)) {
      fs.copyFileSync(file.src, file.dest);
      console.log(`Copied ${file.src} to ${file.dest}`);
    } else {
      console.log(`Warning: ${file.src} does not exist, skipping copy.`);
    }
  } catch (err) {
    console.error(`Error copying ${file.src}: ${err.message}`);
  }
});
