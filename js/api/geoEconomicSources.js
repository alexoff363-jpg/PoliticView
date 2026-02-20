(function () {
  const { httpGet, isDemoMode } = window.PoliticViewApiClient;
  const logger = window.PoliticViewLogger;

  async function fetchGdeltEvents({ query = "ELECTION", timespan = "1d" } = {}) {
    if (isDemoMode()) {
      logger.info("Using demo mode for GDELT");
      return {
        provider: "gdelt (demo)",
        events: []
      };
    }
    const url =
      "https://api.gdeltproject.org/api/v2/events/doc/doc?" +
      new URLSearchParams({
        query,
        timespan,
        format: "json"
      });
    const json = await httpGet(url);
    return {
      provider: "gdelt",
      events: (json.articles || []).slice(0, 100)
    };
  }

  async function fetchWorldBankIndicator({ indicator = "SP.POP.TOTL", country = "WLD" } = {}) {
    // World Bank API does not require a key
    if (isDemoMode()) {
      logger.info("Using demo mode for World Bank");
      return {
        provider: "worldbank (demo)",
        series: []
      };
    }
    const url = `https://api.worldbank.org/v2/country/${country}/indicator/${indicator}?format=json`;
    const json = await httpGet(url);
    const series = Array.isArray(json) && json[1] ? json[1] : [];
    return {
      provider: "worldbank",
      series
    };
  }

  window.PoliticViewGeoEconomicSources = {
    fetchGdeltEvents,
    fetchWorldBankIndicator
  };
})();

