(function () {
  const logger = window.PoliticViewLogger;

  function renderChiefStrategistSection(container) {
    container.innerHTML = "";

    const card = document.createElement("article");
    card.className = "pv-card";
    card.innerHTML = `
      <div class="pv-card-header">
        <h3 class="pv-card-title">Chief Strategist AI</h3>
        <span class="pv-badge"><span class="pv-badge-dot green"></span><span>Meta-brain</span></span>
      </div>
      <p class="pv-card-tagline">One cockpit that reads every signal and proposes the next move</p>
      <div class="pv-card-body">
        This flagship module sits on top of all layers — sentiment, manipulation detection, simulation, memory, and innovation — to
        generate prioritized strategic options for leaders.
      </div>
      <div class="pv-input-group">
        <label class="pv-input-label">Describe your current strategic dilemma</label>
        <textarea id="pv-strategist-input" class="pv-textarea" placeholder="e.g. We must respond to a sudden protest without looking defensive..."></textarea>
      </div>
      <div class="pv-btn-group">
        <button class="pv-btn-primary" id="pv-strategist-run">Generate Options</button>
        <span style="font-size: 12px; color: #64748b;" id="pv-strategist-model-indicator"></span>
      </div>
      <div id="pv-strategist-output" class="pv-output-box" style="display: none;"></div>
      <div style="margin-top: 12px; font-size: 12px; color: #64748b; font-style: italic;">
        In production, this endpoint should call your preferred LLM + retrieval stack with access to all PoliticView logs and experiments.
      </div>
    `;

    container.appendChild(card);

    const btn = container.querySelector("#pv-strategist-run");
    const input = container.querySelector("#pv-strategist-input");
    const output = container.querySelector("#pv-strategist-output");
    const modelIndicator = container.querySelector("#pv-strategist-model-indicator");

    const model = (window.POLITIC_VIEW_API_KEYS && window.POLITIC_VIEW_API_KEYS.llmModel) || "";
    if (modelIndicator) {
      modelIndicator.textContent = model
        ? `Model: ${model} (via Ollama)`
        : "Model: heuristic fallback (configure llmModel in apiKeys.js for Ollama)";
    }

    if (btn && input && output) {
      btn.addEventListener("click", async () => {
        const text = input.value.trim();
        if (!text) {
          output.style.display = "block";
          output.className = "pv-output-box error";
          output.textContent = "Describe the situation first.";
          return;
        }

        output.style.display = "block";
        output.className = "pv-output-box loading";
        output.textContent = "Gathering real-time intelligence & analyzing...";

        // Prefer Ollama if a model is configured, otherwise use heuristic
        const modelName =
          (window.POLITIC_VIEW_API_KEYS && window.POLITIC_VIEW_API_KEYS.llmModel) || "";

        if (modelName) {
          // Fetch context from news feed
          let context = "";
          let searchOnline = false;
          
          try {
            const api = window.PoliticViewApiClient;
            const party = api.getSelectedParty ? api.getSelectedParty() : "Global";
            
            // Try to get relevant news
            const news = await api.getFeed('newsapi').catch(() => []);
            
            if (news.length > 0) {
              // Filter news relevant to the query
              const relevantNews = news.filter(n => {
                const queryWords = text.toLowerCase().split(' ').filter(w => w.length > 3);
                const titleLower = n.title.toLowerCase();
                return queryWords.some(word => titleLower.includes(word));
              });
              
              if (relevantNews.length > 0) {
                context = "Current Headlines:\n" + relevantNews.slice(0, 5).map(n => "- " + n.title).join("\n");
              } else {
                context = "Recent Headlines:\n" + news.slice(0, 5).map(n => "- " + n.title).join("\n");
              }
            } else {
              // No news found, enable online search
              searchOnline = true;
              context = "No recent news available. AI will use general knowledge and online search if needed.";
            }
          } catch (e) {
            console.warn("Failed to fetch context for strategist", e);
            searchOnline = true;
            context = "Unable to fetch news. AI will use general knowledge.";
          }

          try {
            const api = window.PoliticViewApiClient;
            const party = api.getSelectedParty ? api.getSelectedParty() : "Global";

            const systemPrompt = party !== "Global"
              ? `You are the Chief Strategist for ${party} in Tamil Nadu. Your goal is to maximize ${party}'s reach and reputation. 
              
Analyze all data to highlight POSITIVES for ${party} and NEGATIVES/WEAKNESSES of opponents (DMK, ADMK, BJP, TVK). 
Suggest specific actions to improve ${party}'s standing. Be biased in favor of ${party} but grounded in data.

${searchOnline ? 'If you need more context, use your general knowledge about Tamil Nadu politics and recent events.' : ''}

Provide clear, actionable recommendations in plain text. Use paragraphs, not bullet points or special formatting.`
              : `You are the Chief Strategist AI module inside PoliticView. Summarize the situation and propose concise strategic options for a political leader. 
              
${searchOnline ? 'Use your general knowledge about Tamil Nadu politics if specific data is unavailable.' : ''}

Write in short professional paragraphs. Avoid bullet points, numbering, special symbols, or markdown formatting.`;

            const res = await fetch("/api/llm/strategist", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                prompt: `Context: ${context}\n\nUser Question: ${text}`,
                model: modelName,
                party: party,
                systemPrompt: systemPrompt
              })
            });
            
            if (!res.ok) {
              throw new Error(`LLM call failed (${res.status})`);
            }
            
            const json = await res.json();
            let content = (json && json.content) || "";
            
            // Clean up the content - remove markdown, special symbols, etc.
            content = cleanAIResponse(content);
            
            if (!content) {
              throw new Error("Empty response from AI");
            }
            
            output.className = "pv-output-box";
            
            // Format the output nicely
            let html = `<div style="margin-bottom: 16px;"><strong>Strategic Analysis for ${party}</strong></div>`;
            
            if (searchOnline) {
              html += `<div style="padding: 8px; background: #fef3c7; border-left: 3px solid #f59e0b; margin-bottom: 12px; font-size: 12px;">
                ℹ️ Limited news data available. AI used general knowledge for analysis.
              </div>`;
            }
            
            // Split into paragraphs and format
            const paragraphs = content.split('\n').filter(p => p.trim().length > 0);
            html += '<div style="line-height: 1.8; font-size: 14px;">';
            paragraphs.forEach(p => {
              html += `<p style="margin-bottom: 12px;">${escapeHtml(p.trim())}</p>`;
            });
            html += '</div>';
            
            output.innerHTML = html;
            logger.info("Chief Strategist AI (Ollama) suggestion generated", { model: modelName, party });
            return;
            
          } catch (err) {
            logger.error("Chief Strategist AI Ollama call failed, falling back", {
              error: err.message
            });
            output.className = "pv-output-box error";
            output.textContent = "AI analysis failed: " + err.message + ". Using heuristic fallback.";
            
            // Fall through to heuristic
          }
        }

        // Fallback heuristic
        const options = draftOptions(text);
        output.className = "pv-output-box";
        output.innerHTML = `
          <div style="margin-bottom: 16px;"><strong>Strategic Options (Heuristic)</strong></div>
          <div style="padding: 12px; background: #f8fafc; border-left: 3px solid #3b82f6; margin-bottom: 16px;">
            <div style="font-weight: 600; margin-bottom: 8px;">Option A: Deescalate & Empathize</div>
            <div style="font-size: 13px; line-height: 1.6;">${options.optionA}</div>
          </div>
          <div style="padding: 12px; background: #f8fafc; border-left: 3px solid #10b981; margin-bottom: 16px;">
            <div style="font-weight: 600; margin-bottom: 8px;">Option B: Stand Firm with Data</div>
            <div style="font-size: 13px; line-height: 1.6;">${options.optionB}</div>
          </div>
          <div style="font-size: 12px; color: #64748b; font-style: italic;">
            Enable Ollama for AI-powered strategic analysis with real-time data.
          </div>
        `;
        logger.info("Chief Strategist AI heuristic suggestion generated");
      });
    }
  }

  function cleanAIResponse(text) {
    if (!text) return "";
    
    // Remove markdown formatting
    text = text.replace(/```json/g, '');
    text = text.replace(/```/g, '');
    text = text.replace(/\*\*/g, ''); // Remove bold
    text = text.replace(/\*/g, ''); // Remove italics
    text = text.replace(/#{1,6}\s/g, ''); // Remove headers
    text = text.replace(/^\s*[-*+]\s/gm, ''); // Remove bullet points
    text = text.replace(/^\s*\d+\.\s/gm, ''); // Remove numbered lists
    
    // Remove excessive newlines
    text = text.replace(/\n{3,}/g, '\n\n');
    
    // Trim
    text = text.trim();
    
    return text;
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function draftOptions(text) {
    const lower = text.toLowerCase();
    const isCrisis = /protest|scandal|backlash|outrage|crisis|boycott/.test(lower);

    const optionA = isCrisis
      ? "Lower the temperature first: acknowledge emotions explicitly, signal listening, and announce a short, concrete consultation window."
      : "Lead with values and stories that resonate with everyday life, then introduce the policy mechanics gradually.";

    const optionB = isCrisis
      ? "Clarify non-negotiables calmly with supporting data, while offering targeted concessions that do not undercut the core objective."
      : "Publish a simple data-backed explainer and equip surrogates with three crisp talking points to repeat consistently.";

    return { optionA, optionB };
  }

  window.PoliticViewChiefStrategist = {
    render: renderChiefStrategistSection
  };
})();

