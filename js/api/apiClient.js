(function () {
  const logger = window.PoliticViewLogger;
  const keys = window.POLITIC_VIEW_API_KEYS || {};

  let demoMode = false;

  function isDemoMode() {
    return demoMode;
  }

  function setDemoMode(value) {
    demoMode = !!value;
    logger.info("Demo mode " + (demoMode ? "ENABLED" : "DISABLED"));
  }

  function getKey(name) {
    return keys[name] || "";
  }

  async function request(url, options = {}) {
    logger.info("API Request", { url, method: options.method || "GET" });
    try {
      const res = await fetch(url, {
        ...options,
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json",
          ...(options.headers || {})
        }
      });
      if (!res.ok) {
        const text = await res.text();
        logger.warn("HTTP error", { url, status: res.status, body: text.slice(0, 200) });
        throw new Error(`Request failed (${res.status})`);
      }
      return await res.json();
    } catch (err) {
      logger.error("Network error", { url, error: err.message });
      throw err;
    }
  }

  let currentParty = "BJP";

  function getSelectedParty() {
    return currentParty;
  }

  function setSelectedParty(party) {
    currentParty = party;
    logger.info("Party switched", { party });
  }

  async function getFeed(source) {
    return request(`/api/feeds/${source}?party=${encodeURIComponent(currentParty)}`);
  }

  async function getTrends() {
    return request(`/api/feeds/trends?party=${encodeURIComponent(currentParty)}`);
  }

  async function getAllFeeds() {
    return request(`/api/feeds/all?party=${encodeURIComponent(currentParty)}`);
  }

  async function analyzeSentiment(text, searchOnline = false) {
    return request(`/api/analyze/sentiment-enhanced`, {
      method: "POST",
      body: JSON.stringify({ text, party: currentParty, searchOnline })
    });
  }

  async function analyzeHeatmap(context) {
    return request(`/api/analyze/heatmap`, {
      method: "POST",
      body: JSON.stringify({ context, party: currentParty })
    });
  }

  window.PoliticViewApiClient = {
    isDemoMode,
    setDemoMode,
    getKey,
    request,
    getFeed,
    getTrends,
    getAllFeeds,
    analyzeSentiment,
    analyzeHeatmap,
    getSelectedParty,
    setSelectedParty
  };
})();

