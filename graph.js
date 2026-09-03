function drawGraph() {
  const svg = document.getElementById("graph");
  svg.innerHTML = "";

  EDGES.forEach(([fromId, toId]) => {
    const from = POSITIONS[fromId];
    const to = POSITIONS[toId];
    const line = createSvgElement("line", {
      x1: from.x, y1: from.y + 14,
      x2: to.x, y2: to.y - 14,
      stroke: "#2a303c",
      "stroke-width": 1,
    });
    svg.appendChild(line);
  });

  NODES.forEach(node => {
    const pos = POSITIONS[node.id];
    const fill = node.type === "app" ? "#2c3444" : riskColor(METRICS[node.id].trueRisk);

    const circle = createSvgElement("circle", {
      cx: pos.x, cy: pos.y,
      r: node.type === "app" ? 15 : 13,
      fill: fill,
    });

    if (node.type === "package") {
      circle.addEventListener("click", () => showNodeDetails(node.id));
    }

    const label = createSvgElement("text", { x: pos.x, y: pos.y + 30, class: "node-label" });
    label.textContent = node.name;

    svg.appendChild(circle);
    svg.appendChild(label);
  });
}

function showNodeDetails(nodeId) {
  const node = NODES.find(n => n.id === nodeId);
  const m = METRICS[nodeId];
  document.getElementById("info-panel").innerHTML = `
    <p><strong>${node.name}</strong></p>
    <p>Reported vuln score: ${node.vuln}</p>
    <p>True risk score: <span style="color:${riskColor(m.trueRisk)}">${m.trueRisk}</span></p>
    <p>Direct dependents: ${m.directDependents}</p>
    <p>Apps affected: ${m.affectedAppsCount} / ${TOTAL_APPS}</p>
    <p><strong>${riskLabel(m.trueRisk)}</strong></p>
    <p><a href="propagation.html?node=${nodeId}">See full propagation simulation →</a></p>
  `;
}

drawGraph();