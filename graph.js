function drawGraph() {
  const svg = document.getElementById("graph");
  if (!svg) return;
  svg.innerHTML = "";

  EDGES.forEach(([fromId, toId]) => {
    const from = POSITIONS[fromId];
    const to = POSITIONS[toId];
    const line = createSvgElement("line", {
      x1: from.x, y1: from.y + 15,
      x2: to.x, y2: to.y - 15,
      stroke: "rgba(71, 85, 105, 0.45)",
      "stroke-width": 1.2,
      class: "graph-edge"
    });
    svg.appendChild(line);
  });

  NODES.forEach(node => {
    const pos = POSITIONS[node.id];
    const isApp = node.type === "app";
    const fill = isApp ? "var(--node-app)" : riskColor(METRICS[node.id].trueRisk);

    const circle = createSvgElement("circle", {
      cx: pos.x, cy: pos.y,
      r: isApp ? 15 : 13,
      fill: fill,
      stroke: isApp ? "var(--node-app-border)" : "rgba(255, 255, 255, 0.25)",
      "stroke-width": isApp ? 2 : 1.5,
      class: "graph-node"
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
  const panel = document.getElementById("info-panel");
  if (!panel) return;

  panel.innerHTML = `
    <div class="node-detail-content">
      <div class="node-detail-header">
        <span class="node-detail-name">${node.name}</span>
        <span class="node-type-badge">Package</span>
      </div>
      <div class="stat-grid">
        <div class="stat-box">
          <span class="stat-box-label">Reported Vuln</span>
          <span class="stat-box-val">${node.vuln}</span>
        </div>
        <div class="stat-box">
          <span class="stat-box-label">True Risk Score</span>
          <span class="stat-box-val" style="color:${riskColor(m.trueRisk)}">${m.trueRisk}</span>
        </div>
        <div class="stat-box">
          <span class="stat-box-label">Direct Dependents</span>
          <span class="stat-box-val">${m.directDependents}</span>
        </div>
        <div class="stat-box">
          <span class="stat-box-label">Apps Affected</span>
          <span class="stat-box-val">${m.affectedAppsCount} / ${TOTAL_APPS}</span>
        </div>
      </div>
      <div class="action-recommendation-box">
        <span class="legend-dot" style="background:${riskColor(m.trueRisk)}; color:${riskColor(m.trueRisk)};"></span>
        <span>${riskLabel(m.trueRisk)}</span>
      </div>
      <p style="margin-top:10px;"><a class="btn-simulate-jump" href="propagation.html?node=${nodeId}">See full propagation simulation →</a></p>
    </div>
  `;
}

drawGraph();