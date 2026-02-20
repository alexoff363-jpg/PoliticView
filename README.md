# PoliticView - AI Political Intelligence Platform

An AI-powered political intelligence platform for Tamil Nadu politics featuring real-time sentiment analysis, bot detection, PR manipulation detection, and strategic insights.

## Features

### Core Intelligence
- **Real-Time Sentiment Pulse** - Live emotion analysis from news and social media
- **People Response Simulator** - Analyze speeches for backlash risk using AI
- **Emotional Heatmaps** - 8-dimension emotion radar visualization
- **Live Political Feed** - Aggregated real-time news from 7 sources

### Influence Detection
- **Fake PR Detection** - Identify coordinated campaigns using AI
- **Bot Network Identification** - Detect automated accounts and patterns
- **Misinformation Radar** - Source credibility checking

### Public Insight
- **POV Analyzer** - Analyze public opinion on any issue
- **Regional Sentiment** - Tamil Nadu region-by-region analysis

### Integration & Operations
- **Media Monitoring Hub** - Aggregate data from all sources
- **Cross-Source Validator** - Verify stories across multiple sources
- **Export Functionality** - Download aggregated data as JSON

### Memory & History Layer
- **Issue Memory Engine** - Recall past reactions to similar issues
- **Scandal Recall System** - Detect risky messaging that resembles past scandals
- **Historical Pattern Analyzer** - Learn from past campaigns

### Chief Strategist AI
- **Strategic Recommendations** - Party-biased AI strategy
- **Context-Aware Analysis** - Uses current news for recommendations
- **Actionable Insights** - Specific steps to improve party standing

## Technology Stack

- **Frontend:** Vanilla JavaScript, Chart.js
- **Backend:** Node.js, Express
- **AI:** Ollama (DeepSeek v3.1)
- **Data Sources:**
  - NewsAPI
  - NewsData.io
  - GDELT
  - YouTube Data API
  - Reddit RSS
  - Mastodon
  - Google Trends

## Prerequisites

1. **Node.js** (v16 or higher)
2. **Ollama** with DeepSeek model
3. **API Keys** (optional for enhanced features)

## Installation

### 1. Install Dependencies
```bash
npm install
```

### 2. Install Ollama
Visit https://ollama.ai and download for your platform, or:

**Linux/Mac:**
```bash
curl -fsSL https://ollama.com/install.sh | sh
```

**Windows:**
Download from https://ollama.ai/download/windows

### 3. Pull DeepSeek Model
```bash
ollama pull deepseek-v3.1:671b-cloud
```

### 4. Configure API Keys (Optional)

Edit `config/apiKeys.js` to add your API keys:

```javascript
window.POLITIC_VIEW_API_KEYS = {
  newsapiOrg: "YOUR_NEWSAPI_KEY",  // Get from https://newsapi.org
  newsdataIo: "",                   // Get from https://newsdata.io
  youtubeDataV3: "",                // Get from Google Cloud Console
  llmModel: "deepseek-v3.1:671b-cloud"
};
```

Edit `server.js` to add server-side keys:

```javascript
const CONFIG = {
  newsApi: 'YOUR_NEWSAPI_KEY',
  newsdataIo: 'YOUR_NEWSDATA_KEY',
  youtubeApiKey: 'YOUR_YOUTUBE_KEY'
};
```

## Usage

### 1. Start Ollama (Keep Running)
```bash
ollama serve
```

### 2. Start PoliticView Server (New Terminal)
```bash
npm start
```

### 3. Open Browser
Navigate to: http://localhost:3000

### 4. Test Setup (Optional)
```bash
npm test
```

## Features Overview

### Party-Specific Analysis
- Select from BJP, TVK, DMK, or ADMK
- All data filtered by party keywords
- Charts use party-specific colors
- AI analysis biased toward selected party

### Real-Time Data
- Aggregates from 7 sources
- English-only content filtering
- Party-specific keyword filtering
- Live sentiment analysis

### AI-Powered Features
- Bot network detection
- Fake PR identification
- Historical pattern matching
- Scandal similarity detection
- Strategic recommendations

## API Rate Limits

- **NewsAPI:** 100 requests/day (free tier)
- **NewsData.io:** 200 requests/day (free tier)
- **YouTube:** 10,000 units/day (free tier)
- **GDELT:** No limit
- **Reddit RSS:** No limit
- **Mastodon:** Generous limit
- **Ollama:** No limit (local)

## Project Structure

```
politicview/
├── config/
│   └── apiKeys.js          # API key configuration
├── js/
│   ├── api/
│   │   ├── apiClient.js    # API client wrapper
│   │   ├── llmClient.js    # Ollama LLM client
│   │   └── ...
│   ├── features/
│   │   ├── coreIntelligence.js
│   │   ├── influenceDetection.js
│   │   ├── publicInsight.js
│   │   ├── integrationOps.js
│   │   ├── memoryHistory.js
│   │   ├── chiefStrategist.js
│   │   └── ...
│   ├── utils/
│   │   ├── logger.js       # Logging utility
│   │   └── demoData.js     # Demo data generator
│   └── main.js             # Main application
├── index.html              # Main HTML file
├── styles.css              # Styles
├── server.js               # Express server
├── package.json            # Dependencies
└── test-setup.js           # Setup validator

```

## Troubleshooting

### "Failed to contact Ollama"
Make sure Ollama is running:
```bash
ollama serve
```

### "No data showing"
1. Check browser console (F12) for errors
2. Verify API keys in `config/apiKeys.js`
3. Click the "Refresh" button
4. Try switching parties

### "Low confidence" warnings
This is normal when:
- Limited data available for the topic
- AI is being cautious
- You can enable online search for more context

## Development

### Run Tests
```bash
npm test
```

### Check for Errors
Open browser console (F12) and check for any errors

### Debug Mode
Check the Activity Log at the bottom of the dashboard for real-time logs

## Security Notes

- API keys are stored client-side (move to environment variables for production)
- All AI processing runs locally via Ollama
- No data sent to cloud AI services
- Open source and auditable

## Performance

- **Initial Load:** 5-10 seconds (fetching from 7 sources)
- **Party Switch:** 3-5 seconds (new data fetch)
- **AI Analysis:** 2-5 seconds (Ollama processing)
- **Chart Refresh:** 1-2 seconds

## Contributing

This is a demonstration project. For production use:
1. Move API keys to environment variables
2. Add rate limiting and caching
3. Implement user authentication
4. Add database for historical data
5. Set up monitoring and logging

## License

MIT License

## Acknowledgments

- **Ollama** - Local AI inference
- **DeepSeek** - Advanced language model
- **NewsAPI** - News data
- **Google Trends** - Interest data
- **Chart.js** - Data visualization

## Support

For issues or questions:
1. Check browser console (F12) for errors
2. Verify Ollama is running: `ollama list`
3. Test APIs: `npm test`
4. Check server logs in terminal

---

**Made for Tamil Nadu Political Analysis**
