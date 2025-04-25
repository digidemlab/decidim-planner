const fs = require('fs');
const input = fs.readFileSync('./form-definition.mmd', 'utf-8');

function parseNodes(mermaid) {
  const lines = mermaid.split('\n');
  const nodes = new Set();
  const edges = [];
  const recommendations = [];

  lines.forEach(line => {
    // Fråga
    const questionMatch = line.match(/(\w+)\s*\{(.*?)\}/);
    if (questionMatch) {
      const [, node, question] = questionMatch;
      nodes.add({ node, question: question.trim() });
    }

    // Svarsalternativ
    const answerMatch = line.match(/(\w+)\s*\|\|(.*?)\|\|/);
    if (answerMatch) {
      const [, from, answer] = answerMatch;
      edges.push({ from, label: answer.trim() });
    }

    // Rekommendation
    const recommendationMatch = line.match(/(\w+)\s*\[(.*?)\]/);
    if (recommendationMatch) {
      const [, node, recommendation] = recommendationMatch;
      recommendations.push({ node, recommendation: recommendation.trim() });
    }

    // Envalsfråga
    const singleChoiceMatch = line.match(/(\w+)\s*-->\s*(\w+)/);
    if (singleChoiceMatch) {
      const [, from, to] = singleChoiceMatch;
      edges.push({ from, to });
    }

    // Flervalsfråga
    const multiChoiceMatch = line.match(/(\w+)\s*-\.->\s*(\w+)/);
    if (multiChoiceMatch) {
      const [, from, to] = multiChoiceMatch;
      edges.push({ from, to, multiple: true });
    }
  });

  return { edges, nodes: Array.from(nodes), recommendations };
}

function generateForm({ edges, nodes, recommendations }) {
  let html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Formulär från Mermaid</title>
  <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
  <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
</head>
<body class="p-4">
  <h1 class="text-2xl font-bold mb-4">Auto-genererat formulär</h1>
`;

  // Skapa formulär
  nodes.forEach(({ node, question }) => {
    html += `
    <section class="mb-6">
      <h2 class="text-xl font-semibold mb-2">${question}</h2>
      <form id="dynamicForm-${node}" class="space-y-4">
    `;

    // Lägg till svarsalternativ
    edges.forEach(edge => {
      if (edge.from === node) {
        if (edge.multiple) {
          // Flervalsfråga
          html += `
          <div>
            <label class="block text-lg font-semibold mb-1">${edge.from} → ${edge.to}</label>
            <input type="checkbox" name="${edge.from}" value="${edge.to}" class="mr-2">
            <span>${edge.label || 'Välj alternativ'}</span>
          </div>
          `;
        } else {
          // Envalsfråga
          html += `
          <div>
            <label class="block text-lg font-semibold mb-1">${edge.from} → ${edge.to}</label>
            <input type="radio" name="${edge.from}" value="${edge.to}" class="mr-2">
            <span>${edge.label || 'Välj alternativ'}</span>
          </div>
          `;
        }
      }
    });

    html += `
      </form>
    </section>
    `;
  });

  // Sammanfattning av rekommendationer
  if (recommendations.length > 0) {
    html += `
    <section class="mt-6">
      <h2 class="text-xl font-semibold mb-2">Sammanfattning av rekommendationer</h2>
      <ul class="list-disc pl-6">
    `;
    recommendations.forEach(({ recommendation }) => {
      html += `<li>${recommendation}</li>`;
    });
    html += `
      </ul>
    </section>
    `;

    // Knapp för att skapa PDF
    html += `
    <button id="downloadPDF" class="mt-4 px-4 py-2 bg-green-500 text-white rounded">Ladda ner PDF</button>
    </body>
    </html>

    <script>
      document.getElementById('downloadPDF').addEventListener('click', () => {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        // Lägg till text från sammanfattningen i PDF:en
        const recommendations = document.querySelectorAll('section ul li');
        doc.text("Sammanfattning av rekommendationer:", 10, 10);
        recommendations.forEach((li, index) => {
          doc.text(`${index + 1}. ${li.textContent}`, 10, 20 + (index * 10));
        });

        // Skapa och ladda ner PDF
        doc.save('sammanfattning.pdf');
      });
    </script>
  `;
  }

  return html;
}

// Skapa mappen om den inte finns
fs.mkdirSync('./public', { recursive: true });

// Skriva HTML-fil
const parsed = parseNodes(input);
const html = generateForm(parsed);
fs.writeFileSync('./public/index.html', html);
console.log('Formulär genererat till public/index.html');
