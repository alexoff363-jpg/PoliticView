(function () {
  const llm = window.PoliticViewLlmClient;
  const logger = window.PoliticViewLogger;

  function renderContentEngineSection(container) {
    container.innerHTML = "";

    const grid = document.createElement("div");
    grid.className = "pv-card-grid";

    const speechCard = createCard({
      title: "Speech & Post Optimizer",
      tagline: "Turn policy notes into human language with emotional grip",
      description: "Highlights missing empathy, overuse of attack language, and opportunities to anchor on tangible gains.",
      id: "speech-optimizer"
    });

    const viralCard = createCard({
      title: "Viral Potential Scorer",
      tagline: "Estimate how far your content can travel organically",
      description: "Analyzes campaign slogans and hashtags for shareability and memorability factors.",
      id: "viral-scorer"
    });

    const memeCard = createCard({
      title: "Meme Trend Analyzer",
      tagline: "Track how your message mutates in meme culture",
      description: "Connects to Reddit, YouTube, and open social APIs to observe whether you are the hero, villain, or punchline of emerging memes.",
      id: "meme-analyzer"
    });

    grid.appendChild(speechCard);
    grid.appendChild(viralCard);
    grid.appendChild(memeCard);
    container.appendChild(grid);

    bindContentHandlers(container);
  }

  function createCard({ title, tagline, description, id }) {
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
    badge.innerHTML = '<span class="pv-badge-dot"></span><span>AI Tool</span>';

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

    if (id === "speech-optimizer") {
      card.appendChild(buildSpeechOptimizerControls());
    } else if (id === "viral-scorer") {
      card.appendChild(buildViralScorerControls());
    }

    return card;
  }

  function buildSpeechOptimizerControls() {
    const wrapper = document.createElement("div");
    wrapper.innerHTML = `
      <div class="pv-input-group">
        <label class="pv-input-label">Draft text for optimization</label>
        <textarea id="pv-speech-optimizer-input" class="pv-textarea" placeholder="Paste speech excerpt, tweet, or post caption..."></textarea>
      </div>
      <div class="pv-btn-group">
        <button class="pv-btn-primary" id="pv-speech-optimizer-run">Suggest Improvements</button>
        <button class="pv-btn-ghost" id="pv-speech-optimizer-clear">Clear</button>
      </div>
      <div id="pv-speech-optimizer-output" class="pv-output-box" style="display: none;"></div>
    `;
    return wrapper;
  }

  function buildViralScorerControls() {
    const wrapper = document.createElement("div");
    wrapper.innerHTML = `
      <div class="pv-input-group">
        <label class="pv-input-label">Campaign hashtag or slogan</label>
        <input id="pv-viral-text" class="pv-input" placeholder="#JobsNotJargon or 'No one left behind'" />
      </div>
      <div class="pv-btn-group">
        <button class="pv-btn-primary" id="pv-viral-score">Score Viral Potential</button>
        <button class="pv-btn-ghost" id="pv-viral-clear">Clear</button>
      </div>
      <div id="pv-viral-output" class="pv-output-box" style="display: none;"></div>
    `;
    return wrapper;
  }

  function bindContentHandlers(root) {
    const speechInput = root.querySelector("#pv-speech-optimizer-input");
    const speechBtn = root.querySelector("#pv-speech-optimizer-run");
    const speechClear = root.querySelector("#pv-speech-optimizer-clear");
    const speechOutput = root.querySelector("#pv-speech-optimizer-output");

    if (speechBtn && speechInput && speechOutput) {
      speechBtn.addEventListener("click", async () => {
        const text = (speechInput.value || "").trim();
        if (!text) {
          speechOutput.style.display = "block";
          speechOutput.className = "pv-output-box error";
          speechOutput.textContent = "Please paste some text first.";
          return;
        }

        speechOutput.style.display = "block";
        speechOutput.className = "pv-output-box loading";
        speechOutput.textContent = "Optimizing wording with AI...";

        if (llm && llm.isEnabled && llm.isEnabled()) {
          try {
            const content = await llm.generate({
              system:
                "You are the Speech and Post Optimizer inside PoliticView. " +
                "Rewrite or annotate the given text to reduce unnecessary aggression, increase empathy, and keep it clear and memorable. " +
                "Write in short professional paragraphs. Do not use bullet points, numbering, emojis, or questions.",
              prompt: text
            });
            speechOutput.className = "pv-output-box";
            speechOutput.textContent = content || "No response from model.";
            logger.info("Speech optimizer (LLM) suggestion generated");
          } catch (err) {
            logger.error("Speech optimizer LLM call failed", { error: err.message });
            speechOutput.className = "pv-output-box error";
            speechOutput.textContent = "Failed to contact model. Please check your AI configuration.";
          }
        } else {
          speechOutput.className = "pv-output-box error";
          speechOutput.textContent = "Configure llmModel in apiKeys.js to enable AI optimization.";
        }
      });

      if (speechClear) {
        speechClear.addEventListener("click", () => {
          speechInput.value = "";
          speechOutput.style.display = "none";
          speechOutput.textContent = "";
        });
      }
    }

    const textInput = root.querySelector("#pv-viral-text");
    const scoreBtn = root.querySelector("#pv-viral-score");
    const viralClear = root.querySelector("#pv-viral-clear");
    const output = root.querySelector("#pv-viral-output");

    if (textInput && scoreBtn && output) {
      scoreBtn.addEventListener("click", async () => {
        const text = (textInput.value || "").trim();
        if (!text) {
          output.style.display = "block";
          output.className = "pv-output-box error";
          output.textContent = "Enter a phrase or hashtag first.";
          return;
        }

        output.style.display = "block";
        output.className = "pv-output-box loading";
        output.textContent = "Asking model to score viral potential...";

        if (llm && llm.isEnabled && llm.isEnabled()) {
          try {
            const content = await llm.generate({
              system:
                "You are the Viral Potential Scorer inside PoliticView. " +
                "Given a campaign slogan or hashtag, estimate its organic viral potential and explain why. " +
                "Write in short professional paragraphs. Do not use bullet points, numbering, emojis, or questions.",
              prompt: text
            });
            output.className = "pv-output-box";
            output.textContent = content || "No response from model.";
            logger.info("Viral potential (LLM) scored");
          } catch (err) {
            logger.error("Viral scorer LLM call failed, using heuristic", { error: err.message });
            output.className = "pv-output-box";
            output.textContent = computeViralScore(text).analysis;
          }
        } else {
          const score = computeViralScore(text);
          output.className = "pv-output-box";
          output.textContent = score.analysis;
        }
      });

      if (viralClear) {
        viralClear.addEventListener("click", () => {
          textInput.value = "";
          output.style.display = "none";
          output.textContent = "";
        });
      }
    }
  }

  function computeViralScore(text) {
    const length = text.length;
    const words = text.split(/\s+/).filter(Boolean);
    const uniqueWords = new Set(words.map((w) => w.toLowerCase())).size;
    const hasHashtag = /#\w+/.test(text);
    const hasRhyme = /(now|how|wow|go|grow|flow|more|door|war|score)\b/i.test(text);

    let base = 40;
    if (hasHashtag) base += 10;
    if (hasRhyme) base += 10;
    if (length > 4 && length < 26) base += 15;
    if (uniqueWords <= 3) base += 10;

    const score = Math.max(10, Math.min(95, base));
    const band =
      score > 75 ? "High viral candidate" : score > 55 ? "Moderately shareable" : "Low organic reach";

    const memorability =
      score > 75
        ? "Sticky and easy to repeat"
        : score > 55
        ? "Decent but improvable"
        : "Too flat or complex";

    return {
      score,
      band,
      memorability,
      analysis: `Viral Potential: ${band}\n\nMemorability: ${memorability}\n\nScore: ${score}/100\n\nThis assessment is based on length, rhythm, and emotional clarity. For more accurate predictions, connect to live social APIs.`
    };
  }

  window.PoliticViewContentEngine = {
    render: renderContentEngineSection
  };
})();
