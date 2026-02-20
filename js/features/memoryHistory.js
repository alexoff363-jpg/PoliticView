(function () {
  const logger = window.PoliticViewLogger;
  const api = window.PoliticViewApiClient;
  const llm = window.PoliticViewLlmClient;

  // In-memory storage for historical data (in production, use a database)
  const memoryStore = {
    issues: [],
    scandals: []
  };

  function renderMemoryHistorySection(container) {
    container.innerHTML = "";

    const grid = document.createElement("div");
    grid.className = "pv-card-grid";

    grid.appendChild(createIssueMemoryEngine());
    grid.appendChild(createScandalRecallSystem());
    grid.appendChild(createHistoricalAnalyzer());

    container.appendChild(grid);
  }

  function createIssueMemoryEngine() {
    const card = document.createElement("article");
    card.className = "pv-card";
    card.innerHTML = `
      <div class="pv-card-header">
        <h3 class="pv-card-title">Issue Memory Engine</h3>
        <span class="pv-badge"><span class="pv-badge-dot green"></span><span>AI Memory</span></span>
      </div>
      <p class="pv-card-tagline">Remember how people reacted last time</p>
      <div class="pv-card-body">
        AI analyzes historical reactions to similar issues to predict current sentiment patterns.
      </div>
      <div class="pv-input-group">
        <label class="pv-input-label">Issue or topic</label>
        <input id="pv-issue-memory-input" class="pv-input" placeholder="e.g. education reform, tax policy" />
      </div>
      <div class="pv-btn-group">
        <button class="pv-btn-primary" id="pv-recall-issue">Recall History</button>
        <button class="pv-btn-ghost" id="pv-save-issue">Save Current</button>
      </div>
      <div id="pv-issue-memory-output" class="pv-output-box" style="display: none;"></div>
    `;

    setTimeout(() => {
      const recallBtn = card.querySelector("#pv-recall-issue");
      const saveBtn = card.querySelector("#pv-save-issue");
      const input = card.querySelector("#pv-issue-memory-input");
      const output = card.querySelector("#pv-issue-memory-output");

      if (recallBtn && input && output) {
        recallBtn.addEventListener("click", async () => {
          const issue = input.value.trim();
          if (!issue) {
            output.style.display = "block";
            output.className = "pv-output-box error";
            output.textContent = "Please enter an issue or topic";
            return;
          }

          output.style.display = "block";
          output.className = "pv-output-box loading";
          output.textContent = "Searching historical data and analyzing patterns...";

          try {
            const party = api.getSelectedParty();
            
            // Check memory store for similar issues
            const similarIssues = memoryStore.issues.filter(i => 
              i.issue.toLowerCase().includes(issue.toLowerCase()) ||
              issue.toLowerCase().includes(i.issue.toLowerCase())
            );

            // Fetch current news for comparison
            const news = await api.getFeed('newsapi');
            const relevantNews = news.filter(n => 
              n.title.toLowerCase().includes(issue.toLowerCase()) ||
              (n.description && n.description.toLowerCase().includes(issue.toLowerCase()))
            );

            if (relevantNews.length === 0 && similarIssues.length === 0) {
              output.className = "pv-output-box";
              output.innerHTML = `
                <div style="color: #f59e0b;">⚠️ No historical or current data found for "${issue}"</div>
                <div style="margin-top: 12px; font-size: 13px; color: #64748b;">
                  Try a different keyword or save current data for future reference.
                </div>
              `;
              return;
            }

            // AI analysis of historical patterns
            if (llm && llm.isEnabled && llm.isEnabled()) {
              const historicalContext = similarIssues.length > 0 
                ? `Historical data: ${JSON.stringify(similarIssues.slice(0, 3))}`
                : "No historical data available";
              
              const currentContext = relevantNews.length > 0
                ? `Current news: ${relevantNews.slice(0, 5).map(n => n.title).join('; ')}`
                : "No current news available";

              const analysis = await llm.generate({
                system: `You are analyzing historical political patterns for ${party}. Compare past reactions to current sentiment.`,
                prompt: `Analyze the issue "${issue}" for ${party}:

${historicalContext}

${currentContext}

Return JSON: {
  "historical_sentiment": -1.0 to 1.0,
  "current_sentiment": -1.0 to 1.0,
  "pattern_match": 0.0-1.0,
  "key_differences": ["list"],
  "recommendations": ["list"],
  "risk_level": "low/medium/high",
  "summary": "brief analysis"
}`
              });

              try {
                let cleanContent = analysis.replace(/```json/g, '').replace(/```/g, '').trim();
                const result = JSON.parse(cleanContent);

                output.className = "pv-output-box";
                
                let html = `<div style="margin-bottom: 16px;"><strong>Historical Analysis: ${issue}</strong></div>`;
                
                html += `<div class="pv-stat-grid">`;
                html += `<div class="pv-stat-box">
                  <div class="pv-stat-value" style="color: ${result.historical_sentiment > 0 ? '#10b981' : '#dc2626'}">
                    ${result.historical_sentiment > 0 ? '+' : ''}${Math.round(result.historical_sentiment * 100)}
                  </div>
                  <div class="pv-stat-label">Historical</div>
                </div>`;
                html += `<div class="pv-stat-box">
                  <div class="pv-stat-value" style="color: ${result.current_sentiment > 0 ? '#10b981' : '#dc2626'}">
                    ${result.current_sentiment > 0 ? '+' : ''}${Math.round(result.current_sentiment * 100)}
                  </div>
                  <div class="pv-stat-label">Current</div>
                </div>`;
                html += `<div class="pv-stat-box">
                  <div class="pv-stat-value">${Math.round(result.pattern_match * 100)}%</div>
                  <div class="pv-stat-label">Pattern Match</div>
                </div>`;
                html += `<div class="pv-stat-box">
                  <div class="pv-stat-value" style="color: ${result.risk_level === 'high' ? '#dc2626' : result.risk_level === 'medium' ? '#f59e0b' : '#10b981'}">
                    ${result.risk_level.toUpperCase()}
                  </div>
                  <div class="pv-stat-label">Risk Level</div>
                </div>`;
                html += `</div>`;

                html += `<div style="margin-top: 16px;"><strong>Data Sources:</strong></div>`;
                html += `<div style="margin-top: 8px;">`;
                html += `<div class="pv-metric-row">
                  <span class="pv-metric-label">Historical Records</span>
                  <span class="pv-metric-value">${similarIssues.length}</span>
                </div>`;
                html += `<div class="pv-metric-row">
                  <span class="pv-metric-label">Current News</span>
                  <span class="pv-metric-value">${relevantNews.length}</span>
                </div>`;
                html += `</div>`;

                if (result.key_differences && result.key_differences.length > 0) {
                  html += `<div style="margin-top: 16px;"><strong>Key Differences from Past:</strong></div>`;
                  html += `<ul style="margin: 8px 0; padding-left: 20px; font-size: 13px;">`;
                  result.key_differences.forEach(d => html += `<li>${d}</li>`);
                  html += `</ul>`;
                }

                if (result.recommendations && result.recommendations.length > 0) {
                  html += `<div style="margin-top: 16px;"><strong>Recommendations:</strong></div>`;
                  html += `<ul style="margin: 8px 0; padding-left: 20px; font-size: 13px;">`;
                  result.recommendations.forEach(r => html += `<li>${r}</li>`);
                  html += `</ul>`;
                }

                html += `<div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #e2e8f0; font-size: 13px; line-height: 1.6;">
                  <strong>Summary:</strong> ${result.summary}
                </div>`;

                output.innerHTML = html;
                logger.info("Issue memory recall completed", { issue, patternMatch: result.pattern_match });

              } catch (e) {
                throw new Error("AI analysis parsing failed");
              }
            } else {
              output.className = "pv-output-box";
              output.innerHTML = `
                <div><strong>Historical Data Found: ${similarIssues.length} records</strong></div>
                <div style="margin-top: 12px;">Current News: ${relevantNews.length} articles</div>
                <div style="margin-top: 12px; font-size: 12px; color: #64748b;">
                  Enable Ollama for AI-powered historical pattern analysis.
                </div>
              `;
            }

          } catch (err) {
            output.className = "pv-output-box error";
            output.textContent = "Historical analysis failed: " + err.message;
            logger.error("Issue memory recall failed", { error: err.message });
          }
        });
      }

      if (saveBtn && input && output) {
        saveBtn.addEventListener("click", async () => {
          const issue = input.value.trim();
          if (!issue) {
            alert("Please enter an issue to save");
            return;
          }

          try {
            const party = api.getSelectedParty();
            const news = await api.getFeed('newsapi');
            const relevantNews = news.filter(n => 
              n.title.toLowerCase().includes(issue.toLowerCase())
            );

            if (relevantNews.length === 0) {
              alert("No current news found for this issue. Cannot save.");
              return;
            }

            // Analyze current sentiment
            const text = relevantNews.slice(0, 5).map(n => n.title).join(". ");
            const sentiment = await api.analyzeSentiment(text, false);

            // Save to memory
            memoryStore.issues.push({
              issue,
              party,
              timestamp: Date.now(),
              sentiment: sentiment.sentiment_score,
              confidence: sentiment.confidence,
              newsCount: relevantNews.length,
              headlines: relevantNews.slice(0, 3).map(n => n.title)
            });

            output.style.display = "block";
            output.className = "pv-output-box";
            output.innerHTML = `
              <div style="color: #10b981;">✅ Issue saved to memory</div>
              <div style="margin-top: 8px; font-size: 13px;">
                <strong>${issue}</strong> for ${party}<br>
                Sentiment: ${sentiment.sentiment_score > 0 ? '+' : ''}${Math.round(sentiment.sentiment_score * 100)}<br>
                Sources: ${relevantNews.length} articles<br>
                Timestamp: ${new Date().toLocaleString()}
              </div>
            `;

            logger.info("Issue saved to memory", { issue, party });

          } catch (err) {
            alert("Failed to save issue: " + err.message);
            logger.error("Issue save failed", { error: err.message });
          }
        });
      }
    }, 100);

    return card;
  }

  function createScandalRecallSystem() {
    const card = document.createElement("article");
    card.className = "pv-card";
    card.innerHTML = `
      <div class="pv-card-header">
        <h3 class="pv-card-title">Past Scandal Recall</h3>
        <span class="pv-badge"><span class="pv-badge-dot amber"></span><span>Ghost Detector</span></span>
      </div>
      <p class="pv-card-tagline">Avoid waking up old scandals</p>
      <div class="pv-card-body">
        AI checks if your messaging resembles past controversies or scandals.
      </div>
      <div class="pv-input-group">
        <label class="pv-input-label">Draft message or statement</label>
        <textarea id="pv-scandal-check-input" class="pv-textarea" placeholder="Paste your draft message to check for scandal similarities..."></textarea>
      </div>
      <div class="pv-btn-group">
        <button class="pv-btn-primary" id="pv-check-scandal">Check for Ghosts</button>
      </div>
      <div id="pv-scandal-check-output" class="pv-output-box" style="display: none;"></div>
    `;

    setTimeout(() => {
      const checkBtn = card.querySelector("#pv-check-scandal");
      const input = card.querySelector("#pv-scandal-check-input");
      const output = card.querySelector("#pv-scandal-check-output");

      if (checkBtn && input && output) {
        checkBtn.addEventListener("click", async () => {
          const message = input.value.trim();
          if (!message) {
            output.style.display = "block";
            output.className = "pv-output-box error";
            output.textContent = "Please enter a message to check";
            return;
          }

          output.style.display = "block";
          output.className = "pv-output-box loading";
          output.textContent = "Analyzing message for scandal similarities...";

          try {
            const party = api.getSelectedParty();

            // Check memory store for past scandals
            const pastScandals = memoryStore.scandals.filter(s => s.party === party);

            // AI analysis
            if (llm && llm.isEnabled && llm.isEnabled()) {
              const scandalContext = pastScandals.length > 0
                ? `Known past scandals for ${party}: ${JSON.stringify(pastScandals.slice(0, 5))}`
                : `No recorded scandals for ${party} in memory. Use general political scandal knowledge.`;

              const analysis = await llm.generate({
                system: `You are a political risk analyst. Check if this message could remind people of past scandals or controversies for ${party}.`,
                prompt: `Analyze this draft message for ${party}:

"${message}"

${scandalContext}

Return JSON: {
  "risk_score": 0.0-1.0,
  "triggers_memory": true/false,
  "similar_scandals": ["list of similar past issues"],
  "risky_phrases": ["list of phrases that could trigger memories"],
  "safe_alternatives": ["list of safer ways to phrase the message"],
  "recommendation": "approve/revise/reject",
  "explanation": "brief explanation"
}`
              });

              try {
                let cleanContent = analysis.replace(/```json/g, '').replace(/```/g, '').trim();
                const result = JSON.parse(cleanContent);

                output.className = "pv-output-box";
                
                let html = `<div style="margin-bottom: 16px;"><strong>Scandal Risk Analysis</strong></div>`;
                
                html += `<div class="pv-stat-grid">`;
                html += `<div class="pv-stat-box">
                  <div class="pv-stat-value" style="color: ${result.risk_score > 0.7 ? '#dc2626' : result.risk_score > 0.4 ? '#f59e0b' : '#10b981'}">
                    ${Math.round(result.risk_score * 100)}%
                  </div>
                  <div class="pv-stat-label">Risk Score</div>
                </div>`;
                html += `<div class="pv-stat-box">
                  <div class="pv-stat-value" style="color: ${result.triggers_memory ? '#dc2626' : '#10b981'}">
                    ${result.triggers_memory ? 'YES' : 'NO'}
                  </div>
                  <div class="pv-stat-label">Triggers Memory</div>
                </div>`;
                html += `<div class="pv-stat-box">
                  <div class="pv-stat-value" style="color: ${result.recommendation === 'approve' ? '#10b981' : result.recommendation === 'revise' ? '#f59e0b' : '#dc2626'}">
                    ${result.recommendation.toUpperCase()}
                  </div>
                  <div class="pv-stat-label">Recommendation</div>
                </div>`;
                html += `</div>`;

                if (result.similar_scandals && result.similar_scandals.length > 0) {
                  html += `<div style="margin-top: 16px;"><strong>⚠️ Similar Past Issues:</strong></div>`;
                  html += `<ul style="margin: 8px 0; padding-left: 20px; font-size: 13px; color: #dc2626;">`;
                  result.similar_scandals.forEach(s => html += `<li>${s}</li>`);
                  html += `</ul>`;
                }

                if (result.risky_phrases && result.risky_phrases.length > 0) {
                  html += `<div style="margin-top: 16px;"><strong>Risky Phrases Detected:</strong></div>`;
                  html += `<ul style="margin: 8px 0; padding-left: 20px; font-size: 13px; color: #f59e0b;">`;
                  result.risky_phrases.forEach(p => html += `<li>"${p}"</li>`);
                  html += `</ul>`;
                }

                if (result.safe_alternatives && result.safe_alternatives.length > 0) {
                  html += `<div style="margin-top: 16px;"><strong>✅ Safer Alternatives:</strong></div>`;
                  html += `<ul style="margin: 8px 0; padding-left: 20px; font-size: 13px; color: #10b981;">`;
                  result.safe_alternatives.forEach(a => html += `<li>${a}</li>`);
                  html += `</ul>`;
                }

                html += `<div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #e2e8f0; font-size: 13px; line-height: 1.6;">
                  <strong>Explanation:</strong> ${result.explanation}
                </div>`;

                output.innerHTML = html;
                logger.info("Scandal check completed", { riskScore: result.risk_score, recommendation: result.recommendation });

              } catch (e) {
                throw new Error("AI analysis parsing failed");
              }
            } else {
              output.className = "pv-output-box";
              output.innerHTML = `
                <div><strong>Past Scandals in Memory: ${pastScandals.length}</strong></div>
                <div style="margin-top: 12px; font-size: 12px; color: #64748b;">
                  Enable Ollama for AI-powered scandal similarity detection.
                </div>
              `;
            }

          } catch (err) {
            output.className = "pv-output-box error";
            output.textContent = "Scandal check failed: " + err.message;
            logger.error("Scandal check failed", { error: err.message });
          }
        });
      }
    }, 100);

    return card;
  }

  function createHistoricalAnalyzer() {
    const card = document.createElement("article");
    card.className = "pv-card";
    card.innerHTML = `
      <div class="pv-card-header">
        <h3 class="pv-card-title">Historical Pattern Analyzer</h3>
        <span class="pv-badge"><span class="pv-badge-dot green"></span><span>AI Learning</span></span>
      </div>
      <p class="pv-card-tagline">Learn from past campaigns and reactions</p>
      <div class="pv-card-body">
        AI analyzes historical patterns to identify what worked and what didn't in past campaigns.
      </div>
      <div class="pv-stat-grid" style="margin-top: 16px;">
        <div class="pv-stat-box">
          <div class="pv-stat-value" id="pv-memory-issues-count">0</div>
          <div class="pv-stat-label">Issues Stored</div>
        </div>
        <div class="pv-stat-box">
          <div class="pv-stat-value" id="pv-memory-scandals-count">0</div>
          <div class="pv-stat-label">Scandals Tracked</div>
        </div>
      </div>
      <div style="margin-top: 16px; font-size: 12px; color: #64748b; font-style: italic;">
        Memory persists during session. In production, connect to a database for permanent storage.
      </div>
    `;

    // Update counts periodically
    setInterval(() => {
      const issuesCount = document.getElementById("pv-memory-issues-count");
      const scandalsCount = document.getElementById("pv-memory-scandals-count");
      if (issuesCount) issuesCount.textContent = memoryStore.issues.length;
      if (scandalsCount) scandalsCount.textContent = memoryStore.scandals.length;
    }, 1000);

    return card;
  }

  window.PoliticViewMemoryHistory = {
    render: renderMemoryHistorySection,
    memoryStore // Expose for debugging
  };
})();

