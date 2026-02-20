(function () {
  const llm = window.PoliticViewLlmClient;
  const logger = window.PoliticViewLogger;

  function renderStrategyIntelSection(container) {
    container.innerHTML = "";

    const grid = document.createElement("div");
    grid.className = "pv-section-grid";

    const gtmCard = document.createElement("article");
    gtmCard.className = "pv-section-card";
    gtmCard.innerHTML = `
      <div class="pv-section-card-header">
        <div class="pv-section-card-title">Go-To-Market Analysis</div>
        <span class="pv-badge"><span class="pv-badge-dot green"></span><span>Launch advisory</span></span>
      </div>
      <div class="pv-section-card-tagline">Design launches like product rollouts, not press releases.</div>
      <div class="pv-section-card-body">
        Maps audiences, channels, and narrative angles to identify the safest and highest-yield path to roll out a new policy or campaign.
      </div>
      <div class="pv-input-group">
        <label class="pv-input-label">Policy / campaign one-liner</label>
        <input id="pv-gtm-summary" class="pv-input" placeholder="e.g. National clean energy guarantee for all households" />
      </div>
      <div class="pv-input-row">
        <button class="pv-primary-button" id="pv-gtm-analyze">Generate Launch Play</button>
      </div>
      <div id="pv-gtm-output" class="pv-section-card-body"></div>
    `;

    const oppCard = document.createElement("article");
    oppCard.className = "pv-section-card";
    oppCard.innerHTML = `
      <div class="pv-section-card-header">
        <div class="pv-section-card-title">Opposition Weakness Mapper</div>
        <span class="pv-badge"><span class="pv-badge-dot amber"></span><span>Contrast engine</span></span>
      </div>
      <div class="pv-section-card-tagline">Identify narrative blind spots without going negative.</div>
      <div class="pv-section-card-body">
        Highlights areas where opposition messaging is inconsistent with public memory, data, or prior commitments.
      </div>
      <div class="pv-section-footnote">
        Combine with <span class="pv-pill">Issue Memory Engine</span> to avoid over-attacking low-salience weaknesses.
      </div>
    `;

    const policyCard = document.createElement("article");
    policyCard.className = "pv-section-card";
    policyCard.innerHTML = `
      <div class="pv-section-card-header">
        <div class="pv-section-card-title">Policy Impact Simulator</div>
        <span class="pv-badge"><span class="pv-badge-dot amber"></span><span>Trust delta</span></span>
      </div>
      <div class="pv-section-card-tagline">Estimate trust gain/loss before announcing.</div>
      <div class="pv-section-card-body">
        Projects changes to trust, turnout energy, and media framing under best, base, and worst case scenarios.
      </div>
      <div class="pv-section-footnote">
        Attach <span class="pv-pill">World Bank</span> and <span class="pv-pill">GDELT</span> indicators for data-backed impact narratives.
      </div>
    `;

    grid.appendChild(gtmCard);
    grid.appendChild(oppCard);
    grid.appendChild(policyCard);
    container.appendChild(grid);

    const gtmBtn = container.querySelector("#pv-gtm-analyze");
    const gtmSummary = container.querySelector("#pv-gtm-summary");
    const gtmOutput = container.querySelector("#pv-gtm-output");

    if (gtmBtn && gtmSummary && gtmOutput) {
      gtmBtn.addEventListener("click", async () => {
        const summary = gtmSummary.value.trim() || "this initiative";

        if (llm && llm.isEnabled && llm.isEnabled()) {
          gtmOutput.textContent = "Asking Chief Strategist model for launch plan...";
          try {
            const content = await llm.generate({
              system:
                "You are the Go-To-Market Analysis module inside PoliticView. " +
                "Given a short policy or campaign description, propose the primary launch audience, the best channels, and a concise narrative frame. " +
                "Write in short professional paragraphs. Do not use bullet points, numbering, emojis, or questions.",
              prompt: summary
            });
            gtmOutput.textContent = content || "No response from model.";
            logger.info("GTM analysis (LLM) generated");
            return;
          } catch (err) {
            logger.error("GTM analysis LLM failed, using default pattern", { error: err.message });
            gtmOutput.innerHTML =
              '<span class="pv-error-text">LLM failed, showing default heuristic GTM advice.</span>';
          }
        }

        gtmOutput.innerHTML = `
          <div class="pv-metric-row">
            <span class="pv-metric-label">Primary launch audience</span>
            <span class="pv-metric-value">Swing & low-information voters</span>
          </div>
          <div class="pv-metric-row">
            <span class="pv-metric-label">Core narrative lane</span>
            <span class="pv-metric-value">Practical benefits over ideology</span>
          </div>
          <div class="pv-section-footnote">
            Treat <strong>${summary}</strong> as a service upgrade to citizens' daily life. Lead with impact stories, not policy jargon.
          </div>
        `;
      });
    }
  }

  window.PoliticViewStrategyIntel = {
    render: renderStrategyIntelSection
  };
})();

