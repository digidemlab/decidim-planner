const fs = require('fs');
const input = fs.readFileSync('./form-definition.mmd', 'utf-8');

function parseNodes(mermaid) {
  const lines = mermaid.split('\n').filter(l => l.includes('-->'));
  const nodes = new Set();
  const edges = [];

  lines.forEach(line => {
    const match = line.match(/(\w+)\s*-->\|?([^|]*)\|?\s*(\w+)/);
    if (match) {
      const [, from, label, to] = match;
      edges.push({ from, label: label.trim(), to });
      nodes.add(from);
      nodes.add(to);
    }
  });

  return { edges, nodes: Array.from(nodes) };
}

function generateForm({ edges }) {
  let html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Formulär från Mermaid</title>
  <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
</head>
<body class="p-4">
  <h1 class="text-2xl font-bold mb-4">Auto-genererat formulär</h1>
  <form id="dynamicForm" class="space-y-4">
`;

  edges.forEach((edge, index) => {
    html += `
    <div>
      <label class="block text-lg font-semibold mb-1">${edge.from} → ${edge.to}</label>
      <input type="radio" name="${edge.from}" value="${edge.to}" class="mr-2">
      <span>${edge.label || 'Välj'}</span>
    </div>
`;
  });

  html += `
    <button type="submit" class="mt-4 px-4 py-2 bg-blue-500 text-white rounded">Skicka</button>
  </form>
</body>
</html>
  `;
  return html;
}

const parsed = parseNodes(input);
const html = generateForm(parsed);
fs.writeFileSync('./public/index.html', html);
console.log('Formulär genererat till public/index.html');
