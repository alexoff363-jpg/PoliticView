// Simple Node server for PoliticView
// - Serves the static frontend
// - Proxies LLM calls to a local Ollama instance

const express = require("express");
const Parser = require('rss-parser');
const googleTrends = require('google-trends-api');
const axios = require('axios');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;
const rssParser = new Parser({
  headers: {
    'User-Agent': 'PoliticView/1.0.0 (https://github.com/yourusername/politicview)'
  }
});

// API Configuration
const CONFIG = {
  newsApi: '2442e0eeaaf3482f98cf7a679e96bb77',
  mastodonToken: 'yZMw2ZGyfhW2S3dWPZfTWkTcsAP5o9A8hP_FfJwHmnw',
  newsdataIo: '', // Add your NewsData.io key here
  youtubeApiKey: '', // Add your YouTube API key here
};

// Basic middlewares
app.use(cors()); // Allow cross-origin for local dev if needed
app.use(express.json({ limit: "2mb" }));

// Serve static files from project root
app.use(express.static(__dirname));

// Healthcheck
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", app: "PoliticView" });
});

async function callOllamaChat({ prompt, system, model }) {
  const selectedModel = model || process.env.POLITICVIEW_LLM_MODEL || "deepseek-v3.1:671b-cloud";
  const baseUrl = process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434";

  const response = await fetch(`${baseUrl}/v1/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: selectedModel,
      messages: [
        ...(system
          ? [
            {
              role: "system",
              content: system
            }
          ]
          : []),
        { role: "user", content: prompt }
      ],
      stream: false
    })
  });

  if (!response.ok) {
    const text = await response.text();
    return {
      error: "Ollama call failed",
      status: response.status,
      body: text.slice(0, 500)
    };
  }

  const json = await response.json();
  const content =
    json.choices &&
    json.choices[0] &&
    json.choices[0].message &&
    json.choices[0].message.content;

  return { model: selectedModel, content: content || "" };
}

// Generic LLM endpoint using Ollama
// Expected body: { prompt: string, model?: string, system?: string }
app.post("/api/llm/generate", async (req, res) => {
  const { prompt, model, system } = req.body || {};
  if (!prompt || typeof prompt !== "string") {
    return res.status(400).json({ error: "Missing prompt" });
  }

  try {
    const result = await callOllamaChat({ prompt, model, system });
    if (result.error) {
      return res.status(502).json(result);
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: "Failed to contact Ollama", message: err.message });
  }
});

// Backwards-compatible strategist-specific endpoint
// Expected body: { prompt: string, model?: string }
// --- Real Data Feed Endpoints ---
// ============================================
// PROFESSIONAL DATA PROCESSING UTILITIES
// ============================================

// Party-specific keyword configuration for strict filtering
const PARTY_KEYWORDS = {
  'TVK': {
    primary: ['tvk', 'vijay', 'tamizhaga vettri kazhagam'],
    secondary: ['thalapathy', 'actor vijay', 'vettri kazhagam'],
    leaders: ['vijay'],
    searchTerms: 'Tamizhaga Vettri Kazhagam Vijay TVK'
  },
  'DMK': {
    primary: ['dmk', 'dravida munnetra kazhagam', 'stalin'],
    secondary: ['mk stalin', 'chief minister', 'cm stalin'],
    leaders: ['stalin', 'mk stalin', 'udhayanidhi'],
    searchTerms: 'DMK Stalin Tamil Nadu'
  },
  'ADMK': {
    primary: ['admk', 'aiadmk', 'all india anna dravida munnetra kazhagam'],
    secondary: ['palaniswami', 'eps', 'edappadi', 'amma'],
    leaders: ['palaniswami', 'eps', 'edappadi', 'jayalalithaa'],
    searchTerms: 'AIADMK ADMK Palaniswami EPS'
  },
  'BJP': {
    primary: ['bjp', 'bharatiya janata party', 'annamalai'],
    secondary: ['k annamalai', 'saffron', 'hindutva'],
    leaders: ['annamalai', 'modi', 'narendra modi'],
    searchTerms: 'BJP Annamalai Tamil Nadu'
  }
};

/**
 * Get search term optimized for party
 */
function getSearchTerm(party) {
  if (!party || party === 'Global') return "Tamil Nadu Politics";
  const config = PARTY_KEYWORDS[party];
  return config ? config.searchTerms : party + " Tamil Nadu";
}

/**
 * Check if text contains party-specific keywords (STRICT)
 * Returns true only if primary or leader keywords are found
 */
function containsPartyKeywords(text, party) {
  if (!text || !party || party === 'Global') return true;
  
  const config = PARTY_KEYWORDS[party];
  if (!config) return true;

  const lowerText = text.toLowerCase();
  
  // Must contain at least one primary keyword OR leader name
  const hasPrimary = config.primary.some(kw => lowerText.includes(kw));
  const hasLeader = config.leaders.some(kw => lowerText.includes(kw));
  
  return hasPrimary || hasLeader;
}

/**
 * Calculate relevance score (0-100) for filtering
 */
function calculateRelevanceScore(item, party) {
  if (!item || party === 'Global') return 100;

  const config = PARTY_KEYWORDS[party];
  if (!config) return 50;

  const text = [
    item.title || '',
    item.description || '',
    item.content || ''
  ].join(' ').toLowerCase();

  let score = 0;

  // Primary keyword: +50 points
  config.primary.forEach(kw => {
    if (text.includes(kw)) score += 50;
  });

  // Leader name: +40 points
  config.leaders.forEach(kw => {
    if (text.includes(kw)) score += 40;
  });

  // Secondary keyword: +20 points
  config.secondary.forEach(kw => {
    if (text.includes(kw)) score += 20;
  });

  // Tamil Nadu context: +10 points
  if (text.includes('tamil nadu') || text.includes('chennai')) {
    score += 10;
  }

  return Math.min(100, score);
}

/**
 * Filter and sort items by party relevance
 * Removes items that don't contain party keywords
 */
function filterByPartyRelevance(items, party, minScore = 40) {
  if (!items || !Array.isArray(items)) return [];
  if (party === 'Global') return items;

  return items
    .filter(item => {
      const text = (item.title || '') + ' ' + (item.description || '') + ' ' + (item.content || '');
      return containsPartyKeywords(text, party);
    })
    .map(item => ({
      ...item,
      relevanceScore: calculateRelevanceScore(item, party)
    }))
    .filter(item => item.relevanceScore >= minScore)
    .sort((a, b) => b.relevanceScore - a.relevanceScore);
}

/**
 * Validate English content (70% threshold)
 */
function isEnglish(text, threshold = 0.7) {
  if (!text) return false;
  const englishChars = text.match(/[a-zA-Z\s]/g);
  if (!englishChars) return false;
  return englishChars.length / text.length >= threshold;
}

// 1. Reddit Feed
// Note: Reddit RSS doesn't support dynamic query params easily without searching. 
// We will switch to searching reddit instead of a fixed subreddit RSS if a party is selected, 
// or just stick to r/TNpolitics and filter if possible? 
// Better: Use Reddit Search RSS: https://www.reddit.com/search.rss?q=...
app.get("/api/feeds/reddit", async (req, res) => {
  try {
    const party = req.query.party;
    let url = "https://www.reddit.com/r/TNpolitics/top/.rss?t=day";
    if (party && party !== 'Global') {
      const query = encodeURIComponent(getSearchTerm(party));
      url = `https://www.reddit.com/search.rss?q=${query}&sort=new`;
    }

    const feed = await rssParser.parseURL(url);
    const items = feed.items.slice(0, 10).map(item => ({
      title: item.title,
      link: item.link,
      pubDate: item.pubDate,
      source: 'Reddit'
    }));
    res.json(items);
  } catch (err) {
    console.error("Reddit Feed Error:", err.message);
    res.status(500).json({ error: "Failed to fetch Reddit feed" });
  }
});

// 2. Google Trends
app.get("/api/feeds/trends", async (req, res) => {
  try {
    const party = req.query.party;
    // If a party is selected, compare it against major rivals
    const keywords = party && party !== 'Global'
      ? [party, "DMK", "ADMK", "BJP"]
      : ["DMK", "ADMK", "TVK", "BJP", "Tamil Nadu Politics"];

    const results = await googleTrends.interestOverTime({
      keyword: keywords,
      geo: 'IN-TN',
      startTime: new Date(Date.now() - (7 * 24 * 60 * 60 * 1000)),
    });

    const data = JSON.parse(results);
    if (data.default && data.default.timelineData) {
      res.json(data.default.timelineData);
    } else {
      res.json([]);
    }
  } catch (err) {
    console.error("Google Trends Error:", err.message);
    res.json([]);
  }
});

// 3. Mastodon Feed
app.get("/api/feeds/mastodon", async (req, res) => {
  try {
    const party = req.query.party;
    const tag = (party && party !== 'Global') ? party.replace(/\s+/g, '') : "politics";

    const server = "https://mastodon.social";
    const url = `${server}/api/v1/timelines/tag/${tag}?limit=5`;

    const response = await axios.get(url, {
      headers: { "Authorization": `Bearer ${CONFIG.mastodonToken}` }
    });

    const items = response.data.map(post => ({
      content: post.content.replace(/<[^>]*>?/gm, ''),
      author: post.account.display_name,
      url: post.url,
      source: 'Mastodon'
    }));
    res.json(items);
  } catch (err) {
    // console.error("Mastodon Error:", err.message); // Mastodon often 404s on obscure tags
    res.json([]); // Return empty on error to not break UI
  }
});

// 4. NewsAPI (English only with STRICT party filtering)
app.get("/api/feeds/newsapi", async (req, res) => {
  try {
    const party = req.query.party || 'Global';
    const query = getSearchTerm(party);
    const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&language=en&apiKey=${CONFIG.newsApi}&sortBy=publishedAt&pageSize=50`;
    const response = await axios.get(url);

    let articles = response.data.articles
      .filter(a => {
        // English validation
        const text = (a.title + ' ' + (a.description || ''));
        if (!isEnglish(text, 0.7)) return false;
        
        // STRICT: Must contain party keywords
        return containsPartyKeywords(text, party);
      })
      .map(a => ({
        title: a.title,
        source: a.source.name,
        url: a.url,
        publishedAt: a.publishedAt,
        description: a.description
      }));

    // Apply relevance filtering and sorting
    articles = filterByPartyRelevance(articles, party, 40);
    
    console.log(`NewsAPI: ${articles.length} ${party}-relevant articles from ${response.data.articles.length} total`);
    res.json(articles.slice(0, 20));
  } catch (err) {
    console.error("NewsAPI Error:", err.message);
    res.status(500).json({ error: "Failed to fetch NewsAPI" });
  }
});

// 5. GDELT (English only with STRICT party filtering)
app.get("/api/feeds/gdelt", async (req, res) => {
  try {
    const party = req.query.party || 'Global';
    const query = party && party !== 'Global' ? `${party} sourcecountry:IN sourcelang:eng` : "politics sourcecountry:IN sourcelang:eng";
    const url = `https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(query)}&mode=artlist&format=json&maxrecords=50`;
    const response = await axios.get(url);

    if (response.data && response.data.articles) {
      let articles = response.data.articles
        .filter(a => {
          // English validation
          const text = a.title || '';
          if (!isEnglish(text, 0.7)) return false;
          
          // STRICT: Must contain party keywords
          return containsPartyKeywords(text, party);
        })
        .map(a => ({
          title: a.title,
          source: a.domain,
          url: a.url,
          seendate: a.seendate
        }));

      // Apply relevance filtering and sorting
      articles = filterByPartyRelevance(articles, party, 40);
      
      console.log(`GDELT: ${articles.length} ${party}-relevant articles from ${response.data.articles.length} total`);
      res.json(articles.slice(0, 15));
    } else {
      res.json([]);
    }
  } catch (err) {
    console.error("GDELT Error:", err.message);
    res.json([]); // Return empty on error
  }
});

// 6. NewsData.io (English only with STRICT party filtering)
app.get("/api/feeds/newsdata", async (req, res) => {
  try {
    if (!CONFIG.newsdataIo) {
      return res.json([]);
    }
    
    const party = req.query.party || 'Global';
    const query = getSearchTerm(party);
    const url = `https://newsdata.io/api/1/news?apikey=${CONFIG.newsdataIo}&q=${encodeURIComponent(query)}&language=en&country=in`;
    const response = await axios.get(url);

    if (response.data && response.data.results) {
      let articles = response.data.results
        .filter(a => {
          // English validation
          const text = (a.title + ' ' + (a.description || ''));
          if (!isEnglish(text, 0.7)) return false;
          
          // STRICT: Must contain party keywords
          return containsPartyKeywords(text, party);
        })
        .map(a => ({
          title: a.title,
          source: a.source_id,
          url: a.link,
          publishedAt: a.pubDate,
          description: a.description
        }));

      // Apply relevance filtering and sorting
      articles = filterByPartyRelevance(articles, party, 40);
      
      console.log(`NewsData.io: ${articles.length} ${party}-relevant articles from ${response.data.results.length} total`);
      res.json(articles.slice(0, 15));
    } else {
      res.json([]);
    }
  } catch (err) {
    console.error("NewsData.io Error:", err.message);
    res.json([]); // Return empty on error
  }
});

// 7. YouTube (English only with STRICT party filtering)
app.get("/api/feeds/youtube", async (req, res) => {
  try {
    if (!CONFIG.youtubeApiKey) {
      return res.json([]);
    }
    
    const party = req.query.party || 'Global';
    const query = getSearchTerm(party);
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&relevanceLanguage=en&regionCode=IN&maxResults=20&key=${CONFIG.youtubeApiKey}`;
    const response = await axios.get(url);

    if (response.data && response.data.items) {
      let videos = response.data.items
        .filter(item => {
          // English validation
          const text = item.snippet.title + ' ' + item.snippet.description;
          if (!isEnglish(text, 0.7)) return false;
          
          // STRICT: Must contain party keywords
          return containsPartyKeywords(text, party);
        })
        .map(item => ({
          title: item.snippet.title,
          source: item.snippet.channelTitle,
          url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
          publishedAt: item.snippet.publishedAt,
          description: item.snippet.description,
          thumbnail: item.snippet.thumbnails.default.url
        }));

      // Apply relevance filtering and sorting
      videos = filterByPartyRelevance(videos, party, 40);
      
      console.log(`YouTube: ${videos.length} ${party}-relevant videos from ${response.data.items.length} total`);
      res.json(videos.slice(0, 10));
    } else {
      res.json([]);
    }
  } catch (err) {
    console.error("YouTube Error:", err.message);
    res.json([]); // Return empty on error
  }
});

// 8. Aggregate all feeds
app.get("/api/feeds/all", async (req, res) => {
  const party = req.query.party;
  
  try {
    const [reddit, trends, mastodon, news, gdelt, newsdata, youtube] = await Promise.allSettled([
      axios.get(`http://localhost:${PORT}/api/feeds/reddit?party=${party}`),
      axios.get(`http://localhost:${PORT}/api/feeds/trends?party=${party}`),
      axios.get(`http://localhost:${PORT}/api/feeds/mastodon?party=${party}`),
      axios.get(`http://localhost:${PORT}/api/feeds/newsapi?party=${party}`),
      axios.get(`http://localhost:${PORT}/api/feeds/gdelt?party=${party}`),
      axios.get(`http://localhost:${PORT}/api/feeds/newsdata?party=${party}`),
      axios.get(`http://localhost:${PORT}/api/feeds/youtube?party=${party}`)
    ]);

    const aggregated = {
      reddit: reddit.status === 'fulfilled' ? reddit.value.data : [],
      trends: trends.status === 'fulfilled' ? trends.value.data : [],
      mastodon: mastodon.status === 'fulfilled' ? mastodon.value.data : [],
      news: news.status === 'fulfilled' ? news.value.data : [],
      gdelt: gdelt.status === 'fulfilled' ? gdelt.value.data : [],
      newsdata: newsdata.status === 'fulfilled' ? newsdata.value.data : [],
      youtube: youtube.status === 'fulfilled' ? youtube.value.data : []
    };

    res.json(aggregated);
  } catch (err) {
    console.error("Aggregate feed error:", err.message);
    res.status(500).json({ error: "Failed to aggregate feeds" });
  }
});


// --- AI Analysis Endpoints ---

// Validate data using LLM
async function validateWithLLM(data, context) {
  const prompt = `You are a data validation expert. Analyze the following data and determine if it's valid, accurate, and relevant to ${context}. 
  
Data: ${JSON.stringify(data).slice(0, 2000)}

Return JSON only with: { "is_valid": true/false, "confidence": 0.0-1.0, "issues": ["list of any issues found"], "summary": "brief summary" }`;

  const result = await callOllamaChat({
    prompt,
    system: "You are a precise data validator. Output only valid JSON."
  });

  try {
    let cleanContent = result.content.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanContent);
  } catch (e) {
    return { is_valid: true, confidence: 0.5, issues: [], summary: "Validation unavailable" };
  }
}

// Detect bot networks in social media data
app.post("/api/analyze/bot-detection", async (req, res) => {
  const { posts } = req.body; // Array of posts with author, timestamp, content
  if (!posts || !Array.isArray(posts)) {
    return res.status(400).json({ error: "Posts array required" });
  }

  const prompt = `Analyze these social media posts for bot network activity. Look for:
1. Repetitive phrasing patterns
2. Synchronized posting times
3. Similar account creation patterns
4. Coordinated messaging

Posts: ${JSON.stringify(posts.slice(0, 50))}

Return JSON: { "bot_probability": 0.0-1.0, "suspicious_patterns": ["list"], "coordinated_accounts": ["list"], "recommendation": "string" }`;

  const result = await callOllamaChat({
    prompt,
    system: "You are a bot detection specialist. Analyze social media patterns and output only valid JSON."
  });

  try {
    let cleanContent = result.content.replace(/```json/g, '').replace(/```/g, '').trim();
    const analysis = JSON.parse(cleanContent);
    res.json(analysis);
  } catch (e) {
    res.json({ bot_probability: 0, suspicious_patterns: [], coordinated_accounts: [], recommendation: "Analysis failed" });
  }
});

// Detect fake PR and artificial amplification
app.post("/api/analyze/pr-detection", async (req, res) => {
  const { headlines, party } = req.body;
  if (!headlines || !Array.isArray(headlines)) {
    return res.status(400).json({ error: "Headlines array required" });
  }

  const prompt = `Analyze these news headlines for artificial PR amplification related to ${party || 'political parties'} in Tamil Nadu:

Headlines: ${JSON.stringify(headlines)}

Look for:
1. Sudden coordinated positive/negative coverage
2. Repetitive phrasing across sources
3. Timing patterns suggesting orchestrated release
4. Unnatural sentiment uniformity

Return JSON: { "pr_score": 0.0-1.0, "is_artificial": true/false, "patterns": ["list"], "affected_sources": ["list"], "analysis": "string" }`;

  const result = await callOllamaChat({
    prompt,
    system: "You are a media manipulation analyst. Output only valid JSON."
  });

  try {
    let cleanContent = result.content.replace(/```json/g, '').replace(/```/g, '').trim();
    const analysis = JSON.parse(cleanContent);
    res.json(analysis);
  } catch (e) {
    res.json({ pr_score: 0, is_artificial: false, patterns: [], affected_sources: [], analysis: "Analysis failed" });
  }
});

// Enhanced sentiment analysis with online search capability
app.post("/api/analyze/sentiment-enhanced", async (req, res) => {
  const { text, party, searchOnline } = req.body;
  if (!text) return res.status(400).json({ error: "Text is required" });

  let context = "";
  
  // If searchOnline is true and confidence is low, search for additional context
  if (searchOnline) {
    try {
      const searchQuery = `${party || 'Tamil Nadu'} politics recent news`;
      // Note: In production, integrate with a search API like SerpAPI or Google Custom Search
      context = `\n\nAdditional Context: Searching online for recent ${party} political developments...`;
    } catch (e) {
      console.warn("Online search failed:", e.message);
    }
  }

  const prompt = `Analyze the sentiment of this political text about ${party || 'Tamil Nadu politics'}. ${context}

Text: "${text.slice(0, 2000)}"

Return JSON with: 
{
  "sentiment_score": (number -1.0 to 1.0),
  "confidence": (0.0-1.0),
  "emotions": {
    "anger": 0.0-1.0,
    "fear": 0.0-1.0,
    "joy": 0.0-1.0,
    "trust": 0.0-1.0,
    "sadness": 0.0-1.0,
    "disgust": 0.0-1.0,
    "anticipation": 0.0-1.0,
    "surprise": 0.0-1.0
  },
  "keywords": ["list"],
  "party_sentiment": {
    "TVK": -1.0 to 1.0,
    "DMK": -1.0 to 1.0,
    "ADMK": -1.0 to 1.0,
    "BJP": -1.0 to 1.0
  }
}`;

  const result = await callOllamaChat({
    prompt,
    system: "You are a precise political sentiment analyzer for Tamil Nadu. Output only valid JSON."
  });

  try {
    let cleanContent = result.content.replace(/```json/g, '').replace(/```/g, '').trim();
    const analysis = JSON.parse(cleanContent);
    
    // Validate the result
    if (analysis.confidence < 0.6 && searchOnline) {
      analysis.note = "Low confidence - consider enabling online search for better accuracy";
    }
    
    res.json(analysis);
  } catch (e) {
    console.error("JSON Parse Error:", e);
    res.json({ 
      sentiment_score: 0, 
      confidence: 0.3,
      emotions: { neutral: 1 }, 
      keywords: [],
      party_sentiment: {},
      raw: result.content 
    });
  }
});

// Generate Heatmap Data
app.post("/api/analyze/heatmap", async (req, res) => {
  // In a real app, we'd feed recent news headlines to determining regional heat
  // For now, we simulate asking the AI to generate heat values for TN districts based on "current political climate" (which it might know or hallucinate if offline, but if we feed it context it's better)

  // We can feed it the recent news we fetched?
  // For simplicity, we ask it to generate based on general knowledge or context we provide.
  const { context } = req.body; // Context can be recent headlines provided by frontend

  const prompt = `Based on the following recent news headlines about Tamil Nadu politics, assign a "political heat" intensity (0-100) to key districts (Chennai, Coimbatore, Madurai, Trichy, Salem, Tirunelveli). 
    Headlines: ${context || "General Tamil Nadu political climate"}
    Return JSON only: { "Chennai": 50, ... }`;

  const result = await callOllamaChat({
    prompt,
    system: "You are a political analyst. Output only valid JSON mapping districts to heat intensity integers."
  });

  try {
    let cleanContent = result.content.replace(/```json/g, '').replace(/```/g, '').trim();
    const data = JSON.parse(cleanContent);
    res.json(data);
  } catch (e) {
    res.json({});
  }
});

app.post("/api/llm/strategist", async (req, res) => {
  const { prompt, model, party, systemPrompt } = req.body || {};
  
  if (!prompt || typeof prompt !== "string") {
    return res.status(400).json({ error: "Missing prompt" });
  }

  // Use custom system prompt if provided, otherwise use default
  const defaultSystemPrompt = (party && party !== "Global")
    ? `You are the Chief Strategist for ${party} in Tamil Nadu. Your goal is to maximize ${party}'s reach and reputation. Analyze all data to highlight POSITIVES for ${party} and NEGATIVES/WEAKNESSES of opponents (DMK, ADMK, BJP, TVK). Suggest specific actions to improve ${party}'s standing. Be biased in favor of ${party} but grounded in data. Provide clear, actionable recommendations in plain text paragraphs without bullet points, numbering, or special formatting.`
    : "You are the Chief Strategist AI module inside PoliticView. Summarize the situation and propose concise strategic options for a political leader. Write in short professional paragraphs without bullet points, numbering, or special formatting.";

  const finalSystemPrompt = systemPrompt || defaultSystemPrompt;

  try {
    const result = await callOllamaChat({
      prompt,
      model,
      system: finalSystemPrompt
    });
    if (result.error) {
      return res.status(502).json(result);
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: "Failed to contact Ollama", message: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`PoliticView server running on http://localhost:${PORT}`);
});

