(function () {
  function renderPerformanceLearningSection(container) {
    container.innerHTML = "";

    const grid = document.createElement("div");
    grid.className = "pv-section-grid";

    grid.appendChild(simpleCard(
      "Strategy Effectiveness Tracker",
      "See which narratives actually changed minds.",
      "Connects each campaign or speech to downstream sentiment, turnout, and media framing changes."
    ));

    grid.appendChild(simpleCard(
      "Adaptive Learning Engine",
      "Your playbook gets smarter every week.",
      "Learns from past experiments to recommend fewer, higher-quality moves instead of constant noise."
    ));

    const vaultCard = document.createElement("article");
    vaultCard.className = "pv-section-card";
    vaultCard.innerHTML = `
      <div class="pv-section-card-header">
        <div class="pv-section-card-title">Experiment Learning Vault</div>
        <span class="pv-badge"><span class="pv-badge-dot green"></span><span>Institutional memory</span></span>
      </div>
      <div class="pv-section-card-tagline">Every test, lesson, and failure — searchable.</div>
      <div class="pv-section-card-body">
        Stores hypotheses, setups, and outcomes so that new staff never have to repeat old mistakes.
      </div>
    `;

    grid.appendChild(vaultCard);
    container.appendChild(grid);
  }

  function simpleCard(title, tagline, description) {
    const card = document.createElement("article");
    card.className = "pv-section-card";
    card.innerHTML = `
      <div class="pv-section-card-header">
        <div class="pv-section-card-title">${title}</div>
        <span class="pv-badge"><span class="pv-badge-dot amber"></span><span>Closed loop</span></span>
      </div>
      <div class="pv-section-card-tagline">${tagline}</div>
      <div class="pv-section-card-body">${description}</div>
    `;
    return card;
  }

  window.PoliticViewPerformanceLearning = {
    render: renderPerformanceLearningSection
  };
})();

