function getNodeFromUrl() {
  return new URLSearchParams(window.location.search).get("node");
}

let compromisedId = getNodeFromUrl() || null;

function populateDropdown() {
  const select = document.getElementById("node-select");
  NODES.filter(n => n.type === "package").forEach(n => {
    const option = document.createElement("option");
    option.value = n.id;
    option.textContent = n.name;
    if (n.id === compromisedId) option.selected = true;
    select.appendChild(option);
  });
  select.addEventListener("change", () => {
    compromisedId = select.value || null;
    drawGraph();
    updateInfoPanel();
  });
}

function drawGraph() {
  const svg = document.getElementById("graph");
  svg.innerHTML = "";
  const affected = compromisedId ? propagate(compromisedId) : new Map();
  const affectedIds = new Set(affected.keys());

  EDGES.forEach(([fromId, toId]) => {
    const from = POSITIONS[fromId];
    const to = POSITIONS[toId];
    const isTaintedEdge = compromisedId &&
      (fromId === compromisedId || affectedIds.has(fromId)) &&
      (toId === compromisedId || affectedIds.has(toId));
    const line = createSvgElement("line", {
      x1: from.x, y1: from.y + 14,
      x2: to.x, y2: to.y - 14,
      stroke: isTaintedEdge ? "#c4432b" : "#2a303c",
      "stroke-width": isTaintedEdge ? 2 : 1,
    });
    svg.appendChild(line);
  });

  NODES.forEach(node => {
    const pos = POSITIONS[node.id];
    let fill = node.type === "app" ? "#2c3444" : riskColor(METRICS[node.id].trueRisk);
    if (node.id === compromisedId) fill = "#ffffff";
    else if (affectedIds.has(node.id)) fill = "#c4432b";
    else if (compromisedId) fill = "#333a47";

    const circle = createSvgElement("circle", { cx: pos.x, cy: pos.y, r: node.type === "app" ? 15 : 13, fill });
    const label = createSvgElement("text", { x: pos.x, y: pos.y + 30, class: "node-label" });
    label.textContent = node.name;
    svg.appendChild(circle);
    svg.appendChild(label);
  });
}

function updateInfoPanel() {
  const panel = document.getElementById("info-panel");
  if (!compromisedId) {
    panel.innerHTML = `<p>Pick a package above to simulate a compromise.</p>`;
    return;
  }
  const node = NODES.find(n => n.id === compromisedId);
  const affected = propagate(compromisedId);
  const waveMap = {};
  affected.forEach((hop, id) => {
    if (!waveMap[hop]) waveMap[hop] = [];
    waveMap[hop].push(NODES.find(n => n.id === id).name);
  });
  let wavesHtml = "";
  Object.keys(waveMap).sort((a, b) => a - b).forEach(hop => {
    wavesHtml += `<p><strong>Hop ${hop}:</strong> ${waveMap[hop].join(", ")}</p>`;
  });
  panel.innerHTML = `
    <p><strong>Compromised:</strong> ${node.name}</p>
    <p>Total affected: ${affected.size} package(s)/app(s)</p>
    ${wavesHtml}
  `;
}

populateDropdown();
drawGraph();
updateInfoPanel();
