(function () {
  const logger = window.PoliticViewLogger;
  const demo = window.PoliticViewDemoData;

  document.addEventListener("DOMContentLoaded", () => {
    bindConsoleControls();
    bindSidebarNavigation();
    bindGlobalControls();
    renderAllFeatureSections();
    initializeCharts();
  });

  function bindConsoleControls() {
    const clear = document.getElementById("pv-clear-log");
    if (clear) {
      clear.addEventListener("click", () => {
        const target = document.getElementById("pv-log-output");
        if (target) target.textContent = "";
      });
    }
  }

  function bindSidebarNavigation() {
    const navItems = document.querySelectorAll(".pv-nav-item");
    const sections = document.querySelectorAll(".pv-feature-section");

    navItems.forEach((item) => {
      item.addEventListener("click", (e) => {
        e.preventDefault();
        const href = item.getAttribute("href");
        if (!href) return;

        const targetId = href.substring(1);
        const targetSection = document.getElementById(targetId);

        if (targetSection) {
          navItems.forEach((nav) => nav.classList.remove("active"));
          item.classList.add("active");

          targetSection.scrollIntoView({ behavior: "smooth", block: "start" });
          logger.info("Section navigated", { section: targetId });
        }
      });
    });

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const id = entry.target.id;
            navItems.forEach((nav) => {
              nav.classList.remove("active");
              if (nav.getAttribute("href") === `#${id}`) {
                nav.classList.add("active");
              }
            });
          }
        });
      },
      { threshold: 0.3 }
    );

    sections.forEach((section) => observer.observe(section));
  }

  function renderAllFeatureSections() {
    const map = {
      "core-intelligence": window.PoliticViewCoreIntelligence,
      "influence-detection": window.PoliticViewInfluenceDetection,
      "public-insight": window.PoliticViewPublicInsight,
      "strategy-intel": window.PoliticViewStrategyIntel,
      "content-engine": window.PoliticViewContentEngine,
      "simulation-prediction": window.PoliticViewSimulationPrediction,
      "geo-field": window.PoliticViewGeoField,
      "integration-ops": window.PoliticViewIntegrationOps,
      "performance-learning": window.PoliticViewPerformanceLearning,
      "innovation-layer": window.PoliticViewInnovationLayer,
      "memory-history": window.PoliticViewMemoryHistory,
      "chief-strategist": window.PoliticViewChiefStrategist
    };

    const bodies = document.querySelectorAll(".pv-feature-body[data-section-key]");
    bodies.forEach((el) => {
      const key = el.getAttribute("data-section-key");
      const mod = map[key];
      if (mod && typeof mod.render === "function") {
        mod.render(el);
      }
    });
  }

  function bindGlobalControls() {
    const refreshAll = document.getElementById("pv-refresh-all");
    if (refreshAll) {
      refreshAll.addEventListener("click", () => {
        initializeCharts(true);
        // Also refresh feed if possible, or just reload page? 
        // Ideally we should have a global refresh method.
        // For now, charts + specific sections re-render if we call them.
        renderAllFeatureSections();
        logger.info("Dashboard refreshed");
      });
    }

    const partySelect = document.getElementById("pv-party-select");
    if (partySelect) {
      partySelect.addEventListener("change", (e) => {
        const party = e.target.value;
        window.PoliticViewApiClient.setSelectedParty(party);
        // Trigger refresh
        initializeCharts(true);
        renderAllFeatureSections();
        logger.info("Party changed", { party });
      });
    }
  }

  let sentimentChart;
  let emotionChart;

  async function initializeCharts(force) {
    const ctxSentiment = document.getElementById("pv-sentiment-pulse-chart");
    const ctxEmotion = document.getElementById("pv-emotion-heatmap-chart");
    const trendContainer = document.getElementById("pv-trend-inflections");

    if (!ctxSentiment || !ctxEmotion || !trendContainer) return;

    let sentimentData = [];
    let emotions = {};
    let inflections = [];
    let labels = [];
    let values = [];

    const api = window.PoliticViewApiClient;
    const party = api.getSelectedParty();

    // Show loading state
    if (!sentimentChart || force) {
      trendContainer.innerHTML = '<div class="pv-loader">Loading data for ' + party + '...</div>';
    }

    try {
      if (!api.isDemoMode()) {
        console.log("Fetching real data for", party, "...");

        // 1. Fetch Trends (using Google Trends data from backend)
        const trendData = await api.getTrends();
        if (trendData && trendData.length > 0) {
          labels = trendData.map(d => {
            const date = new Date(d.formattedTime || d.time * 1000);
            return date.toLocaleDateString();
          });
          
          // Find the index for the selected party in the trend data
          // Google Trends returns value array with one value per keyword
          const partyIndex = trendData[0]?.value ? 0 : 0; // Simplified - in production, map party to correct index
          values = trendData.map(d => d.value[partyIndex] || d.value[0]);
        } else {
          throw new Error("No trend data");
        }

        // 2. Fetch News & Analyze Emotion
        const news = await api.getFeed('newsapi');
        if (news && news.length > 0) {
          // Inflections from headlines
          inflections = news.slice(0, 4).map(n => {
            const date = new Date(n.publishedAt);
            const hoursAgo = Math.round((Date.now() - date.getTime()) / (1000 * 60 * 60));
            return {
              title: n.title,
              impact: n.source,
              severity: hoursAgo < 6 ? "high" : hoursAgo < 24 ? "medium" : "watch",
              scoreChange: 0,
              horizon: hoursAgo < 1 ? "Now" : hoursAgo < 24 ? hoursAgo + "h ago" : date.toLocaleDateString()
            };
          });

          // Analyze emotion of combined text with online search enabled
          const text = news.slice(0, 10).map(n => n.title + ". " + (n.description || "")).join(" ");
          const analysis = await api.analyzeSentiment(text, true);
          
          if (analysis.confidence && analysis.confidence < 0.6) {
            logger.warn("Low confidence sentiment analysis", { confidence: analysis.confidence });
          }
          
          emotions = analysis.emotions || { neutral: 1 };
          
          // Update inflections with party-specific sentiment if available
          if (analysis.party_sentiment && analysis.party_sentiment[party]) {
            const partySentiment = analysis.party_sentiment[party];
            inflections.forEach(inf => {
              inf.scoreChange = Math.round(partySentiment * 10);
            });
          }
        } else {
          emotions = demo.emotionHeatmap();
          inflections = demo.trendInflections();
        }

      } else {
        throw new Error("Demo Mode");
      }
    } catch (e) {
      console.warn("Using demo data for charts:", e.message);
      sentimentData = demo.sentimentPulse();
      emotions = demo.emotionHeatmap();
      inflections = demo.trendInflections();
      labels = sentimentData.map((p) => p.t);
      values = sentimentData.map((p) => p.sentiment * 100);
    }

    // -- Render Charts --

    // Sentiment/Interest Chart
    if (sentimentChart && force) {
      sentimentChart.destroy();
      sentimentChart = null;
    }
    if (!sentimentChart) {
      sentimentChart = new Chart(ctxSentiment, {
        type: "line",
        data: {
          labels,
          datasets: [
            {
              label: party + " Interest Trend",
              data: values,
              borderColor: getPartyColor(party),
              backgroundColor: getPartyColor(party, 0.1),
              tension: 0.35,
              fill: true,
              pointRadius: 3,
              pointHoverRadius: 5
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          plugins: {
            legend: { display: true },
            tooltip: {
              callbacks: {
                label: function(context) {
                  return party + ': ' + context.parsed.y.toFixed(1);
                }
              }
            }
          },
          scales: {
            x: {
              display: true,
              ticks: { color: "#64748b", maxRotation: 45 },
              grid: { display: false }
            },
            y: {
              ticks: { color: "#64748b" },
              grid: { color: "#e2e8f0" }
            }
          }
        }
      });
    } else if (!force && sentimentChart) {
      sentimentChart.data.labels = labels;
      sentimentChart.data.datasets[0].data = values;
      sentimentChart.data.datasets[0].label = party + " Interest Trend";
      sentimentChart.data.datasets[0].borderColor = getPartyColor(party);
      sentimentChart.data.datasets[0].backgroundColor = getPartyColor(party, 0.1);
      sentimentChart.update();
    }

    // Emotion Radar Chart
    const emotionLabels = Object.keys(emotions);
    const emotionValues = emotionLabels.map((k) => emotions[k] * 100);

    if (emotionChart && force) {
      emotionChart.destroy();
      emotionChart = null;
    }
    if (!emotionChart) {
      emotionChart = new Chart(ctxEmotion, {
        type: "radar",
        data: {
          labels: emotionLabels.map(l => l.charAt(0).toUpperCase() + l.slice(1)),
          datasets: [
            {
              label: "Intensity",
              data: emotionValues,
              borderColor: getPartyColor(party),
              backgroundColor: getPartyColor(party, 0.2),
              pointBackgroundColor: getPartyColor(party),
              pointBorderColor: "#fff",
              pointHoverBackgroundColor: "#fff",
              pointHoverBorderColor: getPartyColor(party)
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          plugins: { legend: { display: false } },
          scales: {
            r: {
              angleLines: { color: "#e2e8f0" },
              grid: { color: "#e2e8f0" },
              pointLabels: { color: "#475569", font: { size: 11 } },
              ticks: { display: false },
              min: 0,
              max: 100
            }
          }
        }
      });
    } else if (!force && emotionChart) {
      emotionChart.data.labels = emotionLabels.map(l => l.charAt(0).toUpperCase() + l.slice(1));
      emotionChart.data.datasets[0].data = emotionValues;
      emotionChart.data.datasets[0].borderColor = getPartyColor(party);
      emotionChart.data.datasets[0].backgroundColor = getPartyColor(party, 0.2);
      emotionChart.data.datasets[0].pointBackgroundColor = getPartyColor(party);
      emotionChart.update();
    }

    // Inflections List
    trendContainer.innerHTML = "";
    if (inflections.length === 0) {
      trendContainer.innerHTML = '<div class="pv-section-footnote">No recent trend warnings for ' + party + '</div>';
    } else {
      inflections.forEach((inf) => {
        const div = document.createElement("div");
        div.className = "pv-trend-item";
        if (inf.severity === "high") div.classList.add("danger");
        else if (inf.severity === "medium") div.classList.add("warning");

        div.innerHTML = `
          <div style="font-weight: 600; margin-bottom: 4px;">${inf.title}</div>
          <div style="color: #64748b; font-size: 12px;">${inf.impact}</div>
          <div style="margin-top: 8px; font-size: 11px; color: #94a3b8;">
            ${inf.horizon} | Impact: ${inf.scoreChange > 0 ? "+" : ""}${inf.scoreChange} pts
          </div>
        `;
        trendContainer.appendChild(div);
      });
    }
  }

  function getPartyColor(party, alpha = 1) {
    const colors = {
      'TVK': alpha === 1 ? '#dc2626' : `rgba(220, 38, 38, ${alpha})`,
      'DMK': alpha === 1 ? '#ef4444' : `rgba(239, 68, 68, ${alpha})`,
      'ADMK': alpha === 1 ? '#10b981' : `rgba(16, 185, 129, ${alpha})`,
      'BJP': alpha === 1 ? '#f97316' : `rgba(249, 115, 22, ${alpha})`
    };
    return colors[party] || (alpha === 1 ? '#3b82f6' : `rgba(59, 130, 246, ${alpha})`);
  }
})();
