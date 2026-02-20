(function () {
  const geoApis = window.PoliticViewGeoEconomicSources;

  function renderGeoFieldSection(container) {
    container.innerHTML = "";

    const grid = document.createElement("div");
    grid.className = "pv-section-grid";

    const rallyCard = document.createElement("article");
    rallyCard.className = "pv-section-card";
    rallyCard.innerHTML = `
      <div class="pv-section-card-header">
        <div class="pv-section-card-title">Rally Impact Analyzer</div>
        <span class="pv-badge"><span class="pv-badge-dot green"></span><span>On-ground boost</span></span>
      </div>
      <div class="pv-section-card-tagline">Did the rally move hearts, or just fill chairs?</div>
      <div class="pv-section-card-body">
        Links field events with local sentiment trends to estimate whether rallies converted attention into durable support.
      </div>
    `;

    const turnoutCard = document.createElement("article");
    turnoutCard.className = "pv-section-card";
    turnoutCard.innerHTML = `
      <div class="pv-section-card-header">
        <div class="pv-section-card-title">Turnout Probability Engine</div>
        <span class="pv-badge"><span class="pv-badge-dot amber"></span><span>Energy index</span></span>
      </div>
      <div class="pv-section-card-tagline">Estimate who will actually show up on election day.</div>
      <div class="pv-section-card-body">
        Combines historical turnout, economic stress indicators, and current enthusiasm to project participation by region.
      </div>
      <div class="pv-section-footnote">
        Connect to <span class="pv-pill">GDELT</span> events and <span class="pv-pill">World Bank</span> indicators for richer modeling.
      </div>
    `;

    const dataCard = document.createElement("article");
    dataCard.className = "pv-section-card";
    dataCard.innerHTML = `
      <div class="pv-section-card-header">
        <div class="pv-section-card-title">Geo & Econ Data Snapshot</div>
        <span class="pv-badge"><span class="pv-badge-dot green"></span><span>Open data</span></span>
      </div>
      <div class="pv-section-card-tagline">Pull a quick read of objective context.</div>
      <div class="pv-section-card-body">
        <div class="pv-input-row">
          <input id="pv-worldbank-country" class="pv-input" placeholder="Country code, e.g. IN, US, WLD" />
          <button class="pv-ghost-button" id="pv-worldbank-load">Load Population Trend</button>
        </div>
        <div id="pv-worldbank-output" class="pv-section-card-body"></div>
      </div>
    `;

    grid.appendChild(rallyCard);
    grid.appendChild(turnoutCard);
    grid.appendChild(dataCard);
    container.appendChild(grid);

    const countryInput = container.querySelector("#pv-worldbank-country");
    const loadBtn = container.querySelector("#pv-worldbank-load");
    const output = container.querySelector("#pv-worldbank-output");

    if (countryInput && loadBtn && output) {
      loadBtn.addEventListener("click", async () => {
        const country = (countryInput.value || "WLD").trim().toUpperCase();
        output.textContent = "Loading from World Bank API...";
        try {
          const res = await geoApis.fetchWorldBankIndicator({
            indicator: "SP.POP.TOTL",
            country
          });
          const series = res.series || [];
          const latest = series[0];
          const prev = series[1];
          const currentVal = latest && latest.value;
          const prevVal = prev && prev.value;
          const growth =
            currentVal && prevVal ? (((currentVal - prevVal) / prevVal) * 100).toFixed(2) : null;

          output.innerHTML = `
            <div class="pv-metric-row">
              <span class="pv-metric-label">Latest population</span>
              <span class="pv-metric-value">${currentVal ? currentVal.toLocaleString() : "N/A"}</span>
            </div>
            <div class="pv-metric-row">
              <span class="pv-metric-label">Year-on-year change</span>
              <span class="pv-metric-value ${growth && growth > 0 ? "good" : "neutral"}">
                ${growth ? growth + "%" : "N/A"}
              </span>
            </div>
            <div class="pv-section-footnote">
              Open data via the <a class="pv-inline-link" href="https://data.worldbank.org/" target="_blank" rel="noreferrer">World Bank API</a>.
            </div>
          `;
        } catch (err) {
          output.innerHTML = `<span class="pv-error-text">Failed to load World Bank data. It may require a backend proxy depending on browser CORS policy.</span>`;
        }
      });
    }
  }

  window.PoliticViewGeoField = {
    render: renderGeoFieldSection
  };
})();

