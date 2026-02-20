(function () {
  function renderInnovationLayerSection(container) {
    container.innerHTML = "";

    const grid = document.createElement("div");
    grid.className = "pv-section-grid";

    const civicCard = document.createElement("article");
    civicCard.className = "pv-section-card";
    civicCard.innerHTML = `
      <div class="pv-section-card-header">
        <div class="pv-section-card-title">Civic Sentiment Blockchain</div>
        <span class="pv-badge"><span class="pv-badge-dot green"></span><span>Transparency rail</span></span>
      </div>
      <div class="pv-section-card-tagline">A tamper-evident ledger of aggregated public mood.</div>
      <div class="pv-section-card-body">
        Vision: store anonymized, aggregated sentiment snapshots on a public or consortium chain so that
        leaders, citizens, and media can audit when and how narratives actually shifted.
      </div>
    `;

    const realityCard = document.createElement("article");
    realityCard.className = "pv-section-card";
    realityCard.innerHTML = `
      <div class="pv-section-card-header">
        <div class="pv-section-card-title">Reality Gap Detector</div>
        <span class="pv-badge"><span class="pv-badge-dot amber"></span><span>Reality check</span></span>
      </div>
      <div class="pv-section-card-tagline">Detect when slogans drift too far from lived experience.</div>
      <div class="pv-section-card-body">
        Compares messaging claims with indicators from <span class="pv-pill">World Bank</span>,
        <span class="pv-pill">GDELT</span>, and other datasets to highlight widening gaps between
        narrative and ground reality.
      </div>
    `;

    grid.appendChild(civicCard);
    grid.appendChild(realityCard);
    container.appendChild(grid);
  }

  window.PoliticViewInnovationLayer = {
    render: renderInnovationLayerSection
  };
})();

