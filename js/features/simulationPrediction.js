(function () {
  const llm = window.PoliticViewLlmClient;
  const logger = window.PoliticViewLogger;

  function renderSimulationPredictionSection(container) {
    container.innerHTML = "";

    const grid = document.createElement("div");
    grid.className = "pv-card-grid";

    grid.appendChild(createSimulationCard({
      title: "Mirror AI Reaction Simulator",
      tagline: "Rehearse reactions from supporters, neutrals, and opposition",
      description: "Lets you test how each bloc would respond if you dialed up empathy, aggression, or policy detail in your messaging.",
      id: "mirror-sim"
    }));

    grid.appendChild(createSimulationCard({
      title: "Backlash Risk Forecaster",
      tagline: "Quantify how close you are to triggering anger storms",
      description: "Uses spikes in negative sentiment and prior scandals to estimate whether a move will escalate into organized backlash.",
      id: "backlash-forecast"
    }));

    grid.appendChild(createSimulationCard({
      title: "Media Coverage Predictor",
      tagline: "Forecast headlines before they are written",
      description: "Maps statements to likely media frames: conflict, policy detail, drama, or leadership.",
      id: "media-predictor"
    }));

    grid.appendChild(createSimulationCard({
      title: "Controversy Escalation Model",
      tagline: "See how a small gaffe could grow into a crisis",
      description: "Chains together social amplification, opposition attacks, and media echo to show worst-case narrative arcs.",
      id: "controversy-model"
    }));

    grid.appendChild(createSimulationCard({
      title: "Reputation Impact Estimator",
      tagline: "Measure long-tail damage or gains",
      description: "Estimates shifts in trust, competence, and authenticity scores after a major event.",
      id: "reputation-estimator"
    }));

    container.appendChild(grid);
    bindSimulationHandlers(container);
  }

  function createSimulationCard({ title, tagline, description, id }) {
    const card = document.createElement("div");
    card.className = "pv-card";
    card.dataset.featureId = id;

    const header = document.createElement("div");
    header.className = "pv-card-header";

    const titleEl = document.createElement("h3");
    titleEl.className = "pv-card-title";
    titleEl.textContent = title;

    const badge = document.createElement("span");
    badge.className = "pv-badge";
    badge.innerHTML = '<span class="pv-badge-dot"></span><span>Simulation</span>';

    header.appendChild(titleEl);
    header.appendChild(badge);

    const taglineEl = document.createElement("p");
    taglineEl.className = "pv-card-tagline";
    taglineEl.textContent = tagline;

    const body = document.createElement("div");
    body.className = "pv-card-body";
    body.textContent = description;

    card.appendChild(header);
    card.appendChild(taglineEl);
    card.appendChild(body);

    if (id === "mirror-sim" || id === "backlash-forecast" || id === "media-predictor" || id === "controversy-model" || id === "reputation-estimator") {
      card.appendChild(buildSimulationControls(id));
    }

    return card;
  }

  function buildSimulationControls(id) {
    const wrapper = document.createElement("div");
    wrapper.innerHTML = `
      <div class="pv-input-group">
        <label class="pv-input-label">Enter scenario or statement</label>
        <textarea class="pv-textarea" id="pv-sim-input-${id}" placeholder="Describe the scenario you want to simulate..."></textarea>
      </div>
      <div class="pv-btn-group">
        <button class="pv-btn-primary" id="pv-sim-run-${id}">Run Simulation</button>
        <button class="pv-btn-ghost" id="pv-sim-clear-${id}">Clear</button>
      </div>
      <div id="pv-sim-output-${id}" class="pv-output-box" style="display: none;"></div>
    `;
    return wrapper;
  }

  function bindSimulationHandlers(root) {
    const simulationTypes = ["mirror-sim", "backlash-forecast", "media-predictor", "controversy-model", "reputation-estimator"];

    simulationTypes.forEach((id) => {
      const runBtn = root.querySelector(`#pv-sim-run-${id}`);
      const clearBtn = root.querySelector(`#pv-sim-clear-${id}`);
      const input = root.querySelector(`#pv-sim-input-${id}`);
      const output = root.querySelector(`#pv-sim-output-${id}`);

      if (!runBtn || !clearBtn || !input || !output) return;

      runBtn.addEventListener("click", async () => {
        const text = input.value.trim();
        if (!text) {
          output.style.display = "block";
          output.className = "pv-output-box error";
          output.textContent = "Please enter a scenario first.";
          return;
        }

        output.style.display = "block";
        output.className = "pv-output-box loading";
        output.textContent = "Running simulation...";

        if (llm && llm.isEnabled && llm.isEnabled()) {
          try {
            const systemPrompts = {
              "mirror-sim": "You are the Mirror AI Reaction Simulator inside PoliticView. Simulate how supporters, neutrals, and opposition would react to the given scenario. Write in short professional paragraphs. Do not use bullet points, numbering, emojis, or questions.",
              "backlash-forecast": "You are the Backlash Risk Forecaster inside PoliticView. Analyze the given scenario and estimate the probability and severity of potential backlash. Write in short professional paragraphs. Do not use bullet points, numbering, emojis, or questions.",
              "media-predictor": "You are the Media Coverage Predictor inside PoliticView. Predict how media outlets would frame the given scenario. Write in short professional paragraphs. Do not use bullet points, numbering, emojis, or questions.",
              "controversy-model": "You are the Controversy Escalation Model inside PoliticView. Analyze how the given scenario could escalate into a crisis. Write in short professional paragraphs. Do not use bullet points, numbering, emojis, or questions.",
              "reputation-estimator": "You are the Reputation Impact Estimator inside PoliticView. Estimate the long-term impact on reputation from the given scenario. Write in short professional paragraphs. Do not use bullet points, numbering, emojis, or questions."
            };

            const content = await llm.generate({
              system: systemPrompts[id] || "Analyze the given scenario professionally.",
              prompt: text
            });
            output.className = "pv-output-box";
            output.textContent = content || "No response from model.";
            logger.info(`Simulation ${id} completed`);
          } catch (err) {
            logger.error(`Simulation ${id} failed`, { error: err.message });
            output.className = "pv-output-box error";
            output.textContent = "Simulation failed. Please try again or check your AI configuration.";
          }
        } else {
          output.className = "pv-output-box";
          output.textContent = generateHeuristicSimulation(id, text);
          logger.info(`Simulation ${id} (heuristic) completed`);
        }
      });

      clearBtn.addEventListener("click", () => {
        input.value = "";
        output.style.display = "none";
        output.textContent = "";
      });
    });
  }

  function generateHeuristicSimulation(id, text) {
    const lower = text.toLowerCase();
    const scenarios = {
      "mirror-sim": `Supporters would likely respond positively to this scenario, emphasizing alignment with core values. Neutral observers may require more context to form an opinion. Opposition voices would likely highlight potential concerns or alternative perspectives.`,
      "backlash-forecast": `Based on keyword analysis, this scenario presents moderate risk of backlash. Key factors include public sentiment sensitivity and historical precedent. Monitoring social media signals and news coverage would provide early warning indicators.`,
      "media-predictor": `Media coverage would likely frame this scenario through a policy lens, with emphasis on practical implications. Some outlets may focus on human interest angles, while others prioritize data-driven analysis.`,
      "controversy-model": `The escalation potential depends on several factors including timing, stakeholder reactions, and external events. Early mitigation strategies could reduce controversy risk significantly.`,
      "reputation-estimator": `Long-term reputation impact would depend on execution quality and follow-through. Consistent messaging and transparent communication would help maintain trust levels.`
    };
    return scenarios[id] || "Simulation analysis unavailable.";
  }

  window.PoliticViewSimulationPrediction = {
    render: renderSimulationPredictionSection
  };
})();
