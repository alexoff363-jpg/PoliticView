(function () {
  const { httpGet, getKey, isDemoMode } = window.PoliticViewApiClient;
  const demo = window.PoliticViewDemoData;
  const logger = window.PoliticViewLogger;

  async function fetchNewsApiOrg({ query = "politics", language = "en" } = {}) {
    const key = getKey("newsapiOrg");
    if (!key || isDemoMode()) {
      logger.info("Using demo data for NewsAPI.org");
      return {
        provider: "newsapi.org (demo)",
        articles: []
      };
    }
    const url =
      "https://newsapi.org/v2/everything?" +
      new URLSearchParams({
        q: query,
        language,
        sortBy: "publishedAt",
        apiKey: key
      });
    const json = await httpGet(url);
    return {
      provider: "newsapi.org",
      total: json.totalResults,
      articles: (json.articles || []).slice(0, 30)
    };
  }

  async function fetchNewsDataIo({ query = "politics", language = "en" } = {}) {
    const key = getKey("newsdataIo");
    if (!key || isDemoMode()) {
      logger.info("Using demo data for NewsData.io");
      return {
        provider: "newsdata.io (demo)",
        articles: []
      };
    }
    const url =
      "https://newsdata.io/api/1/news?" +
      new URLSearchParams({
        apikey: key,
        q: query,
        language
      });
    const json = await httpGet(url);
    return {
      provider: "newsdata.io",
      total: json.totalResults,
      articles: (json.results || []).slice(0, 30)
    };
  }

  async function fetchWebzIo({ query = "politics" } = {}) {
    const key = getKey("webzIo");
    if (!key || isDemoMode()) {
      logger.info("Using demo data for Webz.io");
      return {
        provider: "webz.io (demo)",
        articles: []
      };
    }
    const url =
      "https://api.webz.io/news_api_v3/search?" +
      new URLSearchParams({
        token: key,
        q: query,
        sort: "published"
      });
    const json = await httpGet(url);
    return {
      provider: "webz.io",
      total: json.totalResults,
      articles: (json.posts || []).slice(0, 30)
    };
  }

  // High-level helper: aggregate multiple news sources
  async function fetchUnifiedNews(options) {
    const results = await Promise.allSettled([
      fetchNewsApiOrg(options),
      fetchNewsDataIo(options),
      fetchWebzIo(options)
    ]);

    const providers = [];
    for (const r of results) {
      if (r.status === "fulfilled") {
        providers.push(r.value);
      }
    }
    return providers;
  }

  window.PoliticViewNewsSources = {
    fetchNewsApiOrg,
    fetchNewsDataIo,
    fetchWebzIo,
    fetchUnifiedNews
  };
})();

