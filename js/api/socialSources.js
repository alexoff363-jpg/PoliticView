(function () {
  const { httpGet, getKey, isDemoMode } = window.PoliticViewApiClient;
  const logger = window.PoliticViewLogger;

  async function fetchReddit({ query = "politics", limit = 25 } = {}) {
    if (isDemoMode()) {
      logger.info("Using demo mode for Reddit");
      return {
        provider: "reddit (demo)",
        posts: []
      };
    }

    // NOTE: In-browser calls to Reddit API are heavily CORS-limited.
    // In production, route this via your backend or a worker proxy.
    const url =
      "https://www.reddit.com/search.json?" +
      new URLSearchParams({
        q: query,
        limit: String(limit),
        sort: "new",
        t: "day"
      });

    const json = await httpGet(url);
    const children = (json.data && json.data.children) || [];
    return {
      provider: "reddit",
      posts: children.map((c) => c.data)
    };
  }

  async function fetchYouTube({ query = "politics", maxResults = 25 } = {}) {
    const key = getKey("youtubeDataV3");
    if (!key || isDemoMode()) {
      logger.info("Using demo mode for YouTube");
      return {
        provider: "youtube (demo)",
        videos: []
      };
    }
    const url =
      "https://www.googleapis.com/youtube/v3/search?" +
      new URLSearchParams({
        key,
        q: query,
        part: "snippet",
        maxResults: String(maxResults),
        type: "video",
        order: "date"
      });
    const json = await httpGet(url);
    return {
      provider: "youtube",
      videos: json.items || []
    };
  }

  async function fetchMastodonPublicTimeline({ instance = "mastodon.social", limit = 40 } = {}) {
    if (isDemoMode()) {
      logger.info("Using demo mode for Mastodon");
      return {
        provider: "mastodon (demo)",
        statuses: []
      };
    }
    const base = `https://${instance}`;
    const url =
      base +
      "/api/v1/timelines/public?" +
      new URLSearchParams({
        limit: String(limit)
      });
    const json = await httpGet(url);
    return {
      provider: `mastodon@${instance}`,
      statuses: json || []
    };
  }

  window.PoliticViewSocialSources = {
    fetchReddit,
    fetchYouTube,
    fetchMastodonPublicTimeline
  };
})();

