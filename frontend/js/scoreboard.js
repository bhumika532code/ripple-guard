function buildScoreboard() {
  const tbody = document.getElementById("scoreboard-body");
  if (!tbody) return;

  const ranked = NODES
    .filter(n => n.type === "package")
    .map(n => ({ node: n, m: METRICS[n.id] }))
    .sort((a, b) => b.m.trueRisk - a.m.trueRisk);

  ranked.forEach(({ node, m }) => {
    let scoreClass = "low";
    if (m.trueRisk >= 70) scoreClass = "crit";
    else if (m.trueRisk >= 52) scoreClass = "high";
    else if (m.trueRisk >= 35) scoreClass = "med";

    const row = document.createElement("tr");
    row.innerHTML = `
      <td><span class="legend-dot ${scoreClass}" style="background:${riskColor(m.trueRisk)}; color:${riskColor(m.trueRisk)};"></span></td>
      <td class="pkg-name-cell">${node.name}</td>
      <td style="font-family:'JetBrains Mono',monospace;">${node.vuln}</td>
      <td><span class="score-badge ${scoreClass}">${m.trueRisk}</span></td>
      <td style="font-family:'JetBrains Mono',monospace;">${m.directDependents}</td>
      <td style="font-family:'JetBrains Mono',monospace;">${m.affectedAppsCount} / ${TOTAL_APPS}</td>
      <td class="action-pill">${riskLabel(m.trueRisk)}</td>
      <td><a class="btn-table-simulate" href="propagation.html?node=${node.id}">Taint Analysis →</a></td>
    `;
    tbody.appendChild(row);
  });
}

buildScoreboard();