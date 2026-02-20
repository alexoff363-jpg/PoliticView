(function () {
  const logger = window.PoliticViewLogger;
  const api = window.PoliticViewApiClient;

  function renderInfluenceDetectionSection(container) {
    container.innerHTML = "";

    const grid = document.createElement("div");
    grid.className = "pv-card-grid";

    grid.appendChild(createFakePRCard());
    grid.appendChild(createBotNetworkCard());
    grid.appendChild(createMisinformationCard());

    container.appendChild(grid);
  }

  function createFakePRCard() {
    const card = document.createElement("article");
    card.className = "pv-card";
    card.innerHTML = `
      <div class="pv-card-header">
        <h3 class="pv-card-title">Fake PR Detection</h3>
        <span class="pv-badge"><span class="pv-badge-dot amber"></span><span>Active</span></span>
      </div>
      <p class="pv-card-tagline">Spot artificial narrative boosting before it becomes "reality"</p>
      <div class="pv-card-body">
        Analyzes news coverage patterns to detect coordinated PR campaigns and artificial amplification.
      </div>
      <div class="pv-btn-group">
        <button class="pv-btn-primary" id="pv-analyze-pr">Analyze Current News</button>
      </div>
      <div id="pv-pr-output" class="pv-output-box" style="display: none;"></div>
    `;

    setTimeout(() => {
      const btn = card.querySelector("#pv-analyze-pr");
      const output = card.querySelector("#pv-pr-output");
      
      if (btn && output) {
        btn.addEventListener("click", async () => {
          output.style.display = "block";
          output.className = "pv-output-box loading";
          output.textContent = "Analyzing news patterns...";

          try {
            const news = await api.getFeed('newsapi');
            const headlines = news.slice(0, 20).map(n => ({
              title: n.title,
              source: n.source,
              publishedAt: n.publishedAt
            }));

            const party = api.getSelectedParty();
            const response = await fetch('/api/analyze/pr-detection', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ headlines, party })
            });

            const result = await response.json();
            output.className = "pv-output-box";
            
            let html = `<div class="pv-stat-grid">`;
            html += `<div class="pv-stat-box">
              <div class="pv-stat-value" style="color: ${result.pr_score > 0.7 ? '#dc2626' : result.pr_score > 0.4 ? '#f59e0b' : '#10b981'}">${Math.round(result.pr_score * 100)}%</div>
              <div class="pv-stat-label">PR Score</div>
            </div>`;
            html += `<div class="pv-stat-box">
              <div class="pv-stat-value">${result.is_artificial ? 'YES' : 'NO'}</div>
              <div class="pv-stat-label">Artificial</div>
            </div>`;
            html += `</div>`;
            
            if (result.patterns && result.patterns.length > 0) {
              html += `<div style="margin-top: 16px;"><strong>Patterns Detected:</strong><ul style="margin: 8px 0; padding-left: 20px;">`;
              result.patterns.forEach(p => html += `<li>${p}</li>`);
              html += `</ul></div>`;
            }
            
            html += `<div style="margin-top: 12px; font-size: 13px; color: #64748b;">${result.analysis}</div>`;
            output.innerHTML = html;
            
            logger.info("PR Detection analysis completed", { score: result.pr_score });
          } catch (err) {
            output.className = "pv-output-box error";
            output.textContent = "Analysis failed: " + err.message;
            logger.error("PR Detection failed", { error: err.message });
          }
        });
      }
    }, 100);

    return card;
  }

  function createBotNetworkCard() {
    const card = document.createElement("article");
    card.className = "pv-card";
    card.innerHTML = `
      <div class="pv-card-header">
        <h3 class="pv-card-title">Bot Network Identification</h3>
        <span class="pv-badge"><span class="pv-badge-dot amber"></span><span>Active</span></span>
      </div>
      <p class="pv-card-tagline">Separate real people from synthetic crowds</p>
      <div class="pv-card-body">
        Clusters accounts by timing, phrasing, and behavior to surface coordinated bot activity.
      </div>
      <div class="pv-btn-group">
        <button class="pv-btn-primary" id="pv-analyze-bots">Analyze Social Media</button>
      </div>
      <div id="pv-bot-output" class="pv-output-box" style="display: none;"></div>
    `;

    setTimeout(() => {
      const btn = card.querySelector("#pv-analyze-bots");
      const output = card.querySelector("#pv-bot-output");
      
      if (btn && output) {
        btn.addEventListener("click", async () => {
          output.style.display = "block";
          output.className = "pv-output-box loading";
          output.textContent = "Analyzing social media patterns...";

          try {
            const [reddit, mastodon] = await Promise.all([
              api.getFeed('reddit').catch(() => []),
              api.getFeed('mastodon').catch(() => [])
            ]);

            const posts = [
              ...reddit.map(r => ({ author: 'reddit_user', content: r.title, timestamp: r.pubDate })),
              ...mastodon.map(m => ({ author: m.author, content: m.content, timestamp: Date.now() }))
            ];

            const response = await fetch('/api/analyze/bot-detection', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ posts: posts.slice(0, 50) })
            });

            const result = await response.json();
            output.className = "pv-output-box";
            
            let html = `<div class="pv-stat-grid">`;
            html += `<div class="pv-stat-box">
              <div class="pv-stat-value" style="color: ${result.bot_probability > 0.7 ? '#dc2626' : result.bot_probability > 0.4 ? '#f59e0b' : '#10b981'}">${Math.round(result.bot_probability * 100)}%</div>
              <div class="pv-stat-label">Bot Probability</div>
            </div>`;
            html += `<div class="pv-stat-box">
              <div class="pv-stat-value">${result.coordinated_accounts ? result.coordinated_accounts.length : 0}</div>
              <div class="pv-stat-label">Suspicious Accounts</div>
            </div>`;
            html += `</div>`;
            
            if (result.suspicious_patterns && result.suspicious_patterns.length > 0) {
              html += `<div style="margin-top: 16px;"><strong>Suspicious Patterns:</strong><ul style="margin: 8px 0; padding-left: 20px;">`;
              result.suspicious_patterns.forEach(p => html += `<li>${p}</li>`);
              html += `</ul></div>`;
            }
            
            html += `<div style="margin-top: 12px; font-size: 13px; color: #64748b;"><strong>Recommendation:</strong> ${result.recommendation}</div>`;
            output.innerHTML = html;
            
            logger.info("Bot detection analysis completed", { probability: result.bot_probability });
          } catch (err) {
            output.className = "pv-output-box error";
            output.textContent = "Analysis failed: " + err.message;
            logger.error("Bot detection failed", { error: err.message });
          }
        });
      }
    }, 100);

    return card;
  }

  function createMisinformationCard() {
    const card = document.createElement("article");
    card.className = "pv-card";
    card.innerHTML = `
      <div class="pv-card-header">
        <h3 class="pv-card-title">Misinformation Radar</h3>
        <span class="pv-badge"><span class="pv-badge-dot amber"></span><span>Monitoring</span></span>
      </div>
      <p class="pv-card-tagline">Catch fake stories while they are still small</p>
      <div class="pv-card-body">
        Flags low-credibility sources, recycled narratives, and suspicious content patterns for fact-checking.
      </div>
      <div class="pv-chip-row">
        <span class="pv-chip">Source credibility check</span>
        <span class="pv-chip">Narrative recycling detection</span>
        <span class="pv-chip">Cross-reference validation</span>
      </div>
    `;

    return card;
  }

  window.PoliticViewInfluenceDetection = {
    render: renderInfluenceDetectionSection
  };
})();

