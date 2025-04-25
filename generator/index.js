const fs = require('fs');
const ejs = require('ejs');  // Lägg till EJS
const input = fs.readFileSync('./form-definition.mmd', 'utf-8');

// Ladda din EJS-template
const template = fs.readFileSync('./templates/form-template.ejs', 'utf-8');

function parseNodes(mermaid) {
  const lines = mermaid.split('\n');
  const nodes = [];
  const edges = [];
  const recommendations = [];

  lines.forEach(line => {
    const questionMatch = line.match(/(\w+)\s*\{(.*?)\}/);
    if (questionMatch) {
      const [, node, question] = questionMatch;
      nodes.push({ node, question: question.trim() });
    }

    const answerMatch = line.match(/(\w+)\s*\|\|(.*?)\|\|/);
    if (answerMatch) {
      const [, from, answer] = answerMatch;
      edges.push({ from, label: answer.trim() });
    }

    const recommendationMatch = line.match(/(\w+)\s*\[(.*?)\]/);
    if (recommendationMatch) {
      const [, node, recommendation] = recommendationMatch;
      recommendations.push(recommendation.trim());
    }

    const singleChoiceMatch = line.match(/(\w+)\s*-->\s*(\w+)/);
    if (singleChoiceMatch) {
      const [, from, to] = singleChoiceMatch;
      edges.push({ from, to });
    }

    const multiChoiceMatch = line.match(/(\w+)\s*-\.->\s*(\w+)/);
    if (multiChoiceMatch) {
      const [, from, to] = multiChoiceMatch;
      edges.push({ from, to, multiple: true });
    }
  });

  return { edges, nodes, recommendations };
}

function generateForm({ edges, nodes, recommendations }) {
  // Använd EJS för att generera HTML
  const html = ejs.render(template, { nodes, edges, recommendations });
  return html;
}

// Skapa mappen om den inte finns
fs.mkdirSync('./public', { recursive: true });

// Skriva HTML-fil
const parsed = parseNodes(input);
const html = generateForm(parsed);
fs.writeFileSync('./public/index.html', html);
console.log('Formulär genererat till public/index.html');
