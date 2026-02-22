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
    feedList.innerHTML = '<div class="pv-loader">Loading live feeds from 7 sources with strict party filtering...</div>';
    feedCard.parentNode.appendChild(feedList);

    // Fetch feeds
    const api = window.PoliticViewApiClient;
    const processor = window.PoliticViewDataProcessor;
    
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
      
      // All items are already filtered by backend, but we'll add relevance scores
      const allItems = [
        ...news.map(i => ({ ...i, type: 'NewsAPI', color: 'blue' })),
        ...reddit.map(i => ({ ...i, type: 'Reddit', color: 'orange' })),
        ...mastodon.map(i => ({ ...i, type: 'Mastodon', color: 'purple' })),
        ...gdelt.map(i => ({ ...i, type: 'GDELT', color: 'green' })),
        ...newsdata.map(i => ({ ...i, type: 'NewsData', color: 'blue' })),
        ...youtube.map(i => ({ ...i, type: 'YouTube', color: 'red' }))
      ];

      // Calculate relevance scores for frontend display
      const scoredItems = allItems.map(item => ({
        ...item,
        relevanceScore: processor ? processor.calculateRelevanceScore(item, party) : 100
      })).sort((a, b) => {
        // Sort by relevance score, then by date
        if (b.relevanceScore !== a.relevanceScore) {
          return b.relevanceScore - a.relevanceScore;
        }
        return new Date(b.pubDate || b.publishedAt || 0) - new Date(a.pubDate || a.publishedAt || 0);
      });

      if (scoredItems.length === 0) {
        const keywords = processor && processor.PARTY_KEYWORDS[party] 
          ? processor.PARTY_KEYWORDS[party].primary.join(', ')
          : party;
        feedList.innerHTML = `
          <div style="padding: 16px; background: #fef3c7; border-left: 3px solid #f59e0b; border-radius: 6px;">
            <div style="font-weight: 600; margin-bottom: 4px;">⚠️ No ${party}-specific English news found</div>
            <div style="font-size: 12px; color: #92400e;">
              Backend filtered all items. Required keywords: ${keywords}
            </div>
          </div>
        `;
        return;
      }

      const ul = document.createElement('ul');
      ul.style.listStyle = 'none';
      ul.style.padding = '0';

      scoredItems.slice(0, 20).forEach(item => {
        const li = document.createElement('li');
        li.style.marginBottom = '12px';
        li.style.borderBottom = '1px solid #eee';
        li.style.paddingBottom = '8px';

        const date = new Date(item.pubDate || item.publishedAt || Date.now()).toLocaleDateString();
        const relevanceColor = item.relevanceScore >= 80 ? '#10b981' : 
                               item.relevanceScore >= 60 ? '#3b82f6' : 
                               item.relevanceScore >= 40 ? '#f59e0b' : '#64748b';

        li.innerHTML = `
          <div style="font-size: 11px; color: #888; display:flex; justify-content:space-between; align-items: center;">
            <span style="display: flex; align-items: center; gap: 8px;">
              <span class="pv-badge-dot ${item.color}" style="display: inline-block; width: 6px; height: 6px; border-radius: 50%;"></span> 
              ${item.type} | ${item.source || item.author || 'Unknown'}
              <span style="background: ${relevanceColor}; color: white; padding: 2px 6px; border-radius: 3px; font-size: 10px; font-weight: 600;">
                ${item.relevanceScore}% match
              </span>
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
      
      // Add comprehensive filter info
      const filterInfo = document.createElement('div');
      filterInfo.style.marginTop = '12px';
      filterInfo.style.padding = '12px';
      filterInfo.style.background = '#f8fafc';
      filterInfo.style.borderRadius = '6px';
      filterInfo.style.fontSize = '11px';
      filterInfo.style.color = '#64748b';
      
      const avgScore = scoredItems.reduce((sum, item) => sum + item.relevanceScore, 0) / scoredItems.length;
      const highRelevance = scoredItems.filter(i => i.relevanceScore >= 80).length;
      
      const keywords = processor && processor.PARTY_KEYWORDS[party] 
        ? processor.PARTY_KEYWORDS[party].primary.join(', ')
        : party;
      
      filterInfo.innerHTML = `
        <div style="font-weight: 600; margin-bottom: 8px; color: #1e293b;">📊 Data Quality Metrics</div>
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; margin-bottom: 8px;">
          <div><strong>Displayed:</strong> ${scoredItems.length} items</div>
          <div><strong>Avg Relevance:</strong> ${avgScore.toFixed(0)}%</div>
          <div><strong>High Match (80%+):</strong> ${highRelevance} items</div>
          <div><strong>Party:</strong> ${party}</div>
        </div>
        <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #e2e8f0;">
          <strong>Source Distribution:</strong> NewsAPI (${news.length}), Reddit (${reddit.length}), Mastodon (${mastodon.length}), 
          GDELT (${gdelt.length}), NewsData (${newsdata.length}), YouTube (${youtube.length})
        </div>
        <div style="margin-top: 8px; font-style: italic; color: #94a3b8;">
          ✓ Backend filtered by keywords: ${keywords}<br>
          ✓ English-only content (70% threshold)<br>
          ✓ Sorted by relevance score (highest first)
        </div>
      `;
      feedList.appendChild(filterInfo);
      
      logger.info("Live feed loaded", { 
        party, 
        items: scoredItems.length, 
        avgRelevance: avgScore.toFixed(0),
        highMatch: highRelevance
      });
    }).catch(err => {
      feedList.innerHTML = `<div class="pv-section-footnote error">Failed to load feeds: ${err.message}</div>`;
      logger.error("Feed loading failed", { error: err.message });
    });
  }

  window.PoliticViewCoreIntelligence = {
    render: renderCoreIntelligenceSection
  };
})();
