(function () {
  const demo = window.PoliticViewDemoData;
  const logger = window.PoliticViewLogger;
  const llm = window.PoliticViewLlmClient;

  function renderCoreIntelligenceSection(container) {
    container.innerHTML = "";

    const grid = document.createElement("div");
    grid.className = "pv-card-grid";

    grid.appendChild(createCard({
      title: "People Response Simulator",
      tagline: "Predict reactions before the speech leaves the podium",
      description: "Simulates how different audience segments will emotionally and politically respond to a draft speech, policy note, or social post.",
      id: "people-response-sim"
    }));

    grid.appendChild(createCard({
      title: "Real-Time Sentiment Pulse",
      tagline: "Continuously sampled mood across news & social",
      description: "Aggregates sentiment from news APIs, Reddit threads, and open social platforms to estimate current public mood on your topic.",
      id: "sentiment-pulse-explainer"
    }));

    grid.appendChild(createCard({
      title: "Live Political Feed",
      tagline: "Unfiltered stream from News, Reddit & Mastodon",
      description: "Real-time raw feed of Tamil Nadu political discourse.",
      id: "live-political-feed"
    }));

    grid.appendChild(createCard({
      title: "Emotional Heatmaps",
      tagline: "Where anger, trust, and fear live on the map",
      description: "Visualizes dominant emotions across segments or regions, helping you see where narratives are fragile.",
      id: "emotional-heatmaps-explainer"
    }));

    grid.appendChild(createCard({
      title: "Opinion Forecasting & Early Warnings",
      tagline: "See the curve bend before the poll does",
      description: "Uses trend inflection detection from news and community data to forecast support, opposition, and neutral sentiment over coming days.",
      id: "opinion-forecasting-explainer"
    }));

    container.appendChild(grid);
    bindSimulators(container);
    bindFeed(container);
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
    badge.style.whiteSpace = "nowrap";
    badge.innerHTML = '<span class="pv-badge-dot"></span><span>AI Module</span>';

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

    if (id === "people-response-sim") {
      card.appendChild(buildPeopleResponseControls());
    }

    return card;
  }

  function buildPeopleResponseControls() {
    const wrapper = document.createElement("div");
    wrapper.innerHTML = `
      <div class="pv-input-group">
        <label class="pv-input-label">Paste draft speech, post, or policy summary</label>
        <textarea class="pv-textarea" id="pv-speech-input" placeholder="Enter your text here to simulate public reaction..."></textarea>
      </div>
      <div class="pv-btn-group">
        <button class="pv-btn-primary" id="pv-run-speech-sim">Simulate Reaction</button>
        <button class="pv-btn-ghost" id="pv-clear-speech-sim">Clear</button>
      </div>
      <div id="pv-speech-sim-output" class="pv-output-box" style="display: none;"></div>
    `;
    return wrapper;
  }

  function bindSimulators(root) {
    const runBtn = root.querySelector("#pv-run-speech-sim");
    const clearBtn = root.querySelector("#pv-clear-speech-sim");
    const input = root.querySelector("#pv-speech-input");
    const output = root.querySelector("#pv-speech-sim-output");

    if (!runBtn || !clearBtn || !input || !output) return;

    runBtn.addEventListener("click", async () => {
      const text = input.value.trim();
      if (!text) {
        output.style.display = "block";
        output.className = "pv-output-box error";
        output.textContent = "Please paste some text first.";
        return;
      }

      output.style.display = "block";
      output.className = "pv-output-box loading";
      output.textContent = "Analyzing with AI model...";

      if (llm && llm.isEnabled && llm.isEnabled()) {
        try {
          const suggestion = await llm.generate({
            system:
              "You are the People Response Simulator inside PoliticView. " +
              "Given a draft political speech or statement, estimate backlash risk, likely emotional mix, and give specific rewrite recommendations. " +
              "Write in short professional paragraphs. Do not use bullet points, numbering, emojis, or questions.",
            prompt: text
          });
          output.className = "pv-output-box";
          output.textContent = suggestion || "No response from model.";
          logger.info("People response simulation (LLM) completed");
          return;
        } catch (err) {
          logger.error("People response LLM call failed, using heuristic", {
            error: err.message
          });
          output.className = "pv-output-box error";
          output.textContent = "AI analysis failed. Using heuristic scoring instead.";
        }
      }

      const result = simulateResponse(text);
      output.className = "pv-output-box";
      let outputText = `Backlash Risk Assessment: ${result.riskBand}\n\n`;
      outputText += "Analysis:\n";
      result.tags.forEach((tag) => {
        outputText += `${tag.label}: ${tag.value}\n`;
      });
      output.textContent = outputText;
      logger.info("People response simulation run", { riskBand: result.riskBand });
    });

    clearBtn.addEventListener("click", () => {
      input.value = "";
      output.style.display = "none";
      output.textContent = "";
    });
  }

  function simulateResponse(text) {
    const lower = text.toLowerCase();
    let riskScore = 0;

    const backlashKeywords = ["tax", "ban", "punish", "corruption", "scandal", "criminal", "betray"];
    const polarizationKeywords = ["either you are with us", "traitor", "enemy", "boycott"];
    const trustKeywords = ["transparency", "accountable", "listening", "dialogue", "inclusive"];

    backlashKeywords.forEach((k) => {
      if (lower.includes(k)) riskScore += 15;
    });
    polarizationKeywords.forEach((k) => {
      if (lower.includes(k)) riskScore += 20;
    });
    trustKeywords.forEach((k) => {
      if (lower.includes(k)) riskScore -= 10;
    });

    const lengthFactor = Math.min(30, Math.max(0, text.length / 80));
    riskScore += lengthFactor;

    const riskBand = riskScore > 60 ? "High backlash risk" : riskScore > 35 ? "Moderate risk" : "Low risk";

    const tags = [
      { label: "Backlash risk", value: riskBand },
      {
        label: "Perceived aggression",
        value: riskScore > 60 ? "High" : riskScore > 35 ? "Medium" : "Low"
      },
      {
        label: "Trust-building tone",
        value: trustKeywords.some((k) => lower.includes(k)) ? "Present" : "Weak"
      },
      {
        label: "Media controversy potential",
        value: riskScore > 50 ? "Likely" : "Manageable"
      }
    ];

    return { riskBand, tags };
  }

  function bindFeed(root) {
    const feedCard = root.querySelector('[data-feature-id="live-political-feed"] .pv-card-body');
    if (!feedCard) return;

    // Create a container for the feed items
    const feedList = document.createElement('div');
    feedList.className = 'pv-feed-list';
    feedList.style.marginTop = '15px';
    feedList.innerHTML = '<div class="pv-loader">Loading live feeds from 7 sources...</div>';
    feedCard.parentNode.appendChild(feedList);

    // Fetch feeds
    const api = window.PoliticViewApiClient;
    if (api.isDemoMode()) {
      feedList.innerHTML = '<div class="pv-section-footnote">Demo Mode: Feeds unavailable.</div>';
      return;
    }

    const party = api.getSelectedParty();
    
    Promise.all([
      api.getFeed('newsapi').catch(e => []),
      api.getFeed('reddit').catch(e => []),
      api.getFeed('mastodon').catch(e => []),
      api.getFeed('gdelt').catch(e => []),
      api.getFeed('newsdata').catch(e => []),
      api.getFeed('youtube').catch(e => [])
    ]).then(([news, reddit, mastodon, gdelt, newsdata, youtube]) => {
      feedList.innerHTML = '';
      
      // Filter items by party relevance
      const partyKeywords = {
        'TVK': ['tvk', 'vijay', 'tamizhaga', 'vettri', 'kazhagam'],
        'DMK': ['dmk', 'stalin', 'dravida', 'munnetra'],
        'ADMK': ['admk', 'aiadmk', 'palaniswami', 'eps', 'amma'],
        'BJP': ['bjp', 'annamalai', 'bharatiya', 'janata']
      };
      
      const keywords = partyKeywords[party] || [];
      
      const filterByParty = (item) => {
        if (!keywords.length) return true; // No filtering for unknown parties
        const text = (item.title || item.content || '').toLowerCase();
        return keywords.some(kw => text.includes(kw)) || text.includes('tamil nadu') || text.includes('tn politics');
      };
      
      // Filter and combine all items
      const allItems = [
        ...news.filter(filterByParty).map(i => ({ ...i, type: 'News' })),
        ...reddit.filter(filterByParty).map(i => ({ ...i, type: 'Reddit' })),
        ...mastodon.filter(filterByParty).map(i => ({ ...i, type: 'Mastodon' })),
        ...gdelt.filter(filterByParty).map(i => ({ ...i, type: 'GDELT' })),
        ...newsdata.filter(filterByParty).map(i => ({ ...i, type: 'NewsData' })),
        ...youtube.filter(filterByParty).map(i => ({ ...i, type: 'YouTube' }))
      ].sort((a, b) => new Date(b.pubDate || b.publishedAt || 0) - new Date(a.pubDate || a.publishedAt || 0));

      if (allItems.length === 0) {
        feedList.innerHTML = `
          <div style="padding: 16px; background: #fef3c7; border-left: 3px solid #f59e0b; border-radius: 6px;">
            <div style="font-weight: 600; margin-bottom: 4px;">⚠️ No ${party}-specific English news found</div>
            <div style="font-size: 12px; color: #92400e;">
              Try switching parties or check back later. Searching for: ${keywords.join(', ')}
            </div>
          </div>
        `;
        return;
      }

      const ul = document.createElement('ul');
      ul.style.listStyle = 'none';
      ul.style.padding = '0';

      allItems.slice(0, 20).forEach(item => {
        const li = document.createElement('li');
        li.style.marginBottom = '12px';
        li.style.borderBottom = '1px solid #eee';
        li.style.paddingBottom = '8px';

        const date = new Date(item.pubDate || item.publishedAt || Date.now()).toLocaleDateString();
        const sourceColors = {
          'News': 'blue',
          'Reddit': 'orange',
          'Mastodon': 'purple',
          'GDELT': 'green',
          'NewsData': 'blue',
          'YouTube': 'red'
        };
        const sourceClass = sourceColors[item.type] || 'blue';

        li.innerHTML = `
          <div style="font-size: 11px; color: #888; display:flex; justify-content:space-between; align-items: center;">
            <span style="display: flex; align-items: center;">
              <span class="pv-badge-dot ${sourceClass}" style="display: inline-block; width: 6px; height: 6px; border-radius: 50%; margin-right: 4px;"></span> 
              ${item.type} | ${item.source || item.author || 'Unknown'}
            </span>
            <span>${date}</span>
          </div>
          <div style="font-weight: 500; font-size: 13px; margin-top: 4px;">
            <a href="${item.link || item.url}" target="_blank" style="text-decoration: none; color: inherit;">${item.title || item.content.slice(0, 100)}</a>
          </div>
        `;
        ul.appendChild(li);
      });
      
      feedList.appendChild(ul);
      
      // Add filter info
      const filterInfo = document.createElement('div');
      filterInfo.style.marginTop = '12px';
      filterInfo.style.fontSize = '11px';
      filterInfo.style.color = '#64748b';
      filterInfo.style.fontStyle = 'italic';
      const totalSources = news.length + reddit.length + mastodon.length + gdelt.length + newsdata.length + youtube.length;
      filterInfo.innerHTML = `
        Showing ${allItems.length} ${party}-filtered English items from ${totalSources} total sources<br>
        <span style="font-size: 10px;">Sources: NewsAPI (${news.length}), Reddit (${reddit.length}), Mastodon (${mastodon.length}), GDELT (${gdelt.length}), NewsData (${newsdata.length}), YouTube (${youtube.length})</span>
      `;
      feedList.appendChild(filterInfo);
    });
  }

  window.PoliticViewCoreIntelligence = {
    render: renderCoreIntelligenceSection
  };
})();
