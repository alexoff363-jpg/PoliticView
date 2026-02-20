// Central place to manage all external API keys for PoliticView.
// IMPORTANT:
// - Do NOT commit real keys to version control.
// - For production, move these values to a secure backend or environment variables.

window.POLITIC_VIEW_API_KEYS = {
  // News & discourse
  newsapiOrg: "2442e0eeaaf3482f98cf7a679e96bb77",        // https://newsapi.org
  newsdataIo: "https://newsdata.io/api/1/news?apikey=pub_b48ba86d64c648e8adf629ef4198e388&q=Tamil+Nadu+politics",        // https://newsdata.io
  webzIo: "",            // https://webz.io

  // Social / community
  reddit: "",            // https://www.reddit.com/dev/api/
  youtubeDataV3: "AIzaSyDKm4OzTpLu6dgyHxqQwLBinN6io1bJq6U",     // https://console.cloud.google.com/apis/library/youtube.googleapis.com
  mastodon: "yZMw2ZGyfhW2S3dWPZfTWkTcsAP5o9A8hP_FfJwHmnw",          // Instance specific, many do not require global keys

  // Geo / econ / research
  gdelt: "https://api.gdeltproject.org/api/v2/doc/doc?query=politics%20sourcecountry:IN&mode=artlist&format=json",             // https://www.gdeltproject.org
  worldBank: "https://search.worldbank.org/api/v2/projects?format=json&qterm=Tamil+Nadu+Public+Administration&rows=100",         // World Bank API generally does not require a key

  // LLM / strategy brain (Ollama or compatible local server)
  llmModel: "deepseek-v3.1:671b-cloud",  // Default Ollama model name; change to any installed model

  // Custom or future integrations
  customBackendProxy: "" // Optional: your own backend URL to bypass CORS limits
};

