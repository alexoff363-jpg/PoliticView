(function () {
  const logger = window.PoliticViewLogger;
  const api = window.PoliticViewApiClient;
  const llm = window.PoliticViewLlmClient;

  function renderIntegrationOpsSection(container) {
    container.innerHTML = "";

    const grid = document.createElement("div");
    grid.className = "pv-card-grid";

    grid.appendChild(createMediaMonitoringHub());
    grid.appendChild(createDataAggregator());
    grid.appendChild(createCrossSourceAnalyzer());

    container.appendChild(grid);
  }

  function createMediaMonitoringHub() {
    const card = document.createElement("article");
    card.className = "pv-card";
    card.innerHTML = `
      <div class="pv-card-header">
        <h3 class="pv-card-title">Media Monitoring Hub</h3>
        <span class="pv-badge"><span class="pv-badge-dot green"></span><span>Live</span></span>
      </div>
      <p class="pv-card-tagline">Unified view of all data sources</p>
      <div class="pv-card-body">
        Real-time aggregation from NewsAPI, Reddit, Mastodon, GDELT, and Google Trends.
      </div>
      <div class="pv-btn-group">
        <button class="pv-btn-primary" id="pv-load-hub">Load All Sources</button>
        <button class="pv-btn-ghost" id="pv-export-hub">Export Data</button>
      </div>
      <div id="pv-hub-output" class="pv-output-box" style="display: none;"></div>
    `;

    setTimeout(() => {
      const loadBtn = card.querySelector("#pv-load-hub");
      const exportBtn = card.querySelector("#pv-export-hub");
      const output = card.querySelector("#pv-hub-output");

      if (loadBtn && output) {
        loadBtn.addEventListener("click", async () => {
          output.style.display = "block";
          output.className = "pv-output-box loading";
          output.textContent = "Aggregating all data sources...";

          try {
            const party = api.getSelectedParty();
            
            // Fetch all sources in parallel
            const [news, reddit, mastodon, gdelt, newsdata, youtube, trends] = await Promise.allSettled([
              api.getFeed('newsapi'),
              api.getFeed('reddit'),
              api.getFeed('mastodon'),
              api.getFeed('gdelt'),
              api.getFeed('newsdata'),
              api.getFeed('youtube'),
              api.getTrends()
            ]);

            const aggregated = {
              news: news.status === 'fulfilled' ? news.value : [],
              reddit: reddit.status === 'fulfilled' ? reddit.value : [],
              mastodon: mastodon.status === 'fulfilled' ? mastodon.value : [],
              gdelt: gdelt.status === 'fulfilled' ? gdelt.value : [],
              newsdata: newsdata.status === 'fulfilled' ? newsdata.value : [],
              youtube: youtube.status === 'fulfilled' ? youtube.value : [],
              trends: trends.status === 'fulfilled' ? trends.value : []
            };

            // Store in window for export
            window.PV_AGGREGATED_DATA = aggregated;

            // Calculate statistics
            const totalItems = 
              aggregated.news.length + 
              aggregated.reddit.length + 
              aggregated.mastodon.length + 
              aggregated.gdelt.length +
              aggregated.newsdata.length +
              aggregated.youtube.length;

            output.className = "pv-output-box";
            
            let html = `<div style="margin-bottom: 16px;"><strong>Data Aggregation Complete for ${party}</strong></div>`;
            html += `<div style="padding: 8px; background: #dbeafe; border-left: 3px solid #3b82f6; margin-bottom: 12px; font-size: 12px;">
              ℹ️ All sources filtered for English content only
            </div>`;
            
            html += `<div class="pv-stat-grid">`;
            html += `<div class="pv-stat-box">
              <div class="pv-stat-value">${totalItems}</div>
              <div class="pv-stat-label">Total Items</div>
            </div>`;
            html += `<div class="pv-stat-box">
              <div class="pv-stat-value">${aggregated.news.length}</div>
              <div class="pv-stat-label">NewsAPI</div>
            </div>`;
            html += `<div class="pv-stat-box">
              <div class="pv-stat-value">${aggregated.newsdata.length}</div>
              <div class="pv-stat-label">NewsData.io</div>
            </div>`;
            html += `<div class="pv-stat-box">
              <div class="pv-stat-value">${aggregated.gdelt.length}</div>
              <div class="pv-stat-label">GDELT</div>
            </div>`;
            html += `<div class="pv-stat-box">
              <div class="pv-stat-value">${aggregated.youtube.length}</div>
              <div class="pv-stat-label">YouTube</div>
            </div>`;
            html += `<div class="pv-stat-box">
              <div class="pv-stat-value">${aggregated.reddit.length}</div>
              <div class="pv-stat-label">Reddit</div>
            </div>`;
            html += `<div class="pv-stat-box">
              <div class="pv-stat-value">${aggregated.mastodon.length}</div>
              <div class="pv-stat-label">Mastodon</div>
            </div>`;
            html += `<div class="pv-stat-box">
              <div class="pv-stat-value">${aggregated.gdelt.length}</div>
              <div class="pv-stat-label">GDELT Articles</div>
            </div>`;
            html += `<div class="pv-stat-box">
              <div class="pv-stat-value">${aggregated.trends.length}</div>
              <div class="pv-stat-label">Trend Points</div>
            </div>`;
            html += `</div>`;

            // AI Summary
            if (llm && llm.isEnabled && llm.isEnabled()) {
              html += `<div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #e2e8f0;">`;
              html += `<div style="font-size: 12px; color: #64748b; margin-bottom: 8px;">AI-Generated Summary:</div>`;
              
              try {
                const summaryText = `
                  News: ${aggregated.news.slice(0, 3).map(n => n.title).join('; ')}
                  Reddit: ${aggregated.reddit.slice(0, 3).map(r => r.title).join('; ')}
                  Total items: ${totalItems}
                `;
                
                const summary = await llm.generate({
                  system: `You are analyzing aggregated political data for ${party}. Provide a brief 2-3 sentence summary of the current narrative landscape.`,
                  prompt: `Summarize the current political narrative based on this data: ${summaryText}`
                });
                
                html += `<div style="font-size: 13px; line-height: 1.6;">${summary}</div>`;
              } catch (err) {
                logger.error("Hub summary generation failed", { error: err.message });
              }
              
              html += `</div>`;
            }

            html += `<div style="margin-top: 12px; font-size: 12px; color: #64748b;">
              Data cached in memory. Click "Export Data" to download as JSON.
            </div>`;

            output.innerHTML = html;
            logger.info("Media hub aggregation completed", { totalItems, party });

          } catch (err) {
            output.className = "pv-output-box error";
            output.textContent = "Aggregation failed: " + err.message;
            logger.error("Media hub aggregation failed", { error: err.message });
          }
        });
      }

      if (exportBtn) {
        exportBtn.addEventListener("click", () => {
          if (!window.PV_AGGREGATED_DATA) {
            alert("Please load data first by clicking 'Load All Sources'");
            return;
          }

          const dataStr = JSON.stringify(window.PV_AGGREGATED_DATA, null, 2);
          const blob = new Blob([dataStr], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `politicview-data-${api.getSelectedParty()}-${Date.now()}.json`;
          a.click();
          URL.revokeObjectURL(url);
          
          logger.info("Data exported", { party: api.getSelectedParty() });
        });
      }
    }, 100);

    return card;
  }

  function createDataAggregator() {
    const card = document.createElement("article");
    card.className = "pv-card";
    card.innerHTML = `
      <div class="pv-card-header">
        <h3 class="pv-card-title">Cross-Source Validator</h3>
        <span class="pv-badge"><span class="pv-badge-dot amber"></span><span>AI-Powered</span></span>
      </div>
      <p class="pv-card-tagline">Verify stories across multiple sources</p>
      <div class="pv-card-body">
        AI analyzes if the same story appears across different sources with consistent facts.
      </div>
      <div class="pv-input-group">
        <label class="pv-input-label">Story headline or keyword</label>
        <input id="pv-cross-source-input" class="pv-input" placeholder="e.g. education reform, rally attendance" />
      </div>
      <div class="pv-btn-group">
        <button class="pv-btn-primary" id="pv-validate-story">Validate Story</button>
      </div>
      <div id="pv-validate-output" class="pv-output-box" style="display: none;"></div>
    `;

    setTimeout(() => {
      const validateBtn = card.querySelector("#pv-validate-story");
      const input = card.querySelector("#pv-cross-source-input");
      const output = card.querySelector("#pv-validate-output");

      if (validateBtn && input && output) {
        validateBtn.addEventListener("click", async () => {
          const keyword = input.value.trim();
          if (!keyword) {
            output.style.display = "block";
            output.className = "pv-output-box error";
            output.textContent = "Please enter a story headline or keyword";
            return;
          }

          output.style.display = "block";
          output.className = "pv-output-box loading";
          output.textContent = "Searching across all sources...";

          try {
            // Fetch all sources
            const [news, reddit, gdelt] = await Promise.all([
              api.getFeed('newsapi'),
              api.getFeed('reddit'),
              api.getFeed('gdelt')
            ]);

            // Filter for keyword
            const matchingNews = news.filter(n => 
              n.title.toLowerCase().includes(keyword.toLowerCase()) ||
              (n.description && n.description.toLowerCase().includes(keyword.toLowerCase()))
            );
            const matchingReddit = reddit.filter(r => 
              r.title.toLowerCase().includes(keyword.toLowerCase())
            );
            const matchingGdelt = gdelt.filter(g => 
              g.title.toLowerCase().includes(keyword.toLowerCase())
            );

            const totalMatches = matchingNews.length + matchingReddit.length + matchingGdelt.length;

            if (totalMatches === 0) {
              output.className = "pv-output-box";
              output.innerHTML = `<div style="color: #f59e0b;">⚠️ No matches found for "${keyword}"</div>`;
              return;
            }

            // AI validation
            if (llm && llm.isEnabled && llm.isEnabled()) {
              const allHeadlines = [
                ...matchingNews.map(n => n.title),
                ...matchingReddit.map(r => r.title),
                ...matchingGdelt.map(g => g.title)
              ].join('\n');

              const validation = await llm.generate({
                system: "You are a fact-checking analyst. Analyze if these headlines tell a consistent story or if there are contradictions.",
                prompt: `Analyze these headlines about "${keyword}":\n\n${allHeadlines}\n\nReturn JSON: { "consistency_score": 0.0-1.0, "is_consistent": true/false, "contradictions": ["list"], "summary": "brief analysis" }`
              });

              try {
                let cleanContent = validation.replace(/```json/g, '').replace(/```/g, '').trim();
                const result = JSON.parse(cleanContent);

                output.className = "pv-output-box";
                
                let html = `<div style="margin-bottom: 16px;"><strong>Cross-Source Validation: ${keyword}</strong></div>`;
                
                html += `<div class="pv-stat-grid">`;
                html += `<div class="pv-stat-box">
                  <div class="pv-stat-value">${totalMatches}</div>
                  <div class="pv-stat-label">Total Matches</div>
                </div>`;
                html += `<div class="pv-stat-box">
                  <div class="pv-stat-value" style="color: ${result.consistency_score > 0.7 ? '#10b981' : result.consistency_score > 0.4 ? '#f59e0b' : '#dc2626'}">
                    ${Math.round(result.consistency_score * 100)}%
                  </div>
                  <div class="pv-stat-label">Consistency</div>
                </div>`;
                html += `<div class="pv-stat-box">
                  <div class="pv-stat-value">${result.is_consistent ? 'YES' : 'NO'}</div>
                  <div class="pv-stat-label">Consistent</div>
                </div>`;
                html += `</div>`;

                html += `<div style="margin-top: 16px;"><strong>Sources:</strong></div>`;
                html += `<div style="margin-top: 8px;">`;
                html += `<div class="pv-metric-row">
                  <span class="pv-metric-label">News Articles</span>
                  <span class="pv-metric-value">${matchingNews.length}</span>
                </div>`;
                html += `<div class="pv-metric-row">
                  <span class="pv-metric-label">Reddit Posts</span>
                  <span class="pv-metric-value">${matchingReddit.length}</span>
                </div>`;
                html += `<div class="pv-metric-row">
                  <span class="pv-metric-label">GDELT Articles</span>
                  <span class="pv-metric-value">${matchingGdelt.length}</span>
                </div>`;
                html += `</div>`;

                if (result.contradictions && result.contradictions.length > 0) {
                  html += `<div style="margin-top: 16px;"><strong>Contradictions Found:</strong></div>`;
                  html += `<ul style="margin: 8px 0; padding-left: 20px; font-size: 13px;">`;
                  result.contradictions.forEach(c => html += `<li>${c}</li>`);
                  html += `</ul>`;
                }

                html += `<div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #e2e8f0; font-size: 13px; line-height: 1.6;">
                  <strong>Analysis:</strong> ${result.summary}
                </div>`;

                output.innerHTML = html;
                logger.info("Cross-source validation completed", { keyword, consistency: result.consistency_score });

              } catch (e) {
                throw new Error("AI validation parsing failed");
              }
            } else {
              output.className = "pv-output-box";
              output.innerHTML = `
                <div><strong>Matches Found: ${totalMatches}</strong></div>
                <div style="margin-top: 12px;">
                  News: ${matchingNews.length} | Reddit: ${matchingReddit.length} | GDELT: ${matchingGdelt.length}
                </div>
                <div style="margin-top: 12px; font-size: 12px; color: #64748b;">
                  Enable Ollama for AI-powered consistency analysis.
                </div>
              `;
            }

          } catch (err) {
            output.className = "pv-output-box error";
            output.textContent = "Validation failed: " + err.message;
            logger.error("Cross-source validation failed", { error: err.message });
          }
        });
      }
    }, 100);

    return card;
  }

  function createCrossSourceAnalyzer() {
    const card = document.createElement("article");
    card.className = "pv-card";
    card.innerHTML = `
      <div class="pv-card-header">
        <h3 class="pv-card-title">Narrative Tracker</h3>
        <span class="pv-badge"><span class="pv-badge-dot green"></span><span>Real-Time</span></span>
      </div>
      <p class="pv-card-tagline">Track how narratives evolve across sources</p>
      <div class="pv-card-body">
        Monitor how the same story is framed differently across news outlets, social media, and blogs.
      </div>
      <div class="pv-chip-row">
        <span class="pv-chip">Framing analysis</span>
        <span class="pv-chip">Source bias detection</span>
        <span class="pv-chip">Timeline tracking</span>
      </div>
      <div style="margin-top: 16px; font-size: 12px; color: #64748b; font-style: italic;">
        Normalizes inputs from all APIs into a common schema for higher-level reasoning.
      </div>
    `;

    return card;
  }

  window.PoliticViewIntegrationOps = {
    render: renderIntegrationOpsSection
  };
})();

