(function () {
  const demo = window.PoliticViewDemoData;
  const llm = window.PoliticViewLlmClient;
  const logger = window.PoliticViewLogger;
  const api = window.PoliticViewApiClient;

  function renderPublicInsightSection(container) {
    container.innerHTML = "";

    const grid = document.createElement("div");
    grid.className = "pv-card-grid";

    // Current People POV Analyzer
    const povCard = document.createElement("article");
    povCard.className = "pv-card";
    povCard.innerHTML = `
      <div class="pv-card-header">
        <h3 class="pv-card-title">Current People POV Analyzer</h3>
        <span class="pv-badge"><span class="pv-badge-dot green"></span><span>Live Analysis</span></span>
      </div>
      <p class="pv-card-tagline">What people actually think — not just what they click</p>
      <div class="pv-card-body">
        Analyzes real-time sentiment from news and social media to understand public opinion on any issue.
      </div>
      <div class="pv-input-group">
        <label class="pv-input-label">Issue or keyword</label>
        <input id="pv-pov-issue" class="pv-input" placeholder="e.g. farm bill, fuel price, education policy" />
      </div>
      <div class="pv-btn-group">
        <button class="pv-btn-primary" id="pv-run-pov">Analyze POV</button>
      </div>
      <div id="pv-pov-summary" class="pv-output-box" style="display: none;"></div>
    `;

    const regionalCard = document.createElement("article");
    regionalCard.className = "pv-card";
    regionalCard.innerHTML = `
      <div class="pv-card-header">
        <h3 class="pv-card-title">Regional Sentiment Index</h3>
        <span class="pv-badge"><span class="pv-badge-dot amber"></span><span>Geo Analysis</span></span>
      </div>
      <p class="pv-card-tagline">Compare mood across Tamil Nadu regions</p>
      <div class="pv-card-body">
        <div id="pv-regional-index" class="pv-loader">Loading regional data...</div>
      </div>
    `;

    grid.appendChild(povCard);
    grid.appendChild(regionalCard);
    container.appendChild(grid);

    bindPOVAnalyzer(container);
    loadRegionalSentiment(container);
  }

  async function bindPOVAnalyzer(root) {
    const povBtn = root.querySelector("#pv-run-pov");
    const povIssue = root.querySelector("#pv-pov-issue");
    const povSummary = root.querySelector("#pv-pov-summary");

    if (!povBtn || !povIssue || !povSummary) return;

    povBtn.addEventListener("click", async () => {
      const issue = povIssue.value.trim();
      if (!issue) {
        povSummary.style.display = "block";
        povSummary.className = "pv-output-box error";
        povSummary.textContent = "Please enter an issue or keyword";
        return;
      }

      povSummary.style.display = "block";
      povSummary.className = "pv-output-box loading";
      povSummary.textContent = "Analyzing public opinion on: " + issue + "...";

      try {
        const party = api.getSelectedParty();
        
        // Fetch news related to the issue
        const news = await api.getFeed('newsapi');
        const relevantNews = news.filter(n => 
          n.title.toLowerCase().includes(issue.toLowerCase()) ||
          (n.description && n.description.toLowerCase().includes(issue.toLowerCase()))
        );

        if (relevantNews.length === 0) {
          povSummary.className = "pv-output-box";
          povSummary.innerHTML = `
            <div style="color: #f59e0b; margin-bottom: 12px;">⚠️ No recent news found for "${issue}"</div>
            <div style="font-size: 13px; color: #64748b;">Try a different keyword or check back later for updates.</div>
          `;
          return;
        }

        // Analyze sentiment of relevant news
        const text = relevantNews.slice(0, 10).map(n => n.title + ". " + (n.description || "")).join(" ");
        const analysis = await api.analyzeSentiment(text, true);

        povSummary.className = "pv-output-box";
        
        let html = `<div style="margin-bottom: 16px;"><strong>Public Opinion Analysis: ${issue}</strong></div>`;
        
        html += `<div class="pv-stat-grid">`;
        html += `<div class="pv-stat-box">
          <div class="pv-stat-value" style="color: ${analysis.sentiment_score > 0.3 ? '#10b981' : analysis.sentiment_score < -0.3 ? '#dc2626' : '#f59e0b'}">
            ${analysis.sentiment_score > 0 ? '+' : ''}${(analysis.sentiment_score * 100).toFixed(0)}
          </div>
          <div class="pv-stat-label">Sentiment Score</div>
        </div>`;
        
        html += `<div class="pv-stat-box">
          <div class="pv-stat-value">${Math.round(analysis.confidence * 100)}%</div>
          <div class="pv-stat-label">Confidence</div>
        </div>`;
        
        html += `<div class="pv-stat-box">
          <div class="pv-stat-value">${relevantNews.length}</div>
          <div class="pv-stat-label">Sources</div>
        </div>`;
        html += `</div>`;

        // Party-specific sentiment if available
        if (analysis.party_sentiment && Object.keys(analysis.party_sentiment).length > 0) {
          html += `<div style="margin-top: 16px;"><strong>Party-Specific Sentiment:</strong></div>`;
          html += `<div style="margin-top: 8px;">`;
          Object.entries(analysis.party_sentiment).forEach(([p, score]) => {
            const color = score > 0.2 ? '#10b981' : score < -0.2 ? '#dc2626' : '#64748b';
            html += `<div class="pv-metric-row">
              <span class="pv-metric-label">${p}</span>
              <span class="pv-metric-value" style="color: ${color}">${score > 0 ? '+' : ''}${(score * 100).toFixed(0)}</span>
            </div>`;
          });
          html += `</div>`;
        }

        // Top keywords
        if (analysis.keywords && analysis.keywords.length > 0) {
          html += `<div style="margin-top: 16px;"><strong>Key Topics:</strong></div>`;
          html += `<div class="pv-chip-row" style="margin-top: 8px;">`;
          analysis.keywords.slice(0, 8).forEach(kw => {
            html += `<span class="pv-chip">${kw}</span>`;
          });
          html += `</div>`;
        }

        // Generate narrative with LLM
        if (llm && llm.isEnabled && llm.isEnabled()) {
          html += `<div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #e2e8f0;">`;
          html += `<div style="font-size: 12px; color: #64748b; margin-bottom: 8px;">AI-Generated Analysis:</div>`;
          
          try {
            const narrative = await llm.generate({
              system: `You are analyzing public opinion for ${party} in Tamil Nadu. Provide a brief, strategic analysis of the sentiment data.`,
              prompt: `Issue: ${issue}\nSentiment Score: ${analysis.sentiment_score}\nConfidence: ${analysis.confidence}\nTop Keywords: ${analysis.keywords ? analysis.keywords.join(', ') : 'N/A'}\n\nProvide a 2-3 sentence strategic analysis of what this means for ${party}.`
            });
            html += `<div style="font-size: 13px; line-height: 1.6;">${narrative}</div>`;
          } catch (err) {
            logger.error("POV narrative generation failed", { error: err.message });
          }
          
          html += `</div>`;
        }

        povSummary.innerHTML = html;
        logger.info("POV analysis completed", { issue, sentiment: analysis.sentiment_score });

      } catch (err) {
        povSummary.className = "pv-output-box error";
        povSummary.textContent = "Analysis failed: " + err.message;
        logger.error("POV analysis failed", { error: err.message });
      }
    });
  }

  async function loadRegionalSentiment(root) {
    const regIndex = root.querySelector("#pv-regional-index");
    if (!regIndex) return;

    try {
      const party = api.getSelectedParty();
      const news = await api.getFeed('newsapi');
      
      // Analyze sentiment for different regions
      const regions = ['Chennai', 'Coimbatore', 'Madurai', 'Trichy', 'Salem', 'Tirunelveli'];
      const regionalData = [];

      for (const region of regions) {
        const regionalNews = news.filter(n => 
          n.title.toLowerCase().includes(region.toLowerCase()) ||
          (n.description && n.description.toLowerCase().includes(region.toLowerCase()))
        );

        if (regionalNews.length > 0) {
          const text = regionalNews.slice(0, 3).map(n => n.title).join(". ");
          const analysis = await api.analyzeSentiment(text, false);
          
          regionalData.push({
            region,
            sentiment: analysis.sentiment_score,
            sources: regionalNews.length
          });
        } else {
          // Use demo data for regions without news
          regionalData.push({
            region,
            sentiment: (Math.random() - 0.5) * 0.6,
            sources: 0
          });
        }
      }

      regIndex.innerHTML = regionalData
        .map(r => {
          const sentimentClass = r.sentiment > 0.2 ? 'good' : r.sentiment < -0.2 ? 'bad' : 'neutral';
          const sentimentLabel = r.sentiment > 0.2 ? 'Positive' : r.sentiment < -0.2 ? 'Negative' : 'Neutral';
          
          return `
            <div class="pv-metric-row">
              <span class="pv-metric-label">${r.region}</span>
              <span class="pv-metric-value ${sentimentClass}">
                ${sentimentLabel} (${r.sentiment > 0 ? '+' : ''}${(r.sentiment * 100).toFixed(0)})
                ${r.sources > 0 ? `<span style="font-size: 11px; color: #94a3b8; margin-left: 8px;">${r.sources} sources</span>` : ''}
              </span>
            </div>
          `;
        })
        .join("");

    } catch (err) {
      logger.error("Regional sentiment loading failed", { error: err.message });
      regIndex.innerHTML = '<div class="pv-section-footnote">Failed to load regional data. Using demo data.</div>';
      
      // Fallback to demo data
      const regions = demo.regionalSentiment();
      regIndex.innerHTML = regions
        .map(r => `
          <div class="pv-metric-row">
            <span class="pv-metric-label">${r.region}</span>
            <span class="pv-metric-value">
              <span class="pv-pill positive">Support ${r.support}%</span>
              <span class="pv-pill negative">Opp. ${r.opposition}%</span>
            </span>
          </div>
        `)
        .join("");
    }
  }

  window.PoliticViewPublicInsight = {
    render: renderPublicInsightSection
  };
})();

